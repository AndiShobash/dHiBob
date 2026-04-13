"use client";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

interface ApprovalQueueProps {
  onMutationSuccess?: () => void;
}

export default function ApprovalQueue({ onMutationSuccess }: ApprovalQueueProps) {
  const utils = trpc.useContext();
  const { data, isLoading } = trpc.timeoff.listRequests.useQuery({
    status: "PENDING",
    limit: 100,
  });

  const handleSuccess = () => {
    utils.timeoff.listRequests.invalidate();
    utils.timeoff.getPolicyBalances.invalidate();
    if (onMutationSuccess) onMutationSuccess();
  };

  const approveMutation = trpc.timeoff.approve.useMutation({
    onSuccess: handleSuccess,
  });
  const rejectMutation = trpc.timeoff.reject.useMutation({
    onSuccess: handleSuccess,
  });

  if (isLoading) return <p className="text-sm text-gray-400">Loading pending requests...</p>;
  if (!data?.requests.length) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No pending requests.</p>;
  }

  return (
    <div className="space-y-3">
      {data.requests.map((req) => (
        <div key={req.id} className="flex items-center justify-between p-4 border dark:border-charcoal-700 rounded-lg bg-white dark:bg-charcoal-900 shadow-sm">
          <div className="space-y-1">
            <p className="font-medium">
              {req.employee.firstName} {req.employee.lastName}
              <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">({req.employee.department?.name})</span>
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {req.policy.name} &middot; {format(new Date(req.startDate), "MMM d")} &ndash;{" "}
              {format(new Date(req.endDate), "MMM d, yyyy")} &middot; {req.days} day(s)
            </p>
            {req.reason && <p className="text-sm text-gray-400 italic font-medium">&quot;{req.reason}&quot;</p>}
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 dark:border-charcoal-700 hover:bg-red-50 dark:hover:bg-red-900/20"
              onClick={() => rejectMutation.mutate({ requestId: req.id })}
              disabled={rejectMutation.isPending || approveMutation.isPending}
            >
              Reject
            </Button>
            <Button
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={() => approveMutation.mutate({ requestId: req.id })}
              disabled={approveMutation.isPending || rejectMutation.isPending}
            >
              Approve
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
