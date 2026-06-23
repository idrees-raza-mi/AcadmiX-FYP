import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Login from './pages/Login.jsx';
import TodaySchedule from './pages/TodaySchedule.jsx';
import ActiveSession from './pages/ActiveSession.jsx';
import BiometricSetup from './pages/BiometricSetup.jsx';

function ProtectedRoute({ children }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { token } = useAuth();

  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={token ? '/today' : '/login'} replace />}
      />
      <Route
        path="/login"
        element={token ? <Navigate to="/today" replace /> : <Login />}
      />
      <Route
        path="/today"
        element={
          <ProtectedRoute>
            <TodaySchedule />
          </ProtectedRoute>
        }
      />
      <Route
        path="/session/:sessionId"
        element={
          <ProtectedRoute>
            <ActiveSession />
          </ProtectedRoute>
        }
      />
      <Route
        path="/setup"
        element={
          <ProtectedRoute>
            <BiometricSetup />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
