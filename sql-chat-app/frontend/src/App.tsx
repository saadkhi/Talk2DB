// In frontend/src/App.tsx
import React from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import AuthPage from './pages/AuthPage';
import ChatPage from './pages/ChatPage';
import './App.css';

const AppContent: React.FC = () => {
  const { isAuthenticated, loading } = useAuth();
  const [showAuth, setShowAuth] = React.useState(false);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
      }}>
        <div style={{ color: '#39ff14', fontSize: '24px', fontWeight: '700', letterSpacing: '2px' }}>LOADING...</div>
      </div>
    );
  }

  // If user is authenticated, always show ChatPage
  if (isAuthenticated) {
    return <ChatPage />;
  }

  // For unauthenticated users, show ChatPage by default but allow switching to AuthPage
  if (showAuth) {
    return <AuthPage onBack={() => setShowAuth(false)} />;
  }

  return <ChatPage onRequireAuth={() => setShowAuth(true)} />;
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;