import { useRef, useState } from 'react';
import { Plus, Trash2, FileText, Image, File, UploadCloud } from 'lucide-react';
import styles from './SidebarLeft.module.css';

export default function SidebarLeft({ files, onUpload, onRemove }) {
    const fileInputRef = useRef(null);
    const [isDragging, setIsDragging] = useState(false);

    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop().toLowerCase();
        // Return specific icons but they will all be styled the same grey via CSS
        if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <Image size={16} />;
        if (['pdf', 'txt', 'doc', 'docx'].includes(ext)) return <FileText size={16} />;
        return <File size={16} />;
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.types.includes('Files')) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const acceptedExtensions = ['.md', '.pdf', '.txt', '.csv', '.json'];

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const fileArray = Array.from(e.dataTransfer.files);
            const validFiles = fileArray.filter(f => {
                const ext = '.' + f.name.split('.').pop().toLowerCase();
                return acceptedExtensions.includes(ext);
            });
            
            if (validFiles.length > 0) {
                onUpload(validFiles);
            }
        }
    };

    return (
        <aside 
            className={`${styles.sidebar} ${isDragging ? styles.sidebarDragging : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            data-testid="sidebar-left"
        >
            {isDragging && (
                <div className={styles.dragOverlay}>
                    <UploadCloud size={48} className={styles.dragOverlayIcon} />
                    <span className={styles.dragOverlayText}>Drop files here</span>
                    <span className={styles.dragOverlaySubtext}>.md, .pdf, .txt, .csv, .json</span>
                </div>
            )}
            
            <div className={styles.header}>
                <h3>Data Sources</h3>
            </div>

            <input 
                type="file" 
                multiple 
                accept=".md,.pdf,.txt,.csv,.json"
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={onUpload} 
            />

            <button className={styles.addBtn} onClick={() => fileInputRef.current.click()}>
                <Plus size={18} />
                <span>Add Field Data</span>
            </button>

            <div className={styles.fileList}>
                {files.map((file, idx) => (
                    <div key={idx} className={styles.fileItem}>
                        <div className={styles.iconWrapper}>
                            {getFileIcon(file.name)}
                        </div>
                        <span className={styles.fileName}>{file.name}</span>
                        <button className={styles.deleteBtn} onClick={() => onRemove(idx)}>
                            <Trash2 size={14}/>
                        </button>
                    </div>
                ))}
            </div>

            <div className={styles.footer}>
                <p>{files.length} sources active</p>
                <p>Supports .md, .pdf, .txt, .csv, .json</p>
            </div>
        </aside>
    );
}