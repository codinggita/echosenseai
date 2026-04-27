import { useEffect, useState } from 'react';
import { useOutletContext } from 'react-router';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { Play, Pause, AlertCircle } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function FeedbackList() {
  const { businessId } = useOutletContext();
  const [feedbacks, setFeedbacks] = useState([]);
  const [members, setMembers] = useState([]);
  const [playingId, setPlayingId] = useState(null);
  const [audioSource, setAudioSource] = useState(null);

  useEffect(() => {
    if (!businessId) return;
    
    // Fetch feedbacks
    const qFeedbacks = query(
      collection(db, `businesses/${businessId}/feedbacks`),
      orderBy('createdAt', 'desc')
    );
    const unsubFeedbacks = onSnapshot(qFeedbacks, (snapshot) => {
      setFeedbacks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Feedback list snapshot error:", err));

    // Fetch members for assignment
    const qMembers = query(collection(db, `businesses/${businessId}/members`));
    const unsubMembers = onSnapshot(qMembers, (snapshot) => {
      setMembers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (err) => console.error("Members snapshot error:", err));

    return () => {
      unsubFeedbacks();
      unsubMembers();
    };
  }, [businessId]);

  const updateStatus = async (id, newStatus) => {
    if (!businessId) return;
    await updateDoc(doc(db, `businesses/${businessId}/feedbacks`, id), {
      status: newStatus,
      updatedAt: serverTimestamp()
    });
  };

  const updateAssignee = async (id, assigneeId) => {
    if (!businessId) return;
    await updateDoc(doc(db, `businesses/${businessId}/feedbacks`, id), {
      assigneeId: assigneeId === 'unassigned' ? null : assigneeId,
      updatedAt: serverTimestamp()
    });
  };

  const playAudio = async (id, base64) => {
    if (playingId === id && audioSource) {
      audioSource.pause();
      setPlayingId(null);
      return;
    }
    
    if (audioSource) audioSource.pause();

    try {
      const parts = base64.split('|');
      let ext = 'webm';
      let pureBase64 = base64;
      
      if (parts.length > 1) {
        ext = parts[0];
        pureBase64 = parts[1];
      }

      const res = await fetch(`data:audio/${ext};base64,${pureBase64}`).catch(() => null);
      if (!res) throw new Error("Fetch failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      
      const audio = new Audio(url);
      audio.onended = () => {
        setPlayingId(null);
        URL.revokeObjectURL(url);
      };
      
      // Fallback if browser complains about blob url container
      audio.onerror = () => {
         console.warn("Blob playback failed, trying raw data URI fallback");
         const fallbackAudio = new Audio(`data:audio/webm;base64,${base64}`);
         fallbackAudio.onended = () => setPlayingId(null);
         fallbackAudio.play().catch(e => {
            console.error("Audio playback completely failed:", e);
            setPlayingId(null);
         });
         setAudioSource(fallbackAudio);
      };

      await audio.play();
      setAudioSource(audio);
      setPlayingId(id);
    } catch (err) {
      console.error("Audio decoding error:", err);
      // Absolute fallback
      const fallbackAudio = new Audio(`data:audio/mp3;base64,${base64}`);
      fallbackAudio.onended = () => setPlayingId(null);
      fallbackAudio.play().catch(e => setPlayingId(null));
      setAudioSource(fallbackAudio);
      setPlayingId(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-semibold tracking-tight">Feedback Inbox</h2>
        <p className="text-muted-foreground">Manage and resolve customer experiences.</p>
      </div>

      <div className="space-y-4">
        {feedbacks.map((fb) => (
          <Card key={fb.id} className="p-6 transition-colors hover:bg-neutral-50/50 dark:hover:bg-zinc-900/50">
            <div className="flex flex-col md:flex-row md:gap-8">
              {/* Audio & Score Column */}
              <div className="flex-shrink-0 flex md:flex-col items-center gap-4 md:w-32 mb-4 md:mb-0 pb-4 md:pb-0 border-b md:border-b-0 md:border-r border-border">
                <div className="text-center">
                  <div className="text-3xl font-light leading-none">{fb.score}</div>
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mt-1">Score</div>
                </div>
                
                {fb.audioBase64 && (
                  <button 
                    onClick={() => playAudio(fb.id, fb.audioBase64)}
                    className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center hover:bg-secondary/80 transition-colors"
                  >
                    {playingId === fb.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                  </button>
                )}
              </div>

              {/* Content Column */}
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant={fb.sentiment === 'positive' ? 'default' : fb.sentiment === 'negative' ? 'destructive' : 'secondary'}>
                    {fb.sentiment}
                  </Badge>
                  <Badge variant="outline" className="bg-transparent capitalize">{fb.emotion}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {fb.createdAt?.toDate ? format(fb.createdAt.toDate(), 'MMM d, h:mm a') : 'Just now'}
                  </span>
                  {fb.sentiment === 'negative' && (
                    <span className="flex items-center text-xs text-rose-500 font-medium ml-auto">
                      <AlertCircle className="w-3.5 h-3.5 mr-1" />
                      Critical
                    </span>
                  )}
                </div>

                <div className="flex flex-col gap-3">
                  <p className="text-foreground text-lg font-medium leading-relaxed">
                    "{fb.text}"
                  </p>

                  {fb.customerContact && (
                    <div className="flex items-center text-sm font-medium text-muted-foreground bg-neutral-100 dark:bg-zinc-800/50 w-fit px-3 py-1.5 rounded-md border border-neutral-200 dark:border-zinc-700">
                      <span className="mr-2 text-[10px] uppercase font-bold tracking-wider opacity-70">Contact:</span> 
                      {fb.customerContact}
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2 mt-1">
                    {fb.topics?.map((topic) => (
                      <span key={topic} className="px-2 py-1 bg-secondary text-secondary-foreground rounded text-xs font-medium uppercase tracking-wider">
                        {topic}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Column */}
              <div className="flex-shrink-0 md:w-48 pl-0 md:pl-4 border-t md:border-t-0 md:border-l border-border pt-4 md:pt-0 space-y-4">
                <div>
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">Status</div>
                  <Select value={fb.status} onValueChange={(val) => updateStatus(fb.id, val)}>
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Open</SelectItem>
                      <SelectItem value="in-progress">In Progress</SelectItem>
                      <SelectItem value="resolved">Resolved</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <div className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-2">Assignee</div>
                  <Select value={fb.assigneeId || 'unassigned'} onValueChange={(val) => updateAssignee(fb.id, val)}>
                    <SelectTrigger className="h-8 text-xs font-medium">
                      <SelectValue placeholder="Assign Staff" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </Card>
        ))}

        {feedbacks.length === 0 && (
          <div className="text-center py-16 px-4 bg-white rounded-lg border border-dashed">
            <h3 className="text-lg font-medium text-neutral-900 mb-1">Inbox Zero</h3>
            <p className="text-neutral-500 text-sm">No feedback has been captured yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
