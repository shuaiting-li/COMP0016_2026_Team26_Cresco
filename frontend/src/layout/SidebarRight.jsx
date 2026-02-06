import React, { useState } from 'react';
import styles from './SidebarRight.module.css';
import { STUDIO_ITEMS } from '../data/mockData';
import Weather from '../weather';

export default function SidebarRight({ handleOpenSatellite, handleOpenWeather }) {
    const [isWeatherOpen, setIsWeatherOpen] = useState(false);

    const handleCloseWeather = () => {
        setIsWeatherOpen(false);
    };

    return (
        <>
            <aside className={styles.sidebar}>
                <h3>Toolbox</h3>
                <div className={styles.grid}>
                    {STUDIO_ITEMS.map((item, index) => (
                        <button
                            key={index}
                            className={styles.card}
                            onClick={
                                item.title === "Add Farm"
                                    ? handleOpenSatellite
                                    : item.title === "Weather Data"
                                    ? handleOpenWeather
                                    : undefined
                            }
                        >
                            <div className={styles.iconBox}>
                                <item.icon size={20} />
                            </div>
                            <span>{item.title}</span>
                        </button>
                    ))}
                </div>
            </aside>

            {isWeatherOpen && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100vw',
                        height: '100vh',
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        zIndex: 1000,
                    }}
                >
                    <div
                        style={{
                            position: 'relative',
                            width: '80%',
                            height: '80%',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            overflow: 'hidden',
                        }}
                    >
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
                                cursor: 'pointer',
                            }}
                        >
                            X
                        </button>
                        <Weather lat={40.785091} lon={-73.968285} />
                    </div>
                </div>
            )}
        </>
    );
}