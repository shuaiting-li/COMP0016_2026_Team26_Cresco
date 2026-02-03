import { useRef } from 'react';
import { Plus, Trash2, FileText, Image, File } from 'lucide-react';
import styles from './SidebarLeft.module.css';

export default function SidebarLeft({ files, onUpload, onRemove }) {
    const fileInputRef = useRef(null);

    const getFileIcon = (fileName) => {
        const ext = fileName.split('.').pop().toLowerCase();
        // Return specific icons but they will all be styled the same grey via CSS
        if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return <Image size={16} />;
        if (['pdf', 'txt', 'doc', 'docx'].includes(ext)) return <FileText size={16} />;
        return <File size={16} />;
    };

    return (
        <aside className={styles.sidebar}>
            <div className={styles.header}>
                <h3>Data Sources</h3>
            </div>

            <input type="file" multiple ref={fileInputRef} style={{ display: 'none' }} onChange={onUpload} />

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
            </div>
        </aside>
    );
}