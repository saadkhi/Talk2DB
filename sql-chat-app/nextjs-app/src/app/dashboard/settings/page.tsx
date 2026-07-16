"use client";
import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useDatabase } from "@/context/DatabaseContext";
import ConnectDBModal from "@/components/dashboard/ConnectDBModal";

const card = { background: "#0d0f1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "22px 24px" };
const sectionTitle = { fontSize: "13px", fontWeight: 700, color: "#fff", margin: "0 0 4px" };
const sectionSub = { fontSize: "12px", color: "#6B7280", margin: "0 0 18px" };
const inputStyle: React.CSSProperties = {
    background: "#080a12", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "9px",
    color: "#fff", padding: "10px 14px", fontSize: "13px", fontFamily: "inherit",
    width: "100%", boxSizing: "border-box", outline: "none", transition: "border-color 0.15s",
};
const label = { fontSize: "11px", fontWeight: 700, color: "#6B7280", textTransform: "uppercase" as const, letterSpacing: "0.08em", display: "block", marginBottom: "6px" };
const divider = { borderBottom: "1px solid rgba(255,255,255,0.06)", marginBottom: "22px", paddingBottom: "22px" };

function SaveBtn({ loading, saved, label: lbl }: { loading: boolean; saved: boolean; label: string }) {
    return (
        <button type="submit" disabled={loading || saved} style={{
            padding: "9px 22px", borderRadius: "9px", fontSize: "12px", fontWeight: 700,
            background: saved ? "rgba(16,185,129,0.12)" : loading ? "rgba(99,102,241,0.4)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: saved ? "1px solid rgba(16,185,129,0.25)" : "none",
            color: saved ? "#34d399" : "#fff", cursor: loading || saved ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", gap: "7px",
            boxShadow: saved || loading ? "none" : "0 4px 14px rgba(99,102,241,0.25)",
        }}>
            {loading && <div style={{ width: "12px", height: "12px", border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
            {saved ? "✓ Saved" : loading ? "Saving…" : lbl}
        </button>
    );
}

export default function SettingsPage() {
    const { data: session } = useSession();
    const { dbConnected, dbDialect, setShowConnectModal, showConnectModal, disconnectDatabase } = useDatabase();

    // Profile
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [profileLoading, setProfileLoading] = useState(false);
    const [profileSaved, setProfileSaved] = useState(false);
    const [profileErr, setProfileErr] = useState<string | null>(null);

    // Password
    const [currentPwd, setCurrentPwd] = useState("");
    const [newPwd, setNewPwd] = useState("");
    const [confirmPwd, setConfirmPwd] = useState("");
    const [pwdLoading, setPwdLoading] = useState(false);
    const [pwdSaved, setPwdSaved] = useState(false);
    const [pwdErr, setPwdErr] = useState<string | null>(null);

    // DB disconnect
    const [disconnecting, setDisconnecting] = useState(false);
    const [disconnectErr, setDisconnectErr] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/user/profile").then(r => r.json()).then(d => {
            setName(d.name ?? ""); setEmail(d.email ?? "");
        });
    }, []);

    const handleProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setProfileLoading(true); setProfileErr(null); setProfileSaved(false);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Update failed");
            setProfileSaved(true);
            setTimeout(() => setProfileSaved(false), 2500);
        } catch (e: any) { setProfileErr(e.message); }
        finally { setProfileLoading(false); }
    };

    const handlePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPwd !== confirmPwd) { setPwdErr("Passwords do not match"); return; }
        if (newPwd.length < 8) { setPwdErr("New password must be at least 8 characters"); return; }
        setPwdLoading(true); setPwdErr(null); setPwdSaved(false);
        try {
            const res = await fetch("/api/user/profile", {
                method: "PATCH", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Password change failed");
            setPwdSaved(true); setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
            setTimeout(() => setPwdSaved(false), 2500);
        } catch (e: any) { setPwdErr(e.message); }
        finally { setPwdLoading(false); }
    };

    const handleDisconnect = async () => {
        setDisconnecting(true); setDisconnectErr(null);
        try { await disconnectDatabase(); }
        catch (e: any) { setDisconnectErr(e.message); }
        finally { setDisconnecting(false); }
    };

    const ErrBox = ({ msg }: { msg: string }) => (
        <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", borderRadius: "8px", padding: "10px 14px", fontSize: "12px", color: "#f87171", marginBottom: "14px" }}>⚠ {msg}</div>
    );

    return (
        <div style={{ maxWidth: "680px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "24px", width: "100%" }}>
            {/* Header */}
            <div>
                <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 4px", letterSpacing: "-0.03em" }}>Settings</h1>
                <p style={{ fontSize: "13px", color: "#6B7280", margin: 0 }}>Manage your account, security, and database connection.</p>
            </div>

            {/* ── Profile ── */}
            <div style={card}>
                <div style={divider}>
                    <p style={sectionTitle}>Profile</p>
                    <p style={sectionSub}>Update your display name. Email cannot be changed.</p>
                </div>
                <form onSubmit={handleProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {profileErr && <ErrBox msg={profileErr} />}
                    <div>
                        <label style={label}>Display Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} required style={inputStyle}
                            onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                            onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                        />
                    </div>
                    <div>
                        <label style={label}>Email Address</label>
                        <input value={email} disabled style={{ ...inputStyle, opacity: 0.5, cursor: "not-allowed" }} />
                        <p style={{ fontSize: "11px", color: "#4B5563", margin: "5px 0 0" }}>Email is managed by your auth provider and cannot be changed here.</p>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <SaveBtn loading={profileLoading} saved={profileSaved} label="Save Profile" />
                    </div>
                </form>
            </div>

            {/* ── Password ── */}
            <div style={card}>
                <div style={divider}>
                    <p style={sectionTitle}>Change Password</p>
                    <p style={sectionSub}>Leave blank if you signed in via GitHub OAuth — passwords don't apply.</p>
                </div>
                <form onSubmit={handlePassword} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                    {pwdErr && <ErrBox msg={pwdErr} />}
                    <div>
                        <label style={label}>Current Password</label>
                        <input type="password" value={currentPwd} onChange={e => setCurrentPwd(e.target.value)} required
                            placeholder="••••••••" style={inputStyle} autoComplete="current-password"
                            onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                            onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                        />
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <label style={label}>New Password</label>
                            <input type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} required
                                placeholder="min. 8 chars" style={inputStyle} autoComplete="new-password"
                                onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                            />
                        </div>
                        <div>
                            <label style={label}>Confirm New Password</label>
                            <input type="password" value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)} required
                                placeholder="repeat password" style={inputStyle} autoComplete="new-password"
                                onFocus={e => (e.currentTarget.style.borderColor = "#6366f1")}
                                onBlur={e => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)")}
                            />
                        </div>
                    </div>
                    <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <SaveBtn loading={pwdLoading} saved={pwdSaved} label="Update Password" />
                    </div>
                </form>
            </div>

            {/* ── Database Connection ── */}
            <div style={card}>
                <div style={divider}>
                    <p style={sectionTitle}>Database Connection</p>
                    <p style={sectionSub}>Manage your connected PostgreSQL database.</p>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px", padding: "14px 16px", background: dbConnected ? "rgba(16,185,129,0.06)" : "rgba(239,68,68,0.06)", border: `1px solid ${dbConnected ? "rgba(16,185,129,0.2)" : "rgba(239,68,68,0.18)"}`, borderRadius: "10px", marginBottom: "14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <div style={{ width: "8px", height: "8px", borderRadius: "50%", background: dbConnected ? "#10b981" : "#ef4444", boxShadow: `0 0 6px ${dbConnected ? "#10b981" : "#ef4444"}` }} />
                        <div>
                            <p style={{ fontSize: "13px", fontWeight: 700, color: "#fff", margin: 0 }}>
                                {dbConnected ? `Connected — ${dbDialect ?? "PostgreSQL"}` : "No database connected"}
                            </p>
                            <p style={{ fontSize: "11px", color: "#6B7280", margin: "2px 0 0" }}>
                                {dbConnected ? "Your connection string is encrypted at rest." : "Connect a database to use all features."}
                            </p>
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => setShowConnectModal(true)} type="button" style={{
                            padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
                            background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", border: "none",
                            cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.25)",
                        }}>
                            {dbConnected ? "Update Connection" : "Connect Database"}
                        </button>
                        {dbConnected && (
                            <button onClick={handleDisconnect} disabled={disconnecting} type="button" style={{
                                padding: "8px 16px", borderRadius: "8px", fontSize: "12px", fontWeight: 700,
                                background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                                color: "#f87171", cursor: disconnecting ? "not-allowed" : "pointer",
                                display: "flex", alignItems: "center", gap: "6px",
                            }}>
                                {disconnecting && <div style={{ width: "12px", height: "12px", border: "2px solid rgba(248,113,113,0.3)", borderTop: "2px solid #f87171", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
                                {disconnecting ? "Disconnecting…" : "Disconnect"}
                            </button>
                        )}
                    </div>
                </div>
                {disconnectErr && <ErrBox msg={disconnectErr} />}
            </div>

            {/* ── Danger Zone ── */}
            <div style={{ ...card, border: "1px solid rgba(239,68,68,0.2)" }}>
                <div style={{ ...divider, borderBottomColor: "rgba(239,68,68,0.15)" }}>
                    <p style={{ ...sectionTitle, color: "#f87171" }}>Danger Zone</p>
                    <p style={sectionSub}>These actions are irreversible. Please proceed carefully.</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "12px" }}>
                    <div>
                        <p style={{ fontSize: "13px", fontWeight: 600, color: "#fff", margin: "0 0 3px" }}>Sign out of all sessions</p>
                        <p style={{ fontSize: "12px", color: "#6B7280", margin: 0 }}>You will be redirected to the login page.</p>
                    </div>
                    <button onClick={() => signOut({ callbackUrl: "/auth/login" })} type="button" style={{
                        padding: "9px 20px", borderRadius: "9px", fontSize: "12px", fontWeight: 700,
                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
                        color: "#f87171", cursor: "pointer",
                    }}>Sign Out</button>
                </div>
            </div>

            <ConnectDBModal isOpen={showConnectModal} onClose={() => setShowConnectModal(false)} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}
