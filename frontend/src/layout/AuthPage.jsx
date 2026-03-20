import { useState } from 'react';
import { Sprout } from 'lucide-react';
import styles from './AuthPage.module.css';

export default function AuthPage({ onAuth }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [authType, setAuthType] = useState('login'); // default submit mode


    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const api = await import('../services/api');
            const mode = e.nativeEvent.submitter?.dataset?.mode || authType;
            if (mode === 'register') {
                await api.register(username, password);
            }
            else {
                await api.login(username, password);
            }
            onAuth();
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.page}>

            <div className={styles.card}>
                <div className={styles.logo}>
                    <div className={styles.logoBox}>
                        <Sprout size={24} strokeWidth={2.5} />
                    </div>
                    <span className={styles.title}>Cresco</span>
                </div>

                <p className={styles.subtitle}>Sign in to your account</p>

                <form onSubmit={handleSubmit} className={styles.form}>
                    <div className={styles.field}>
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            required
                            minLength={3}
                            autoFocus
                        />
                    </div>

                    <div className={styles.field}>
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter your password"
                            required
                            minLength={8}
                        />
                    </div>

                    {error && <p className={styles.error}>{error}</p>}

                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading}
                        data-mode="login"
                        onClick={() => setAuthType('login')}
                    >
                        {loading ? 'Please wait...' : 'Sign In'}
                    </button>
                    <button
                        type="submit"
                        className={styles.submitBtn}
                        disabled={loading}
                        data-mode="register"
                        onClick={() => setAuthType('register')}
                    >
                        {loading ? 'Please wait...' : 'Create Account'}
                    </button>
                </form>
            </div>
        </div>
    );
}
