import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { PanelLeftOpen, PanelRightOpen } from 'lucide-react';
import Header from './layout/Header';
import SidebarLeft from './layout/SidebarLeft';
import SidebarRight from './layout/SidebarRight';
import ChatArea from './layout/ChatArea';
import AuthPage from './layout/AuthPage';
import {
    sendMessage,
    uploadAndIndexFile,
    deleteUploadedFile,
    fetchUploadedFiles,
    fetchFarmData, fetchChatHistory, clearChatHistory,
    isLoggedIn,
    logout,
    getUsername,
    deleteLastExchange,
    deleteAccount,
} from './services/api';
import SatelliteMap from './satellite';
import Weather from './weather';
import DroneImagery from './DroneFrontend/drone_imagery';
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
    const [internetSearchEnabled, setInternetSearchEnabled] = useState(false);
    const [leftCollapsed, setLeftCollapsed] = useState(false);
    const [rightCollapsed, setRightCollapsed] = useState(false);

    const [deletePrompt, setDeletePrompt] = useState(false);  // State to confirm account deletion



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
                    } else {
                        setFarmLocation(null);
                    }
                })
                .catch(err => {
                    console.error('Failed to fetch farm data:', err);
                    setFarmLocation(null);
                });
            fetchChatHistory()
                .then(history => {
                    if (history.length > 0) {
                        setMessages(history);
                    }
                })
                .catch(err => console.error('Failed to fetch chat history:', err));
        } else {
            setFarmLocation(null);
        }
    }, [authenticated]);

    useEffect(() => {
        if (!authenticated) return;

        const onKeyDown = (event) => {
            if (event.ctrlKey && event.shiftKey && event.key === 'Backspace') {
                event.preventDefault();
                event.stopPropagation();
                setMessages([]);
                clearChatHistory().catch((error) => {
                    console.error('Failed to clear chat history:', error);
                });
            }
        };

        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [authenticated]);

    const handleAuth = () => setAuthenticated(true);

    const handleLogout = () => {
        logout();
        setAuthenticated(false);
        setMessages([]);
        setConversationId(null);
        setFiles([]);
        setFarmLocation(null);
    };

    const handleDeleteAccount = async () => {
        setDeletePrompt(true);
    };

    const handleCancelAction = () => {
        setDeletePrompt(false);
    };

    const handleConfirmDeleteAccount = async () => {
        try {
            await deleteAccount();
            setAuthenticated(false);
            setMessages([]);
            setConversationId(null);
            setFiles([]);
            setFarmLocation(null);
        } catch (error) {
            console.error('Delete account error:', error);
        } finally {
            setDeletePrompt(false);
        }
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

    const handleClearHistory = async () => {
        setMessages([]);
        try {
            await clearChatHistory();
        } catch (error) {
            console.error('Failed to clear chat history:', error);
        }
    };

    const handleDeleteTaskFromMessages = (messageKey, taskIndex) => {
        setMessages((prev) => prev.map((message, index) => {
            const currentMessageKey = message.id ?? index;
            if (currentMessageKey !== messageKey || !Array.isArray(message.tasks)) {
                return message;
            }

            return {
                ...message,
                tasks: message.tasks.filter((_, idx) => idx !== taskIndex),
            };
        }));
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
                onDeleteAccount={handleDeleteAccount}
                username={getUsername()}
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
                        onClearHistory={handleClearHistory}
                        onDeleteTask={handleDeleteTaskFromMessages}
                        isLoading={isLoading}
                        farmLocation={farmLocation}
                        internetSearchEnabled={internetSearchEnabled}
                        setInternetSearchEnabled={setInternetSearchEnabled}
                    />
                    {leftCollapsed && (
                        <button
                            style={{
                                position: 'absolute',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                left: 0,
                                zIndex: 100,
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border)',
                                borderLeft: 'none',
                                borderRadius: '0 8px 8px 0',
                                width: 32,
                                height: 48,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--accent)',
                                boxShadow: '2px 0 8px rgba(0,0,0,0.1)'
                            }}
                            onClick={() => setLeftCollapsed(false)}
                            aria-label="Show left sidebar"
                        >
                            <PanelLeftOpen size={20} />
                        </button>
                    )}
                    {rightCollapsed && (
                        <button
                            style={{
                                position: 'absolute',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                right: 0,
                                zIndex: 100,
                                background: 'var(--bg-panel)',
                                border: '1px solid var(--border)',
                                borderRight: 'none',
                                borderRadius: '8px 0 0 8px',
                                width: 32,
                                height: 48,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                color: 'var(--accent)',
                                boxShadow: '-2px 0 8px rgba(0,0,0,0.1)'
                            }}
                            onClick={() => setRightCollapsed(false)}
                            aria-label="Show right sidebar"
                        >
                            <PanelRightOpen size={20} />
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
                        internetSearchEnabled={internetSearchEnabled}
                        toggleWebSearch={() => setInternetSearchEnabled(prev => !prev)}
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
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            aria-label="Close"
                        >
                            <X size={16} strokeWidth={2.5} />
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
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            aria-label="Close"
                        >
                            <X size={16} strokeWidth={2.5} />
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
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            aria-label="Close"
                        >
                            <X size={16} strokeWidth={2.5} />
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
                                backgroundColor: 'rgba(239, 68, 68, 0.2)',
                                color: '#fca5a5',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                borderRadius: '50%',
                                width: '30px',
                                height: '30px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                            aria-label="Close"
                        >
                            <X size={16} strokeWidth={2.5} />
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

            {deletePrompt && (
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
                    zIndex: 1200,
                }}>
                    <div style={{
                        width: 'min(90vw, 420px)',
                        backgroundColor: '#0f1110',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '10px',
                        padding: '20px',
                        color: '#f5f5f5',
                        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.4)',
                    }}>
                        <h3 style={{ margin: '0 0 10px 0' }}>Delete account?</h3>
                        <p style={{ margin: '0 0 18px 0', color: '#d1d5db' }}>
                            This action is permanent. Do you want to continue?
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                            <button
                                type="button"
                                onClick={handleCancelAction}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(148, 163, 184, 0.4)',
                                    background: 'transparent',
                                    color: '#e5e7eb',
                                    cursor: 'pointer',
                                }}
                            >
                                No
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDeleteAccount}
                                style={{
                                    padding: '8px 14px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(239, 68, 68, 0.6)',
                                    background: 'rgba(239, 68, 68, 0.2)',
                                    color: '#fecaca',
                                    cursor: 'pointer',
                                }}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;