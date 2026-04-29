import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useOutletContext } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, ExternalLink, ShieldCheck, KeyRound, MonitorSmartphone, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function Settings() {
  const { businessId } = useOutletContext();
  
  const [kioskConfig, setKioskConfig] = useState({
    kioskTitle: 'How was your experience?',
    kioskMessage: 'Tap the microphone and speak briefly.',
    collectContact: false
  });
  const [savingKiosk, setSavingKiosk] = useState(false);

  useEffect(() => {
    if (!businessId) return;
    const fetchBiz = async () => {
      const d = await getDoc(doc(db, 'businesses', businessId));
      if (d.exists()) {
        const data = d.data();
        setKioskConfig({
          kioskTitle: data.kioskTitle || 'How was your experience?',
          kioskMessage: data.kioskMessage || 'Tap the microphone and speak briefly.',
          collectContact: data.collectContact || false
        });
      }
    };
    fetchBiz();
  }, [businessId]);

  const handleSaveKiosk = async () => {
    if (!businessId) return;
    setSavingKiosk(true);
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        kioskTitle: kioskConfig.kioskTitle,
        kioskMessage: kioskConfig.kioskMessage,
        collectContact: kioskConfig.collectContact,
        updatedAt: serverTimestamp()
      });
      // Optionally show a toast here if sonner is available
    } catch (e) {
      console.error(e);
    } finally {
      setSavingKiosk(false);
    }
  };

  
  if (!businessId) return null;

  const captureUrl = `${window.location.origin}/capture/${businessId}`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(captureUrl);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h2 className="text-3xl font-semibold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Configure your workspace and feedback channels.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Feedback Channel</CardTitle>
            <CardDescription>
              Share this link or QR code with your customers to start collecting feedback. 
              No login is required for them.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="p-4 bg-card rounded-xl border border-border inline-flex">
                <QRCodeSVG value={captureUrl} size={160} level="Q" />
              </div>
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label>Direct Link</Label>
                  <div className="flex items-center gap-2">
                    <Input readOnly value={captureUrl} className="font-mono text-sm bg-secondary/50" />
                    <Button variant="outline" size="icon" onClick={copyToClipboard} title="Copy link">
                      <Copy className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="icon" title="Open test link" onClick={() => window.open(captureUrl, '_blank')}>
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
                <div className="p-4 bg-secondary/50 rounded-lg text-sm text-muted-foreground">
                  <h4 className="font-semibold text-foreground mb-1">How to use</h4>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Print the QR Code for tables or receipts</li>
                    <li>Add the link to your SMS or WhatsApp receipts</li>
                    <li>Include it in your post-service emails</li>
                  </ul>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Kiosk Customization Card */}
        <Card className="md:col-span-2 border shadow-sm">
          <CardHeader className="bg-secondary/30 border-b border-border pb-4">
            <div className="flex items-center gap-2">
               <MonitorSmartphone className="w-5 h-5 text-muted-foreground" />
               <CardTitle>Kiosk Customization</CardTitle>
            </div>
            <CardDescription>
              Personalize the feedback capture screen your customers interact with.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Greeting Title</Label>
                <Input 
                  value={kioskConfig.kioskTitle} 
                  onChange={(e) => setKioskConfig(prev => ({...prev, kioskTitle: e.target.value}))}
                  placeholder="E.g. How was your experience?" 
                />
              </div>
              <div className="space-y-2">
                <Label>Instruction Subtitle</Label>
                <Input 
                  value={kioskConfig.kioskMessage} 
                  onChange={(e) => setKioskConfig(prev => ({...prev, kioskMessage: e.target.value}))}
                  placeholder="E.g. Tap the microphone and speak briefly." 
                />
              </div>
            </div>
            <div className="flex items-start md:items-center justify-between p-4 border border-border rounded-lg bg-secondary/30 flex-col md:flex-row gap-4">
              <div className="space-y-1">
                <Label className="text-sm font-semibold">Request Customer Contact</Label>
                <p className="text-xs text-muted-foreground w-full max-w-sm">After processing the feedback, ask customers for their email or phone number for follow-ups.</p>
              </div>
              <div 
                onClick={() => setKioskConfig(prev => ({...prev, collectContact: !prev.collectContact}))}
                className={`flex-shrink-0 h-6 w-11 rounded-full relative cursor-pointer transition-colors duration-200 border ${kioskConfig.collectContact ? 'bg-foreground border-foreground' : 'bg-secondary border-border'}`}
              >
                <div className={`absolute top-[2px] w-4 h-4 rounded-full bg-card transition-all duration-200 shadow-sm ${kioskConfig.collectContact ? 'left-[22px]' : 'left-[2px]'}`}></div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-secondary/30 flex justify-end p-4 border-t border-border">
            <Button onClick={handleSaveKiosk} disabled={savingKiosk} size="sm">
              {savingKiosk ? 'Saving...' : 'Save Configuration'}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Access Control</CardTitle>
            <CardDescription>Manage staff roles and access.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between p-3 border border-border rounded-md bg-secondary/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center text-emerald-700 dark:text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">Administrator</p>
                  <p className="text-xs text-muted-foreground">Full workspace access</p>
                </div>
              </div>
              <Badge variant="outline">Active</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-4 text-center">
              Multi-user management is available on the Pro plan.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notification Settings</CardTitle>
            <CardDescription>Configure how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="critical-alert" className="flex flex-col space-y-1">
                <span>Critical Alerts</span>
                <span className="font-normal text-xs text-muted-foreground">Notify on negative feedback</span>
              </Label>
              <div className="h-5 w-9 rounded-full bg-foreground relative cursor-pointer">
                <div className="absolute right-1 top-1 h-3 w-3 rounded-full bg-card"></div>
              </div>
            </div>
            <div className="flex items-center justify-between opacity-50">
              <Label className="flex flex-col space-y-1">
                <span>Daily Digest</span>
                <span className="font-normal text-xs text-muted-foreground">Summary of the day's feedback</span>
              </Label>
              <div className="h-5 w-9 rounded-full bg-secondary border border-border relative">
                <div className="absolute left-1 top-1 h-3 w-3 rounded-full bg-card"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="pt-12 pb-4 text-center">
        <p className="text-muted-foreground text-sm font-medium tracking-wide flex items-center justify-center gap-1.5">
          Created with <Heart className="w-4 h-4 text-red-500 fill-current" /> by{' '}
          <a 
            href="https://pal-pathak-sigma.vercel.app" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-foreground hover:underline hover:text-blue-600 transition-colors"
          >
            Pal Pathak
          </a>
        </p>
      </div>
    </div>
  );
}
