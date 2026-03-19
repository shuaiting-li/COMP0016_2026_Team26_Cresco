"""Tests for drone image processing metadata persistence."""

import json
from pathlib import Path
from unittest.mock import patch

import numpy as np

from scripts import drone_image


class TestDroneImageMetadata:
    """Tests for metadata generated during index image save operations."""

    def test_calculate_and_save_index_persists_user_id(self, tmp_path):
        """Test user_id and histogram are stored in NDVI metadata entries when saving images."""
        images_dir = tmp_path / "ndvi_images"
        images_dir.mkdir(parents=True, exist_ok=True)
        metadata_file = tmp_path / "images_metadata.json"

        index_array = np.zeros((2, 2), dtype=np.float32)
        histogram = drone_image.compute_histogram(index_array)

        with (
            patch.object(drone_image, "IMAGES_DIR", images_dir),
            patch.object(drone_image, "IMAGES_METADATA_FILE", metadata_file),
        ):
            result = drone_image._calculate_and_save_index(
                index_array=index_array,
                filename_prefix="ndvi",
                rgb_filename="rgb.png",
                nir_filename="nir.png",
                save_to_disk=True,
                histogram=histogram,
                user_id="test-user-id",
            )

        assert result["id"] is not None
        assert result["filename"] is not None

        metadata = json.loads(Path(metadata_file).read_text())
        assert "images" in metadata
        assert len(metadata["images"]) == 1
        assert metadata["images"][0]["user_id"] == "test-user-id"
        assert metadata["images"][0]["histogram"] == histogram


class TestDroneImageHistogram:
    """Tests for histogram generation from vegetation index arrays."""

    def test_compute_histogram_returns_counts_and_edges(self):
        """Test compute_histogram returns serializable bins and count arrays."""
        index_array = np.array([[-1.0, -0.5, 0.0, 0.5, 1.0]], dtype=np.float32)

        histogram = drone_image.compute_histogram(index_array, bins=4)

        assert "counts" in histogram
        assert "bin_edges" in histogram
        assert len(histogram["counts"]) == 4
        assert len(histogram["bin_edges"]) == 5
        assert sum(histogram["counts"]) == index_array.size
