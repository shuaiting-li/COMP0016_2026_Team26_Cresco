""" Deletes:
- AccountInfo
- FarmData
- NDVI Images
- Uploaded Documents
"""

import json
import shutil
from pathlib import Path

from cresco.config import get_settings


def delete_account_info(user_id: str, username: str | None = None):
    from cresco.db import get_connection

    settings = get_settings()
    conn = get_connection(settings.database_path)
    try:
        deleted = conn.execute("DELETE FROM users WHERE id = ?", (user_id,)).rowcount

        if deleted == 0:
            fallback_username = username or user_id
            deleted = conn.execute(
                "DELETE FROM users WHERE username = ?", (fallback_username,)
            ).rowcount

        conn.commit()
        if deleted == 0:
            raise ValueError("User account not found; credentials were not deleted")
    finally:
        conn.close()

def delete_farm_data(user_id: str):
    from cresco.db import get_connection

    settings = get_settings()
    conn = get_connection(settings.database_path)
    try:
        conn.execute("DELETE FROM farm_data WHERE user_id = ?", (user_id,))
        conn.commit()
    finally:
        conn.close()

def delete_images(user_id: str):
    data_dir = Path(__file__).resolve().parent.parent / "data"
    metadata_file = data_dir / "images_metadata.json"
    images_dir = data_dir / "ndvi_images"

    if not metadata_file.exists():
        return

    with open(metadata_file, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    images = metadata.get("images", [])
    user_images = [image for image in images if image.get("user_id") == user_id]
    if not user_images:
        return

    for image in user_images:
        filename = image.get("filename")
        if not filename:
            continue
        image_path = images_dir / filename
        if image_path.exists() and image_path.is_file():
            image_path.unlink()

    metadata["images"] = [image for image in images if image.get("user_id") != user_id]
    with open(metadata_file, "w", encoding="utf-8") as f:
        json.dump(metadata, f, indent=2)

def delete_uploaded_documents(user_id: str):
    from cresco.db import get_connection

    settings = get_settings()

    # Remove user-uploaded files from disk
    user_upload_dir = settings.uploads_dir / user_id
    if user_upload_dir.exists() and user_upload_dir.is_dir():
        shutil.rmtree(user_upload_dir)

    conn = get_connection(settings.database_path)
    try:
        table = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='uploaded_documents'"
        ).fetchone()
        if table is not None:
            conn.execute("DELETE FROM uploaded_documents WHERE user_id = ?", (user_id,))
            conn.commit()
    finally:
        conn.close()

def delete_user_account(user_id: str, username: str | None = None):
    """Delete all user-related data for a given user ID."""
    delete_farm_data(user_id)
    delete_images(user_id)
    delete_uploaded_documents(user_id)
    # once all related data is deleted, can delete the user account itself
    delete_account_info(user_id, username=username)
