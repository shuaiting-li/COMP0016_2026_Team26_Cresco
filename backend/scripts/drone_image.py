import rasterio
import numpy as np
import matplotlib.pyplot as plt
from fastapi import APIRouter
from PIL import Image
import io
import tempfile
import os
import json
import uuid
from datetime import datetime
from pathlib import Path

router = APIRouter()

# Define paths for storing NDVI images and metadata
NDVI_IMAGES_DIR = Path(__file__).parent.parent / "data" / "ndvi_images"
NDVI_METADATA_FILE = Path(__file__).parent.parent / "data" / "ndvi_metadata.json"

# Ensure directory exists
NDVI_IMAGES_DIR.mkdir(parents=True, exist_ok=True)

# loading metdata from json file 
def load_metadata():
    """Load NDVI metadata from JSON file."""
    if NDVI_METADATA_FILE.exists():
        with open(NDVI_METADATA_FILE, "r") as f:
            return json.load(f)
    return {"images": []}


def save_metadata(metadata):
    """Save NDVI metadata to JSON file."""
    with open(NDVI_METADATA_FILE, "w") as f:
        json.dump(metadata, f, indent=2)


def compute_ndvi_image(rgb_file: bytes, nir_file: bytes, rgb_filename: str = "rgb.png", nir_filename: str = "nir.png", save_to_disk: bool = True) -> dict:
    """
    Compute NDVI from RGB and NIR images and return as PNG bytes.
    Uses rasterio for proper image reading (your working script logic).
    
    Returns:
        dict with keys:
        - 'image_bytes': PNG image as bytes
        - 'filename': saved filename (if save_to_disk=True)
        - 'id': unique ID for the image
    """
    # Create temporary files to use with rasterio
    with tempfile.TemporaryDirectory() as tmpdir:
        rgb_path = os.path.join(tmpdir, "rgb.png")
        nir_path = os.path.join(tmpdir, "nir.png")
        
        # Write uploaded files to temporary location
        with open(rgb_path, "wb") as f:
            f.write(rgb_file)
        with open(nir_path, "wb") as f:
            f.write(nir_file)
        
        # Read RGB using rasterio
        with rasterio.open(rgb_path) as rgb_src:
            red = rgb_src.read(1).astype("float32")  # R channel
        
        # Read NIR using rasterio
        with rasterio.open(nir_path) as nir_src:
            nir = nir_src.read(1).astype("float32")
        
        # Check dimensions
        if red.shape != nir.shape:
            print("Warning: Images slightly misaligned. Cropping to match.")
            min_h = min(red.shape[0], nir.shape[0])
            min_w = min(red.shape[1], nir.shape[1])
            red = red[:min_h, :min_w]
            nir = nir[:min_h, :min_w]
        
        # Compute NDVI
        np.seterr(divide='ignore', invalid='ignore')
        ndvi = np.where(
            (nir + red) == 0.,
            0,
            (nir - red) / (nir + red)
        )
        
        # Normalize NDVI from [-1,1] to [0,1]
        ndvi_normalized = (ndvi + 1) / 2
        
        # Clip just in case of small floating errors
        ndvi_normalized = np.clip(ndvi_normalized, 0, 1)
        
        # Apply colormap
        cmap = plt.get_cmap("RdYlGn")  # Red → Yellow → Green
        ndvi_colored = cmap(ndvi_normalized)
        
        # cmap returns RGBA in range [0,1]
        # Convert to RGB 8-bit (PNG needs uint8)
        ndvi_rgb = (ndvi_colored[:, :, :3] * 255).astype(np.uint8)
        
        # Save as PNG to in-memory buffer
        buffer = io.BytesIO()
        ndvi_image = Image.fromarray(ndvi_rgb)
        ndvi_image.save(buffer, format="PNG")
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
            filename = f"ndvi_{image_id}.png"
            file_path = NDVI_IMAGES_DIR / filename
            
            # Save the image file
            with open(file_path, "wb") as f:
                f.write(image_bytes)
            
            # Update metadata
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
