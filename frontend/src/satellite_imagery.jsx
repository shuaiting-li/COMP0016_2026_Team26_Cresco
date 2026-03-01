
import { handleSatelliteImage } from './services/api';
import React, { useState, useEffect } from "react";
import "./drone_imagery.css"; // Reuse styling for now

const SatelliteImagery = () => {

    const [uploadStatus, setUploadStatus] = useState("");
    const [resultBlob, setResultBlob] = useState(null);
    const [resultImageUrl, setResultImageUrl] = useState(null);

    // Create and revoke the object URL whenever the blob changes.
    useEffect(() => {
        if (!resultBlob) {
            setResultImageUrl(null);
            return;
        }
        const url = URL.createObjectURL(resultBlob);
        setResultImageUrl(url);
        return () => URL.revokeObjectURL(url);
    }, [resultBlob]);

    const handleUpload = async () => {
        setUploadStatus("Uploading...");
        try {
            const blob = await handleSatelliteImage();
            if (blob) {
                setResultBlob(blob);
                setUploadStatus("Upload successful!");
            } else {
                setUploadStatus("Upload failed.");
            }
        } catch {
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