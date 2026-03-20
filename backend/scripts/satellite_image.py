import asyncio
import logging
from datetime import datetime, timedelta
from io import BytesIO

import requests
from PIL import Image
from requests_toolbelt.multipart.decoder import MultipartDecoder

from cresco.config import get_settings
from scripts.drone_image import compute_ndvi_from_satellite

logger = logging.getLogger(__name__)


async def process_satellite_images(nir_bytes: bytes, rgb_bytes: bytes):
    result_bytes = compute_ndvi_from_satellite(rgb_bytes, nir_bytes, save_to_disk=False)[
        "image_bytes"
    ]
    return result_bytes


def convert_tiff_to_png(tiff_bytes):
    """Convert GeoTIFF bytes to PNG bytes."""
    try:
        with BytesIO(tiff_bytes) as tiff_io:
            img = Image.open(tiff_io)
            with BytesIO() as png_io:
                img.convert("RGB").save(png_io, format="PNG")
                return png_io.getvalue()
    except Exception as e:
        logger.exception("Error converting TIFF to PNG: %s", e)
        return None


async def satellite_images_main(lat, lon):
    """
    Main function: receives lat/lon, gets satellite images,
    computes NDVI and returns result bytes.
    """
    try:
        red_tiff, nir_tiff = await get_satellite_images(lat, lon)
        if not red_tiff or not nir_tiff:
            logger.warning("Failed to fetch satellite images.")
            return None

        result = await process_satellite_images(nir_tiff, red_tiff)
        logger.info("Processing complete. Result bytes length: %d", len(result) if result else 0)
        return result
    except Exception as e:
        logger.exception("Error in satellite_images_main: %s", e)
        return None


def get_access_token(client_id, client_secret):
    token_url = (
        "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
    )
    payload = {
        "grant_type": "client_credentials",
        "client_id": client_id,
        "client_secret": client_secret,
    }
    try:
        response = requests.post(token_url, data=payload)
        response.raise_for_status()
        return response.json()["access_token"]
    except requests.exceptions.RequestException as e:
        logger.exception("Error fetching token: %s", e)
        return None


def get_farm_bbox(lat, lon, margin=0.01):
    """
    Returns bounding box [minLon, minLat, maxLon, maxLat] for user's farm, with a margin (degrees).
    """
    return [lon - margin, lat - margin, lon + margin, lat + margin]


def _get_satellite_images_sync(lat, lon):
    """
    Synchronous helper that downloads Red (B04) and NIR (B08) bands as GeoTIFFs
    from Copernicus Sentinel Hub.
    Returns: (red_bytes, nir_bytes) tuple, or (None, None) on failure.
    """
    settings = get_settings()
    client_id = settings.COPERNICUS_CLIENT_ID
    client_secret = settings.COPERNICUS_CLIENT_SECRET
    access_token = get_access_token(client_id, client_secret)
    if not access_token:
        logger.error("Failed to retrieve token. Exiting.")
        return None, None

    bbox = get_farm_bbox(lat, lon)

    # Use current date, fallback to last 100 days
    today = datetime.utcnow()
    from_date = today - timedelta(days=100)
    from_str = from_date.strftime("%Y-%m-%dT00:00:00Z")
    to_str = today.strftime("%Y-%m-%dT23:59:59Z")

    process_api_url = "https://sh.dataspace.copernicus.eu/api/v1/process"
    evalscript_two_bands = """
    //VERSION=3
    function setup() {
        return {
            input: [{
                bands: ["B04", "B08"],
                units: "DN"
            }],
            output: [
                { id: "red", bands: 1, sampleType: "UINT16" },
                { id: "nir", bands: 1, sampleType: "UINT16" }
            ]
        };
    }

    function evaluatePixel(samples) {
        return {
            red: [samples.B04],
            nir: [samples.B08]
        };
    }
    """

    payload = {
        "input": {
            "bounds": {"bbox": bbox},
            "data": [
                {
                    "type": "sentinel-2-l2a",
                    "dataFilter": {
                        "timeRange": {
                            "from": from_str,
                            "to": to_str,
                        },
                        "maxCloudCoverage": 10,
                        "mosaickingOrder": "leastCC",
                    },
                }
            ],
        },
        "output": {
            "width": 1024,
            "height": 1024,
            "responses": [
                {"identifier": "red", "format": {"type": "image/tiff"}},
                {"identifier": "nir", "format": {"type": "image/tiff"}},
            ],
        },
        "evalscript": evalscript_two_bands,
    }

    headers = {
        "Content-Type": "application/json",
        "Accept": "multipart/mixed",
        "Authorization": f"Bearer {access_token}",
    }

    try:
        logger.info("Sending Process API request to retrieve separate Red and NIR images...")
        response = requests.post(process_api_url, headers=headers, json=payload)
        response.raise_for_status()

        content_type = response.headers.get("Content-Type")
        if not content_type or "multipart/mixed" not in content_type:
            raise ValueError("Response is not a multipart/mixed message.")

        decoder = MultipartDecoder.from_response(response)
        red_bytes = None
        nir_bytes = None
        for part in decoder.parts:
            content_disp = part.headers.get(b"Content-Disposition", b"").decode(errors="replace")
            if 'name="red"' in content_disp:
                red_bytes = part.content
            elif 'name="nir"' in content_disp:
                nir_bytes = part.content
            else:
                # Returned files do not have file names, only order
                if red_bytes is None:
                    red_bytes = part.content
                else:
                    nir_bytes = part.content
        if red_bytes and nir_bytes:
            logger.info("Successfully downloaded Red and NIR bands.")
            return red_bytes, nir_bytes
        else:
            logger.warning("Bands not found in response.")
            return None, None
    except requests.exceptions.HTTPError as errh:
        logger.error("Http Error: %s", errh)
        try:
            logger.error("Response content: %s", response.json())
        except Exception:
            logger.error("Response content: %s", response.text)
        return None, None
    except requests.exceptions.RequestException as err:
        logger.error("Request error: %s", err)
        return None, None
    except ValueError as errv:
        logger.error("Data Processing Error: %s", errv)
        return None, None


async def get_satellite_images(lat, lon):
    """
    Downloads Red (B04) and NIR (B08) bands as GeoTIFFs from Copernicus Sentinel Hub.
    Runs sync HTTP calls in a thread to avoid blocking the event loop.
    Returns: (red_bytes, nir_bytes) tuple, or (None, None) on failure.
    """
    return await asyncio.to_thread(_get_satellite_images_sync, lat, lon)
