import React, { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { deleteDroneImage, updateDroneImageTimestamp } from "./services/api";
import "./drone_imagery.css"; // Importing drone_imagery.css for styling

const DroneImagery = () => {
    const [rgbFile, setRgbFile] = useState(null);
    const [nirFile, setNirFile] = useState(null);
    const [selectedIndexType, setSelectedIndexType] = useState("NDVI");
    const [rgbPreview, setRgbPreview] = useState(null);
    const [nirPreview, setNirPreview] = useState(null);
    const [uploadStatus, setUploadStatus] = useState("");
    const [resultImageUrl, setResultImageUrl] = useState(null);
    const [savedImages, setSavedImages] = useState([]);
    const [savedImageUrls, setSavedImageUrls] = useState({});
    const [isLoadingGallery, setIsLoadingGallery] = useState(false);
    const [galleryFilter, setGalleryFilter] = useState("ALL");
    const [timestampEdits, setTimestampEdits] = useState({});

    const getImageIndexType = (image) => (
        image.index_type || image.filename?.split("_")[0]?.toUpperCase() || "NDVI"
    );

    const filteredSavedImages = savedImages.filter((image) => (
        galleryFilter === "ALL" || getImageIndexType(image) === galleryFilter
    ));

    const toDatetimeLocal = (isoTimestamp) => {
        if (!isoTimestamp) {
            return "";
        }
        const date = new Date(isoTimestamp);
        if (Number.isNaN(date.getTime())) {
            return "";
        }
        const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
        return localDate.toISOString().slice(0, 16);
    };

    const authHeaders = () => {
        const token = localStorage.getItem("cresco_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchSavedImages = useCallback(async () => {
        setIsLoadingGallery(true);
        try {
            const response = await fetch("http://127.0.0.1:8000/api/v1/images", {
                headers: authHeaders(),
            });
            if (response.ok) {
                const data = await response.json();
                const images = data.images || [];
                setSavedImages(images);

                const urls = {};
                await Promise.all(
                    images.map(async (image) => {
                        const imageResponse = await fetch(
                            `http://127.0.0.1:8000/api/v1/images/${image.filename}`,
                            {
                                headers: authHeaders(),
                            }
                        );
                        if (imageResponse.ok) {
                            const blob = await imageResponse.blob();
                            urls[image.filename] = URL.createObjectURL(blob);
                        }
                    })
                );
                setSavedImageUrls(urls);
            }
        } catch {
            console.error("Error fetching saved images");
        } finally {
            setIsLoadingGallery(false);
        }
    }, []);

    // Fetch saved NDVI images
    useEffect(() => {
        fetchSavedImages();
    }, [fetchSavedImages]);


    const handleRgbChange = (e) => {
        const file = e.target.files[0];
        setRgbFile(file);
        setRgbPreview(file ? URL.createObjectURL(file) : null);
    };

    const handleNirChange = (e) => {
        const file = e.target.files[0];
        setNirFile(file);
        setNirPreview(file ? URL.createObjectURL(file) : null);
    };


    const handleUpload = async () => {
        if (!rgbFile || !nirFile) {
            setUploadStatus("Please select both images.");
            return;
        }
        const formData = new FormData();
        formData.append("files", rgbFile);
        formData.append("files", nirFile);

        setUploadStatus("Uploading...");
        try {
            const response = await fetch(
                `http://127.0.0.1:8000/api/v1/droneimage?index_type=${selectedIndexType.toLowerCase()}`,
                {
                method: "POST",
                body: formData,
                headers: authHeaders(),
                }
            );
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);  //bc its sending back a whole file, not just a url
                setResultImageUrl(url);
                setUploadStatus(`${selectedIndexType} upload successful!`);
                // Refresh the gallery after successful upload
                fetchSavedImages();
            } else {
                setUploadStatus("Upload failed.");
            }
        } catch (err) {
            setUploadStatus("Error uploading files.");
            console.error("Error uploading files:", err);
        }
    };

    const handleDeleteImage = async (filename) => {
        const confirmed = window.confirm("Delete this saved image?");
        if (!confirmed) {
            return;
        }

        try {
            await deleteDroneImage(filename);

            setSavedImages((prev) => prev.filter((image) => image.filename !== filename));
            setSavedImageUrls((prev) => {
                const next = { ...prev };
                if (next[filename]) {
                    URL.revokeObjectURL(next[filename]);
                    delete next[filename];
                }
                return next;
            });
        } catch (err) {
            console.error("Error deleting image:", err);
            setUploadStatus("Failed to delete image.");
        }
    };

    const handleTimestampChange = (filename, value) => {
        setTimestampEdits((prev) => ({
            ...prev,
            [filename]: value,
        }));
    };

    const handleTimestampSave = async (filename) => {
        const localValue = timestampEdits[filename];
        if (!localValue) {
            setUploadStatus("Please choose a valid date and time.");
            return;
        }

        const isoTimestamp = new Date(localValue).toISOString();
        if (!isoTimestamp || Number.isNaN(new Date(isoTimestamp).getTime())) {
            setUploadStatus("Please choose a valid date and time.");
            return;
        }

        try {
            const result = await updateDroneImageTimestamp(filename, isoTimestamp);
            setSavedImages((prev) => (
                prev.map((image) => (
                    image.filename === filename
                        ? { ...image, timestamp: result.timestamp || isoTimestamp }
                        : image
                ))
            ));
            setUploadStatus("Image date/time updated.");
        } catch (err) {
            console.error("Error updating image timestamp:", err);
            setUploadStatus("Failed to update image date/time.");
        }
    };

    return (
        <div className="drone-imagery-container scrollable">
            <h2 className="drone-imagery-title">Upload files</h2>
            <div style={{ marginBottom: 12 }}>
                <label className="text-label" htmlFor="index-type-select">
                    Vegetation Index:
                </label>
                <br />
                <select
                    id="index-type-select"
                    value={selectedIndexType}
                    onChange={(e) => setSelectedIndexType(e.target.value)}
                    style={{ marginTop: 6, padding: "6px 8px" }}
                >
                    <option value="NDVI">NDVI</option>
                    <option value="EVI">EVI</option>
                    <option value="SAVI">SAVI</option>
                </select>
            </div>
            <div className = "drone-imagery-form"> 
                <div>
                    <label className="text-label">
                        RGB Image: 
                        <br />
                        <input type="file" accept="image/*" onChange={handleRgbChange} />
                    </label>
                    {rgbPreview && <img src={rgbPreview} alt="RGB Preview" style={{ maxWidth: 200, margin: 8 }} />}
                </div>
                <div>
                    <label className="text-label">
                        NIR Image:
                        <br />
                        <input type="file" accept="image/*" onChange={handleNirChange} />
                    </label>
                    {nirPreview && <img src={nirPreview} alt="NIR Preview" style={{ maxWidth: 200, margin: 8 }} />}
                </div>
            </div>
            <button onClick={handleUpload} style={{ marginTop: 16 }}>Upload</button>
            {uploadStatus && <div style={{ marginTop: 8, color: "white" }}>{uploadStatus}</div>}
            <br />
            {resultImageUrl && (
                <div style={{ marginTop: 16 }}>
                    <h3 style={{color: "white" }} >{selectedIndexType} Result Image:</h3>
                    <img src={resultImageUrl} alt="Result" style={{ maxWidth: 400 }} />
                </div>
            )}

            {/* Saved Images Gallery */}
            <div style={{ marginTop: 32 }}>
                <h2 className="drone-imagery-title">Saved Vegetation Index Images</h2>
                <div style={{ marginBottom: 12 }}>
                    <label className="text-label" htmlFor="gallery-index-filter">
                        Filter gallery:
                    </label>
                    <br />
                    <select
                        id="gallery-index-filter"
                        value={galleryFilter}
                        onChange={(e) => setGalleryFilter(e.target.value)}
                        style={{ marginTop: 6, padding: "6px 8px" }}
                    >
                        <option value="ALL">All</option>
                        <option value="NDVI">NDVI</option>
                        <option value="EVI">EVI</option>
                        <option value="SAVI">SAVI</option>
                    </select>
                </div>
                {isLoadingGallery ? (
                    <div style={{ color: "white" }}>Loading saved images...</div>
                ) : filteredSavedImages.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px", marginTop: "16px" }}>
                        {filteredSavedImages.map((image) => (
                            <div key={image.id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "12px", backgroundColor: "rgba(255, 255, 255, 0.1)" }}>
                                <div style={{ position: "relative" }}>
                                    <img 
                                        src={savedImageUrls[image.filename]} 
                                        alt={`${image.index_type || "INDEX"} ${image.id}`} 
                                        style={{ width: "100%", borderRadius: "4px" }} 
                                    />
                                    <button
                                        type="button"
                                        aria-label="Delete image"
                                        onClick={() => handleDeleteImage(image.filename)}
                                        style={{
                                            position: "absolute",
                                            top: "8px",
                                            right: "8px",
                                            width: "28px",
                                            height: "28px",
                                            borderRadius: "50%",
                                            border: "1px solid rgba(239, 68, 68, 0.9)",
                                            backgroundColor: "rgba(185, 28, 28, 0.9)",
                                            color: "#fee2e2",
                                            fontSize: "16px",
                                            lineHeight: 1,
                                            fontWeight: 700,
                                            cursor: "pointer",
                                        }}
                                    >
                                        <X size={14} strokeWidth={2.5} />
                                    </button>
                                </div>
                                <div style={{ marginTop: "8px", color: "white", fontSize: "12px" }}>
                                    <div><strong>Index:</strong> {getImageIndexType(image)}</div>
                                    <div><strong>Created:</strong> {new Date(image.timestamp).toLocaleString()}</div>
                                    <div style={{ marginTop: "6px", display: "flex", gap: "6px", alignItems: "center" }}>
                                        <input
                                            type="datetime-local"
                                            value={timestampEdits[image.filename] ?? toDatetimeLocal(image.timestamp)}
                                            onChange={(e) => handleTimestampChange(image.filename, e.target.value)}
                                            style={{
                                                flex: 1,
                                                minWidth: 0,
                                                padding: "4px 6px",
                                                borderRadius: "6px",
                                                border: "1px solid rgba(255, 255, 255, 0.25)",
                                                backgroundColor: "rgba(15, 17, 16, 0.85)",
                                                color: "#ffffff",
                                            }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleTimestampSave(image.filename)}
                                            style={{
                                                padding: "5px 8px",
                                                borderRadius: "6px",
                                                border: "1px solid rgba(132, 204, 22, 0.6)",
                                                backgroundColor: "rgba(132, 204, 22, 0.2)",
                                                color: "#d9f99d",
                                                cursor: "pointer",
                                            }}
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: "white" }}>
                        {savedImages.length === 0
                            ? "No saved images yet. Upload some images to get started!"
                            : `No ${galleryFilter} images found in your gallery.`}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DroneImagery;