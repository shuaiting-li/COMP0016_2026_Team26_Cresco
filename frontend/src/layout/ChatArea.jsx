import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Sprout, Bot, ClipboardList, BookOpen, Trash2 } from 'lucide-react';
import styles from './ChatArea.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';


export default function ChatArea({ messages, onSendMessage, onDeleteLastExchange, isLoading }) {
    const [input, setInput] = useState("");
    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    useEffect(() => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = el.scrollHeight + 'px';
        }
    }, [input]);

    const handleSend = () => {
        if(!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <main className={styles.main}>
            <div className={styles.contentArea}>
                {messages.length === 0 ? (
                    <div className={styles.emptyContainer}>
                        <Sprout size={48} className={styles.heroIcon} strokeWidth={1} />
                        <div style={{textAlign: 'center'}}>
                            <h1>Cresco Intelligence</h1>
                            {/* Subtitle text removed completely */}
                        </div>
                    </div>
                ) : (
                    <div className={styles.messageList}>
                        {messages.map((msg, index) => {
                            if(msg.role === 'event') return null;
                            const isUser = msg.role === 'user';
                            const isLastUserMsg = isUser
                                && !isLoading
                                && index === messages.length - 2
                                && messages[messages.length - 1]?.role === 'assistant';
                            return (
                                <div key={msg.id} className={`${styles.messageRow} ${isUser ? styles.userRow : styles.botRow}`}>
                                    {isLastUserMsg && (
                                        <button
                                            className={styles.deleteExchangeBtn}
                                            onClick={onDeleteLastExchange}
                                            aria-label="Delete last exchange"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                    {!isUser && <div className={styles.botAvatar}><Bot size={18} /></div>}
                                    <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
                                        <div className={styles.messageContent}>
                                            {isUser ? (
                                                <span className={styles.userText}>{msg.content}</span>
                                            ) : (
                                                <ReactMarkdown
                                                    remarkPlugins={[remarkGfm, remarkMath]}
                                                    rehypePlugins={[rehypeKatex]}
                                                    components={{table: (props) => <table className={styles['markdown-table']} {...props} /> }}
                                                    >
                                                    {msg.content}
                                                </ReactMarkdown>
                                            )}
                                        </div>

                                        {/* Render Tasks if present */}
                                        {msg.tasks && msg.tasks.length > 0 && (
                                            <div className={styles.tasksContainer}>
                                                <div className={styles.sectionTitle}>
                                                    <ClipboardList size={14} /> <span>Suggested Plan</span>
                                                </div>
                                                <ul className={styles.taskList}>
                                                    {msg.tasks.map((task, idx) => (
                                                        <li key={idx} className={styles.taskItem}>
                                                            <strong>{task.title}</strong>
                                                            <p>{task.detail}</p>
                                                            {task.priority && <span className={styles.tag}>{task.priority}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}

                                        {/* Render Citations if present */}
                                        {msg.citations && msg.citations.length > 0 && (
                                            <div className={styles.citationsContainer}>
                                                <div className={styles.sectionTitle}>
                                                    <BookOpen size={14} /> <span>Sources</span>
                                                </div>
                                                <ul className={styles.citationList}>
                                                    {msg.citations.map((cite, idx) => (
                                                        <li key={idx}>{cite}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                        {isLoading && <div className={styles.messageRow}><span style={{color: '#666', fontSize: '0.8rem', marginLeft: '45px'}}>Processing...</span></div>}
                        <div ref={messagesEndRef} />
                    </div>
                )}
            </div>

            <div className={styles.inputWrapper}>
                <div className={styles.inputContainer}>
                    <textarea
                        ref={textareaRef}
                        rows={1}
                        placeholder={isLoading ? "Waiting for response..." : "Message Cresco..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={isLoading}
                        className={styles.textarea}
                    />

                    <button
                        className={`${styles.sendBtn} ${input.trim() && !isLoading ? styles.sendActive : ''}`}
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                    >
                        <ArrowUp size={20} strokeWidth={2.5}/>
                    </button>
                </div>
            </div>
        </main>
    );
}