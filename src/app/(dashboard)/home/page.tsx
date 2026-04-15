"use client";
import { trpc } from "@/lib/trpc";
import { useSession } from "next-auth/react";
import { FeedCard } from "@/components/home/feed-card";
import { MeWidget, TeamWidget } from "@/components/home/sidebar-widgets";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShoutoutModal } from "@/components/home/shoutout-modal";
import { Image, Smile, MapPin, Loader2, Users, CheckSquare, Calendar, Briefcase, ClipboardList, Cake, Trophy } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";

export default function HomePage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [greeting, setGreeting] = useState("Good morning");
  const [isShoutoutOpen, setIsShoutoutOpen] = useState(false);
  const { data: feed, isLoading: feedLoading } = trpc.home.getFeed.useQuery();
  const { data: stats } = trpc.home.getStats.useQuery();
  const { data: upcomingEvents } = trpc.home.getUpcomingEvents.useQuery();

  const userName = session?.user?.name?.split(' ')[0] || 'there';

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 12 && hour < 17) setGreeting("Good afternoon");
    else if (hour >= 17) setGreeting("Good evening");
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {greeting}, {userName}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Here&apos;s what is happening in your company today.
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="border-none shadow-sm bg-white dark:bg-charcoal-900 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/people')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><Users size={18} className="text-blue-600" /></div>
            <div><p className="text-2xl font-bold">{stats?.headcount ?? '—'}</p><p className="text-[11px] text-gray-500">Employees</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-charcoal-900 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/onboarding')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30"><CheckSquare size={18} className="text-amber-600" /></div>
            <div><p className="text-2xl font-bold">{stats?.myTasks ?? '—'}</p><p className="text-[11px] text-gray-500">My Tasks</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-charcoal-900 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/time-off')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/30"><Calendar size={18} className="text-orange-600" /></div>
            <div><p className="text-2xl font-bold">{stats?.pendingTimeOff ?? '—'}</p><p className="text-[11px] text-gray-500">Pending Leave</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-charcoal-900 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/surveys')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30"><ClipboardList size={18} className="text-purple-600" /></div>
            <div><p className="text-2xl font-bold">{stats?.activeSurveys ?? '—'}</p><p className="text-[11px] text-gray-500">Active Surveys</p></div>
          </CardContent>
        </Card>
        <Card className="border-none shadow-sm bg-white dark:bg-charcoal-900 cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push('/workforce-planning')}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30"><Briefcase size={18} className="text-green-600" /></div>
            <div><p className="text-2xl font-bold">{stats?.openPositions ?? '—'}</p><p className="text-[11px] text-gray-500">Open Positions</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-10 gap-8">
        {/* Main Column (70%) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Shoutout / Post Input */}
          <Card className="border-none shadow-sm bg-white dark:bg-charcoal-900">
            <CardContent className="p-4">
              <div className="flex gap-4">
                <Avatar className="h-10 w-10 shrink-0">
                  <AvatarFallback className="bg-primary-100 text-primary-600 font-bold">
                    {userName[0]?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <div
                    onClick={() => setIsShoutoutOpen(true)}
                    className="bg-gray-50 dark:bg-charcoal-800 rounded-full px-4 py-2.5 text-gray-400 text-sm cursor-pointer hover:bg-gray-100 dark:hover:bg-charcoal-700 transition-colors border border-gray-100 dark:border-charcoal-700"
                  >
                    What&apos;s on your mind or want to give a shoutout?
                  </div>
                  <div className="flex items-center gap-4 text-gray-500 dark:text-gray-400 px-2">
                    <button onClick={() => setIsShoutoutOpen(true)} className="flex items-center gap-1.5 text-xs font-bold hover:text-primary-500 transition-colors">
                      <Smile size={16} className="text-amber-400" /> Shoutout
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-bold hover:text-primary-500 transition-colors cursor-not-allowed opacity-50">
                      <Image size={16} className="text-emerald-400" /> Photo/Video
                    </button>
                    <button className="flex items-center gap-1.5 text-xs font-bold hover:text-primary-500 transition-colors cursor-not-allowed opacity-50">
                      <MapPin size={16} className="text-rose-400" /> Check in
                    </button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <ShoutoutModal isOpen={isShoutoutOpen} onClose={() => setIsShoutoutOpen(false)} />

          {/* Activity Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Activity Feed</h2>
              <div className="h-px flex-1 mx-4 bg-gray-100 dark:bg-charcoal-800" />
            </div>

            {feedLoading ? (
              <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
                <Loader2 className="animate-spin" size={32} />
                <p className="text-sm font-medium">Gathering updates...</p>
              </div>
            ) : feed?.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-100 dark:border-charcoal-800 bg-transparent">
                <CardContent className="py-12 text-center text-gray-400 italic">
                  No activities to show yet. Be the first to post!
                </CardContent>
              </Card>
            ) : (
              feed?.map((item, i) => (
                <FeedCard key={i} item={item} />
              ))
            )}
          </div>
        </div>

        {/* Sidebar (30%) */}
        <div className="lg:col-span-3 space-y-6">
          {/* Upcoming Events — split into Birthdays and Anniversaries */}
          <div className="grid grid-cols-1 gap-3">
            <Card className="border-none shadow-sm bg-white dark:bg-charcoal-900">
              <CardHeader className="pb-2 border-b border-gray-50 dark:border-charcoal-800 px-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Cake size={18} className="text-pink-500" />
                  Birthdays
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 px-4">
                {(() => {
                  const birthdays = (upcomingEvents || []).filter((e: any) => e.type === 'BIRTHDAY');
                  return birthdays.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-3">No upcoming birthdays</p>
                  ) : (
                    <div className="space-y-2.5">
                      {birthdays.slice(0, 5).map((event: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg shrink-0 bg-pink-100 dark:bg-pink-900/30">
                            <Cake size={16} className="text-pink-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{event.name}</p>
                            <p className="text-[10px] text-gray-400">{format(new Date(event.date), 'MMM d')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm bg-white dark:bg-charcoal-900">
              <CardHeader className="pb-2 border-b border-gray-50 dark:border-charcoal-800 px-4">
                <CardTitle className="text-xs font-semibold flex items-center gap-1.5">
                  <Trophy size={18} className="text-amber-500" />
                  Anniversaries
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 px-4">
                {(() => {
                  const anniversaries = (upcomingEvents || []).filter((e: any) => e.type === 'ANNIVERSARY');
                  return anniversaries.length === 0 ? (
                    <p className="text-[10px] text-gray-400 text-center py-3">No upcoming anniversaries</p>
                  ) : (
                    <div className="space-y-2.5">
                      {anniversaries.slice(0, 5).map((event: any, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <div className="p-1.5 rounded-lg shrink-0 bg-amber-100 dark:bg-amber-900/30">
                            <Trophy size={16} className="text-amber-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{event.name}</p>
                            <p className="text-[10px] text-gray-400">{event.detail} · {format(new Date(event.date), 'MMM d')}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          </div>

          <MeWidget />
          <TeamWidget />
        </div>
      </div>
    </div>
  );
}
