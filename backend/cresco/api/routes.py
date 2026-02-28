"""API routes for Cresco chatbot."""

import asyncio
import shutil

import httpx
import io

from fastapi import APIRouter, Depends, HTTPException, FastAPI,File, UploadFile, Query
from pydantic import BaseModel

from cresco import __version__
from cresco.agent.agent import CrescoAgent, get_agent
from cresco.auth.dependencies import get_current_user
from cresco.config import Settings, get_settings
from cresco.rag.indexer import index_knowledge_base, is_indexed
from scripts.drone_image import process_drone_images
import shutil
from pathlib import Path
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from cresco.rag.indexer import index_knowledge_base

from .schemas import (
    ChatRequest,
    ChatResponse,
    FileUploadResponse,
    HealthResponse,
    IndexRequest,
    IndexResponse,
)

router = APIRouter()

# In-memory storage for farm data
farm_data = {}


class FarmData(BaseModel):
    location: str
    area: float
    lat: float | None = None
    lon: float | None = None


@router.post("/farm-data")
async def save_farm_data(
    farm: FarmData,
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    try:
        user_id = current_user["user_id"]
        farm_data[user_id] = {
            "location": farm.location,
            "area": farm.area,
            "lat": farm.lat,
            "lon": farm.lon,
        }

        # Auto-fetch weather if coordinates are provided
        if farm.lat is not None and farm.lon is not None:
            api_key = settings.openweather_api_key
            if api_key:
                await fetch_weather(user_id, farm.lat, farm.lon, api_key)
                # Failure is silent — user can still open the weather panel manually

        return {"message": "Farm data saved successfully", "data": farm_data[user_id]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/farm-data")
async def get_farm_data(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    if user_id in farm_data:
        return {"data": farm_data[user_id]}
    else:
        raise HTTPException(status_code=404, detail="No farm data found for the user")


async def fetch_weather(user_id: str, lat: float, lon: float, api_key: str) -> bool:
    """Fetch weather + forecast from OWM and store in farm_data. Returns True on success."""
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
        if user_id not in farm_data:
            farm_data[user_id] = {}
        farm_data[user_id]["weather"] = {
            "location": weather_json.get("name", "Unknown"),
            "current_weather": weather_json,
            "forecast": forecast_resp.json(),
        }
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
    success = await fetch_weather(user_id, lat, lon, api_key)
    if not success:
        raise HTTPException(status_code=502, detail="Weather API request failed.")

    weather_block = farm_data[user_id]["weather"]
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
            file_context = "\n\n[Uploaded Files Context]:\n"
            for file in request.files:
                file_name = file.get("name", "unknown")
                file_content = file.get("content", "")
                file_context += f"\n--- {file_name} ---\n{file_content}\n"
            message = message + file_context
        result = await agent.chat(message, thread_id=user_id, user_id=user_id)
        return ChatResponse(
            answer=result["answer"],
            sources=result.get("sources", []),
            tasks=result.get("tasks", []),
            conversation_id=request.conversation_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/upload", response_model=FileUploadResponse, tags=["Files"])
async def upload_file(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    settings: Settings = Depends(get_settings),
):
    try:
        upload_dir = settings.knowledge_base
        upload_dir.mkdir(parents=True, exist_ok=True)

        filename = file.filename if file.filename else "unknown"
        file_path = upload_dir / filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Trigger reindexing
        await index_knowledge_base(settings, force=False, upload_file=filename)
        return FileUploadResponse(
            filename=filename,
            status="indexed",
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")
    
    

@router.post("/droneimage", tags=["Files"])
async def upload_file_drone(
    files: list[UploadFile] = File(...), settings: Settings = Depends(get_settings)
):
    try:
        if len(files) != 2:
            raise HTTPException(status_code=400, detail="Exactly 2 files (NIR and RGB) are required")

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
