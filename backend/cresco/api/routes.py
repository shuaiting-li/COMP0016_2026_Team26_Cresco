"""API routes for Cresco chatbot."""

import asyncio
import io
import logging
import shutil

import httpx
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from cresco import __version__, db
from cresco.agent.agent import CrescoAgent, get_agent
from cresco.auth.dependencies import get_current_user
from cresco.config import Settings, get_settings
from cresco.rag.indexer import (
    delete_user_upload,
    index_knowledge_base,
    index_user_upload,
    is_indexed,
)

# Drone and satellite imagery imports
from scripts.drone_image import NDVI_IMAGES_DIR, compute_ndvi_image, load_metadata
from scripts.satellite_image import satellite_images_main

from .schemas import (
    ChatRequest,
    ChatResponse,
    FarmData,
    FileDeleteResponse,
    FileUploadResponse,
    HealthResponse,
    IndexRequest,
    IndexResponse,
    UploadedFileInfo,
    UploadedFilesResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/farm-data")
async def save_farm_data(
    farm: FarmData,
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    try:
        user_id = current_user["user_id"]
        data = {
            "location": farm.location,
            "area": farm.area,
            "lat": farm.lat,
            "lon": farm.lon,
            "nodes": farm.nodes if farm.nodes is not None else [],
        }
        db.save_farm_data(settings.database_path, user_id, data)

        # Auto-fetch weather if coordinates are provided
        if farm.lat is not None and farm.lon is not None:
            api_key = settings.openweather_api_key
            if api_key:
                await fetch_weather(user_id, farm.lat, farm.lon, api_key, settings.database_path)
                # Failure is silent — user can still open the weather panel manually

        saved = db.get_farm_data(settings.database_path, user_id)
        return {"message": "Farm data saved successfully", "data": saved}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/farm-data")
async def get_farm_data(
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    user_id = current_user["user_id"]
    data = db.get_farm_data(settings.database_path, user_id)
    if data is not None:
        return {"data": data}
    else:
        raise HTTPException(status_code=404, detail="No farm data found for the user")


async def fetch_weather(user_id: str, lat: float, lon: float, api_key: str, db_path: str) -> bool:
    """Fetch weather + forecast from OWM and store in the database. Returns True on success."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            weather_resp, forecast_resp = await asyncio.gather(
                client.get(
                    "https://api.openweathermap.org/data/2.5/weather",
                    params={"lat": lat, "lon": lon, "units": "metric", "appid": api_key},
                ),
                client.get(
                    "https://api.openweathermap.org/data/2.5/forecast",
                    params={"lat": lat, "lon": lon, "units": "metric", "appid": api_key},
                ),
            )
            weather_resp.raise_for_status()
            forecast_resp.raise_for_status()

        weather_json = weather_resp.json()
        weather_dict = {
            "location": weather_json.get("name", "Unknown"),
            "current_weather": weather_json,
            "forecast": forecast_resp.json(),
        }
        db.update_farm_weather(db_path, user_id, weather_dict)
        return True
    except httpx.HTTPError:
        return False


@router.get("/weather", tags=["Weather"])
async def get_weather(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Fetch current weather and forecast from OpenWeatherMap, store it, and return it."""
    api_key = settings.openweather_api_key
    if not api_key:
        raise HTTPException(
            status_code=500, detail="OPENWEATHER_API_KEY is not configured on the server."
        )

    user_id = current_user["user_id"]
    success = await fetch_weather(user_id, lat, lon, api_key, settings.database_path)
    if not success:
        raise HTTPException(status_code=502, detail="Weather API request failed.")

    data = db.get_farm_data(settings.database_path, user_id)
    weather_block = data.get("weather") if data else None
    if not weather_block:
        raise HTTPException(status_code=502, detail="Weather data could not be stored.")

    return {
        "current_weather": weather_block["current_weather"],
        "forecast": weather_block["forecast"],
    }


@router.get("/geocode/search", tags=["Geocoding"])
async def geocode_search(
    q: str = Query(..., description="Search query (city, address, postcode)"),
    current_user: dict = Depends(get_current_user),
):
    """Proxy forward geocoding requests to Nominatim."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/search",
                params={"format": "json", "q": q},
                headers={"User-Agent": "Cresco/1.0"},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Geocoding request failed: {e}")


@router.get("/geocode/reverse", tags=["Geocoding"])
async def geocode_reverse(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    current_user: dict = Depends(get_current_user),
):
    """Proxy reverse geocoding requests to Nominatim."""
    try:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://nominatim.openstreetmap.org/reverse",
                params={"format": "json", "lat": lat, "lon": lon},
                headers={"User-Agent": "Cresco/1.0"},
                timeout=10,
            )
            resp.raise_for_status()
            return resp.json()
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Reverse geocoding request failed: {e}")


@router.get("/health", response_model=HealthResponse, tags=["System"])
async def health_check(settings: Settings = Depends(get_settings)) -> HealthResponse:
    """Check API health and knowledge base status."""
    return HealthResponse(
        status="healthy",
        version=__version__,
        knowledge_base_loaded=is_indexed(settings),
    )


@router.post("/chat", response_model=ChatResponse, tags=["Chat"])
async def chat(
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
    agent: CrescoAgent = Depends(get_agent),
) -> ChatResponse:
    """Send a message to the Cresco chatbot."""
    try:
        message = request.message

        user_id = current_user["user_id"]
        if request.files and len(request.files) > 0:
            names = ", ".join(f.get("name", "unknown") for f in request.files)
            message += (
                f"\n\n[The user has uploaded the following files which are "
                f"indexed in the knowledge base — use the retrieval tool to "
                f"search their contents: {names}]"
            )
        logger.info(
            "Chat request from user '%s': message length=%d, files=%s",
            user_id,
            len(message),
            request.files,
        )
        print("Full message to agent: %s", message)
        result = await agent.chat(
            message,
            thread_id=user_id,
            user_id=user_id,
            enable_internet_search=request.enable_internet_search,
        )
        logger.info(
            "Chat response: answer length=%d, sources=%d, tasks=%d, charts=%d",
            len(result["answer"]),
            len(result.get("sources", [])),
            len(result.get("tasks", [])),
            len(result.get("charts", [])),
        )
        return ChatResponse(
            answer=result["answer"],
            sources=result.get("sources", []),
            tasks=result.get("tasks", []),
            charts=result.get("charts", []),
            conversation_id=request.conversation_id,
        )
    except Exception as e:
        logger.exception("Chat error for user '%s'", current_user.get("user_id", "?"))
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.delete("/chat/last-exchange", tags=["Chat"])
async def delete_last_exchange(
    current_user: dict = Depends(get_current_user),
    agent: CrescoAgent = Depends(get_agent),
):
    """Delete the last user-assistant exchange from the agent's memory."""
    user_id = current_user["user_id"]
    deleted = await agent.delete_last_exchange(thread_id=user_id, user_id=user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="No exchange to delete")
    return {"status": "deleted"}


@router.post("/upload", response_model=FileUploadResponse, tags=["Files"])
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    from cresco.rag.document_loader import SUPPORTED_EXTENSIONS

    try:
        # Validate file extension
        file_ext = "." + file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
        if file_ext not in SUPPORTED_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type '{file_ext}'. "
                f"Accepted: {', '.join(SUPPORTED_EXTENSIONS)}",
            )

        # Save to per-user upload directory (not the shared knowledge base)
        user_id = current_user["user_id"]
        upload_dir = settings.uploads_dir / user_id
        upload_dir.mkdir(parents=True, exist_ok=True)

        filename = file.filename if file.filename else "unknown"
        file_path = upload_dir / filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Index with user_id metadata so retrieval is scoped
        chunks_indexed = 0
        try:
            chunks_indexed = await index_user_upload(settings, user_id=user_id, filename=filename)
        except Exception:
            logger.exception("Indexing failed for '%s' (user '%s')", filename, user_id)
            # Roll back any partially indexed chunks for this user/file to keep state consistent
            try:
                await delete_user_upload(settings, user_id=user_id, filename=filename)
            except Exception:
                logger.exception(
                    "Failed to roll back indexed chunks for '%s' (user '%s') after indexing error",
                    filename,
                    user_id,
                )
                # Surface a server error if we cannot guarantee a consistent index state
                raise HTTPException(
                    status_code=500,
                    detail="Failed to index and roll back uploaded file;"
                    " index state may be inconsistent.",
                )

        status = "indexed" if chunks_indexed > 0 else "uploaded"
        return FileUploadResponse(
            filename=filename,
            status=status,
            chunks_indexed=chunks_indexed,
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


@router.get("/uploads", response_model=UploadedFilesResponse, tags=["Files"])
async def list_uploads(
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """List uploaded files for the current user."""
    user_id = current_user["user_id"]
    upload_dir = settings.uploads_dir / user_id
    if not upload_dir.exists():
        return UploadedFilesResponse(files=[])
    files = [UploadedFileInfo(name=f.name) for f in sorted(upload_dir.iterdir()) if f.is_file()]
    return UploadedFilesResponse(files=files)


@router.post("/droneimage", tags=["Files"])
async def upload_file_drone(
    files: list[UploadFile] = File(...), settings: Settings = Depends(get_settings)
):
    try:
        if len(files) != 2:
            raise HTTPException(
                status_code=400, detail="Exactly 2 files (NIR and RGB) are required"
            )  # noqa: E501

        rgb = await files[0].read()
        nir = await files[1].read()
        rgb_filename = files[0].filename or "rgb.png"
        nir_filename = files[1].filename or "nir.png"

        # Compute NDVI and save to disk
        result = compute_ndvi_image(rgb, nir, rgb_filename, nir_filename, save_to_disk=True)

        return StreamingResponse(io.BytesIO(result["image_bytes"]), media_type="image/png")
    except Exception as e:
        print(f"Error processing drone images: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


# Get list of all saved NDVI images with metadata.
@router.get("/ndvi-images", tags=["Files"])
async def get_ndvi_images():
    try:
        metadata = load_metadata()
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading NDVI images: {str(e)}")


# Gets a specific NDVI image. Uh. It it's ever needed
@router.get("/ndvi-images/{filename}", tags=["Files"])
async def get_ndvi_image(filename: str):
    try:
        file_path = NDVI_IMAGES_DIR / filename
        if not file_path.exists():
            raise HTTPException(status_code=404, detail="Image not found")
        return FileResponse(file_path, media_type="image/png")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving image: {str(e)}")


@router.delete("/upload/{filename}", response_model=FileDeleteResponse, tags=["Files"])
async def delete_file(
    filename: str,
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Delete a user-uploaded file and its indexed chunks."""
    user_id = current_user["user_id"]
    upload_dir = settings.uploads_dir / user_id
    file_path = upload_dir / filename

    if not file_path.exists():
        raise HTTPException(status_code=404, detail=f"File '{filename}' not found")

    # Remove chunks from ChromaDB
    chunks_deleted = delete_user_upload(settings, user_id=user_id, filename=filename)

    # Remove file from disk
    file_path.unlink()

    return FileDeleteResponse(
        filename=filename,
        status="deleted",
        chunks_removed=chunks_deleted,
    )


@router.post("/index", response_model=IndexResponse, tags=["System"])
async def index_documents(
    request: IndexRequest,
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
) -> IndexResponse:
    """Index or re-index the knowledge base documents."""
    try:
        num_docs = await index_knowledge_base(settings, force=request.force_reindex)
        return IndexResponse(
            status="success",
            documents_indexed=num_docs,
            message=f"Successfully indexed {num_docs} document chunks",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Indexing error: {str(e)}")


@router.post("/satellite-image", tags=["System"])
async def satellite_image(
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    """Index or re-index the knowledge base documents."""
    try:
        user_id = current_user["user_id"]
        user_farm = db.get_farm_data(settings.database_path, user_id)
        if user_farm and user_farm.get("lat") is not None and user_farm.get("lon") is not None:
            lat = user_farm["lat"]
            lon = user_farm["lon"]
        else:
            raise HTTPException(status_code=404, detail="No farm data found for the user")
        print(f"Received request for satellite image with lat={lat}, lon={lon}")  # Debug log
        result = await satellite_images_main(lat, lon)
        if result is None:
            # Upstream satellite image generation failed; surface a clear error.
            raise HTTPException(
                status_code=502,
                detail="Failed to generate satellite image from upstream service",
            )

        return StreamingResponse(io.BytesIO(result), media_type="image/png")

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"satellite image error: {str(e)}")
