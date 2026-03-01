
import { handleSatelliteImage } from './services/api';
import React, { useState } from "react";
import "./drone_imagery.css"; // Reuse styling for now

const SatelliteImagery = () => {

    const [uploadStatus, setUploadStatus] = useState("");
    const [resultImageUrl, setResultImageUrl] = useState(null);

    const handleUpload = async () => {


        setUploadStatus("Uploading...");
        try {
            const url = await handleSatelliteImage();
            if (url) {
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

            <button onClick={handleUpload} style={{ marginTop: 16 }}>Fetch Satellite Analysis</button>
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