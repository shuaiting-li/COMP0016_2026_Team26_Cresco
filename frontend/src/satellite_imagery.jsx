
import React, { useState } from "react";
import "./drone_imagery.css"; // Reuse styling for now

const SatelliteImagery = () => {
    const [rgbFile, setRgbFile] = useState(null);
    const [nirFile, setNirFile] = useState(null);
    const [rgbPreview, setRgbPreview] = useState(null);
    const [nirPreview, setNirPreview] = useState(null);
    const [uploadStatus, setUploadStatus] = useState("");
    const [resultImageUrl, setResultImageUrl] = useState(null);

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
            const response = await fetch("http://127.0.0.1:8000/api/v1/satelliteimage", {
                method: "POST",
                body: formData,
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                setResultImageUrl(url);
                setUploadStatus("Upload successful!");
            } else {
                setUploadStatus("Upload failed.");
            }
        } catch (err) {
            setUploadStatus("Error uploading files.");
        }
    };

    return (
        <div className="drone-imagery-container scrollable">
            <h2 className="drone-imagery-title">Upload Satellite Images</h2>
            <div className="drone-imagery-form">
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
                    <h3 style={{ color: "white" }}>NDVI Result Image:</h3>
                    <img src={resultImageUrl} alt="Result" style={{ maxWidth: 400 }} />
                </div>
            )}
        </div>
    );
};

export default SatelliteImagery;