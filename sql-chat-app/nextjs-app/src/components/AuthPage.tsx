"use client";

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import Image from 'next/image';
import logo from '../media/logo_talk2db.png';
import './AuthPage.css';

interface AuthPageProps {
    onBack?: () => void;
}

const AuthPage: React.FC<AuthPageProps> = ({ onBack }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            if (isLogin) {
                const result = await signIn('credentials', {
                    redirect: false,
                    username,
                    password,
                });

                if (result?.error) {
                    setError('Login failed. Please check your credentials.');
                }
            } else {
                if (password !== passwordConfirm) {
                    setError('Passwords do not match');
                    setLoading(false);
                    return;
                }

                const res = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email, password }),
                });

                const data = await res.json();

                if (!res.ok) {
                    setError(data.error || 'Registration failed. Please try again.');
                } else {
                    await signIn('credentials', {
                        redirect: false,
                        username,
                        password,
                    });
                }
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-container">
                <div className="auth-header">
                    {onBack && (
                        <button onClick={onBack} className="back-btn" style={{
                            position: 'absolute',
                            top: '20px',
                            left: '20px',
                            background: 'rgba(255, 255, 255, 0.03)',
                            border: '1px solid var(--border-default)',
                            color: 'var(--text-secondary)',
                            padding: '6px 14px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 600,
                            zIndex: 10,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            transition: 'all 0.2s'
                        }}
                            onMouseOver={(e) => { e.currentTarget.style.color = '#fff'; e.currentTarget.style.borderColor = 'var(--accent-primary)'; }}
                            onMouseOut={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-default)'; }}
                        >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="19" y1="12" x2="5" y2="12"></line>
                                <polyline points="12 19 5 12 12 5"></polyline>
                            </svg>
                            Back
                        </button>
                    )}

                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(255,255,255,0.02)',
                        width: '74px',
                        height: '74px',
                        borderRadius: '18px',
                        border: '1px solid var(--border-default)',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
                    }}>
                        <Image src={logo} alt="Talk2DB Logo" width={44} height={44} priority />
                    </div>
                    <h1>Talk2DB Studio</h1>
                    <p>{isLogin ? 'Welcome back! Sign in to get started.' : 'Create your secure account.'}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}

                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="email">Email Address</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@domain.com"
                                required={!isLogin}
                                autoComplete="email"
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="username"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="passwordConfirm">Confirm Password</label>
                            <input
                                id="passwordConfirm"
                                type="password"
                                value={passwordConfirm}
                                onChange={(e) => setPasswordConfirm(e.target.value)}
                                placeholder="••••••••"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="auth-submit">
                        {loading ? (
                            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                                <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)"></circle>
                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round"></path>
                            </svg>
                        ) : null}
                        {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-switch">
                    <p>
                        {isLogin ? "Don't have an account? " : 'Already have an account? '}
                        <button
                            type="button"
                            onClick={() => {
                                setIsLogin(!isLogin);
                                setError(null);
                                setPassword('');
                                setPasswordConfirm('');
                            }}
                            className="auth-switch-button"
                        >
                            {isLogin ? 'Register' : 'Login'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;
