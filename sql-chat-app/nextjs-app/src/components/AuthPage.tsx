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
                } else {
                    // Success, Page.tsx will handle the shift back to ChatPage via session status
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
                    // Auto login after registration
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
                            background: 'transparent',
                            border: '1px solid #333',
                            color: '#888',
                            padding: '4px 12px',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            zIndex: 10
                        }}>
                            ← Back to Chat
                        </button>
                    )}
                    <Image src={logo} alt="Talk2DB Logo" width={80} height={80} style={{ marginBottom: '20px', marginLeft: 'auto', marginRight: 'auto' }} />
                    <h1>Talk2DB</h1>
                    <p>{isLogin ? 'Welcome back!' : 'Create your account'}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {error && <div className="auth-error">{error}</div>}

                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Email"
                                required={!isLogin}
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
                            placeholder="Username"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            required
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
                                placeholder="Confirm Password"
                                required
                            />
                        </div>
                    )}

                    <button type="submit" disabled={loading} className="auth-submit">
                        {loading ? 'Please wait...' : isLogin ? 'Login' : 'Register'}
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
