// Lima Agritech Chat Application

import { useState } from 'react';
import { Sidebar, ChatMessage, ChatInput, WelcomeScreen, TypingIndicator } from './components';
import { useChat } from './hooks/useChat';
import './App.css';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    conversations,
    currentConversationId,
    messages,
    isLoading,
    error,
    messagesEndRef,
    sendMessage,
    createNewConversation,
    selectConversation,
  } = useChat();

  const handleNewChat = () => {
    createNewConversation();
    setSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    selectConversation(id);
    setSidebarOpen(false);
  };

  const handleSuggestionClick = (message: string) => {
    sendMessage(message);
  };

  return (
    <div className="app">
      {/* Sidebar */}
      <Sidebar
        conversations={conversations}
        currentConversationId={currentConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        isOpen={sidebarOpen}
        onToggle={() => setSidebarOpen(!sidebarOpen)}
      />

      {/* Main Content */}
      <main className="main">
        {/* Header */}
        <header className="header">
          <button
            className="header__menu-btn"
            onClick={() => setSidebarOpen(true)}
            aria-label="Open menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h1 className="header__title">
            <svg className="header__logo" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Lima
          </h1>
          <div className="header__spacer" />
        </header>

        {/* Chat Area */}
        <div className="chat-area">
          {messages.length === 0 && !isLoading ? (
            <WelcomeScreen onSuggestionClick={handleSuggestionClick} />
          ) : (
            <div className="messages">
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
              {isLoading && <TypingIndicator />}
              {error && (
                <div className="error-message">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
                  </svg>
                  {error}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Area */}
        <ChatInput onSend={sendMessage} disabled={isLoading} />
      </main>
    </div>
  );
}

export default App;
