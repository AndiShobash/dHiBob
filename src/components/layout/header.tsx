"use client";
import { Search, User, LogOut, Settings } from "lucide-react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { TasksPopover } from "./tasks-popover";
import { NotificationsPopover } from "./notifications-popover";
import { ThemeToggle } from "./theme-toggle";

export default function Header() {
  const { data: session } = useSession();
  const router = useRouter();
  const userName = session?.user?.name || 'User';
  const initials = userName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-30 bg-white dark:bg-charcoal-900 border-b border-gray-200 dark:border-charcoal-700 h-16 md:ml-64 transition-colors duration-200">
      <div className="h-full px-4 md:px-6 flex items-center justify-between gap-4">
        <div className="flex-1 max-w-md hidden md:flex items-center">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input placeholder="Search employees, documents..." className="pl-10 bg-gray-50 dark:bg-charcoal-800 border-gray-200 dark:border-charcoal-700" />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <TasksPopover />
          <NotificationsPopover />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2">
                <Avatar className="h-8 w-8"><AvatarFallback className="text-xs font-bold">{initials}</AvatarFallback></Avatar>
                <span className="hidden md:inline text-sm font-medium">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{userName}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => { if (session?.user?.employeeId) router.push(`/people/${session.user.employeeId}`); }}>
                <User size={16} className="mr-2" />My Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings size={16} className="mr-2" />Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-red-600" onClick={() => signOut()}>
                <LogOut size={16} className="mr-2" />Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
