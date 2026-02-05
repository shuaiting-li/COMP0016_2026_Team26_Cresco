import { useState } from 'react';
import Header from './layout/Header';
import SidebarLeft from './layout/SidebarLeft';
import SidebarRight from './layout/SidebarRight';
import ChatArea from './layout/ChatArea';
import { sendMessage, uploadAndIndexFile } from './services/api';

const layoutStyle = {
    display: 'flex',
    height: 'calc(100vh - 64px)',
    width: '100vw',
    overflow: 'hidden'
};

function App() {
    const [files, setFiles] = useState([]);
    const [messages, setMessages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [conversationId, setConversationId] = useState(null);

    const handleFileUpload = async (e) => {
        setIsLoading(true);
        const uploadedFiles = Array.from(e.target.files);
        console.log("Uploading files:");
        for (const file of uploadedFiles) {
            try {
                await uploadAndIndexFile(file);
                setFiles(prev => [...prev, file]);
                setIsLoading(false);
            } catch (error) {
                console.error("Failed to upload and index:", file.name);
            }
        };
    };

    const handleRemoveFile = (index) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    const handleSendMessage = async (text) => {
        if (!text.trim()) return;

        // 1. Add User Message
        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: text
        };

        // This is the moment the Central Logo disappears (messages.length > 0)
        setMessages(prev => [...prev, userMsg]);
        setIsLoading(true);

        try {
            // 2. Call Real API with conversation ID and uploaded files
            const response = await sendMessage(text, conversationId, files);

            // Update conversation ID if provided
            if (response.conversationId) {
                setConversationId(response.conversationId);
            }

            setMessages(prev => [
                ...prev,
                {
                    id: Date.now() + 1,
                    role: 'assistant',
                    content: response.reply,
                    tasks: response.tasks,      // Pass tasks through
                    citations: response.citations // Pass citations through
                }
            ]);

            // Clear files after successful send
            // setFiles([]); 
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

    return (
        <div className="app-container">
            <Header />
            <div style={layoutStyle}>
                <SidebarLeft
                    files={files}
                    onUpload={handleFileUpload}
                    onRemove={handleRemoveFile}
                />
                <ChatArea
                    files={files}
                    messages={messages}
                    onSendMessage={handleSendMessage}
                    isLoading={isLoading}
                />
                <SidebarRight />
            </div>
        </div>
    );
}

export default App;