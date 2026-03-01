import io
import json
import os
import tempfile
import uuid
from datetime import datetime
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import rasterio
from fastapi import APIRouter
from PIL import Image

router = APIRouter()

# Define paths for storing NDVI images and metadata
NDVI_IMAGES_DIR = Path(__file__).parent.parent / "data" / "ndvi_images"
NDVI_METADATA_FILE = Path(__file__).parent.parent / "data" / "ndvi_metadata.json"

# Ensure directory exists
NDVI_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# loading metdata from json file
def load_metadata():
    if NDVI_METADATA_FILE.exists():
        with open(NDVI_METADATA_FILE, "r") as f:
            return json.load(f)
    return {"images": []}


# Saving metagata to json file
def save_metadata(metadata):
    with open(NDVI_METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)


def _read_and_normalize_bands(rgb_path, nir_path):
    """Read RGB and NIR channels and normalize to 0-1."""
    with rasterio.open(rgb_path) as rgb_src:
        red = rgb_src.read(1).astype("float32") / 255.0
        green = rgb_src.read(2).astype("float32") / 255.0
        blue = rgb_src.read(3).astype("float32") / 255.0

    with rasterio.open(nir_path) as nir_src:
        nir = nir_src.read(1).astype("float32") / 255.0

    return red, green, blue, nir


def _ensure_dimension_match(red, green, blue, nir):
    """Ensure all bands have matching dimensions by cropping if necessary."""
    if red.shape != nir.shape:
        print("Warning!! Images slightly misaligned. Cropping to match.")
        min_h = min(red.shape[0], nir.shape[0])
        min_w = min(red.shape[1], nir.shape[1])
        red = red[:min_h, :min_w]
        green = green[:min_h, :min_w]
        blue = blue[:min_h, :min_w]
        nir = nir[:min_h, :min_w]

    return red, green, blue, nir


def _calculate_and_save_index(index_array, filename_prefix, rgb_filename, nir_filename, save_to_disk):
    """Normalize index array, apply colormap, and save as PNG."""
    # Normalize from [-1,1] to [0,1]
    index_normalized = (index_array + 1) / 2
    index_normalized = np.clip(index_normalized, 0, 1)

    # Apply colormap
    cmap = plt.get_cmap("RdYlGn")
    index_colored = cmap(index_normalized)
    index_rgb = (index_colored[:, :, :3] * 255).astype(np.uint8)

    # Save as PNG to in-memory buffer
    buffer = io.BytesIO()
    index_image = Image.fromarray(index_rgb)
    index_image.save(buffer, format="PNG")
    buffer.seek(0)
    image_bytes = buffer.getvalue()

    result = {
        "image_bytes": image_bytes,
        "id": None,
        "filename": None
    }

    # Save to disk if requested
    if save_to_disk:
        image_id = str(uuid.uuid4())
        filename = f"{filename_prefix}_{image_id}.png"
        file_path = NDVI_IMAGES_DIR / filename

        with open(file_path, "wb") as f:
            f.write(image_bytes)

        metadata = load_metadata()
        metadata["images"].append({
            "id": image_id,
            "filename": filename,
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "rgb_filename": rgb_filename,
            "nir_filename": nir_filename
        })
        save_metadata(metadata)

        result["id"] = image_id
        result["filename"] = filename

    return result



def sat_compute_ndvi_image(red_file: bytes, nir_file: bytes, rgb_filename: str = "rgb.png", nir_filename: str = "nir.png", save_to_disk: bool = False) -> dict:
    """
    Compute NDVI (Normalized Difference Vegetation Index) from RGB and NIR images.
    
    Returns:
        dict with keys:
        - 'image_bytes': PNG image as bytes
        - 'filename': saved filename (if save_to_disk=True)
        - 'id': unique ID for the image
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        red_path = os.path.join(tmpdir, "red.tif")
        nir_path = os.path.join(tmpdir, "nir.tif")

        with open(red_path, "wb") as f:
            f.write(red_file)
        with open(nir_path, "wb") as f:
            f.write(nir_file)

        with rasterio.open(nir_path) as nir_src:
            nir = nir_src.read(1).astype("float32")
        with rasterio.open(red_path) as red_src:
            red = red_src.read(1).astype("float32")

        # Normalize if needed (optional, depending on TIFF bit depth)
        if nir.max() > 255 or red.max() > 255:
            # Assume 16-bit data, scale to 0-1
            nir = nir / 65535.0
            red = red / 65535.0
        else:
            # Assume 8-bit data, scale to 0-1
            nir = nir / 255.0
            red = red / 255.0

        # Compute NDVI
        np.seterr(divide='ignore', invalid='ignore')
        ndvi = np.where(
            (nir + red) == 0.,
            0,
            (nir - red) / (nir + red)
        )

        return _calculate_and_save_index(ndvi, "ndvi", "red.tif", nir_filename, save_to_disk)



def compute_ndvi_image(rgb_file: bytes, nir_file: bytes, rgb_filename: str = "rgb.png", nir_filename: str = "nir.png", save_to_disk: bool = True) -> dict:
    """
    Compute NDVI (Normalized Difference Vegetation Index) from RGB and NIR images.
    
    Returns:
        dict with keys:
        - 'image_bytes': PNG image as bytes
        - 'filename': saved filename (if save_to_disk=True)
        - 'id': unique ID for the image
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        rgb_path = os.path.join(tmpdir, "rgb.png")
        nir_path = os.path.join(tmpdir, "nir.png")

        with open(rgb_path, "wb") as f:
            f.write(rgb_file)
        with open(nir_path, "wb") as f:
            f.write(nir_file)

        red, green, blue, nir = _read_and_normalize_bands(rgb_path, nir_path)
        red, green, blue, nir = _ensure_dimension_match(red, green, blue, nir)

        # Compute NDVI
        np.seterr(divide='ignore', invalid='ignore')
        ndvi = np.where(
            (nir + red) == 0.,
            0,
            (nir - red) / (nir + red)
        )

        return _calculate_and_save_index(ndvi, "ndvi", rgb_filename, nir_filename, save_to_disk)


def compute_evi_image(rgb_file: bytes, nir_file: bytes, rgb_filename: str = "rgb.png", nir_filename: str = "nir.png", save_to_disk: bool = True) -> dict:
    """
    Compute EVI (Enhanced Vegetation Index) from RGB and NIR images.
    
    Returns:
        dict with keys:
        - 'image_bytes': PNG image as bytes
        - 'filename': saved filename (if save_to_disk=True)
        - 'id': unique ID for the image
    """
    with tempfile.TemporaryDirectory() as tmpdir:
        rgb_path = os.path.join(tmpdir, "rgb.png")
        nir_path = os.path.join(tmpdir, "nir.png")

        with open(rgb_path, "wb") as f:
            f.write(rgb_file)
        with open(nir_path, "wb") as f:
            f.write(nir_file)

        red, green, blue, nir = _read_and_normalize_bands(rgb_path, nir_path)
        red, green, blue, nir = _ensure_dimension_match(red, green, blue, nir)

        # Compute EVI
        G = 2.5
        C1 = 6.0
        C2 = 7.5
        L = 1.0

        np.seterr(divide='ignore', invalid='ignore')
        evi = np.where(
            (nir + C1 * red - C2 * blue + L) == 0.,
            0,
            G * (nir - red) / (nir + C1 * red - C2 * blue + L)
        )

        return _calculate_and_save_index(evi, "evi", rgb_filename, nir_filename, save_to_disk)
