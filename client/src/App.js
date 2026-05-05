import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LanguageProvider } from './context/LanguageContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import OwnerDashboard from './pages/OwnerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import OperatorDashboard from './pages/OperatorDashboard';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:5000';

function ProtectedRoute({ role, children, authReady, user }) {
  const token = localStorage.getItem('machineos_token');
  if (!authReady) {
    return <div style={{ color: '#c9a84c', textAlign: 'center', paddingTop: '20vh' }}>Validating session...</div>;
  }
  if (!token || !user?.role) {
    return <Navigate to="/" replace />;
  }
  if (role && user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [sessionUser, setSessionUser] = useState(null);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const token = localStorage.getItem('machineos_token');
        const refreshToken = localStorage.getItem('machineos_refresh_token');
        if (!token) {
          setAuthReady(true);
          return;
        }

        let response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.status === 401 && refreshToken) {
          const refreshResponse = await fetch(`${API_BASE_URL}/api/auth/refresh`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken }),
          });
          if (refreshResponse.ok) {
            const refreshed = await refreshResponse.json();
            if (refreshed?.token) {
              localStorage.setItem('machineos_token', refreshed.token);
              response = await fetch(`${API_BASE_URL}/api/auth/me`, {
                headers: { Authorization: `Bearer ${refreshed.token}` },
              });
            }
          }
        }

        if (!response.ok) {
          localStorage.removeItem('machineos_user');
          localStorage.removeItem('machineos_token');
          localStorage.removeItem('machineos_refresh_token');
          setSessionUser(null);
          setAuthReady(true);
          return;
        }

        const payload = await response.json();
        if (payload?.user) {
          localStorage.setItem('machineos_user', JSON.stringify(payload.user));
          setSessionUser(payload.user);
        }
      } catch (_err) {
        localStorage.removeItem('machineos_user');
        localStorage.removeItem('machineos_token');
        localStorage.removeItem('machineos_refresh_token');
        setSessionUser(null);
      } finally {
        setAuthReady(true);
      }
    };

    validateSession();
  }, []);

  return (
    <LanguageProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/admin" element={<ProtectedRoute role="admin" authReady={authReady} user={sessionUser}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/owner" element={<ProtectedRoute role="owner" authReady={authReady} user={sessionUser}><OwnerDashboard /></ProtectedRoute>} />
          <Route path="/client" element={<ProtectedRoute role="client" authReady={authReady} user={sessionUser}><ClientDashboard /></ProtectedRoute>} />
          <Route path="/operator" element={<ProtectedRoute role="operator" authReady={authReady} user={sessionUser}><OperatorDashboard /></ProtectedRoute>} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </LanguageProvider>
  );
}

export default App;