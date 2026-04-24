import React from 'react';
import { Outlet, Link } from 'react-router';
import { LayoutDashboard, LogOut } from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export default function DashboardLayout() {
  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar - Initialized Structure skeleton */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-200 flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg"></div>
          <span className="font-bold text-xl tracking-tight text-slate-900">EchoSense AI</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link to="/" className="flex items-center gap-3 px-3 py-2 text-blue-700 bg-blue-50 font-medium rounded-lg">
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>
          {/* Future sections like Insights, Settings, etc. will go here */}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-slate-900 w-full hover:bg-slate-50 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-h-screen">
        <Outlet />
      </main>
    </div>
  );
}
