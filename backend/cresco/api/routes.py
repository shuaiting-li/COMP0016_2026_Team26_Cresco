"""API routes for Cresco chatbot."""

import io

from fastapi import APIRouter, Depends, HTTPException, FastAPI
from pydantic import BaseModel

from cresco import __version__
from cresco.agent.agent import get_agent, CrescoAgent
from cresco.config import Settings, get_settings
from cresco.rag.indexer import index_knowledge_base, is_indexed
from scripts.drone_image import compute_ndvi_image, load_metadata, NDVI_IMAGES_DIR
import shutil
from pathlib import Path
from fastapi import UploadFile, File
from fastapi.responses import StreamingResponse, FileResponse
from cresco.rag.indexer import index_knowledge_base

from .schemas import (
    ChatRequest,
    ChatResponse,
    HealthResponse,
    IndexRequest,
    IndexResponse,
    FileUploadResponse,
)

router = APIRouter()

# In-memory storage for farm data
farm_data = {}


class FarmData(BaseModel):
    location: str
    area: float


# Add a new endpoint to receive weather data
class WeatherData(BaseModel):
    location: str
    currentWeather: dict
    forecast: dict


app = FastAPI()


@router.post("/farm-data")
async def save_farm_data(farm: FarmData):
    try:
        # For simplicity, using a single key for now
        user_id = "default_user"
        farm_data[user_id] = {"location": farm.location, "area": farm.area}
        return {"message": "Farm data saved successfully", "data": farm_data[user_id]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


@router.get("/farm-data")
async def get_farm_data():
    user_id = "default_user"
    if user_id in farm_data:
        return {"data": farm_data[user_id]}
    else:
        raise HTTPException(status_code=404, detail="No farm data found for the user")


# Update the /weather-data endpoint to parse and store both current weather and forecast data
@router.post("/weather-data")
async def save_weather_data(weather: WeatherData):
    try:
        # For simplicity, using a single key for now
        user_id = "default_user"
        farm_data[user_id]["weather"] = {
            "location": weather.location,
            "currentWeather": weather.currentWeather,
            "forecast": weather.forecast,  # Include forecast data
        }
        return {
            "message": "Weather data saved successfully",
            "data": farm_data[user_id]["weather"],
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {str(e)}")


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
    agent: CrescoAgent = Depends(get_agent),
) -> ChatResponse:
    """Send a message to the Cresco chatbot."""
    try:
        # Build the message, including farm and weather data context if available
        message = request.message

        user_id = "default_user"
        if user_id in farm_data:
            farm_context = f"\n\n[Farm Data Context]:\nLocation: {farm_data[user_id]['location']}, Area: {farm_data[user_id]['area']} km²"
            message += farm_context

            if "weather" in farm_data[user_id]:
                weather_context = f"\n\n[Weather Data Context]:\nLocation: {farm_data[user_id]['weather']['location']}, Current Weather: {farm_data[user_id]['weather']['currentWeather']['weather'][0]['description']}, Temperature: {farm_data[user_id]['weather']['currentWeather']['main']['temp']}°C"
                message += weather_context
        if request.files and len(request.files) > 0:
            file_context = "\n\n[Uploaded Files Context]:\n"
            for file in request.files:
                file_name = file.get("name", "unknown")
                file_content = file.get("content", "")
                file_context += f"\n--- {file_name} ---\n{file_content}\n"
            message = message + file_context
        result = await agent.chat(message)
        return ChatResponse(
            answer=result["answer"],
            sources=result.get("sources", []),
            tasks=result.get("tasks", []),
            conversation_id=request.conversation_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/upload", response_model=FileUploadResponse, tags=["Files"])
async def upload_file_drone(
    file: UploadFile = File(...), settings: Settings = Depends(get_settings)
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
    
    

@router.post("/droneimage", tags=["Files"])  #pydantic not used bc it will return a file, not json
async def upload_file(
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


@router.get("/ndvi-images", tags=["Files"])
async def get_ndvi_images():
    """Get list of all saved NDVI images with metadata."""
    try:
        metadata = load_metadata()
        return metadata
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading NDVI images: {str(e)}")


@router.get("/ndvi-images/{filename}", tags=["Files"])
async def get_ndvi_image(filename: str):
    """Get a specific NDVI image file."""
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


# Include the router in the FastAPI app with the prefix `/api/v1`
app.include_router(router, prefix="/api/v1")
