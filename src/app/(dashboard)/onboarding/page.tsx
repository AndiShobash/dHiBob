"use client";

import { Button } from "@/components/ui/button";
import { UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { EmployeeChecklistRow } from "@/components/onboarding/employee-checklist-row";

export default function OnboardingPage() {
  const { data: newHires, isLoading } = trpc.onboarding.listNewHires.useQuery();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Onboarding</h1>
        <Button>
          <UserPlus size={16} className="mr-2" />
          New Hire
        </Button>
      </div>

      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <>
          {!newHires || newHires.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>No employees currently being onboarded.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {newHires.map(emp => (
                <EmployeeChecklistRow
                  key={emp.id}
                  employee={emp as any}
                  mode="onboarding"
                  isDevOps={emp.department?.name?.toLowerCase().includes('engineering') ?? false}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
