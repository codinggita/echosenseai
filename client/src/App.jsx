import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import FeedbackList from './pages/FeedbackList';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="text-sm font-medium text-slate-500 animate-pulse">Initializing EchoSense...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      
      {/* Protected Routes */}
      <Route 
        path="/" 
        element={user ? <DashboardLayout /> : <Navigate to="/login" replace />}
      >
        <Route index element={<Dashboard />} />
        <Route path="feedback" element={<FeedbackList />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;