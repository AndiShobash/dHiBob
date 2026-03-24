"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Target, Star, TrendingUp, Plus } from "lucide-react";

const goals = [
  { title: "Increase test coverage to 80%", progress: 65, status: "On Track", dueDate: "Q1 2026" },
  { title: "Launch new onboarding flow", progress: 90, status: "Ahead", dueDate: "Mar 2026" },
  { title: "Reduce API response time by 30%", progress: 40, status: "At Risk", dueDate: "Q1 2026" },
];

const reviews = [
  { reviewer: "Tom Wilson", rating: 4.5, period: "H2 2025", status: "Completed", feedback: "Excellent technical leadership and mentorship." },
  { reviewer: "Peer Review", rating: 4.2, period: "H2 2025", status: "Completed", feedback: "Great collaboration and communication skills." },
];

export default function PerformancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Performance</h1><Button><Plus size={16} className="mr-2" />New Goal</Button></div>
      <Tabs defaultValue="goals">
        <TabsList><TabsTrigger value="goals">Goals & OKRs</TabsTrigger><TabsTrigger value="reviews">Reviews</TabsTrigger></TabsList>
        <TabsContent value="goals"><div className="space-y-4">{goals.map(g => <Card key={g.title}><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><div className="flex items-center gap-2"><Target size={18} className="text-primary-500" /><p className="font-medium">{g.title}</p></div><Badge variant={g.status === "Ahead" ? "success" : g.status === "On Track" ? "secondary" : "warning"}>{g.status}</Badge></div><div className="flex items-center gap-3"><div className="flex-1 h-2 bg-gray-100 rounded-full"><div className="h-2 bg-primary-500 rounded-full" style={{ width: g.progress + "%" }} /></div><span className="text-sm font-medium">{g.progress}%</span></div><p className="text-xs text-gray-400 mt-1">Due: {g.dueDate}</p></CardContent></Card>)}</div></TabsContent>
        <TabsContent value="reviews"><div className="space-y-4">{reviews.map(r => <Card key={r.reviewer}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="font-medium">{r.reviewer}</p><p className="text-sm text-gray-500">{r.period}</p></div><div className="flex items-center gap-1"><Star size={16} className="text-yellow-500 fill-yellow-500" /><span className="font-bold">{r.rating}</span></div></div><p className="mt-2 text-sm text-gray-600">{r.feedback}</p></CardContent></Card>)}</div></TabsContent>
      </Tabs>
    </div>
  );
}
