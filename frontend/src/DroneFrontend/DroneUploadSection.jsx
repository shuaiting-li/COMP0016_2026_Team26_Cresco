import React from "react";

const DroneUploadSection = ({
    selectedIndexType,
    setSelectedIndexType,
    handleRgbChange,
    handleNirChange,
    rgbPreview,
    nirPreview,
    handleUpload,
    uploadStatus,
    resultImageUrl,
}) => (
    <section style={{ marginTop: 8 }}>
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
                <h3 style={{ color: "white" }}>{selectedIndexType} Result Image:</h3>
                <img src={resultImageUrl} alt="Result" style={{ maxWidth: 400 }} />
            </div>
        )}
    </section>
);

export default DroneUploadSection;
