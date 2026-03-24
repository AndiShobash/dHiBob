"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, BarChart3, Users, CheckCircle } from "lucide-react";

const surveys = [
  { title: "Q1 2026 Employee Engagement", status: "Active", responses: 189, total: 247, deadline: "Mar 31" },
  { title: "Remote Work Satisfaction", status: "Completed", responses: 234, total: 247, deadline: "Feb 28" },
  { title: "Manager Effectiveness", status: "Draft", responses: 0, total: 247, deadline: "Apr 15" },
];

export default function SurveysPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Surveys</h1><Button><Plus size={16} className="mr-2" />Create Survey</Button></div>
      <div className="space-y-4">{surveys.map(s => <Card key={s.title}><CardContent className="p-4"><div className="flex items-center justify-between"><div><p className="font-medium">{s.title}</p><p className="text-sm text-gray-500">{s.responses}/{s.total} responses · Due {s.deadline}</p></div><Badge variant={s.status === "Active" ? "success" : s.status === "Completed" ? "secondary" : "outline"}>{s.status}</Badge></div>{s.status !== "Draft" && <div className="mt-3 h-2 bg-gray-100 rounded-full"><div className="h-2 bg-primary-500 rounded-full" style={{ width: (s.responses/s.total*100)+"%"}} /></div>}</CardContent></Card>)}</div>
    </div>
  );
}
