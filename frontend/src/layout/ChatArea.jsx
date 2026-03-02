import { useRef, useEffect, useState } from 'react';
import { ArrowUp, Sprout, Bot, ClipboardList, BookOpen, Trash2 } from 'lucide-react';
import styles from './ChatArea.module.css';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import ChartRenderer from '../ChartRenderer';


import 'katex/dist/katex.min.css';


export default function ChatArea({ messages, onSendMessage, onDeleteLastExchange, isLoading }) {
    const [input, setInput] = useState("");
    const [activeTab, setActiveTab] = useState('chat');
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
            <div className={styles.topBar}>
                <div className={styles.tabs}>
                    <button
                        className={`${styles.tab} ${activeTab === 'chat' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('chat')}
                    >
                        <span className={styles.tabLabel} title="Chat">Chat</span>
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'visuals' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('visuals')}
                    >
                        <span className={styles.tabLabel} title="Visuals">Visuals</span>
                    </button>
                    <button
                        className={`${styles.tab} ${activeTab === 'data' ? styles.activeTab : ''}`}
                        onClick={() => setActiveTab('data')}
                    >
                        <span className={styles.tabLabel} title="Raw Data">Raw Data</span>
                    </button>
                </div>
            </div>

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
                    <>
                    {activeTab === 'chat' && 
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
                                            {/* Render message content with inline charts */}
                                            {isUser ? (
                                                <span className={styles.userText}>{msg.content}</span>
                                            ) : (() => {
                                                if (!msg.charts || msg.charts.length === 0) {
                                                    return (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm, remarkMath]}
                                                            rehypePlugins={[rehypeKatex]}
                                                            components={{table: (props) => <table className={styles['markdown-table']} {...props} /> }}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    );
                                                }
                                                // Sort charts by position
                                                const sortedCharts = [...msg.charts].sort((a, b) => a.position - b.position);
                                                const elements = [];
                                                let chartPos = 0;
                                                for (let i = 0; i < sortedCharts.length; i++) {
                                                    const chart = sortedCharts[i];
                                                    // Text before this chart
                                                    const textSegment = msg.content.slice(chartPos, chart.position);
                                                    if (textSegment) {
                                                        elements.push(
                                                            <ReactMarkdown
                                                                key={`text-${i}`}
                                                                remarkPlugins={[remarkGfm, remarkMath]}
                                                                rehypePlugins={[rehypeKatex]}
                                                                components={{table: (props) => <table className={styles['markdown-table']} {...props} /> }}
                                                            >
                                                                {textSegment}
                                                            </ReactMarkdown>
                                                        );
                                                    }
                                                    // Chart itself
                                                    elements.push(
                                                        <div key={`chart-${i}`} style={{margin: '1.5em 0'}}>
                                                            <ChartRenderer
                                                                chartData={chart.data}
                                                                chartType={chart.type}
                                                                xKey={chart.xKey}
                                                                yKey={chart.yKey}
                                                            />
                                                            {chart.title && <div style={{textAlign: 'center', fontWeight: 500, marginTop: 8}}>{chart.title}</div>}
                                                        </div>
                                                    );
                                                    chartPos = chart.position;
                                                }
                                                // Remaining text after last chart
                                                const lastText = msg.content.slice(chartPos);
                                                if (lastText) {
                                                    elements.push(
                                                        <ReactMarkdown
                                                            key={`text-final`}
                                                            remarkPlugins={[remarkGfm, remarkMath]}
                                                            rehypePlugins={[rehypeKatex]}
                                                            components={{table: (props) => <table className={styles['markdown-table']} {...props} /> }}
                                                        >
                                                            {lastText}
                                                        </ReactMarkdown>
                                                    );
                                                }
                                                return elements;
                                            })()}
                                        </div>


                                        {/* Render charts  if present */}
                                        {msg.charts && msg.charts.length > 0 && (
                                            <div className={styles.chartsContainer}>
                                                <div className={styles.sectionTitle}>
                                                    <ClipboardList size={14} /> <span>Charts</span>
                                                </div>
                                                <ul className={styles.taskList}>
                                                    {msg.charts.map((chart, idx) => (
                                                        <li key={idx} className={styles.taskItem}>
                                                            <strong>{chart.title}</strong>
                                                            <p>{chart.detail}</p>
                                                            {chart.priority && <span className={styles.tag}>{chart.priority}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}


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
                    </div>}
                    {activeTab === 'visuals' && 
                    <div className={styles.messageList}>
                        {messages.map((msg) => {
                            if(msg.role === 'event') return null;
                            const isUser = msg.role === 'user';
                            return (
                                <div key={msg.id} className={`${styles.messageRow} ${isUser ? styles.userRow : styles.botRow}`}>
                                    {!isUser && <div className={styles.botAvatar}><Bot size={18} /></div>}
                                    <div className={`${styles.bubble} ${isUser ? styles.userBubble : styles.botBubble}`}>
                                        <div className={styles.messageContent}>
                                            {/* Render charts */}
                                            {(() => {
                                                if ((!msg.charts || msg.charts.length === 0) && msg.role === 'user') {
                                                    return (
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm, remarkMath]}
                                                            rehypePlugins={[rehypeKatex]}
                                                            components={{table: (props) => <table className={styles['markdown-table']} {...props} /> }}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    );
                                                }
                                                // Sort charts by position
                                                const sortedCharts = [...msg.charts].sort((a, b) => a.position - b.position);
                                                const elements = [];
                                                for (let i = 0; i < sortedCharts.length; i++) {
                                                    const chart = sortedCharts[i];
                                                    // Chart itself
                                                    elements.push(
                                                        <div key={`chart-${i}`} style={{margin: '1.5em 0'}}>
                                                            <ChartRenderer
                                                                chartData={chart.data}
                                                                chartType={chart.type}
                                                                xKey={chart.xKey}
                                                                yKey={chart.yKey}
                                                            />
                                                            {chart.title && <div style={{textAlign: 'center', fontWeight: 500, marginTop: 8}}>{chart.title}</div>}
                                                        </div>
                                                    );
                                                }
                                                return elements;
                                            })()}
                                        </div>


                                        {/* Render charts  if present */}
                                        {msg.charts && msg.charts.length > 0 && (
                                            <div className={styles.chartsContainer}>
                                                <div className={styles.sectionTitle}>
                                                    <ClipboardList size={14} /> <span>Charts</span>
                                                </div>
                                                <ul className={styles.taskList}>
                                                    {msg.charts.map((chart, idx) => (
                                                        <li key={idx} className={styles.taskItem}>
                                                            <strong>{chart.title}</strong>
                                                            <p>{chart.detail}</p>
                                                            {chart.priority && <span className={styles.tag}>{chart.priority}</span>}
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}


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
                    </div>}
                    </>
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
                        aria-label="Send message"
                    >
                        <ArrowUp size={20} strokeWidth={2.5}/>
                    </button>
                </div>
            </div>
        </main>
    );
}