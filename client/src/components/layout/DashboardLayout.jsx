                                               import { useEffect, useState, useRef } from 'react';
import { Outlet, Link, useLocation } from 'react-router';
import { LayoutDashboard, MessageSquare, Settings as SettingsIcon, LogOut, Loader2, Volume2, Moon, Sun, BrainCircuit, Users, Sparkles, BarChart3, Menu, X, ChevronRight } from 'lucide-react';
import { auth, db } from '../../lib/firebase';
import { signOut } from 'firebase/auth';
import { collection, query, where, getDocs, doc, setDoc, serverTimestamp, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { Toaster, toast } from 'sonner';
import { motion, AnimatePresence } from 'motion/react';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/feedback', label: 'Voice Feed', icon: MessageSquare },
  { to: '/analytics', label: 'Intelligence', icon: BarChart3 },
  { to: '/insights', label: 'AI Insights', icon: Sparkles },
];

const ADMIN_NAV_ITEMS = [
  { to: '/staff', label: 'Staff', icon: Users },
  { to: '/settings', label: 'Settings', icon: SettingsIcon },
];

export default function DashboardLayout() {
  const location = useLocation();
  const [businessId, setBusinessId] = useState(null);
  const [businessName, setBusinessName] = useState('');
  const [memberRole, setMemberRole] = useState('admin');
  const [loading, setLoading] = useState(true);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const lastFeedbackIdRef = useRef(null);

  useEffect(() => {
    async function loadBusiness() {
      if (!auth.currentUser) return;
      
      try {
        const q = query(
          collection(db, 'businesses'), 
          where('ownerId', '==', auth.currentUser.uid)
        );
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setBusinessId(snap.docs[0].id);
          setBusinessName(snap.docs[0].data().name);
          // In a real app we would check membership collection here for exact role
          setMemberRole('admin'); 
        } else {
          // Auto-provision a default business for the user
          const newDocRef = doc(collection(db, 'businesses'));
          const newBusiness = {
            name: "My Business",
            ownerId: auth.currentUser.uid,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          await setDoc(newDocRef, newBusiness);
          
          // Auto-provision membership
          const memberRef = doc(db, 'businesses', newDocRef.id, 'members', auth.currentUser.uid);
          await setDoc(memberRef, {
            role: 'admin',
            name: auth.currentUser.displayName || 'Admin',
            email: auth.currentUser.email,
            joinedAt: serverTimestamp()
          });

          setBusinessId(newDocRef.id);
          setBusinessName("My Business");
        }
      } catch (err) {
        console.error("Failed to load or provision business:", err);
      } finally {
        setLoading(false);
      }
    }
    loadBusiness();
  }, []);

  // Global Notification Listener
  useEffect(() => {
    if (!businessId) return;

    let isInitialLoad = true;
    const q = query(
      collection(db, `businesses/${businessId}/feedbacks`),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      
      const newFeedback = snapshot.docs[0];
      const data = newFeedback.data();
      
      if (!isInitialLoad && newFeedback.id !== lastFeedbackIdRef.current) {
        // Trigger toast on completely new incoming feedback!
        toast.success(`New Feedback Received: ${data.sentiment.toUpperCase()}`, {
          description: data.text.length > 50 ? data.text.substring(0, 50) + "..." : data.text,
          action: {
            label: "View",
            onClick: () => window.location.href = "/feedback"
          }
        });
      }
      
      lastFeedbackIdRef.current = newFeedback.id;
      isInitialLoad = false;
    });

    return () => unsubscribe();
  }, [businessId]);

  // Scroll detection for nav shadow enhancement
  useEffect(() => {
    const handleScroll = () => {
      const mainContent = document.getElementById('main-scroll-area');
      if (mainContent) {
        setScrolled(mainContent.scrollTop > 20);
      }
    };

    const el = document.getElementById('main-scroll-area');
    if (el) el.addEventListener('scroll', handleScroll);
    return () => el?.removeEventListener('scroll', handleScroll);
  }, [loading]);

  const toggleTheme = () => {
    const root = document.documentElement;
    if (root.classList.contains('dark')) {
      root.classList.remove('dark');
      setIsDark(false);
    } else {
      root.classList.add('dark');
      setIsDark(true);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin text-accent" />
          <span className="text-xs text-muted-foreground font-medium tracking-wide">Loading workspace...</span>
        </div>
      </div>
    );
  }

  const handleLogout = () => signOut(auth);

  const allNavItems = memberRole === 'admin'
    ? [...NAV_ITEMS, ...ADMIN_NAV_ITEMS]
    : NAV_ITEMS;

  const currentPageLabel = allNavItems.find(item => item.to === location.pathname)?.label || 'Overview';

  return (
    <div className="h-screen bg-background text-foreground font-sans flex flex-col overflow-hidden">
      
      {/* ═══════════════════════════════════════════════ */}
      {/* FLOATING NAVIGATION SYSTEM - Desktop           */}
      {/* ═══════════════════════════════════════════════ */}
      <div className="hidden md:flex fixed top-0 left-0 right-0 z-50 items-start justify-between px-5 pt-4 pointer-events-none">
        
        {/* ── Left Pill: Logo ── */}
        <div 
          className="floating-pill pointer-events-auto flex items-center gap-2.5 px-5 py-3"
          style={{ animationDelay: '0ms' }}
        >
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-[#7c3aed] flex items-center justify-center shadow-lg shadow-accent/20">
            <Volume2 className="h-3.5 w-3.5 text-white" />
          </div>
          <span className="font-bold text-[15px] tracking-tight text-foreground">
            Klyvora<span className="text-accent">AI</span>
          </span>
        </div>

        {/* ── Center Pill: Navigation ── */}
        <nav 
          className={`floating-pill pointer-events-auto flex items-center gap-1 px-2 py-2 transition-shadow duration-500 ${scrolled ? 'shadow-lg shadow-black/8' : ''}`}
          style={{ animationDelay: '80ms' }}
        >
          {allNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.to}
                to={item.to}
                className={`nav-pill-item group relative flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-semibold transition-all duration-300 ${
                  isActive
                    ? 'bg-accent text-white shadow-md shadow-accent/25'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/80'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden lg:inline whitespace-nowrap">{item.label}</span>
                
                {/* Active glow effect */}
                {isActive && (
                  <div className="absolute inset-0 rounded-full bg-accent/20 blur-xl -z-10 animate-pulse" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* ── Right Pill: Actions ── */}
        <div 
          className="floating-pill pointer-events-auto flex items-center gap-2 px-3 py-2"
          style={{ animationDelay: '160ms' }}
        >
          <button 
            onClick={toggleTheme} 
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-secondary/80 transition-all duration-300 text-muted-foreground hover:text-foreground group"
            aria-label="Toggle Dark Mode"
          >
            {isDark 
              ? <Sun className="w-4 h-4 group-hover:rotate-45 transition-transform duration-500" /> 
              : <Moon className="w-4 h-4 group-hover:-rotate-12 transition-transform duration-500" />
            }
          </button>

          <div className="w-px h-5 bg-border/60" />
          
          <Link to="profile" className="w-8 h-8 rounded-full bg-gradient-to-br from-accent/80 to-accent flex items-center justify-center text-[11px] font-bold text-white cursor-pointer shadow-sm hover:scale-110 hover:shadow-accent/40 hover:shadow-lg transition-all duration-300" title="View Profile & Organization">
            {auth.currentUser?.email?.[0]?.toUpperCase()}
          </Link>

          <button 
            onClick={handleLogout}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-destructive/10 transition-all duration-300 text-muted-foreground hover:text-destructive group"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-300" />
          </button>
        </div>
      </div>

      {/* ── Mobile Header ── */}
      <div className="md:hidden flex items-center justify-between px-4 h-16 bg-background/80 backdrop-blur-xl border-b border-border/40 z-40 shrink-0 sticky top-0">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="w-10 h-10 rounded-xl flex items-center justify-center bg-secondary/50 text-foreground"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-accent to-[#7c3aed] flex items-center justify-center">
              <Volume2 className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-bold text-[15px] tracking-tight text-foreground">
              Klyvora<span className="text-accent">AI</span>
            </span>
          </div>
        </div>
        
        <Link to="profile" className="w-8 h-8 rounded-full bg-accent flex items-center justify-center text-[10px] font-bold text-white shadow-sm shadow-accent/20">
          {auth.currentUser?.email?.[0]?.toUpperCase()}
        </Link>
      </div>

      {/* ═══════════════════════════════════════════════ */}
      {/* MOBILE DRAWER SYSTEM                           */}
      {/* ═══════════════════════════════════════════════ */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />
            
            {/* Drawer */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-[280px] bg-card border-r border-border/50 z-[70] md:hidden flex flex-col"
            >
              <div className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center shadow-lg shadow-accent/20">
                    <Volume2 className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-bold text-lg text-foreground">KlyvoraAI</span>
                </div>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-secondary/50 text-muted-foreground"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <nav className="flex-1 px-4 py-2 space-y-1">
                {allNavItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = location.pathname === item.to;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300 ${
                        isActive 
                          ? 'bg-accent text-white shadow-lg shadow-accent/20' 
                          : 'text-muted-foreground hover:bg-secondary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="w-5 h-5" />
                        <span className="font-semibold text-sm">{item.label}</span>
                      </div>
                      {isActive && <ChevronRight className="w-4 h-4 opacity-70" />}
                    </Link>
                  );
                })}
              </nav>

              <div className="p-6 border-t border-border/40 space-y-3">
                <button 
                  onClick={() => {
                    toggleTheme();
                    setIsMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-secondary/30 text-foreground transition-all active:scale-95"
                >
                  <div className="flex items-center gap-3">
                    {isDark ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5 text-indigo-500" />}
                    <span className="font-semibold text-sm">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
                  </div>
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl text-destructive hover:bg-destructive/10 transition-all font-semibold text-sm active:scale-95"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ═══════════════════════════════════════════════ */}
      {/* MAIN CONTENT AREA                              */}
      {/* ═══════════════════════════════════════════════ */}
      <main id="main-scroll-area" className="flex-1 overflow-auto">
        {/* Desktop: spacer for floating nav */}
        <div className="hidden md:block h-20" />
        
        <div className="max-w-[1280px] mx-auto px-4 md:px-8 lg:px-12 py-4 md:py-6 pb-8">
          {/* Breadcrumb - desktop only */}
          <div className="hidden md:flex items-center gap-2 mb-6">
            <span className="text-muted-foreground text-xs font-medium">KlyvoraAI</span>
            <span className="text-muted-foreground/40 text-xs">/</span>
            <span className="text-foreground text-xs font-semibold">{currentPageLabel}</span>
          </div>
          
          <Outlet context={{ businessId }} />
        </div>
      </main>

      <Toaster position="top-right" richColors />

      {/* Inline styles for floating pill effects */}
      <style>{`
        .floating-pill {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          box-shadow: 
            0 4px 24px -1px rgba(0, 0, 0, 0.06),
            0 1px 3px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          animation: floatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .floating-pill {
          background: rgba(255, 255, 255, 0.72);
          backdrop-filter: blur(24px) saturate(180%);
          -webkit-backdrop-filter: blur(24px) saturate(180%);
          border-radius: 9999px;
          border: 1px solid rgba(0, 0, 0, 0.04);
          box-shadow: 
            0 4px 24px -1px rgba(0, 0, 0, 0.06),
            0 1px 3px rgba(0, 0, 0, 0.04),
            inset 0 1px 0 rgba(255, 255, 255, 0.6);
          animation: floatIn 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        :is(.dark) .floating-pill {
          background: rgba(30, 32, 40, 0.78);
          border: 1px solid rgba(255, 255, 255, 0.06);
          box-shadow: 
            0 4px 24px -1px rgba(0, 0, 0, 0.25),
            0 1px 3px rgba(0, 0, 0, 0.15),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
        }

        @keyframes floatIn {
          from {
            opacity: 0;
            transform: translateY(-12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .nav-pill-item {
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .nav-pill-item:hover {
          transform: translateY(-1px);
        }

        .nav-pill-item:active {
          transform: scale(0.97);
        }
      `}</style>
    </div>
  );
}
