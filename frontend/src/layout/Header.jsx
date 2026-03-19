import { useState, useRef, useEffect } from 'react';
import { Sprout, ChevronDown, LogOut, Trash2 } from 'lucide-react';
import styles from './Header.module.css';

export default function Header({ onLogout, onDeleteAccount, username }) {
    const initials = username ? username.slice(0, 2).toUpperCase() : 'CR';
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
                        <span className={styles.dropdownLabel}>{username || 'User'}</span>
                        <button className={styles.logoutBtn} onClick={onLogout}>
                            <LogOut size={14} />
                            Sign out
                        </button>
                        <button
                            className={styles.deleteAccountBtn}
                            type="button"
                            onClick={onDeleteAccount}
                        >
                            <Trash2 size={14} />
                            Delete account
                        </button>
                    </div>
                )}
            </div>
        </header>
    );
}