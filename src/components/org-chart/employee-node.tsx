"use client";
import { Handle, Position } from "reactflow";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";

const DEPT_COLORS: Record<string, { border: string; bg: string; dot: string }> = {
  Executive:    { border: 'border-red-300 dark:border-red-700', bg: 'bg-red-50 dark:bg-red-900/20', dot: '#ef4444' },
  Engineering:  { border: 'border-blue-300 dark:border-blue-700', bg: 'bg-blue-50 dark:bg-blue-900/20', dot: '#3b82f6' },
  Product:      { border: 'border-purple-300 dark:border-purple-700', bg: 'bg-purple-50 dark:bg-purple-900/20', dot: '#8b5cf6' },
  Design:       { border: 'border-pink-300 dark:border-pink-700', bg: 'bg-pink-50 dark:bg-pink-900/20', dot: '#ec4899' },
  Marketing:    { border: 'border-orange-300 dark:border-orange-700', bg: 'bg-orange-50 dark:bg-orange-900/20', dot: '#f97316' },
  Sales:        { border: 'border-green-300 dark:border-green-700', bg: 'bg-green-50 dark:bg-green-900/20', dot: '#22c55e' },
  HR:           { border: 'border-teal-300 dark:border-teal-700', bg: 'bg-teal-50 dark:bg-teal-900/20', dot: '#14b8a6' },
  Finance:      { border: 'border-amber-300 dark:border-amber-700', bg: 'bg-amber-50 dark:bg-amber-900/20', dot: '#f59e0b' },
  Operations:   { border: 'border-cyan-300 dark:border-cyan-700', bg: 'bg-cyan-50 dark:bg-cyan-900/20', dot: '#06b6d4' },
};

const DEFAULT_COLORS = { border: 'border-gray-200 dark:border-gray-700', bg: 'bg-white dark:bg-charcoal-800', dot: '#6b7280' };

interface EmployeeNodeData {
  id: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  avatar?: string;
  department?: { id: string; name: string } | null;
  directReportsCount?: number;
}

export function EmployeeNode({ data }: { data: EmployeeNodeData }) {
  const router = useRouter();
  const name = `${data.firstName} ${data.lastName}`;
  const jobTitle = data.jobTitle || "No Title";
  const deptName = data.department?.name || '';
  const colors = DEPT_COLORS[deptName] || DEFAULT_COLORS;
  const reportsCount = data.directReportsCount || 0;

  return (
    <div
      onClick={() => router.push(`/people/${data.id}`)}
      className={`px-4 py-3 shadow-md rounded-lg border-2 ${colors.border} ${colors.bg} min-w-[220px] cursor-pointer hover:shadow-lg transition-shadow`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="w-2 h-2 !bg-primary-500"
        aria-label="Parent connection"
      />
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-white dark:ring-charcoal-900 shadow-sm">
          {data.avatar && <AvatarImage src={data.avatar} alt={name} />}
          <AvatarFallback className="text-xs font-bold" style={{ backgroundColor: colors.dot + '22', color: colors.dot }}>
            {data.firstName?.[0] || ""}{data.lastName?.[0] || ""}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate dark:text-white">{name}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{jobTitle}</p>
          <div className="flex items-center gap-2 mt-1">
            {deptName && (
              <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ backgroundColor: colors.dot + '20', color: colors.dot }}>
                {deptName}
              </span>
            )}
            {reportsCount > 0 && (
              <span className="text-[10px] text-gray-400 flex items-center gap-0.5">
                <Users size={10} /> {reportsCount}
              </span>
            )}
          </div>
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="w-2 h-2 !bg-primary-500"
        aria-label="Child connection"
      />
    </div>
  );
}

export { DEPT_COLORS, DEFAULT_COLORS };
