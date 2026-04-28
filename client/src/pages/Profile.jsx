import { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useOutletContext } from 'react-router';
import { auth, db } from '../lib/firebase';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UserCircle, Building2, Mail, BadgeCheck, ShieldAlert, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Profile() {
  const { businessId } = useOutletContext();
  const [businessName, setBusinessName] = useState('');
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    if (!businessId) return;
    const fetchBiz = async () => {
      try {
        const d = await getDoc(doc(db, 'businesses', businessId));
        if (d.exists()) {
          setBusinessName(d.data().name || '');
        }
      } catch (err) {
        console.error("Failed to fetch organization", err);
      }
    };
    fetchBiz();
  }, [businessId]);

  const handleSaveOrganization = async () => {
    if (!businessId || !businessName.trim()) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'businesses', businessId), {
        name: businessName.trim(),
        updatedAt: serverTimestamp()
      });
      toast.success("Organization updated successfully", {
        description: "Your workspace has been renamed."
      });
    } catch (e) {
      console.error(e);
      toast.error("Failed to update organization");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 max-w-5xl mx-auto pt-4 md:pt-6">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Profile & Organization</h2>
        <p className="text-muted-foreground mt-1 font-medium">Manage your personal identity and workspace branding.</p>
      </div>

      <div className="grid gap-10 md:grid-cols-2">
        {/* Personal Identity Card */}
        <Card className="border shadow-sm overflow-hidden relative dark:border-white/10 p-2">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-accent via-purple-500 to-accent opacity-50" />
          <CardHeader className="pb-8 pt-6 px-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <UserCircle className="w-6 h-6 text-accent" />
              <CardTitle className="text-xl">Personal Information</CardTitle>
            </div>
            <CardDescription className="text-[15px]">Your verified administrator identity.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-10 px-6 pb-8">
            <div className="flex items-center gap-6 pb-6 border-b border-border/50">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/20 to-purple-500/20 border border-accent/20 flex flex-col items-center justify-center text-accent shadow-inner relative overflow-hidden">
                <div className="absolute inset-0 bg-accent/10 blur-xl"></div>
                <span className="text-3xl font-black relative z-10">{user?.email?.[0]?.toUpperCase()}</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-xl font-bold tracking-tight">{user?.displayName || "Administrator"}</h3>
                <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-50 dark:bg-emerald-500/10 px-2.5 py-0.5 rounded-full w-fit">
                  <BadgeCheck className="w-4 h-4" /> Fully Authenticated
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Account Email</Label>
                <div className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl border border-border/50">
                  <Mail className="w-5 h-5 text-muted-foreground" />
                  <span className="text-sm font-medium">{user?.email}</span>
                </div>
              </div>
              
              <div className="rounded-xl border border-amber-200/50 bg-amber-50 dark:bg-amber-500/10 p-4">
                <div className="flex gap-3 text-amber-600 dark:text-amber-400">
                  <ShieldAlert className="w-5 h-5 shrink-0" />
                  <div className="text-sm font-medium leading-tight">
                    To change your email or password, please contact enterprise support or manage your global Google Account.
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Organization / Workspace Card */}
        <Card className="border shadow-sm overflow-hidden relative dark:border-white/10 p-2">
          <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-cyan-400 to-blue-500 opacity-50" />
          <CardHeader className="pb-8 pt-6 px-6 relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-6 h-6 text-blue-500" />
              <CardTitle className="text-xl">Organization Details</CardTitle>
            </div>
            <CardDescription className="text-[15px]">Customize how your business appears to customers.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-10 px-6 pb-8">
            <div className="space-y-2">
              <Label htmlFor="org-name">Workspace / Organization Name</Label>
              <Input 
                id="org-name"
                value={businessName} 
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="E.g. Acme Coffee Roasters" 
                className="h-12 text-base font-medium rounded-xl bg-secondary/50 focus-visible:ring-blue-500"
              />
              <p className="text-[13px] text-muted-foreground font-medium pt-1">
                This name is used internally for your dashboard and may be displayed on public feedback forms.
              </p>
            </div>
            
            <div className="space-y-2 opacity-50 pointer-events-none">
              <Label>Brand Logo</Label>
              <div className="h-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-secondary/50">
                <span className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Sparkles className="w-4 h-4" /> Pro Feature Unlock
                </span>
              </div>
            </div>
            
          </CardContent>
          <CardFooter className="bg-secondary/30 flex justify-end p-4 border-t border-border/50">
            <Button 
              onClick={handleSaveOrganization} 
              disabled={loading || !businessName.trim()} 
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-full px-6 font-bold tracking-wide shadow-[0_0_15px_rgba(37,99,235,0.4)] transition-all hover:scale-105 active:scale-95"
            >
              {loading ? 'Saving...' : 'Save Organization'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
