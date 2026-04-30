import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area, Cell, PieChart, Pie } from 'recharts';
import { BrainCircuit, TrendingUp, TrendingDown, AlertTriangle, Clock, Lightbulb, Sparkles, Target, ShieldAlert, Activity, Zap, Bell, Layers, Timer, Flame, ThumbsUp, ThumbsDown, Minus, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, formatDistanceToNow } from 'date-fns';
import { auth, db } from '../lib/firebase';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { Helmet } from 'react-helmet-async';

// ─── Constants ───────────────────────────────────────
const INSIGHT_ICONS = { trend: TrendingUp, pattern: Clock, issue: AlertTriangle };
const INSIGHT_COLORS = {
  trend: { bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-800', text: 'text-blue-700 dark:text-blue-400', icon: 'text-blue-500' },
  pattern: { bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-800', text: 'text-amber-700 dark:text-amber-400', icon: 'text-amber-500' },
  issue: { bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-800', text: 'text-rose-700 dark:text-rose-400', icon: 'text-rose-500' },
};

const SEVERITY_CONFIG = {
  critical: { color: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/30', border: 'border-rose-300 dark:border-rose-800', icon: Flame },
  high: { color: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/30', border: 'border-orange-300 dark:border-orange-800', icon: AlertTriangle },
  medium: { color: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-300 dark:border-amber-800', icon: Bell },
  low: { color: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-300 dark:border-blue-800', icon: Lightbulb },
};

const SENTIMENT_COLORS = ['#10B981', '#94A3B8', '#F43F5E'];

// ─── Analytics Engine ────────────────────────────────
function generateInsightsData(feedbackList) {
  const now = new Date();
  const last24h = new Date(now - 24 * 60 * 60 * 1000);
  const prev24h = new Date(now - 48 * 60 * 60 * 1000);
  const last6h = new Date(now - 6 * 60 * 60 * 1000);

  const todayFeedbacks = feedbackList.filter(f => f.createdAt >= last24h);
  const yesterdayFeedbacks = feedbackList.filter(f => f.createdAt >= prev24h && f.createdAt < last24h);
  const generatedInsights = [];

  const todayTopics = {};
  const yesterdayTopics = {};
  todayFeedbacks.forEach(f => (f.topics || []).forEach(t => { todayTopics[t.toLowerCase()] = (todayTopics[t.toLowerCase()] || 0) + 1; }));
  yesterdayFeedbacks.forEach(f => (f.topics || []).forEach(t => { yesterdayTopics[t.toLowerCase()] = (yesterdayTopics[t.toLowerCase()] || 0) + 1; }));

  for (const [topic, todayCount] of Object.entries(todayTopics)) {
    const yesterdayCount = yesterdayTopics[topic] || 0;
    if (yesterdayCount > 0) {
      const pct = Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100);
      if (Math.abs(pct) >= 20) {
        generatedInsights.push({ type: "trend", priority: pct > 0 ? 2 : 1, message: `"${topic}" mentions ${pct > 0 ? 'increased' : 'decreased'} by ${Math.abs(pct)}% compared to yesterday` });
      }
    } else if (todayCount >= 2) {
      generatedInsights.push({ type: "trend", priority: 2, message: `New trending topic: "${topic}" appeared ${todayCount} times today` });
    }
  }

  const todayPosPct = todayFeedbacks.length ? Math.round((todayFeedbacks.filter(f => f.sentiment === 'positive').length / todayFeedbacks.length) * 100) : 0;
  const todayNegPct = todayFeedbacks.length ? Math.round((todayFeedbacks.filter(f => f.sentiment === 'negative').length / todayFeedbacks.length) * 100) : 0;
  const yesterdayNegPct = yesterdayFeedbacks.length ? Math.round((yesterdayFeedbacks.filter(f => f.sentiment === 'negative').length / yesterdayFeedbacks.length) * 100) : 0;

  if (todayNegPct > yesterdayNegPct + 10) {
    generatedInsights.push({ type: "trend", priority: 3, message: `Negative sentiment rose to ${todayNegPct}% today (was ${yesterdayNegPct}% yesterday)` });
  } else if (todayPosPct > 70 && todayFeedbacks.length >= 2) {
    generatedInsights.push({ type: "trend", priority: 0, message: `Strong positive day: ${todayPosPct}% of feedback is positive` });
  }

  const hourBuckets = {};
  todayFeedbacks.filter(f => f.sentiment === 'negative').forEach(f => {
    const h = f.createdAt.getHours();
    hourBuckets[h] = (hourBuckets[h] || 0) + 1;
  });
  const sortedHours = Object.entries(hourBuckets).sort((a, b) => b[1] - a[1]);
  if (sortedHours.length > 0 && sortedHours[0][1] >= 2) {
    const peakHour = parseInt(sortedHours[0][0]);
    generatedInsights.push({ type: "pattern", priority: 2, message: `Peak dissatisfaction around ${peakHour > 12 ? peakHour - 12 : peakHour} ${peakHour >= 12 ? 'PM' : 'AM'} (${sortedHours[0][1]} negative reports)` });
  }

  const recentFeedbacks = feedbackList.filter(f => f.createdAt >= last6h);
  const recentTopics = {};
  recentFeedbacks.forEach(f => (f.topics || []).forEach(t => { recentTopics[t.toLowerCase()] = (recentTopics[t.toLowerCase()] || 0) + 1; }));
  const threshold = recentFeedbacks.length >= 20 ? 5 : 3;
  for (const [topic, count] of Object.entries(recentTopics)) {
    if (count >= threshold) {
      generatedInsights.push({ type: "issue", priority: 3, message: `Repeated issue: "${topic}" (${count} reports in last 6 hours)` });
    }
  }

  generatedInsights.sort((a, b) => b.priority - a.priority);
  return { insights: generatedInsights };
}

function generateSummaryData(feedbackList) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart - 24 * 60 * 60 * 1000);

  const todayFeedbacks = feedbackList.filter(f => f.createdAt >= todayStart);
  const yesterdayFeedbacks = feedbackList.filter(f => f.createdAt >= yesterdayStart && f.createdAt < todayStart);

  const topicCounts = {};
  todayFeedbacks.forEach(f => (f.topics || []).forEach(t => {
    const key = t.toLowerCase();
    topicCounts[key] = { name: t, count: (topicCounts[key]?.count || 0) + 1 };
  }));
  const topIssue = Object.values(topicCounts).sort((a, b) => b.count - a.count)[0];

  const todayTotal = todayFeedbacks.length;
  const todayPositive = todayFeedbacks.filter(f => f.sentiment === 'positive').length;
  const todayNegative = todayFeedbacks.filter(f => f.sentiment === 'negative').length;
  const posPct = todayTotal > 0 ? Math.round((todayPositive / todayTotal) * 100) : 0;
  const negPct = todayTotal > 0 ? Math.round((todayNegative / todayTotal) * 100) : 0;
  const neuPct = todayTotal > 0 ? 100 - posPct - negPct : 0;

  let trend = "No previous data to compare";
  if (yesterdayFeedbacks.length > 0) {
    const yPosPct = yesterdayFeedbacks.filter(f => f.sentiment === 'positive').length / yesterdayFeedbacks.length;
    const tPosPct = todayPositive / (todayTotal || 1);
    if (tPosPct > yPosPct + 0.05) trend = "Customer satisfaction improved compared to yesterday";
    else if (tPosPct < yPosPct - 0.05) trend = "Customer satisfaction declined compared to yesterday";
    else trend = "Customer satisfaction is stable compared to yesterday";
  }

  const hourlyData = Array.from({ length: 24 }, (_, i) => ({ hour: `${i.toString().padStart(2, '0')}:00`, positive: 0, negative: 0, neutral: 0, total: 0 }));
  todayFeedbacks.forEach(f => {
    const h = f.createdAt.getHours();
    hourlyData[h].total += 1;
    if (f.sentiment === 'positive') hourlyData[h].positive += 1;
    else if (f.sentiment === 'negative') hourlyData[h].negative += 1;
    else hourlyData[h].neutral += 1;
  });

  return {
    date: todayStart.toISOString().split('T')[0],
    total_feedback: todayTotal,
    overall_sentiment: posPct >= negPct ? `Positive (${posPct}%)` : `Negative (${negPct}%)`,
    sentiment_breakdown: { positive: posPct, neutral: neuPct, negative: negPct },
    top_issue: topIssue ? topIssue.name : "No data yet",
    top_issue_count: topIssue ? topIssue.count : 0,
    critical_alerts: todayNegative,
    avg_score: todayTotal > 0 ? Math.round(todayFeedbacks.reduce((s, f) => s + (f.score || 50), 0) / todayTotal) : 0,
    trend,
    comparison: { change: yesterdayFeedbacks.length > 0 ? Math.round(((todayTotal - yesterdayFeedbacks.length) / yesterdayFeedbacks.length) * 100) : 0 },
    hourly_data: hourlyData,
    topic_breakdown: Object.values(topicCounts).sort((a, b) => b.count - a.count).slice(0, 10)
  };
}

// ─── Smart Alert System ──────────────────────────────
function generateSmartAlerts(feedbackList) {
  const now = new Date();
  const last1h = new Date(now - 1 * 60 * 60 * 1000);
  const last6h = new Date(now - 6 * 60 * 60 * 1000);
  const last24h = new Date(now - 24 * 60 * 60 * 1000);
  const ALERT_EXPIRY_MS = 6 * 60 * 60 * 1000; // 6 hours

  const alerts = [];
  const lastHourFeedbacks = feedbackList.filter(f => f.createdAt >= last1h);
  const last6hFeedbacks = feedbackList.filter(f => f.createdAt >= last6h);
  const last24hFeedbacks = feedbackList.filter(f => f.createdAt >= last24h);

  // A. High Negative Feedback in last hour
  const negLastHour = lastHourFeedbacks.filter(f => f.sentiment === 'negative');
  const negThreshold = Math.max(2, Math.round(lastHourFeedbacks.length * 0.4));
  if (negLastHour.length >= negThreshold && negLastHour.length >= 2) {
    alerts.push({
      type: "critical",
      severity: negLastHour.length >= 5 ? "critical" : "high",
      message: `${negLastHour.length} negative feedback reports in the last hour (${lastHourFeedbacks.length > 0 ? Math.round((negLastHour.length / lastHourFeedbacks.length) * 100) : 0}% negative rate)`,
      topic: "negative_saturation",
      count: negLastHour.length,
      timeWindow: "1 hour",
      timestamp: now,
      expiresAt: new Date(now.getTime() + ALERT_EXPIRY_MS)
    });
  }

  // B. Repeated Topic Issues (same topic multiple times in last 6 hours)
  const topicCounts6h = {};
  last6hFeedbacks.forEach(f => (f.topics || []).forEach(t => {
    const key = t.toLowerCase();
    if (!topicCounts6h[key]) topicCounts6h[key] = { name: t, count: 0, neg: 0 };
    topicCounts6h[key].count += 1;
    if (f.sentiment === 'negative') topicCounts6h[key].neg += 1;
  }));

  for (const [key, data] of Object.entries(topicCounts6h)) {
    const repeatedThreshold = last6hFeedbacks.length >= 20 ? 5 : 3;
    if (data.count >= repeatedThreshold) {
      const negRatio = data.count > 0 ? data.neg / data.count : 0;
      alerts.push({
        type: negRatio > 0.5 ? "critical" : "warning",
        severity: negRatio > 0.6 ? "critical" : data.count >= 5 ? "high" : "medium",
        message: `Repeated complaints about "${data.name}" (${data.count} in last 6 hours${data.neg > 0 ? `, ${data.neg} negative` : ''})`,
        topic: data.name,
        count: data.count,
        timeWindow: "6 hours",
        timestamp: now,
        expiresAt: new Date(now.getTime() + ALERT_EXPIRY_MS)
      });
    }
  }

  // C. Sudden Spike Detection
  if (last24hFeedbacks.length > 0) {
    const avgPerHour = last24hFeedbacks.length / 24;
    const lastHourCount = lastHourFeedbacks.length;
    if (avgPerHour > 0 && lastHourCount > avgPerHour * 2.5 && lastHourCount >= 3) {
      alerts.push({
        type: "spike",
        severity: lastHourCount > avgPerHour * 4 ? "critical" : "high",
        message: `Sudden feedback spike: ${lastHourCount} reports in last hour (avg: ${avgPerHour.toFixed(1)}/hr) — ${Math.round((lastHourCount / avgPerHour) * 100 - 100)}% above normal`,
        topic: "volume_spike",
        count: lastHourCount,
        timeWindow: "1 hour",
        timestamp: now,
        expiresAt: new Date(now.getTime() + ALERT_EXPIRY_MS)
      });
    }
  }

  // Sort by severity priority
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  alerts.sort((a, b) => (severityOrder[a.severity] ?? 4) - (severityOrder[b.severity] ?? 4));

  return alerts;
}

// ─── Feedback Clustering ─────────────────────────────
function generateTopicClusters(feedbackList) {
  const clusters = {};

  feedbackList.forEach(f => {
    (f.topics || []).forEach(t => {
      const key = t.toLowerCase();
      if (!clusters[key]) {
        clusters[key] = { topic: t, total: 0, sentiment: { positive: 0, negative: 0, neutral: 0 } };
      }
      clusters[key].total += 1;
      const sent = f.sentiment || 'neutral';
      if (sent === 'positive') clusters[key].sentiment.positive += 1;
      else if (sent === 'negative') clusters[key].sentiment.negative += 1;
      else clusters[key].sentiment.neutral += 1;
    });
  });

  return Object.values(clusters).sort((a, b) => b.total - a.total);
}

// ─── Component ───────────────────────────────────────
export default function AIInsights() {
  const { businessId } = useOutletContext();
  const [insights, setInsights] = useState(null);
  const [summary, setSummary] = useState(null);
  const [smartAlerts, setSmartAlerts] = useState([]);
  const [topicClusters, setTopicClusters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // overview | alerts | clusters

  const fetchData = useCallback(async () => {
    if (!businessId) return;
    try {
      const q = query(collection(db, `businesses/${businessId}/feedbacks`), orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      const rawData = snapshot.docs.map(doc => {
        const data = doc.data();
        let created = new Date();
        if (data.createdAt && data.createdAt.toDate) {
          created = data.createdAt.toDate();
        }
        return { id: doc.id, ...data, createdAt: created };
      });
      
      setInsights(generateInsightsData(rawData));
      setSummary(generateSummaryData(rawData));
      setSmartAlerts(generateSmartAlerts(rawData));
      setTopicClusters(generateTopicClusters(rawData));
      setLastRefresh(new Date());
    } catch (err) {
      console.error("AI Insights fetch error:", err);
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

  if (loading || !businessId) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <BrainCircuit className="w-8 h-8 text-accent animate-pulse" />
          <span className="text-sm font-medium text-muted-foreground">Generating AI insights...</span>
        </div>
      </div>
    );
  }

  const containerAnim = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.06 } } };
  const itemAnim = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 24 } } };
  const hourlyData = summary?.hourly_data?.filter(h => { const hr = parseInt(h.hour); return hr >= 6 && hr <= 23; }) || [];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'alerts', label: 'Smart Alerts', icon: ShieldAlert, count: smartAlerts.length },
    { id: 'clusters', label: 'Topic Clusters', icon: Layers, count: topicClusters.length },
  ];

  return (
    <motion.div variants={containerAnim} initial="hidden" animate="show" className="space-y-6 pb-10">
      <Helmet>
        <title>AI Insights | Klyvora AI</title>
      </Helmet>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-accent" />
            <h2 className="text-3xl font-extrabold tracking-tight">AI Insights</h2>
          </div>
          <p className="text-muted-foreground font-medium">Real-time intelligence generated from your feedback data.</p>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-[11px] text-muted-foreground font-mono bg-secondary/50 px-2 py-1 rounded flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Updated — {format(lastRefresh, 'h:mm a')}
            </span>
          )}
          <button 
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary transition-all active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl w-fit">
        {tabs.map(tab => {
          const TabIcon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <TabIcon className="w-4 h-4" />
              {tab.label}
              {tab.count > 0 && (
                <Badge variant={activeTab === tab.id ? "default" : "secondary"} className="text-[10px] ml-1 px-1.5 py-0">
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {/* ════════════ OVERVIEW TAB ════════════ */}
      {activeTab === 'overview' && (
        <>
          {/* Daily Summary Banner */}
          {summary && (
            <motion.div variants={itemAnim}>
              <Card className="border-border shadow-sm overflow-hidden relative">
                <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-4 h-4 text-accent" />
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Daily Summary — {summary.date}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Total Feedback</div>
                      <div className="text-3xl font-extrabold">{summary.total_feedback}</div>
                      {summary.comparison.change !== 0 && (
                        <div className={`text-xs font-semibold flex items-center gap-1 ${summary.comparison.change > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {summary.comparison.change > 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                          {summary.comparison.change > 0 ? '+' : ''}{summary.comparison.change}% vs yesterday
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Sentiment</div>
                      <div className="text-2xl font-bold">{summary.overall_sentiment}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Top Issue</div>
                      <div className="text-xl font-bold capitalize">{summary.top_issue}</div>
                      {summary.top_issue_count > 0 && <div className="text-xs text-muted-foreground">{summary.top_issue_count} mentions</div>}
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active Alerts</div>
                      <div className={`text-3xl font-extrabold ${smartAlerts.length > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>{smartAlerts.length}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Avg Score</div>
                      <div className="text-3xl font-extrabold">{summary.avg_score}</div>
                    </div>
                  </div>
                  <div className="mt-4 p-3 bg-secondary/50 rounded-lg border border-border">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Lightbulb className="w-4 h-4 text-accent shrink-0" />
                      <span>{summary.trend}</span>
                    </div>
                  </div>
                  <div className="mt-4 flex h-2 w-full rounded-full overflow-hidden">
                    <div className="bg-emerald-500 transition-all" style={{ width: `${summary.sentiment_breakdown.positive}%` }} />
                    <div className="bg-slate-400 transition-all" style={{ width: `${summary.sentiment_breakdown.neutral}%` }} />
                    <div className="bg-rose-500 transition-all" style={{ width: `${summary.sentiment_breakdown.negative}%` }} />
                  </div>
                  <div className="flex justify-between text-[10px] font-semibold mt-1 text-muted-foreground">
                    <span className="text-emerald-600">Positive {summary.sentiment_breakdown.positive}%</span>
                    <span>Neutral {summary.sentiment_breakdown.neutral}%</span>
                    <span className="text-rose-600">Negative {summary.sentiment_breakdown.negative}%</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Insights Feed + Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            <motion.div variants={itemAnim} className="lg:col-span-3 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert className="w-4 h-4 text-muted-foreground" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Live Insights</h3>
                {insights?.insights?.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">{insights.insights.length} detected</Badge>
                )}
              </div>
              <AnimatePresence>
                {insights?.insights?.length > 0 ? (
                  insights.insights.map((insight, idx) => {
                    const Icon = INSIGHT_ICONS[insight.type] || Lightbulb;
                    const colors = INSIGHT_COLORS[insight.type] || INSIGHT_COLORS.trend;
                    return (
                      <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                        className={`flex items-start gap-3 p-4 rounded-xl border ${colors.bg} ${colors.border}`}>
                        <div className={`mt-0.5 shrink-0 ${colors.icon}`}><Icon className="w-5 h-5" /></div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-wider ${colors.text} border-current`}>{insight.type}</Badge>
                            {insight.priority >= 3 && <Badge variant="destructive" className="text-[10px]">Critical</Badge>}
                          </div>
                          <p className={`text-sm font-medium ${colors.text}`}>{insight.message}</p>
                        </div>
                      </motion.div>
                    );
                  })
                ) : (
                  <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <BrainCircuit className="w-10 h-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm font-semibold text-muted-foreground">No significant insights detected</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">Insights will appear as more feedback arrives.</p>
                    </CardContent>
                  </Card>
                )}
              </AnimatePresence>
            </motion.div>

            <motion.div variants={itemAnim} className="lg:col-span-2 space-y-4">
              <Card className="shadow-sm border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" /> Hourly Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[200px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={hourlyData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                        <XAxis dataKey="hour" tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} interval={2} />
                        <YAxis tick={{ fontSize: 10, fill: '#71717A' }} tickLine={false} axisLine={false} allowDecimals={false} />
                        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #E4E4E7', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                        <Area type="monotone" dataKey="positive" stackId="1" fill="#10B981" stroke="#059669" fillOpacity={0.6} />
                        <Area type="monotone" dataKey="neutral" stackId="1" fill="#94A3B8" stroke="#64748B" fillOpacity={0.4} />
                        <Area type="monotone" dataKey="negative" stackId="1" fill="#F43F5E" stroke="#E11D48" fillOpacity={0.6} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {summary?.topic_breakdown?.length > 0 && (
                <Card className="shadow-sm border-border">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5" /> Topic Breakdown
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[220px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={summary.topic_breakdown} margin={{ top: 5, right: 5, left: 0, bottom: 5 }} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E4E4E7" />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={100} tick={{ fill: '#52525B', fontSize: 11, fontWeight: 500 }} />
                          <Tooltip cursor={{ fill: '#F1F5F9' }} contentStyle={{ borderRadius: '8px', border: '1px solid #E4E4E7', fontSize: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Bar dataKey="count" fill="#6366F1" radius={[0, 4, 4, 0]} maxBarSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </div>
        </>
      )}

      {/* ════════════ SMART ALERTS TAB ════════════ */}
      {activeTab === 'alerts' && (
        <motion.div variants={itemAnim} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Smart Alert System</h3>
            <Badge variant="outline" className="text-[10px]">Context-Aware</Badge>
          </div>

          {smartAlerts.length > 0 ? (
            <div className="space-y-3">
              {smartAlerts.map((alert, idx) => {
                const config = SEVERITY_CONFIG[alert.severity] || SEVERITY_CONFIG.medium;
                const AlertIcon = config.icon;
                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.08 }}
                    className={`p-4 rounded-xl border ${config.bg} ${config.border}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`shrink-0 p-2 rounded-lg ${config.color}/10`}>
                        <AlertIcon className={`w-5 h-5 ${config.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge className={`text-[10px] uppercase font-bold tracking-wider ${config.color} text-white`}>
                            {alert.severity}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] capitalize">{alert.type}</Badge>
                        </div>
                        <p className={`text-sm font-semibold ${config.text}`}>{alert.message}</p>

                        {/* Metadata chips */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 text-[10px] font-medium text-muted-foreground">
                            <Target className="w-3 h-3" /> {alert.topic}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 text-[10px] font-medium text-muted-foreground">
                            <Layers className="w-3 h-3" /> {alert.count} reports
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 text-[10px] font-medium text-muted-foreground">
                            <Clock className="w-3 h-3" /> {alert.timeWindow}
                          </span>
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary/80 text-[10px] font-medium text-muted-foreground">
                            <Timer className="w-3 h-3" /> Expires {formatDistanceToNow(alert.expiresAt, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="w-16 h-16 rounded-full bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center mb-4">
                  <ShieldAlert className="w-8 h-8 text-emerald-500" />
                </div>
                <p className="text-lg font-bold text-foreground">All Clear</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-sm text-center">No active smart alerts detected. The system monitors feedback spikes, negative sentiment surges, and recurring issue patterns in real-time.</p>
              </CardContent>
            </Card>
          )}

          {/* Alert system info */}
          <Card className="border-border bg-secondary/30">
            <CardContent className="py-4">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Detection Rules</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50 border border-border">
                  <Flame className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">Negative Saturation</div>
                    <div className="text-[11px] text-muted-foreground">Triggers when &gt;40% of feedback in the last hour is negative</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50 border border-border">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">Repeated Issues</div>
                    <div className="text-[11px] text-muted-foreground">Same topic appears 3+ times within a 6-hour window</div>
                  </div>
                </div>
                <div className="flex items-start gap-2 p-3 rounded-lg bg-background/50 border border-border">
                  <Zap className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div>
                    <div className="text-xs font-bold">Volume Spike</div>
                    <div className="text-[11px] text-muted-foreground">Feedback count exceeds 2.5x the hourly average</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* ════════════ TOPIC CLUSTERS TAB ════════════ */}
      {activeTab === 'clusters' && (
        <motion.div variants={itemAnim} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Layers className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Feedback Clusters</h3>
            <Badge variant="outline" className="text-[10px]">{topicClusters.length} topics</Badge>
          </div>

          {topicClusters.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topicClusters.map((cluster, idx) => {
                const total = cluster.total;
                const posPct = total > 0 ? Math.round((cluster.sentiment.positive / total) * 100) : 0;
                const neuPct = total > 0 ? Math.round((cluster.sentiment.neutral / total) * 100) : 0;
                const negPct = total > 0 ? 100 - posPct - neuPct : 0;
                const dominant = cluster.sentiment.negative >= cluster.sentiment.positive ? 'negative' : 'positive';
                const pieData = [
                  { name: 'Positive', value: cluster.sentiment.positive },
                  { name: 'Neutral', value: cluster.sentiment.neutral },
                  { name: 'Negative', value: cluster.sentiment.negative },
                ].filter(d => d.value > 0);

                return (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="shadow-sm border-border hover:shadow-md transition-shadow h-full">
                      <CardContent className="pt-5">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h4 className="text-base font-bold capitalize">{cluster.topic}</h4>
                            <span className="text-xs text-muted-foreground">{total} total mentions</span>
                          </div>
                          <Badge variant={dominant === 'negative' ? 'destructive' : 'default'} className="text-[10px]">
                            {dominant === 'negative' ? 'Mostly Negative' : 'Mostly Positive'}
                          </Badge>
                        </div>

                        {/* Mini pie chart */}
                        <div className="flex items-center gap-4">
                          <div className="w-[80px] h-[80px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={22} outerRadius={36} strokeWidth={1.5}>
                                  {pieData.map((entry, i) => (
                                    <Cell key={i} fill={entry.name === 'Positive' ? '#10B981' : entry.name === 'Neutral' ? '#94A3B8' : '#F43F5E'} />
                                  ))}
                                </Pie>
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 space-y-1.5">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 text-emerald-600 font-medium"><ThumbsUp className="w-3 h-3" /> Positive</span>
                              <span className="font-bold">{cluster.sentiment.positive} ({posPct}%)</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 text-muted-foreground font-medium"><Minus className="w-3 h-3" /> Neutral</span>
                              <span className="font-bold">{cluster.sentiment.neutral} ({neuPct}%)</span>
                            </div>
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="flex items-center gap-1 text-rose-600 font-medium"><ThumbsDown className="w-3 h-3" /> Negative</span>
                              <span className="font-bold">{cluster.sentiment.negative} ({negPct}%)</span>
                            </div>
                          </div>
                        </div>

                        {/* Sentiment bar */}
                        <div className="mt-3 flex h-1.5 w-full rounded-full overflow-hidden">
                          <div className="bg-emerald-500 transition-all" style={{ width: `${posPct}%` }} />
                          <div className="bg-slate-400 transition-all" style={{ width: `${neuPct}%` }} />
                          <div className="bg-rose-500 transition-all" style={{ width: `${negPct}%` }} />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-16">
                <Layers className="w-10 h-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm font-semibold text-muted-foreground">No topic clusters yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">Clusters will automatically form as feedback with detected topics arrives.</p>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
