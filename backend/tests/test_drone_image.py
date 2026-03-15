"""Tests for drone image processing metadata persistence."""

import json
from pathlib import Path
from unittest.mock import patch

import numpy as np

from scripts import drone_image


class TestDroneImageMetadata:
    """Tests for metadata generated during index image save operations."""

    def test_calculate_and_save_index_persists_user_id(self, tmp_path):
        """Test user_id is stored in NDVI metadata entries when saving images."""
        images_dir = tmp_path / "ndvi_images"
        images_dir.mkdir(parents=True, exist_ok=True)
        metadata_file = tmp_path / "ndvi_metadata.json"

        index_array = np.zeros((2, 2), dtype=np.float32)

        with patch.object(drone_image, "NDVI_IMAGES_DIR", images_dir), patch.object(
            drone_image, "NDVI_METADATA_FILE", metadata_file
        ):
            result = drone_image._calculate_and_save_index(
                index_array=index_array,
                filename_prefix="ndvi",
                rgb_filename="rgb.png",
                nir_filename="nir.png",
                save_to_disk=True,
                user_id="test-user-id",
            )

        assert result["id"] is not None
        assert result["filename"] is not None

        metadata = json.loads(Path(metadata_file).read_text())
        assert "images" in metadata
        assert len(metadata["images"]) == 1
        assert metadata["images"][0]["user_id"] == "test-user-id"
