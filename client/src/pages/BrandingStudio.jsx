import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Helmet } from 'react-helmet-async';
import BrandingSidebar from '../components/branding/BrandingSidebar';
import LivePreview from '../components/branding/LivePreview';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Save, Loader2, RefreshCw } from 'lucide-react';

const DEFAULT_CONFIG = {
  // Identity
  orgName: '',
  tagline: '',
  supportEmail: '',
  website: '',
  logoUrl: '',
  
  // Theme
  primaryColor: '#0f172a',
  backgroundColor: '#ffffff',
  surfaceColor: '#ffffff',
  textColor: '#0f172a',
  buttonTextColor: '#ffffff',
  accentColor: '#3b82f6',

  // Typography
  borderRadius: '0.75rem',
  bodyFont: 'Inter, sans-serif',
  
  // Welcome Screen
  kioskTitle: 'How was your experience?',
  kioskMessage: 'Tap the microphone and speak briefly.',
  
  // Thank You Screen
  thankyouHeadline: 'Thank you!',
  thankyouDescription: 'Your feedback has been securely analyzed and relayed to the manager.',
  
  // Options
  collectContact: false,
};

export default function BrandingStudio() {
  const { businessId } = useOutletContext();
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [originalConfig, setOriginalConfig] = useState(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const fetchConfig = async () => {
      try {
        const d = await getDoc(doc(db, 'businesses', businessId));
        if (d.exists()) {
          const data = d.data();
          // Flatten the branding object back into the config state
          const brandingData = data.branding || {};
          const mergedConfig = { 
            ...DEFAULT_CONFIG, 
            ...data,
            ...brandingData 
          };
          setConfig(mergedConfig);
          setOriginalConfig(mergedConfig);
        }
      } catch (err) {
        console.error("Error fetching config:", err);
        toast.error("Failed to load branding configuration.");
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [businessId]);

  const handleUpdate = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!businessId) return;
    setSaving(true);
    try {
      const brandingPayload = {
        branding: {
          orgName:              config.orgName              ?? '',
          tagline:              config.tagline              ?? '',
          supportEmail:         config.supportEmail         ?? '',
          website:              config.website              ?? '',
          logoUrl:              config.logoUrl              ?? '',
          primaryColor:         config.primaryColor         ?? '#0f172a',
          backgroundColor:      config.backgroundColor      ?? '#ffffff',
          surfaceColor:         config.surfaceColor         ?? '#ffffff',
          textColor:            config.textColor            ?? '#0f172a',
          buttonTextColor:      config.buttonTextColor      ?? '#ffffff',
          accentColor:          config.accentColor          ?? '#3b82f6',
          borderRadius:         config.borderRadius         ?? '0.75rem',
          bodyFont:             config.bodyFont             ?? 'Inter, sans-serif',
          thankyouHeadline:     config.thankyouHeadline     ?? 'Thank you!',
          thankyouDescription:  config.thankyouDescription  ?? 'Your feedback has been securely analyzed and relayed to the manager.',
        },
        kioskTitle:           config.kioskTitle           ?? 'How was your experience?',
        kioskMessage:         config.kioskMessage         ?? 'Tap the microphone and speak briefly.',
        collectContact:       Boolean(config.collectContact),
        updatedAt:            serverTimestamp(),
      };

      try {
        await updateDoc(doc(db, 'businesses', businessId), brandingPayload);
        toast.success("Branding updated successfully");
        setOriginalConfig(config);
      } catch (mainErr) {
        console.error("Main save failed:", mainErr);
        
        // Diagnostic mode: Try saving just a simple allowed field to see if ANY write works
        try {
          await updateDoc(doc(db, 'businesses', businessId), { updatedAt: serverTimestamp() });
          console.log("Diagnostic: Basic save works. The issue is with the new fields.");
          
          // Now try saving just the branding object
          try {
            await updateDoc(doc(db, 'businesses', businessId), { branding: brandingPayload.branding, updatedAt: serverTimestamp() });
            console.log("Diagnostic: Branding object save works! The issue is kiosk fields.");
          } catch (brandingErr) {
            console.error("Diagnostic: Branding object save FAILED.", brandingErr);
            toast.error("Firebase Rules are still rejecting the 'branding' field. Did you publish the rules?");
            return;
          }
          
        } catch (basicErr) {
          console.error("Diagnostic: Even a basic save failed.", basicErr);
          toast.error("You don't have permission to edit this workspace at all.");
          return;
        }

        throw mainErr; // rethrow if we didn't catch the exact reason above
      }
    } catch (err) {
      console.error('Save error:', err);
      toast.error(`Failed to save: ${err?.message || 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };


  const hasChanges = JSON.stringify(config) !== JSON.stringify(originalConfig);

  if (loading) {
    return (
      <div className="flex h-[calc(100vh-6rem)] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-accent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] md:h-[calc(100vh-8rem)]">
      <Helmet>
        <title>Branding Studio | Klyvora AI</title>
      </Helmet>
      
      {/* Studio Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border/40 shrink-0">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Branding Studio</h2>
          <p className="text-sm text-muted-foreground mt-1">Design your premium customer kiosk experience.</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-md hidden md:inline-flex items-center gap-1">
              <RefreshCw className="w-3 h-3" /> Unsaved Changes
            </span>
          )}
          <Button onClick={handleSave} disabled={saving || !hasChanges} className="gap-2 shadow-md">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'Saving...' : 'Save & Publish'}
          </Button>
        </div>
      </div>

      {/* Workspace */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden mt-4 gap-6">
        {/* Left Panel: Controls */}
        <div className="w-full lg:w-[400px] xl:w-[480px] shrink-0 border border-border/50 bg-card/50 rounded-xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-4 bg-secondary/30 border-b border-border/50 font-semibold text-sm">
            Configuration
          </div>
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            <BrandingSidebar config={config} onChange={handleUpdate} businessId={businessId} />
          </div>
        </div>

        {/* Right Panel: Live Preview */}
        <div className="flex-1 bg-secondary/20 border border-border/50 rounded-xl flex flex-col overflow-hidden relative">
          <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-background border border-border px-4 py-1.5 rounded-full text-xs font-semibold shadow-sm z-10 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Live Preview
          </div>
          <div className="flex-1 overflow-y-auto flex items-center justify-center p-4 lg:p-8 bg-grid-slate-200/50 dark:bg-grid-slate-900/50">
             <LivePreview config={config} />
          </div>
        </div>
      </div>
      
      {/* Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: var(--border);
          border-radius: 10px;
        }
        .bg-grid-slate-200\\/50 {
           background-image: radial-gradient(circle, rgba(148, 163, 184, 0.15) 1px, transparent 1px);
           background-size: 24px 24px;
        }
        .dark .bg-grid-slate-900\\/50 {
           background-image: radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px);
           background-size: 24px 24px;
        }
      `}</style>
    </div>
  );
}
