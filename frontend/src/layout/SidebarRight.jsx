import styles from './SidebarRight.module.css';
import { STUDIO_ITEMS } from '../data/mockData';

export default function SidebarRight() {
    return (
        <aside className={styles.sidebar}>
            <h3>Toolbox</h3>
            <div className={styles.grid}>
                {STUDIO_ITEMS.map((item, index) => (
                    <button key={index} className={styles.card}>
                        <div className={styles.iconBox}>
                            <item.icon size={20} />
                        </div>
                        <span>{item.title}</span>
                    </button>
                ))}
            </div>
        </aside>
    );
}