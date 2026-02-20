import asyncio
import sys
from pathlib import Path

async def process_drone_images(nir_bytes: bytes, rgb_bytes: bytes):
    # nir_bytes: the NIR image file content (JPEG)
    # rgb_bytes: the RGB image file content (JPEG)
    # 
    #ndvi here pls ! (or just reuse this somewhere else idm)
    result_bytes = rgb_bytes  # Replace with actual image processing result

    return result_bytes

    