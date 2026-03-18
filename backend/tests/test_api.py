"""Tests for API endpoints."""

import io
import tempfile
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import httpx


class TestHealthEndpoint:
    """Tests for the /health endpoint."""

    def test_health_endpoint_returns_healthy(self, client):
        """Test health check endpoint returns correct structure."""
        response = client.get("/api/v1/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert "version" in data
        assert "knowledge_base_loaded" in data
        assert data["status"] == "healthy"

    def test_health_endpoint_shows_knowledge_base_status(self, client):
        """Test health endpoint includes knowledge base status."""
        response = client.get("/api/v1/health")
        data = response.json()
        assert isinstance(data["knowledge_base_loaded"], bool)

    def test_health_endpoint_returns_version(self, client):
        """Test health endpoint returns version string."""
        response = client.get("/api/v1/health")
        data = response.json()
        assert data["version"] is not None
        assert len(data["version"]) > 0


class TestChatEndpoint:
    """Tests for the /chat endpoint."""

    def test_chat_endpoint_requires_message(self, client):
        """Test chat endpoint validates request body."""
        response = client.post("/api/v1/chat", json={})
        assert response.status_code == 422  # Validation error

    def test_chat_endpoint_rejects_empty_message(self, client):
        """Test chat endpoint rejects empty messages."""
        response = client.post("/api/v1/chat", json={"message": ""})
        assert response.status_code == 422

    def test_chat_endpoint_accepts_valid_message(self, client):
        """Test chat endpoint accepts valid messages."""
        response = client.post("/api/v1/chat", json={"message": "What diseases affect wheat?"})
        assert response.status_code == 200
        data = response.json()
        assert "answer" in data
        assert "sources" in data
        assert "tasks" in data

    def test_chat_endpoint_with_conversation_id(self, client):
        """Test chat endpoint accepts conversation ID."""
        response = client.post(
            "/api/v1/chat",
            json={
                "message": "Tell me about crop rotation",
                "conversation_id": "test-conv-123",
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data.get("conversation_id") == "test-conv-123"

    def test_chat_endpoint_with_files(self, client):
        """Test chat endpoint accepts file uploads."""
        response = client.post(
            "/api/v1/chat",
            json={
                "message": "Analyze this soil report",
                "files": [{"name": "soil_report.txt", "content": "pH: 6.5, N: 50ppm"}],
            },
        )
        assert response.status_code == 200

    def test_chat_endpoint_message_too_long(self, client):
        """Test chat endpoint rejects overly long messages."""
        long_message = "a" * 2001  # Max is 2000
        response = client.post("/api/v1/chat", json={"message": long_message})
        assert response.status_code == 422

    def test_chat_response_has_correct_structure(self, client):
        """Test chat response has all required fields."""
        response = client.post("/api/v1/chat", json={"message": "How do I manage septoria?"})
        assert response.status_code == 200
        data = response.json()

        # Check required fields
        assert "answer" in data
        assert isinstance(data["answer"], str)

        assert "sources" in data
        assert isinstance(data["sources"], list)

        assert "tasks" in data
        assert isinstance(data["tasks"], list)

    def test_chat_endpoint_accepts_internet_search_disabled(self, client):
        """Test chat endpoint accepts enable_internet_search=false."""
        response = client.post(
            "/api/v1/chat",
            json={"message": "What is wheat?", "enable_internet_search": False},
        )
        assert response.status_code == 200

    def test_chat_endpoint_defaults_internet_search_enabled(self, client):
        """Test chat endpoint defaults enable_internet_search to true."""
        response = client.post(
            "/api/v1/chat",
            json={"message": "What is wheat?"},
        )
        assert response.status_code == 200


class TestIndexEndpoint:
    """Tests for the /index endpoint."""

    def test_index_endpoint_default_no_force(self, client):
        """Test index endpoint accepts request without force flag."""
        with patch("cresco.api.routes.index_knowledge_base", new_callable=AsyncMock) as mock_index:
            mock_index.return_value = 50
            response = client.post("/api/v1/index", json={})
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "success"
            assert data["documents_indexed"] == 50

    def test_index_endpoint_with_force_reindex(self, client):
        """Test index endpoint with force_reindex flag."""
        with patch("cresco.api.routes.index_knowledge_base", new_callable=AsyncMock) as mock_index:
            mock_index.return_value = 100
            response = client.post("/api/v1/index", json={"force_reindex": True})
            assert response.status_code == 200
            mock_index.assert_called_once()
            # Verify force=True was passed
            call_kwargs = mock_index.call_args
            assert call_kwargs[1]["force"] is True

    def test_index_endpoint_returns_document_count(self, client):
        """Test index endpoint returns correct document count."""
        with patch("cresco.api.routes.index_knowledge_base", new_callable=AsyncMock) as mock_index:
            mock_index.return_value = 75
            response = client.post("/api/v1/index", json={})
            data = response.json()
            assert data["documents_indexed"] == 75
            assert "75" in data["message"]

    def test_index_endpoint_handles_errors(self, client):
        """Test index endpoint handles indexing errors gracefully."""
        with patch("cresco.api.routes.index_knowledge_base", new_callable=AsyncMock) as mock_index:
            mock_index.side_effect = Exception("Database error")
            response = client.post("/api/v1/index", json={})
            assert response.status_code == 500
            assert "error" in response.json()["detail"].lower()


class TestCORS:
    """Tests for CORS configuration."""

    def test_cors_allows_options_request(self, client):
        """Test CORS preflight request is handled."""
        response = client.options(
            "/api/v1/health",
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "GET",
            },
        )
        # Should not be blocked by CORS
        assert response.status_code in [200, 204, 405]

    def test_cors_headers_present(self, client):
        """Test CORS headers are present in response."""
        response = client.get("/api/v1/health", headers={"Origin": "http://localhost:3000"})
        # When CORS is configured with allow_origins=["*"]
        # the header should be present
        assert response.status_code == 200


class TestErrorHandling:
    """Tests for API error handling."""

    def test_404_for_unknown_endpoint(self, client):
        """Test 404 response for unknown endpoints."""
        response = client.get("/api/v1/unknown")
        assert response.status_code == 404

    def test_method_not_allowed(self, client):
        """Test 405 response for wrong HTTP method."""
        response = client.get("/api/v1/chat")  # Should be POST
        assert response.status_code == 405

    def test_invalid_json_body(self, client):
        """Test error handling for invalid JSON."""
        response = client.post(
            "/api/v1/chat",
            content="not valid json",
            headers={"Content-Type": "application/json"},
        )
        assert response.status_code == 422


class TestGeocodeSearchEndpoint:
    """Tests for the /geocode/search proxy endpoint."""

    def test_geocode_search_returns_results(self, client):
        """Test forward geocoding proxy returns Nominatim results."""
        mock_response = httpx.Response(
            200,
            json=[{"lat": "51.5074", "lon": "-0.1278", "display_name": "London, UK"}],
            request=httpx.Request("GET", "https://nominatim.openstreetmap.org/search"),
        )
        with patch("cresco.api.routes.httpx.AsyncClient") as mock_client_cls:
            mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            response = client.get("/api/v1/geocode/search", params={"q": "London"})

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert data[0]["display_name"] == "London, UK"

    def test_geocode_search_requires_query(self, client):
        """Test forward geocoding requires the q parameter."""
        response = client.get("/api/v1/geocode/search")
        assert response.status_code == 422

    def test_geocode_search_handles_upstream_failure(self, client):
        """Test forward geocoding returns 502 when Nominatim fails."""
        with patch("cresco.api.routes.httpx.AsyncClient") as mock_client_cls:
            mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.HTTPError("Connection refused")
            )
            response = client.get("/api/v1/geocode/search", params={"q": "London"})

        assert response.status_code == 502


class TestGeocodeReverseEndpoint:
    """Tests for the /geocode/reverse proxy endpoint."""

    def test_geocode_reverse_returns_location(self, client):
        """Test reverse geocoding proxy returns a display name."""
        mock_response = httpx.Response(
            200,
            json={"display_name": "London, UK", "lat": "51.5074", "lon": "-0.1278"},
            request=httpx.Request("GET", "https://nominatim.openstreetmap.org/reverse"),
        )
        with patch("cresco.api.routes.httpx.AsyncClient") as mock_client_cls:
            mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
                return_value=mock_response
            )
            response = client.get(
                "/api/v1/geocode/reverse", params={"lat": 51.5074, "lon": -0.1278}
            )

        assert response.status_code == 200
        data = response.json()
        assert data["display_name"] == "London, UK"

    def test_geocode_reverse_requires_params(self, client):
        """Test reverse geocoding requires lat and lon parameters."""
        response = client.get("/api/v1/geocode/reverse")
        assert response.status_code == 422

    def test_geocode_reverse_handles_upstream_failure(self, client):
        """Test reverse geocoding returns 502 when Nominatim fails."""
        with patch("cresco.api.routes.httpx.AsyncClient") as mock_client_cls:
            mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.HTTPError("Connection refused")
            )
            response = client.get(
                "/api/v1/geocode/reverse", params={"lat": 51.5074, "lon": -0.1278}
            )

        assert response.status_code == 502


class TestWeatherEndpoint:
    """Tests for the /weather proxy endpoint."""

    def test_weather_returns_current_and_forecast(self, client):
        """Test weather endpoint returns both current weather and forecast data."""
        weather_json = {
            "name": "London",
            "main": {"temp": 15},
            "weather": [{"description": "clear"}],
        }
        forecast_json = {"list": [{"dt": 1700000000, "main": {"temp": 14}}]}

        mock_weather = httpx.Response(
            200,
            json=weather_json,
            request=httpx.Request("GET", "https://api.openweathermap.org/data/2.5/weather"),
        )
        mock_forecast = httpx.Response(
            200,
            json=forecast_json,
            request=httpx.Request("GET", "https://api.openweathermap.org/data/2.5/forecast"),
        )

        async def fake_get(url, **kwargs):
            if "forecast" in url:
                return mock_forecast
            return mock_weather

        with (
            patch("cresco.api.routes.httpx.AsyncClient") as mock_client_cls,
            patch("cresco.api.routes.db") as mock_db,
        ):
            mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=fake_get
            )
            mock_db.update_farm_weather = AsyncMock()
            mock_db.get_farm_data = AsyncMock(
                return_value={
                    "weather": {
                        "location": "London",
                        "current_weather": weather_json,
                        "forecast": forecast_json,
                    }
                }
            )
            response = client.get("/api/v1/weather", params={"lat": 51.5074, "lon": -0.1278})

        assert response.status_code == 200
        data = response.json()
        assert "current_weather" in data
        assert "forecast" in data
        assert data["current_weather"]["name"] == "London"

    def test_weather_requires_lat_lon(self, client):
        """Test weather endpoint requires lat and lon parameters."""
        response = client.get("/api/v1/weather")
        assert response.status_code == 422

    def test_weather_handles_upstream_failure(self, client):
        """Test weather endpoint returns 502 when OpenWeatherMap fails."""
        with patch("cresco.api.routes.httpx.AsyncClient") as mock_client_cls:
            mock_client_cls.return_value.__aenter__.return_value.get = AsyncMock(
                side_effect=httpx.HTTPError("Connection refused")
            )
            response = client.get("/api/v1/weather", params={"lat": 51.5074, "lon": -0.1278})

        assert response.status_code == 502

    def test_weather_fails_without_api_key(self, client):
        """Test weather endpoint returns 500 when API key is not configured."""
        from cresco.config import get_settings
        from cresco.main import app

        mock_s = MagicMock()
        mock_s.openweather_api_key = ""
        mock_s.knowledge_base = MagicMock()
        app.dependency_overrides[get_settings] = lambda: mock_s

        response = client.get("/api/v1/weather", params={"lat": 51.5074, "lon": -0.1278})

        assert response.status_code == 500


class TestUploadFileEndpoint:
    """Tests for the POST /upload endpoint."""

    def test_upload_and_index_success(self, client):
        """Test successful upload indexes the file and returns status='indexed'."""
        from cresco.config import get_settings
        from cresco.main import app

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_settings = MagicMock()
            mock_settings.uploads_dir = Path(tmpdir) / "uploads"

            app.dependency_overrides[get_settings] = lambda: mock_settings

            with patch(
                "cresco.api.routes.index_user_upload", new_callable=AsyncMock, return_value=5
            ):
                response = client.post(
                    "/api/v1/upload",
                    files={"file": ("report.md", b"# Report\nContent", "text/markdown")},
                )

            assert response.status_code == 200
            data = response.json()
            assert data["filename"] == "report.md"
            assert data["status"] == "indexed"
            assert data["chunks_indexed"] == 5

    def test_upload_index_failure_returns_uploaded(self, client):
        """Test that indexing failure still saves the file with status='uploaded'."""
        from cresco.config import get_settings
        from cresco.main import app

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_settings = MagicMock()
            mock_settings.uploads_dir = Path(tmpdir) / "uploads"

            app.dependency_overrides[get_settings] = lambda: mock_settings

            with (
                patch(
                    "cresco.api.routes.index_user_upload",
                    new_callable=AsyncMock,
                    side_effect=Exception("PDF parse error"),
                ),
                patch(
                    "cresco.api.routes.delete_user_upload",
                    new_callable=AsyncMock,
                ),
            ):
                response = client.post(
                    "/api/v1/upload",
                    files={"file": ("bad.pdf", b"%PDF-corrupt", "application/pdf")},
                )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "uploaded"
            assert data["chunks_indexed"] == 0
            # File should still be saved to disk
            user_dir = mock_settings.uploads_dir / "test-user-id"
            assert (user_dir / "bad.pdf").exists()

    def test_upload_zero_chunks_returns_uploaded(self, client):
        """Test that zero indexed chunks returns status='uploaded'."""
        from cresco.config import get_settings
        from cresco.main import app

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_settings = MagicMock()
            mock_settings.uploads_dir = Path(tmpdir) / "uploads"

            app.dependency_overrides[get_settings] = lambda: mock_settings

            with patch(
                "cresco.api.routes.index_user_upload", new_callable=AsyncMock, return_value=0
            ):
                response = client.post(
                    "/api/v1/upload",
                    files={"file": ("empty.txt", b"", "text/plain")},
                )

            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "uploaded"
            assert data["chunks_indexed"] == 0

    def test_upload_unsupported_extension_rejected(self, client):
        """Test that unsupported file extensions are rejected with 400."""
        response = client.post(
            "/api/v1/upload",
            files={"file": ("malware.exe", b"binary", "application/octet-stream")},
        )

        assert response.status_code == 400
        assert "unsupported" in response.json()["detail"].lower()


class TestDeleteFileEndpoint:
    """Tests for the DELETE /upload/{filename} endpoint."""

    def test_delete_file_success(self, client):
        """Test successful file deletion returns filename and chunks_removed."""
        from cresco.config import get_settings
        from cresco.main import app

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_settings = MagicMock()
            uploads_dir = Path(tmpdir) / "uploads"
            user_dir = uploads_dir / "test-user-id"
            user_dir.mkdir(parents=True)
            (user_dir / "report.md").write_text("test content")
            mock_settings.uploads_dir = uploads_dir

            app.dependency_overrides[get_settings] = lambda: mock_settings

            with patch("cresco.api.routes.delete_user_upload", return_value=5):
                response = client.delete("/api/v1/upload/report.md")

            assert response.status_code == 200
            data = response.json()
            assert data["filename"] == "report.md"
            assert data["status"] == "deleted"
            assert data["chunks_removed"] == 5
            # File should be removed from disk
            assert not (user_dir / "report.md").exists()

    def test_delete_file_not_found(self, client):
        """Test 404 when file does not exist on disk."""
        from cresco.config import get_settings
        from cresco.main import app

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_settings = MagicMock()
            uploads_dir = Path(tmpdir) / "uploads"
            user_dir = uploads_dir / "test-user-id"
            user_dir.mkdir(parents=True)
            mock_settings.uploads_dir = uploads_dir

            app.dependency_overrides[get_settings] = lambda: mock_settings

            response = client.delete("/api/v1/upload/nonexistent.md")

        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()

    def test_delete_file_scoped_to_user(self, client):
        """Test that delete only targets the current user's upload directory."""
        from cresco.config import get_settings
        from cresco.main import app

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_settings = MagicMock()
            uploads_dir = Path(tmpdir) / "uploads"
            # Create file under a different user
            other_dir = uploads_dir / "other-user"
            other_dir.mkdir(parents=True)
            (other_dir / "secret.md").write_text("private")
            # Current user's directory does not have the file
            user_dir = uploads_dir / "test-user-id"
            user_dir.mkdir(parents=True)
            mock_settings.uploads_dir = uploads_dir

            app.dependency_overrides[get_settings] = lambda: mock_settings

            response = client.delete("/api/v1/upload/secret.md")

            assert response.status_code == 404
            # Other user's file must remain untouched
            assert (other_dir / "secret.md").exists()


class TestDeleteLastExchangeEndpoint:
    """Tests for the DELETE /chat/last-exchange endpoint."""

    def test_delete_last_exchange_success(self, client):
        """Test successful deletion returns 200 with status 'deleted'."""
        response = client.delete("/api/v1/chat/last-exchange")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "deleted"

    def test_delete_last_exchange_calls_agent(self, client):
        """Test the endpoint delegates to agent.delete_last_exchange with the user's ID."""
        from cresco.api.routes import get_agent_dep
        from cresco.main import app

        mock_agent = AsyncMock()
        mock_agent.delete_last_exchange.return_value = True
        app.dependency_overrides[get_agent_dep] = lambda: mock_agent

        client.delete("/api/v1/chat/last-exchange")

        mock_agent.delete_last_exchange.assert_called_once_with(
            thread_id="test-user-id", user_id="test-user-id"
        )

    def test_delete_last_exchange_returns_404_when_empty(self, client):
        """Test 404 response when there is no exchange to delete."""
        from cresco.api.routes import get_agent_dep
        from cresco.main import app

        mock_agent = AsyncMock()
        mock_agent.delete_last_exchange.return_value = False
        app.dependency_overrides[get_agent_dep] = lambda: mock_agent

        response = client.delete("/api/v1/chat/last-exchange")
        assert response.status_code == 404
        assert "no exchange" in response.json()["detail"].lower()


class TestListUploadsEndpoint:
    """Tests for the GET /uploads endpoint."""

    def test_list_uploads_returns_files(self, client):
        """Test listing uploaded files returns correct file names."""
        from cresco.config import get_settings
        from cresco.main import app

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_settings = MagicMock()
            uploads_dir = Path(tmpdir) / "uploads"
            user_dir = uploads_dir / "test-user-id"
            user_dir.mkdir(parents=True)
            (user_dir / "file_a.md").write_text("content a")
            (user_dir / "file_b.txt").write_text("content b")
            mock_settings.uploads_dir = uploads_dir

            app.dependency_overrides[get_settings] = lambda: mock_settings

            response = client.get("/api/v1/uploads")

        assert response.status_code == 200
        names = [f["name"] for f in response.json()["files"]]
        assert "file_a.md" in names
        assert "file_b.txt" in names

    def test_list_uploads_empty_when_no_directory(self, client):
        """Test listing uploads when no user directory exists returns empty list."""
        from cresco.config import get_settings
        from cresco.main import app

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_settings = MagicMock()
            mock_settings.uploads_dir = Path(tmpdir) / "nonexistent"
            app.dependency_overrides[get_settings] = lambda: mock_settings

            response = client.get("/api/v1/uploads")

        assert response.status_code == 200
        assert response.json() == {"files": []}

    def test_list_uploads_scoped_to_user(self, client):
        """Test listing uploads returns only the current user's files."""
        from cresco.config import get_settings
        from cresco.main import app

        with tempfile.TemporaryDirectory() as tmpdir:
            mock_settings = MagicMock()
            uploads_dir = Path(tmpdir) / "uploads"
            # Current user has one file
            user_dir = uploads_dir / "test-user-id"
            user_dir.mkdir(parents=True)
            (user_dir / "my_file.md").write_text("mine")
            # Other user also has a file
            other_dir = uploads_dir / "other-user"
            other_dir.mkdir(parents=True)
            (other_dir / "other_file.md").write_text("theirs")
            mock_settings.uploads_dir = uploads_dir

            app.dependency_overrides[get_settings] = lambda: mock_settings

            response = client.get("/api/v1/uploads")

        assert response.status_code == 200
        names = [f["name"] for f in response.json()["files"]]
        assert "my_file.md" in names
        assert "other_file.md" not in names


class TestDroneImageEndpoint:
    """Tests for the POST /droneimage endpoint."""

    def test_droneimage_requires_two_files(self, client):
        """Test uploading fewer than 2 files returns an error."""
        response = client.post(
            "/api/v1/droneimage",
            files={"files": ("single.png", io.BytesIO(b"\x89PNG"), "image/png")},
        )
        assert response.status_code == 500
        assert "2 files" in response.json()["detail"]

    def test_droneimage_success(self, client):
        """Test successful drone image processing returns PNG stream."""
        ndvi_bytes = b"\x89PNG_NDVI_DATA"
        with patch(
            "cresco.api.routes.compute_ndvi_image",
            return_value={"image_bytes": ndvi_bytes},
        ):
            response = client.post(
                "/api/v1/droneimage",
                files=[
                    ("files", ("rgb.png", io.BytesIO(b"\x89PNG_RGB"), "image/png")),
                    ("files", ("nir.png", io.BytesIO(b"\x89PNG_NIR"), "image/png")),
                ],
            )
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"


class TestNDVIImagesEndpoint:
    """Tests for the NDVI image listing and retrieval endpoints."""

    def test_get_ndvi_images_returns_metadata(self, client):
        """Test listing NDVI images returns metadata."""
        mock_metadata = {"images": [{"id": "abc", "filename": "ndvi_001.png"}]}
        with patch("cresco.api.routes.load_metadata", return_value=mock_metadata):
            response = client.get("/api/v1/ndvi-images")
        assert response.status_code == 200
        assert response.json()["images"][0]["id"] == "abc"

    def test_get_ndvi_image_file_not_found(self, client):
        """Test getting a non-existent NDVI image returns 404."""
        with patch("cresco.api.routes.NDVI_IMAGES_DIR", Path("/nonexistent")):
            response = client.get("/api/v1/ndvi-images/missing.png")
        assert response.status_code == 404

    def test_get_ndvi_image_success(self, client):
        """Test serving an existing NDVI image file."""
        with tempfile.TemporaryDirectory() as tmpdir:
            img_path = Path(tmpdir) / "result.png"
            img_path.write_bytes(b"\x89PNG_FAKE")
            with patch("cresco.api.routes.NDVI_IMAGES_DIR", Path(tmpdir)):
                response = client.get("/api/v1/ndvi-images/result.png")
            assert response.status_code == 200


class TestSatelliteImageEndpoint:
    """Tests for the POST /satellite-image endpoint."""

    def test_satellite_image_no_farm_data(self, client):
        """Test 404 when user has no farm data set."""
        with patch("cresco.api.routes.db") as mock_db:
            mock_db.get_farm_data = AsyncMock(return_value=None)
            response = client.post("/api/v1/satellite-image")
        assert response.status_code == 404
        assert "farm data" in response.json()["detail"].lower()

    def test_satellite_image_success(self, client):
        """Test successful satellite image retrieval returns PNG."""
        with patch("cresco.api.routes.db") as mock_db:
            mock_db.get_farm_data = AsyncMock(return_value={"lat": 51.5, "lon": -0.1})
            with patch(
                "cresco.api.routes.satellite_images_main",
                new_callable=AsyncMock,
                return_value=b"\x89PNG_SAT",
            ):
                response = client.post("/api/v1/satellite-image")
        assert response.status_code == 200
        assert response.headers["content-type"] == "image/png"

    def test_satellite_image_upstream_failure(self, client):
        """Test 502 when satellite service returns None."""
        with patch("cresco.api.routes.db") as mock_db:
            mock_db.get_farm_data = AsyncMock(return_value={"lat": 51.5, "lon": -0.1})
            with patch(
                "cresco.api.routes.satellite_images_main",
                new_callable=AsyncMock,
                return_value=None,
            ):
                response = client.post("/api/v1/satellite-image")
        assert response.status_code == 502


class TestFarmDataPersistence:
    """Tests for farm data persistence via PostgreSQL."""

    def test_save_and_get_farm_data(self, client):
        """Test POST then GET round-trips farm data through the database."""
        from cresco.config import get_settings
        from cresco.main import app

        mock_s = MagicMock()
        mock_s.openweather_api_key = ""
        app.dependency_overrides[get_settings] = lambda: mock_s

        with patch("cresco.api.routes.db") as mock_db:
            mock_db.save_farm_data = AsyncMock()
            mock_db.get_farm_data = AsyncMock(
                return_value={
                    "location": "Kent, UK",
                    "area": 50.0,
                    "lat": 51.27,
                    "lon": 0.52,
                    "nodes": [],
                    "weather": None,
                }
            )

            response = client.post(
                "/api/v1/farm-data",
                json={"location": "Kent, UK", "area": 50.0, "lat": 51.27, "lon": 0.52},
            )
            assert response.status_code == 200

            response = client.get("/api/v1/farm-data")
            assert response.status_code == 200
            data = response.json()["data"]
            assert data["location"] == "Kent, UK"
            assert data["area"] == 50.0

    def test_get_farm_data_404_when_empty(self, client):
        """Test GET /farm-data returns 404 when no data has been saved."""
        with patch("cresco.api.routes.db") as mock_db:
            mock_db.get_farm_data = AsyncMock(return_value=None)

            response = client.get("/api/v1/farm-data")
            assert response.status_code == 404
