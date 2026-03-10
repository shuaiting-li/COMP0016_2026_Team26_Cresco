import { useState, useEffect } from 'react';
import Header from './layout/Header';
import SidebarLeft from './layout/SidebarLeft';
import SidebarRight from './layout/SidebarRight';
import ChatArea from './layout/ChatArea';
import AuthPage from './layout/AuthPage';
import { sendMessage, uploadAndIndexFile, deleteUploadedFile, fetchUploadedFiles, fetchFarmData, isLoggedIn, logout, getUsername, deleteLastExchange } from './services/api';
import SatelliteMap from './satellite';
import Weather from './weather';
import DroneImagery from './drone_imagery';
import SatelliteImagery from './satellite_imagery';


const layoutStyle = {
    display: 'flex',
    height: 'calc(100vh - 64px)',
    width: '100vw',
    overflow: 'hidden'
};

function App() {
    const [authenticated, setAuthenticated] = useState(isLoggedIn());
    const [files, setFiles] = useState([]);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);
    const [isSatelliteOpen, setIsSatelliteOpen] = useState(false);
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);
    const [isDroneImageryOpen, setIsDroneImageryOpen] = useState(false);
    const [isSatelliteImageryOpen, setIsSatelliteImageryOpen] = useState(false);
    const [farmLocation, setFarmLocation] = useState(null); // State to store farm location
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);

    useEffect(() => {
        if (authenticated) {
            fetchUploadedFiles()
                .then(serverFiles => setFiles(serverFiles))
                .catch(err => console.error('Failed to fetch uploaded files:', err));
            fetchFarmData()
                .then(data => {
                    if (data && data.lat != null && data.lon != null) {
                        setFarmLocation({
                            lat: data.lat,
                            lng: data.lon,
                            nodes: (data.nodes || []).map(n => ({ lat: n.lat, lng: n.lng || n.lon })),
                        });
                    }
                })
                .catch(err => console.error('Failed to fetch farm data:', err));
        }
    }, [authenticated]);

    const handleAuth = () => setAuthenticated(true);

    const handleLogout = () => {
        logout();
        setAuthenticated(false);
        setMessages([]);
        setConversationId(null);
        setFiles([]);
    };

    if (!authenticated) {
        return <AuthPage onAuth={handleAuth} />;
    }

    const handleFileUpload = async (filesToUpload) => {
        setIsLoading(true);
        // filesToUpload could be an event (from input change) or an array of files (from drop)
        const uploadedFiles = filesToUpload.target ? Array.from(filesToUpload.target.files) : filesToUpload;
        console.log("Uploading files:");
        for (const file of uploadedFiles) {
            try {
                await uploadAndIndexFile(file);
                setFiles(prev => [...prev, file]);
            } catch {
                console.error("Failed to upload and index:", file.name);
            }
        }
        setIsLoading(false);
    };

    const handleRemoveFile = async (index) => {
        const file = files[index];
        setFiles(prev => prev.filter((_, i) => i !== index));
        try {
            await deleteUploadedFile(file.name);
        } catch (error) {
            console.error('Failed to delete file from server:', error);
        }
    };

    const handleDeleteLastExchange = async () => {
        setMessages(prev => {
            if (prev.length < 2) return prev;
            const last = prev[prev.length - 1];
            const secondLast = prev[prev.length - 2];
            if (last.role === 'assistant' && secondLast.role === 'user') {
                return prev.slice(0, -2);
            }
            return prev;
        });

        try {
            await deleteLastExchange();
        } catch (error) {
            console.error('Failed to delete exchange from agent memory:', error);
        }
    };

    const handleSendMessage = async (text, enableInternetSearch = true) => {
        if (!text.trim()) return;

        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: text
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const response = await sendMessage(text, conversationId, files, enableInternetSearch);

            if (response.conversationId) {
                setConversationId(response.conversationId);
            }

            setMessages(prev => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: response.reply,
                    tasks: response.tasks,
                    charts: response.charts,
                    citations: response.citations
                }
            ]);

        } catch (error) {
            console.error('Chat error:', error);
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: "Sorry, I encountered an error communicating with the server."
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleOpenSatellite = () => {
        setIsSatelliteOpen(true);
    };

    const handleCloseSatellite = () => {
        setIsSatelliteOpen(false);
    };

    const handleOpenWeather = () => {
        setIsWeatherOpen(true);
    };

    const handleCloseWeather = () => {
        setIsWeatherOpen(false);
    };

    const handleOpenDroneImagery = () => {
        setIsDroneImageryOpen(true);
    };

    const handleCloseDroneImagery = () => {
        setIsDroneImageryOpen(false);
    };

    const handleOpenSatelliteImagery = () => {
        setIsSatelliteImageryOpen(true);
    };

    const handleCloseSatelliteImagery = () => {
        setIsSatelliteImageryOpen(false);
    };

    return (
        <div className="app-container">
            <Header
                onLogout={handleLogout}
                username={getUsername()}
                leftCollapsed={leftCollapsed}
                rightCollapsed={rightCollapsed}
            />
            <div style={layoutStyle}>
                {!leftCollapsed && (
                    <SidebarLeft
                        files={files}
                        onUpload={handleFileUpload}
                        onRemove={handleRemoveFile}
                        collapsed={leftCollapsed}
                        onCollapse={() => setLeftCollapsed(true)}
                    />
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <ChatArea
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        onDeleteLastExchange={handleDeleteLastExchange}
                        isLoading={isLoading}
                        farmLocation={farmLocation}
                    />
                    {leftCollapsed && (
                        <button
                            style={{
                                position: 'absolute',
                                top: '10%',
                                left: 0,
                                zIndex: 100,
                                background: 'var(--bg-app)',
                                border: '1px solid var(--border)',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--accent)'
                            }}
                            onClick={() => setLeftCollapsed(false)}
                            aria-label="Show left sidebar"
                        >
                            <span style={{ fontSize: 18 }}>&#x25B6;</span>
                        </button>
                    )}
                    {rightCollapsed && (
                        <button
                            style={{
                                position: 'absolute',
                                top: '10%',
                                right: 0,
                                zIndex: 100,
                                background: 'var(--bg-app)',
                                border: '1px solid var(--border)',
                                borderRadius: '50%',
                                width: 32,
                                height: 32,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--accent)'
                            }}
                            onClick={() => setRightCollapsed(false)}
                            aria-label="Show right sidebar"
                        >
                            <span style={{ fontSize: 18 }}>&#x25C0;</span>
                        </button>
                    )}
                </div>
                {!rightCollapsed && (
                    <SidebarRight
                        handleOpenSatellite={handleOpenSatellite}
                        handleOpenWeather={handleOpenWeather}
                        handleOpenDroneImagery={handleOpenDroneImagery}
                        handleOpenSatelliteImagery={handleOpenSatelliteImagery}
                        collapsed={rightCollapsed}
                        onCollapse={() => setRightCollapsed(true)}
                    />
                )}
            </div>

            {isSatelliteOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        position: 'relative',
                        width: '80%',
                        height: '80%',
                        backgroundColor: '#0f1110',
                        borderRadius: '8px',
                        overflow: 'auto'
                    }}>
                        <button
                            onClick={handleCloseSatellite}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                backgroundColor: 'red',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer'
                            }}
                        >
                            X
                        </button>
                        <SatelliteMap
                            farmLocation={farmLocation}
                            setFarmLocation={setFarmLocation}
                        />
                    </div>
                </div>
            )}


            {isDroneImageryOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        position: 'relative',
                        width: '80%',
                        height: '80%',
                        backgroundColor: '#0f1110',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={handleCloseDroneImagery}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                backgroundColor: 'red',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer'
                            }}
                        >
                            X
                        </button>
                        <DroneImagery />
                    </div>
                </div>
            )}


            {isSatelliteImageryOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        position: 'relative',
                        width: '80%',
                        height: '80%',
                        backgroundColor: '#0f1110',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={handleCloseSatelliteImagery}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                backgroundColor: 'red',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer'
                            }}
                        >
                            X
                        </button>
                        {farmLocation ? (
                            <SatelliteImagery />
                        ) : (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '100%',
                                fontSize: '18px',
                                color: 'white'
                            }}>
                                Please select a farm location first.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isWeatherOpen && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    width: '100vw',
                    height: '100vh',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        position: 'relative',
                        width: '80%',
                        height: '80%',
                        backgroundColor: '#0f1110',
                        borderRadius: '8px',
                        overflow: 'hidden'
                    }}>
                        <button
                            onClick={handleCloseWeather}
                            style={{
                                position: 'absolute',
                                top: '10px',
                                right: '10px',
                                backgroundColor: 'red',
                                color: 'white',
                                border: 'none',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer'
                            }}
                        >
                            X
                        </button>
                        {farmLocation ? (
                            <Weather lat={farmLocation.lat} lon={farmLocation.lng} />
                        ) : (
                            <div style={{
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: '100%',
                                fontSize: '18px',
                                color: 'white'
                            }}>
                                Please select a farm location first.
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;