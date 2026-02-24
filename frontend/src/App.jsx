import { useState } from 'react';
import Header from './layout/Header';
import SidebarLeft from './layout/SidebarLeft';
import SidebarRight from './layout/SidebarRight';
import ChatArea from './layout/ChatArea';
import AuthPage from './layout/AuthPage';
import { sendMessage, uploadAndIndexFile, isLoggedIn, logout, getUsername } from './services/api';
import SatelliteMap from './satellite';
import Weather from './weather';

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
    const [farmLocation, setFarmLocation] = useState(null); // State to store farm location

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

    const handleFileUpload = async (e) => {
        setIsLoading(true);
        const uploadedFiles = Array.from(e.target.files);
        console.log("Uploading files:");
        for (const file of uploadedFiles) {
            try {
                await uploadAndIndexFile(file);
                setFiles(prev => [...prev, file]);
                setIsLoading(false);
            } catch {
                console.error("Failed to upload and index:", file.name);
            }
        };
    };

    const handleRemoveFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSendMessage = async (text) => {
        if (!text.trim()) return;

        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: text
        };

        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            const response = await sendMessage(text, conversationId, files);

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
                    content: "Sorry, I encountered an error communicating with the server. Is the backend running?"
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

    return (
        <div className="app-container">
            <Header onLogout={handleLogout} username={getUsername()} />
            <div style={layoutStyle}>
                <SidebarLeft
                    files={files}
                    onUpload={handleFileUpload}
                    onRemove={handleRemoveFile}
                />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <ChatArea
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        isLoading={isLoading}
                    />
                </div>
                <SidebarRight
                    handleOpenSatellite={handleOpenSatellite}
                    handleOpenWeather={handleOpenWeather}
                />
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
                        backgroundColor: 'white',
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
                        backgroundColor: 'black',
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