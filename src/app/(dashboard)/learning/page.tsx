"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, Clock, Award, Plus } from "lucide-react";

const courses = [
  { title: "Leadership Fundamentals", progress: 75, duration: "8 hours", category: "Management", enrolled: 45 },
  { title: "Data Privacy & Security", progress: 100, duration: "2 hours", category: "Compliance", enrolled: 247 },
  { title: "Effective Communication", progress: 30, duration: "4 hours", category: "Soft Skills", enrolled: 89 },
];

export default function LearningPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Learning</h1><Button><Plus size={16} className="mr-2" />Add Course</Button></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">{courses.map(c => <Card key={c.title}><CardContent className="p-4"><div className="flex items-center justify-between mb-2"><Badge variant="outline">{c.category}</Badge>{c.progress === 100 && <Award size={18} className="text-yellow-500" />}</div><h3 className="font-medium mt-2">{c.title}</h3><div className="flex items-center gap-2 mt-1 text-sm text-gray-500"><Clock size={14} />{c.duration} · {c.enrolled} enrolled</div><div className="mt-3 h-2 bg-gray-100 rounded-full"><div className="h-2 bg-primary-500 rounded-full" style={{ width: c.progress+"%" }} /></div><p className="text-xs text-gray-400 mt-1">{c.progress}% complete</p></CardContent></Card>)}</div>
    </div>
  );
}
