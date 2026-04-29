import { useOutletContext } from 'react-router';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState, useEffect, useCallback } from 'react';
import { collection, query, getDocs, addDoc, serverTimestamp, doc, deleteDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trash2, UserPlus, Loader2, RefreshCw } from 'lucide-react';

export default function StaffTracking() {
  const { businessId } = useOutletContext();
  const [members, setMembers] = useState([]);
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Add member form state
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('staff');
  const [addingMember, setAddingMember] = useState(false);

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    try {
      const membersQ = query(collection(db, `businesses/${businessId}/members`));
      const feedbacksQ = query(collection(db, `businesses/${businessId}/feedbacks`));

      const [memberSnap, feedbackSnap] = await Promise.all([
        getDocs(membersQ),
        getDocs(feedbacksQ)
      ]);

      setMembers(memberSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setFeedbacks(feedbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error("Staff tracking fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!inviteEmail || !inviteName || !businessId) return;
    
    setAddingMember(true);
    try {
      await addDoc(collection(db, `businesses/${businessId}/members`), {
        email: inviteEmail,
        name: inviteName,
        role: inviteRole,
        joinedAt: serverTimestamp()
      });
      setInviteEmail('');
      setInviteName('');
      setInviteRole('staff');
      fetchData();
    } catch (err) {
      console.error("Failed to add member:", err);
      alert(err.message || "Failed to add member.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!businessId) return;
    try {
      await deleteDoc(doc(db, `businesses/${businessId}/members`, memberId));
      fetchData();
    } catch (err) {
      console.error(err.message);
    }
  };

  // Compute staff impact based on Feedback assignees
  const staffMetrics = members.map(member => {
    // Find all feedbacks that mention this staff member's name in topics or text
    const relatedFeedbacks = feedbacks.filter(f => 
      f.assigneeId === member.id || 
      (f.text && f.text.toLowerCase().includes(member.name.toLowerCase().split(' ')[0])) ||
      (f.topics && f.topics.some((t) => t.toLowerCase().includes(member.name.toLowerCase().split(' ')[0])))
    );
    
    const mentions = relatedFeedbacks.length;
    const avgScore = mentions > 0 
      ? Math.round(relatedFeedbacks.reduce((sum, f) => sum + (f.score || 50), 0) / mentions)
      : null; // Null means no data yet

    let status = "Not Evaluated";
    if (avgScore !== null) {
      if (avgScore >= 80) status = "Excellent";
      else if (avgScore >= 60) status = "Good";
      else if (avgScore >= 40) status = "Needs Review";
      else status = "Critical Action Reqd";
    }

    return {
      ...member,
      mentions,
      score: avgScore,
      status
    };
  });

  const container = {
    hidden: { opacity: 0 },
    show: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemAnim = {
    hidden: { opacity: 0, scale: 0.95 },
    show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  if(loading) return <div className="text-muted-foreground animate-pulse">Loading staff records...</div>;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-10 max-w-6xl">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-extrabold tracking-tight">Staff Roster</h2>
          <p className="text-muted-foreground mt-1 font-medium">
            Staff impact scores are calculated automatically. Feedback scores are attributed to staff either explicitly (via assignment in the Feed tab) or implicitly (if the AI extracts their first name from the voice recording).
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {staffMetrics.map((staff) => (
          <motion.div key={staff.id} variants={itemAnim}>
            <Card className="h-full shadow-sm hover:shadow-md transition-shadow border-border group cursor-pointer relative overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start pt-1">
                  <div className="w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg mb-2 capitalize">
                    {staff.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex items-center gap-2 relative z-20">
                    <Badge variant={staff.score !== null ? (staff.score >= 80 ? 'default' : staff.score >= 50 ? 'secondary' : 'destructive') : 'outline'} className="font-semibold px-2 text-[10px]">
                      {staff.status}
                    </Badge>
                    <button 
                      onClick={() => handleRemoveMember(staff.id)}
                      className="p-1.5 rounded-full hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Remove Staff Member"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <CardTitle className="text-lg font-bold">{staff.name}</CardTitle>
                <CardDescription className="capitalize text-xs font-semibold tracking-wider">{staff.role}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-3 mt-2">
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Customer Mentions</div>
                    <div className="text-2xl font-bold">{staff.mentions}</div>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-3">
                    <div className="text-xs font-semibold uppercase text-muted-foreground mb-1">Impact Score</div>
                    <div className="text-2xl font-bold">{staff.score !== null ? `${staff.score}/100` : '--'}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Card className="max-w-2xl mt-12 bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
             <UserPlus className="w-5 h-5" /> Add Staff Member
          </CardTitle>
          <CardDescription>
            Inputting their email pre-authorizes them. When they log into the portal using this exact Google email, they will automatically gain access to this Business Dashboard without needing a password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddMember} className="flex flex-col md:flex-row gap-4 items-end">
            <div className="space-y-2 flex-1 w-full">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Full Name</label>
              <Input 
                placeholder="Ex: Emma Smith" 
                value={inviteName} 
                onChange={(e) => setInviteName(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2 flex-[1.5] w-full">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Email</label>
              <Input 
                type="email" 
                placeholder="staff@company.com" 
                value={inviteEmail} 
                onChange={(e) => setInviteEmail(e.target.value)} 
                required 
              />
            </div>
            <div className="space-y-2 flex-[0.8] w-full">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Role</label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={addingMember} className="w-full md:w-auto h-10 mt-4 md:mt-0">
              {addingMember ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Invite'}
            </Button>
          </form>
        </CardContent>
      </Card>

    </motion.div>
  );
}
