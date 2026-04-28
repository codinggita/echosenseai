import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './lib/firebase';
import Login from './pages/Login';
import DashboardLayout from './components/layout/DashboardLayout';
import Dashboard from './pages/Dashboard';
import FeedbackList from './pages/FeedbackList';
import Analytics from './pages/Analytics';
import AIInsights from './pages/AIInsights';
import StaffTracking from './pages/StaffTracking';
import Settings from './pages/Settings';
import Landing from './pages/Landing';
import FeedbackCapture from './pages/FeedbackCapture';
import Profile from './pages/Profile';

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
        <div className="text-sm font-medium text-slate-500 animate-pulse">Initializing Klyvora...</div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/capture/:businessId" element={<FeedbackCapture />} />
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      
      {/* Root Route: Landing if unauthenticated, Dashboard if authenticated */}
      <Route 
        path="/" 
        element={user ? <DashboardLayout /> : <Landing />}
      >
        {user && <Route index element={<Dashboard />} />}
      </Route>

      {/* Protected Dashboard Routes */}
      <Route element={user ? <DashboardLayout /> : <Navigate to="/login" replace />}>
        <Route path="feedback" element={<FeedbackList />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="insights" element={<AIInsights />} />
        <Route path="staff" element={<StaffTracking />} />
        <Route path="settings" element={<Settings />} />
        <Route path="profile" element={<Profile />} />
      </Route>
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;