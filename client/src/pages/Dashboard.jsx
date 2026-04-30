import { useEffect, useState, useCallback } from 'react';
import { useOutletContext, Link } from 'react-router';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { format, subDays } from 'date-fns';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';
import { Helmet } from 'react-helmet-async';

export default function DashboardHome() {
  const { businessId } = useOutletContext();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeedbacks = useCallback(async () => {
    if (!businessId) return;
    try {
      const q = query(
        collection(db, `businesses/${businessId}/feedbacks`),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const fbData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setFeedbacks(fbData);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchFeedbacks();
  }, [fetchFeedbacks]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFeedbacks();
  };

  if (loading || !businessId) {
    return <div className="text-sm font-medium text-muted-foreground">Loading workspace data...</div>;
  }

  // Calculate metrics
  const totalFeedback = feedbacks.length;
  const avgScore = totalFeedback > 0 
    ? Math.round(feedbacks.reduce((acc, curr) => acc + (curr.score || 50), 0) / totalFeedback)
    : 0;
  
  const negativeCount = feedbacks.filter(f => f.sentiment === 'negative').length;
  const positiveCount = feedbacks.filter(f => f.sentiment === 'positive').length;
  const neutralCount = feedbacks.filter(f => f.sentiment === 'neutral').length;

  const satisfiedPct = totalFeedback > 0 ? Math.round((positiveCount / totalFeedback) * 100) : 0;
  const neutralPct = totalFeedback > 0 ? Math.round((neutralCount / totalFeedback) * 100) : 0;
  const angryCount = feedbacks.filter(f => f.emotion === 'angry').length;
  const frustratedCount = feedbacks.filter(f => f.emotion === 'frustrated').length;
  const angryPct = totalFeedback > 0 ? Math.round((angryCount / totalFeedback) * 100) : 0;
  const frustratedPct = totalFeedback > 0 ? Math.round((frustratedCount / totalFeedback) * 100) : 0;

  // Real chart data (simulated grouping since it's just visual)
  const qrSourceCount = feedbacks.filter(f => f.source === 'qr').length;
  const qrPct = totalFeedback > 0 ? Math.round((qrSourceCount / totalFeedback) * 100) : 0;

  const containerAnimations = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemAnimations = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerAnimations} initial="hidden" animate="show" className="h-full flex flex-col">
      <Helmet>
        <title>Dashboard | Klyvora AI</title>
      </Helmet>
      
      {/* Refresh Button */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary transition-all active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 md:grid-rows-6 gap-4 min-h-[700px] h-full pb-10">
        
        <motion.div variants={itemAnimations} className="md:col-span-4 lg:col-span-3 md:row-span-2 flex flex-col">
          <Card className="h-full flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow p-5 rounded-xl">
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-3">Average Sentiment</div>
            <div className="text-4xl font-bold leading-none">{avgScore}</div>
            <div className="text-[13px] font-medium mt-1 text-success">+2.1% from last week</div>
            <div className="flex-grow flex items-end gap-1 mt-4">
              <div className="h-[40%] w-[20%] bg-accent/20 dark:bg-accent/15 rounded-t-[4px] hover:bg-accent transition-colors"></div>
              <div className="h-[60%] w-[20%] bg-accent/20 dark:bg-accent/15 rounded-t-[4px] hover:bg-accent transition-colors"></div>
              <div className="h-[85%] w-[20%] bg-accent rounded-t-[4px]"></div>
              <div className="h-[50%] w-[20%] bg-accent/20 dark:bg-accent/15 rounded-t-[4px] hover:bg-accent transition-colors"></div>
              <div className="h-[75%] w-[20%] bg-accent/20 dark:bg-accent/15 rounded-t-[4px] hover:bg-accent transition-colors"></div>
            </div>
          </Card>
        </motion.div>
        
        {/* Card 2: Voice Feedback Volume */}
        <motion.div variants={itemAnimations} className="md:col-span-4 lg:col-span-3 md:row-span-2 flex flex-col">
          <Card className="h-full flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow p-5 rounded-xl">
            <div>
              <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-3">Voice Feedback Volume</div>
              <div className="text-4xl font-bold leading-none">{totalFeedback}</div>
              <div className="text-[13px] font-medium mt-1 text-foreground">Total recordings</div>
            </div>
            <div className="mt-4 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span>QR Access</span>
                <span className="font-semibold">{qrPct}%</span>
              </div>
              <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${qrPct}%` }} transition={{ duration: 1, delay: 0.5 }} className="h-full bg-accent rounded-full"></motion.div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Card 3: Live Feedback Stream */}
        <motion.div variants={itemAnimations} className="md:col-span-4 lg:col-span-6 md:row-span-2 flex flex-col">
          <Card className="h-full flex flex-col shadow-sm hover:shadow-md transition-shadow p-5 rounded-xl overflow-hidden group">
            <div className="flex justify-between items-center mb-3 shrink-0">
               <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground">Recent Feedback</div>
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          <div className="flex flex-col gap-3 overflow-auto flex-1">
            {feedbacks.slice(0, 3).map((fb, idx) => (
              <div key={fb.id} className={`flex gap-3 items-center ${idx > 0 ? 'opacity-60' : ''}`}>
                <div className="flex items-center gap-[3px] h-8 shrink-0">
                  <div className={`w-1 rounded-full ${idx === 0 ? 'bg-accent' : 'bg-muted-foreground/40'} h-3`}></div>
                  <div className={`w-1 rounded-full ${idx === 0 ? 'bg-accent' : 'bg-muted-foreground/40'} h-6`}></div>
                  <div className={`w-1 rounded-full ${idx === 0 ? 'bg-accent' : 'bg-muted-foreground/40'} h-4`}></div>
                </div>
                <div className="flex-grow min-w-0">
                  <div className="text-[13px] font-medium truncate">{fb.text}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate border-separate">
                    Recorded {fb.createdAt?.toDate ? format(fb.createdAt.toDate(), 'h:mm a') : 'Now'} &bull; {fb.emotion} &bull; {fb.source}
                  </div>
                </div>
                <div className={`shrink-0 text-[11px] px-2 py-0.5 rounded-[4px] font-semibold
                  ${fb.sentiment === 'negative' ? 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-400' : 
                    fb.sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-400' : 
                    'bg-secondary text-muted-foreground'}`
                }>
                  {fb.sentiment === 'negative' ? 'Critical' : fb.sentiment === 'positive' ? 'Positive' : 'Neutral'}
                </div>
              </div>
            ))}
            {feedbacks.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">No feedback recorded yet.</div>
            )}
          </div>
          </Card>
        </motion.div>

        {/* Card 4: Emotional Intelligence Index */}
        <motion.div variants={itemAnimations} className="md:col-span-4 lg:col-span-4 md:row-span-4 flex flex-col">
          <Card className="h-full flex flex-col shadow-sm p-5 rounded-xl hover:shadow-md transition-shadow">
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-3">Emotional Intelligence Index</div>
            <div className="flex-grow flex flex-col justify-around py-2">
              
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span>Satisfied</span>
                  <span className="font-semibold">{satisfiedPct}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${satisfiedPct}%` }} transition={{ duration: 1, delay: 0.6 }} className="h-full bg-emerald-600 dark:bg-emerald-500 rounded-full"></motion.div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span>Neutral</span>
                  <span className="font-semibold">{neutralPct}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${neutralPct}%` }} transition={{ duration: 1, delay: 0.7 }} className="h-full bg-slate-400 dark:bg-slate-500 rounded-full"></motion.div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span>Frustrated</span>
                  <span className="font-semibold">{frustratedPct}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${frustratedPct}%` }} transition={{ duration: 1, delay: 0.8 }} className="h-full bg-orange-500 dark:bg-orange-600 rounded-full"></motion.div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span>Angry</span>
                  <span className="font-semibold">{angryPct}%</span>
                </div>
                <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${angryPct}%` }} transition={{ duration: 1, delay: 0.9 }} className="h-full bg-red-600 dark:bg-red-500 rounded-full"></motion.div>
                </div>
              </div>

            </div>
          </Card>
        </motion.div>

        {/* Card 5: Key Issues & Topics */}
        <motion.div variants={itemAnimations} className="md:col-span-4 lg:col-span-5 md:row-span-4 flex flex-col">
          <Card className="h-full flex flex-col shadow-sm p-5 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-3">Key Issues & Topics</div>
          <div className="flex flex-wrap gap-2">
            {/* Generate tags from actual topics if available, else placeholders */}
            {(() => {
              const allTopics = feedbacks.flatMap(f => f.topics || []).reduce((acc, t) => {
                acc[t] = (acc[t] || 0) + 1;
                return acc;
              }, {});
              const sorted = Object.entries(allTopics).sort((a, b) => b[1] - a[1]).slice(0, 8);
              
              if (sorted.length > 0) {
                return sorted.map(([t, count], idx) => (
                  <div key={t} className={`text-[13px] px-3 py-2 rounded-[4px] font-semibold whitespace-nowrap
                    ${idx === 0 ? 'bg-accent/15 text-accent dark:bg-accent/20 dark:text-accent' : 'bg-secondary text-foreground'}`}>
                    {t} ({count})
                  </div>
                ));
              } else {
                return (
                  <div className="text-sm font-medium text-muted-foreground py-2">No topics extracted yet. Record feedback to see analysis.</div>
                )
              }
            })()}
          </div>
          
          <div className="mt-auto">
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-3">Topic Sentiment Trend</div>
            <div className="h-[100px] w-full border-l border-b border-border relative overflow-hidden group-hover:border-accent transition-colors">
               <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-full fill-none stroke-accent stroke-2">
                 <motion.path 
                   initial={{ pathLength: 0 }}
                   animate={{ pathLength: 1 }}
                   transition={{ duration: 1.5, ease: "easeInOut" }}
                   d="M0,35 Q10,30 20,25 T40,28 T60,15 T80,10 T100,5"
                 />
               </svg>
            </div>
          </div>
          </Card>
        </motion.div>

        {/* Card 6: Critical Alerts */}
        <motion.div variants={itemAnimations} className="md:col-span-4 lg:col-span-3 md:row-span-4 flex flex-col">
          <Card className="h-full flex flex-col justify-between shadow-sm p-5 rounded-xl hover:shadow-md transition-shadow">
            <div className="text-xs font-semibold uppercase tracking-[0.05em] text-muted-foreground mb-3 shrink-0 flex justify-between items-center">
              Critical Alerts
              {negativeCount > 0 && <span className="bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400 px-2 py-0.5 rounded-full text-[10px]">{negativeCount} New</span>}
            </div>
            
            <div className="flex flex-col flex-1 overflow-auto -mx-5 px-5">
              {feedbacks.filter(f => f.sentiment === 'negative' || f.score < 50).slice(0, 5).map(f => (
                <div key={f.id} className="py-2.5 border-b border-border flex justify-between items-center group cursor-pointer hover:bg-secondary/50 px-2 -mx-2 rounded-md transition-colors">
                   <div className="flex flex-col gap-1 max-w-[80%]">
                    <div className="flex items-center gap-2">
                       <div className="w-2 h-2 rounded-full bg-destructive shrink-0"></div>
                       <span className="text-[13px] font-semibold text-foreground truncate">{f.topics?.[0] || 'Issue Detected'}</span>
                    </div>
                    <span className="text-[11px] text-muted-foreground truncate pl-4">{f.text}</span>
                  </div>
                  <span className="text-[11px] text-red-500 dark:text-red-400 font-medium whitespace-nowrap bg-red-50 dark:bg-red-900/30 px-2 py-1 rounded-md">Score: {f.score}</span>
                </div>
              ))}
              
              {feedbacks.filter(f => f.sentiment === 'negative' || f.score < 50).length === 0 && (
                 <div className="py-6 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">No critical alerts entirely!</div>
              )}
            </div>

            <div className="mt-4 pt-2 shrink-0">
              <Link to="/feedback">
                <button className="w-full py-2.5 bg-foreground text-background rounded-lg text-xs font-semibold hover:bg-foreground/90 hover:scale-[1.02] shadow-sm transition-all active:scale-[0.98]">
                  Review Escalations
                </button>
              </Link>
            </div>
          </Card>
        </motion.div>

      </div>
    </motion.div>
  );
}
