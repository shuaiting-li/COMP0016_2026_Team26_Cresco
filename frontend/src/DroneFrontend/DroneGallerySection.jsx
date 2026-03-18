import React from "react";
import { X } from "lucide-react";
import HistogramChart from "./HistogramChart";

const DroneGallerySection = ({
    isLoadingGallery,
    filteredSavedImages,
    savedImages,
    galleryFilter,
    setGalleryFilter,
    getImageIndexType,
    savedImageUrls,
    handleDeleteImage,
    hasHistogramData,
    toggleHistogramVisibility,
    collapsedHistograms,
    timestampEdits,
    toDatetimeLocal,
    handleTimestampChange,
    handleTimestampSave,
}) => (
    <section style={{ marginTop: 8 }}>
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
                {filteredSavedImages.map((image) => {
                    const isHistogramCollapsed = collapsedHistograms[image.filename] ?? true;
                    return (
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
                            {hasHistogramData(image) && (
                                <div style={{ marginTop: "10px" }}>
                                    <button
                                        type="button"
                                        onClick={() => toggleHistogramVisibility(image.filename)}
                                        aria-expanded={!isHistogramCollapsed}
                                        className="histogram-toggle-button"
                                    >
                                        {isHistogramCollapsed ? "Show Histogram" : "Hide Histogram"}
                                    </button>
                                    {!isHistogramCollapsed && (
                                        <div style={{ marginTop: "8px" }}>
                                            <HistogramChart
                                                histogram={image.histogram}
                                                title={`${getImageIndexType(image)} Histogram`}
                                            />
                                        </div>
                                    )}
                                </div>
                            )}
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
                    );
                })}
            </div>
        ) : (
            <div style={{ color: "white" }}>
                {savedImages.length === 0
                    ? "No saved images yet. Upload some images to get started!"
                    : `No ${galleryFilter} images found in your gallery.`}
            </div>
        )}
    </section>
);

export default DroneGallerySection;
