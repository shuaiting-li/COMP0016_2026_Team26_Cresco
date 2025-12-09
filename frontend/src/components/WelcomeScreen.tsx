// WelcomeScreen component for empty chat state

import './WelcomeScreen.css';

interface WelcomeScreenProps {
    onSuggestionClick: (message: string) => void;
}

const SUGGESTIONS = [
    {
        icon: '🌱',
        title: 'Crop Planning',
        prompt: 'What crops should I plant this season in Kenya?',
    },
    {
        icon: '💧',
        title: 'Irrigation',
        prompt: 'How should I water my maize crops efficiently?',
    },
    {
        icon: '🐛',
        title: 'Pest Control',
        prompt: 'How do I identify and control common pests in my farm?',
    },
    {
        icon: '🌿',
        title: 'Soil Health',
        prompt: 'What are best practices for maintaining healthy soil?',
    },
];

export function WelcomeScreen({ onSuggestionClick }: WelcomeScreenProps) {
    return (
        <div className="welcome-screen">
            <div className="welcome-screen__content">
                <div className="welcome-screen__logo">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                        <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </div>
                <h1 className="welcome-screen__title">Welcome to Lima</h1>
                <p className="welcome-screen__subtitle">
                    Your intelligent farming assistant. Ask me anything about agriculture, crop management, or farming best practices.
                </p>

                <div className="suggestions">
                    {SUGGESTIONS.map((suggestion, index) => (
                        <button
                            key={index}
                            className="suggestion-card"
                            onClick={() => onSuggestionClick(suggestion.prompt)}
                        >
                            <span className="suggestion-card__icon">{suggestion.icon}</span>
                            <div className="suggestion-card__content">
                                <span className="suggestion-card__title">{suggestion.title}</span>
                                <span className="suggestion-card__prompt">{suggestion.prompt}</span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}
