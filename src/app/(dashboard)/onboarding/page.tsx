"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, Clock, UserPlus } from "lucide-react";

const newHires = [
  { name: "Tom Wilson", role: "Backend Engineer", startDate: "Apr 1", progress: 60, tasks: 6, completed: 4 },
  { name: "Amy Zhang", role: "Marketing Lead", startDate: "Apr 8", progress: 20, tasks: 8, completed: 2 },
];

export default function OnboardingPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Onboarding</h1><Button><UserPlus size={16} className="mr-2" />New Hire</Button></div>
      <div className="space-y-4">{newHires.map(h => <Card key={h.name}><CardContent className="p-4"><div className="flex items-center justify-between mb-3"><div><p className="font-medium">{h.name}</p><p className="text-sm text-gray-500">{h.role} · Starts {h.startDate}</p></div><Badge variant={h.progress >= 80 ? "success" : "warning"}>{h.completed}/{h.tasks} tasks</Badge></div><div className="h-2 bg-gray-100 rounded-full"><div className="h-2 bg-primary-500 rounded-full" style={{ width: h.progress+"%" }} /></div></CardContent></Card>)}</div>
    </div>
  );
}
