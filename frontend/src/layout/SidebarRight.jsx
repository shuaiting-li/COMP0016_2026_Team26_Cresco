import { ChevronRight } from 'lucide-react';
import styles from './SidebarRight.module.css';
import { STUDIO_ITEMS } from '../tools/toolMenu';

export default function SidebarRight({
    handleOpenSatellite,
    handleOpenWeather,
    handleOpenDroneImagery,
    handleOpenSatelliteImagery,
    onCollapse,
    internetSearchEnabled,
    toggleWebSearch,
}) {
    const getCardTitle = (item) => {
        if (item.id === 'web-search') {
            return internetSearchEnabled ? 'Disable Web Search' : 'Enable Web Search';
        }

        return item.title;
    };

    const handleCardClick = (itemId) => {
        switch (itemId) {
            case 'farm':
                handleOpenSatellite?.();
                break;
            case 'weather':
                handleOpenWeather?.();
                break;
            case 'satellite':
                handleOpenSatelliteImagery?.();
                break;
            case 'drone':
                handleOpenDroneImagery?.();
                break;
            case 'web-search':
                toggleWebSearch?.();
                break;
            default:
                break;
        }
    };

    return (
        <aside className={styles.sidebar}>
            <button
                className={styles.collapseBtn}
                onClick={onCollapse}
                aria-label="Collapse right sidebar"
            >
                <ChevronRight size={20} />
            </button>
            <h3>Toolbox</h3>
            <div className={styles.grid}>
                {STUDIO_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        className={styles.card}
                        data-testid="studio-item"
                        onClick={() => handleCardClick(item.id)}
                    >
                        <div className={styles.iconBox}>
                            <item.icon size={20} />
                        </div>
                        <span>{getCardTitle(item)}</span>
                    </button>
                ))}
            </div>
        </aside>
    );
}