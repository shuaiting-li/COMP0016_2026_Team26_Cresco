"""API routes for Cresco chatbot."""

from fastapi import APIRouter, Depends, HTTPException, FastAPI
from pydantic import BaseModel

from cresco import __version__
from cresco.agent.agent import get_agent, CrescoAgent
from cresco.config import Settings, get_settings
from cresco.rag.indexer import index_knowledge_base, is_indexed
import shutil
from pathlib import Path
from fastapi import UploadFile, File
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
        print(f"Error during chat processing: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Chat error: {str(e)}")


@router.post("/upload", response_model=FileUploadResponse, tags=["Files"])
async def upload_file(
    file: UploadFile = File(...), settings: Settings = Depends(get_settings)
):
    try:
        upload_dir = settings.knowledge_base
        upload_dir.mkdir(parents=True, exist_ok=True)

        file_path = upload_dir / file.filename
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Trigger reindexing
        print(f"uploaded file: {file.filename}")

        await index_knowledge_base(settings, force=False, upload_file=file.filename)
        print(f"ran index file: {file.filename}")

        return {"filename": file.filename, "status": "indexed"}
    except Exception as e:
        print(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Upload error: {str(e)}")


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
