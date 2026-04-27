                                               import { useEffect, useState } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, LogOut, Loader2, Volume2, MessageSquare, BrainCircuit, Sparkles } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function DashboardLayout() {
  const location = useLocation();
  const [businessId, setBusinessId] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadBusiness() {
      if (!auth.currentUser) {
        setLoading(false);
        return;
      }
      try {
        const q = query(
          collection(db, 'businesses'), 
          where('ownerId', '==', auth.currentUser.uid)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setBusinessId(snap.docs[0].id);
          setBusinessName(snap.docs[0].data().name);
        } else {
          // Provision
          const newDocRef = doc(collection(db, 'businesses'));
          await setDoc(newDocRef, {
            name: "My Business",
            ownerId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          });
          setBusinessId(newDocRef.id);
          setBusinessName("My Business");
        }
      } catch (err) {
        console.error("Failed to load business:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBusiness();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#f5f5f5]">
        <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
      </div>
    );
  }

  const handleLogout = () => signOut(auth);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col hidden md:flex">
        <div className="p-6 border-b border-slate-200 flex items-center gap-2">
          <Volume2 className="h-6 w-6 text-blue-600" />
          <span className="font-bold text-xl tracking-tight text-slate-900">Klyvora AI</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Link 
             to="/" 
             className={`flex items-center gap-3 px-3 py-2 font-medium rounded-lg ${location.pathname === '/' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <LayoutDashboard className="w-5 h-5" />
            Dashboard
          </Link>

          <Link 
             to="/feedback" 
             className={`flex items-center gap-3 px-3 py-2 font-medium rounded-lg ${location.pathname === '/feedback' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <MessageSquare className="w-5 h-5" />
            Voice Feed
          </Link>

          <Link 
             to="/analytics" 
             className={`flex items-center gap-3 px-3 py-2 font-medium rounded-lg ${location.pathname === '/analytics' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <BrainCircuit className="w-5 h-5" />
            Intelligence
          </Link>

          <Link 
             to="/insights" 
             className={`flex items-center gap-3 px-3 py-2 font-medium rounded-lg ${location.pathname === '/insights' ? 'bg-blue-50 text-blue-700' : 'text-slate-600 hover:bg-slate-50'}`}
          >
            <Sparkles className="w-5 h-5" />
            AI Insights
          </Link>
          {/* We will add remaining links like Settings in future pushes */}
        </nav>

        <div className="p-4 border-t border-slate-200">
           <div className="text-xs text-slate-500 mb-1">Business Account</div>
           <div className="font-semibold text-slate-900 text-sm truncate">{businessName}</div>
           <div className="text-[10px] text-slate-400 font-mono truncate mb-4">ID: {businessId}</div>

          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 text-slate-600 hover:text-slate-900 w-full hover:bg-slate-50 rounded-lg font-medium transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <header className="h-16 border-b border-slate-200 bg-white flex items-center shrink-0 px-8">
           <span className="text-slate-500 text-sm">Dashboard / </span>
           <span className="font-semibold text-sm ml-1 select-none">Overview</span>
        </header>

        <div className="flex-1 overflow-auto">
          <div className="p-8 h-full"> 
            <Outlet context={{ businessId }} />
          </div>
        </div>
      </main>
    </div>
  );
}
