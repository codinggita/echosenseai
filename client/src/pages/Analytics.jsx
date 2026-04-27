import { useOutletContext } from 'react-router';
import { motion } from 'motion/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BrainCircuit, Zap, TrendingUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export default function Analytics() {
  const { businessId } = useOutletContext();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessId) return;

    const q = query(
      collection(db, `businesses/${businessId}/feedbacks`),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fbData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFeedbacks(fbData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [businessId]);

  if (loading || !businessId) {
    return <div className="text-sm text-muted-foreground animate-pulse">Loading intelligence models...</div>;
  }

  // Derived data based on real feedbacks
  const dynamicTopics = [];
  const topicMap = new Map();

  feedbacks.forEach(f => {
    if (f.topics && Array.isArray(f.topics)) {
      f.topics.forEach((t) => {
        const tk = t.toLowerCase();
        if (!topicMap.has(tk)) topicMap.set(tk, { name: t, positive: 0, negative: 0, neutral: 0 });
        const item = topicMap.get(tk);
        if (f.score >= 70) item.positive += 1;
        else if (f.score <= 40) item.negative += 1;
        else item.neutral += 1;
      });
    }
  });

  const topTopics = Array.from(topicMap.values())
    .sort((a, b) => (b.positive+b.negative+b.neutral) - (a.positive+a.negative+a.neutral))
    .slice(0, 8)
    .map(t => ({ name: t.name, count: t.positive + t.negative + t.neutral }));

  const topTopicName = topTopics.length > 0 ? topTopics[0].name : "No Data Yet";

  // Calculate overall tilt
  let positiveTotal = 0;
  let negativeTotal = 0;
  feedbacks.forEach(f => {
    if (f.sentiment === 'positive') positiveTotal++;
    if (f.sentiment === 'negative') negativeTotal++;
  });
  
  let tiltLabel = "Neutral Baseline";
  let tiltColor = "text-neutral-500";
  let tiltDesc = "Awaiting more data";
  
  if (positiveTotal > negativeTotal + 1) {
    tiltLabel = "Positive Tilt";
    tiltColor = "text-emerald-600";
    tiltDesc = "Higher positive sentiment";
  } else if (negativeTotal > positiveTotal + 1) {
    tiltLabel = "Negative Tilt";
    tiltColor = "text-rose-600";
    tiltDesc = "Declining sentiment detected";
  }

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-8 pb-10">
      <div>
        <h2 className="text-3xl font-extrabold tracking-tight">Intelligence</h2>
        <p className="text-muted-foreground mt-1 font-medium">Deep-dive customer behavior and topic extraction.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div variants={item}>
          <Card className="h-full border-border shadow-sm flex flex-col justify-between overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform duration-500">
               <BrainCircuit className="w-32 h-32" />
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Feedback Processed</CardTitle>
            </CardHeader>
            <CardContent className="relative z-10">
              <div className="text-5xl font-extrabold text-accent">{feedbacks.length}</div>
              <p className="text-xs font-medium text-muted-foreground mt-2">Total feedback recorded to date.</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={item}>
          <Card className="h-full border-border shadow-sm">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Highest Velocity Topic</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold">{topTopicName}</div>
               <p className="text-sm font-medium text-muted-foreground mt-1 text-emerald-600 flex items-center gap-1">
                 <Zap className="w-4 h-4" /> Most discussed
               </p>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div variants={item}>
           <Card className="h-full border-border shadow-sm">
            <CardHeader className="pb-2">
               <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Overall Lift</CardTitle>
            </CardHeader>
            <CardContent>
               <div className="text-2xl font-bold text-foreground">{tiltLabel}</div>
               <p className={`text-sm font-medium mt-1 flex items-center gap-1 ${tiltColor}`}>
                 <TrendingUp className="w-4 h-4" /> {tiltDesc}
               </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={item}>
        <Card className="shadow-sm border-border">
          <CardHeader>
            <CardTitle>Top Extracted Topics</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-[300px] w-full">
               <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTopics} margin={{ top: 20, right: 30, left: 0, bottom: 5 }} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E4E7" />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{ fill: '#52525B', fontSize: 13, fontWeight: 500 }} />
                    <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E4E4E7', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}/>
                    <Bar dataKey="count" fill="#2563EB" radius={[0, 4, 4, 0]} maxBarSize={32} />
                  </BarChart>
               </ResponsiveContainer>
             </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
