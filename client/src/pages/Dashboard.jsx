import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export default function Dashboard() {
  return (
    <div className="flex-1 p-8 space-y-6 overflow-y-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">Dashboard</h1>
        <p className="text-slate-500 font-medium mt-1">Welcome to your EchoSense AI workspace.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Placeholder cards for future metrics */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Total Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900">--</div>
          </CardContent>
        </Card>
        
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Avg Sentiment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900">--</div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold uppercase tracking-wider text-slate-500">Active Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-extrabold text-slate-900">--</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm h-64 flex items-center justify-center">
        <div className="text-center">
          <div className="text-slate-400 font-medium mb-2">Metrics visualization initialized...</div>
          <p className="text-sm text-slate-500 max-w-sm mx-auto">Feedback data will appear here once connected to your backend.</p>
        </div>
      </Card>
    </div>
  );
}
