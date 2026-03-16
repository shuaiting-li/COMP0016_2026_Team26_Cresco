import React, { useCallback, useEffect, useState } from "react";
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

    const authHeaders = () => {
        const token = localStorage.getItem("cresco_token");
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const fetchSavedImages = useCallback(async () => {
        setIsLoadingGallery(true);
        try {
            const response = await fetch("http://127.0.0.1:8000/api/v1/ndvi-images", {
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
                            `http://127.0.0.1:8000/api/v1/ndvi-images/${image.filename}`,
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
                {isLoadingGallery ? (
                    <div style={{ color: "white" }}>Loading saved images...</div>
                ) : savedImages.length > 0 ? (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: "16px", marginTop: "16px" }}>
                        {savedImages.map((image) => (
                            <div key={image.id} style={{ border: "1px solid #ddd", borderRadius: "8px", padding: "12px", backgroundColor: "rgba(255, 255, 255, 0.1)" }}>
                                <img 
                                    src={savedImageUrls[image.filename]} 
                                    alt={`${image.index_type || "INDEX"} ${image.id}`} 
                                    style={{ width: "100%", borderRadius: "4px" }} 
                                />
                                <div style={{ marginTop: "8px", color: "white", fontSize: "12px" }}>
                                    <div><strong>Index:</strong> {image.index_type || image.filename?.split("_")[0]?.toUpperCase() || "NDVI"}</div>
                                    <div><strong>Created:</strong> {new Date(image.timestamp).toLocaleString()}</div>
                                    <div><strong>RGB:</strong> {image.rgb_filename}</div>
                                    <div><strong>NIR:</strong> {image.nir_filename}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ color: "white" }}>No saved images yet. Upload some images to get started!</div>
                )}
            </div>
        </div>
    );
};

export default DroneImagery;