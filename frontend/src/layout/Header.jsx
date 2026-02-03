import { useState, useRef, useEffect } from 'react';
import { Sprout, ChevronDown } from 'lucide-react';
import styles from './Header.module.css';

export default function Header() {
    const [initials, setInitials] = useState("JD");
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <header className={styles.header}>
            <div className={styles.left}>
                <div className={styles.logoBox}>
                    <Sprout size={18} strokeWidth={2.5}/>
                </div>
                <span className={styles.title}>Cresco</span>
            </div>

            <div className={styles.right} ref={dropdownRef}>
                {/* V12 Pill-style Profile Button */}
                <button className={styles.profileBtn} onClick={() => setIsOpen(!isOpen)}>
                    <div className={styles.avatar}>{initials}</div>
                    <ChevronDown size={14} className={styles.chevron} />
                </button>

                {isOpen && (
                    <div className={styles.initialsDropdown}>
                        <label className={styles.dropdownLabel}>INITIALS</label>
                        <input
                            type="text"
                            maxLength={2}
                            value={initials}
                            onChange={(e) => setInitials(e.target.value.toUpperCase())}
                            autoFocus
                        />
                    </div>
                )}
            </div>
        </header>
    );
}