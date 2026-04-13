"use client";
import { trpc } from "@/lib/trpc";
import { FeedCard } from "@/components/home/feed-card";
import { MeWidget, TeamWidget } from "@/components/home/sidebar-widgets";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ShoutoutModal } from "@/components/home/shoutout-modal";
import { Image, Smile, MapPin, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";

export default function HomePage() {
  const [greeting, setGreeting] = useState("Good morning");
  const [isShoutoutOpen, setIsShoutoutOpen] = useState(false);
  const { data: feed, isLoading: feedLoading } = trpc.home.getFeed.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({ limit: 1 });
  const user = employees?.employees[0];

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
          {greeting}, {user?.firstName || 'there'}!
        </h1>
        <p className="text-gray-500 dark:text-gray-400 font-medium">
          Here&apos;s what is happening in your company today.
        </p>
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
                    {user?.firstName ? user.firstName[0] : ''}{user?.lastName ? user.lastName[0] : ''}
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
                    <button 
                      onClick={() => setIsShoutoutOpen(true)}
                      className="flex items-center gap-1.5 text-xs font-bold hover:text-primary-500 transition-colors"
                    >
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
          <MeWidget />
          <TeamWidget />
          
          <Card className="border-none shadow-sm bg-gradient-to-br from-cherry to-rose-600 text-white overflow-hidden">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-bold text-lg leading-tight">Join the Q1 All-Hands tomorrow!</h3>
              <p className="text-rose-100 text-sm">
                Get ready for our quarterly review and some exciting product updates.
              </p>
              <button className="w-full py-2 bg-white/20 hover:bg-white/30 transition-colors rounded-lg text-sm font-bold backdrop-blur-sm">
                Add to Calendar
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
