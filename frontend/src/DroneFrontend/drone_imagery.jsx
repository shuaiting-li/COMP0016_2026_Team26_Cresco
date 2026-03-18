import React, { useCallback, useEffect, useState } from "react";
import { deleteDroneImage, updateDroneImageTimestamp } from "../services/api";
import DroneGallerySection from "./DroneGallerySection";
import DroneTimeSeriesSection from "./DroneTimeSeriesSection";
import DroneUploadSection from "./DroneUploadSection";
import "./drone_imagery.css"; // Importing drone_imagery.css for styling

const DroneImagery = () => {
    const [activeTab, setActiveTab] = useState("upload");
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
    const [collapsedHistograms, setCollapsedHistograms] = useState({});

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

    const toggleHistogramVisibility = (filename) => {
        setCollapsedHistograms((prev) => {
            const isCurrentlyCollapsed = prev[filename] ?? true;
            return {
                ...prev,
                [filename]: !isCurrentlyCollapsed,
            };
        });
    };

    const hasHistogramData = (image) => {
        const counts = image?.histogram?.counts;
        const binEdges = image?.histogram?.bin_edges;
        return Array.isArray(counts) && Array.isArray(binEdges) && binEdges.length === counts.length + 1;
    };

    const tabs = [
        { id: "upload", label: "Upload" },
        { id: "gallery", label: "Gallery" },
        { id: "time-series", label: "Time Series" },
    ];

    return (
        <div className="drone-imagery-container scrollable">
            <div className="drone-tabs" role="tablist" aria-label="Drone imagery sections">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={activeTab === tab.id}
                        aria-controls={`drone-tab-panel-${tab.id}`}
                        id={`drone-tab-${tab.id}`}
                        className={`drone-tab-button ${activeTab === tab.id ? "active" : ""}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div
                role="tabpanel"
                id={`drone-tab-panel-${activeTab}`}
                aria-labelledby={`drone-tab-${activeTab}`}
            >
                {activeTab === "upload" && (
                    <DroneUploadSection
                        selectedIndexType={selectedIndexType}
                        setSelectedIndexType={setSelectedIndexType}
                        handleRgbChange={handleRgbChange}
                        handleNirChange={handleNirChange}
                        rgbPreview={rgbPreview}
                        nirPreview={nirPreview}
                        handleUpload={handleUpload}
                        uploadStatus={uploadStatus}
                        resultImageUrl={resultImageUrl}
                    />
                )}
                {activeTab === "gallery" && (
                    <DroneGallerySection
                        isLoadingGallery={isLoadingGallery}
                        filteredSavedImages={filteredSavedImages}
                        savedImages={savedImages}
                        galleryFilter={galleryFilter}
                        setGalleryFilter={setGalleryFilter}
                        getImageIndexType={getImageIndexType}
                        savedImageUrls={savedImageUrls}
                        handleDeleteImage={handleDeleteImage}
                        hasHistogramData={hasHistogramData}
                        toggleHistogramVisibility={toggleHistogramVisibility}
                        collapsedHistograms={collapsedHistograms}
                        timestampEdits={timestampEdits}
                        toDatetimeLocal={toDatetimeLocal}
                        handleTimestampChange={handleTimestampChange}
                        handleTimestampSave={handleTimestampSave}
                    />
                )}
                {activeTab === "time-series" && <DroneTimeSeriesSection savedImages={savedImages} />}
            </div>
        </div>
    );
};

export default DroneImagery;