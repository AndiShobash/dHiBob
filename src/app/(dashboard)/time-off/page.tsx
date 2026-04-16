"use client";
import React, { useState, useMemo } from "react";
import { useSession } from "next-auth/react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Calendar, Plus, ChevronLeft, ChevronRight, X, Pencil } from "lucide-react";
import { format, addMonths, subMonths, isSameMonth, isWithinInterval, eachDayOfInterval, startOfMonth, endOfMonth, getDay } from "date-fns";
import RequestFormModal from "@/components/time-off/request-form-modal";
import ApprovalQueue from "@/components/time-off/approval-queue";
import { PolicyBalanceCard } from "@/components/time-off/policy-balance-card";

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "default"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
};

const DEFAULT_COLOR = '#6b7280';

function policyColor(req: any, policies: any[]): string {
  const policy = policies?.find((p: any) => p.id === req.policy?.id || p.name === req.policy?.name);
  return policy?.color || req.policy?.color || DEFAULT_COLOR;
}

// ─── Team Calendar Grid ───
function TeamCalendarGrid({ currentMonth, policies }: { currentMonth: Date; policies: any[] }) {
  const { data: teamRequests } = trpc.timeoff.teamCalendar.useQuery();
  const [popoverDay, setPopoverDay] = useState<string | null>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const startDay = getDay(monthStart);

  // Build a map: date string -> requests
  const requestsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    if (!teamRequests) return map;
    for (const req of teamRequests) {
      const start = new Date(req.startDate);
      const end = new Date(req.endDate);
      const reqDays = eachDayOfInterval({ start, end });
      for (const d of reqDays) {
        if (d >= monthStart && d <= monthEnd) {
          const key = format(d, 'yyyy-MM-dd');
          if (!map[key]) map[key] = [];
          map[key].push(req);
        }
      }
    }
    return map;
  }, [teamRequests, currentMonth]);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid grid-cols-7 gap-px bg-gray-200 dark:bg-gray-700 rounded-lg">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-xs font-semibold text-gray-500">{d}</div>
          ))}
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="bg-white dark:bg-charcoal-900 p-2 h-[100px]" />
          ))}
          {days.map((day, dayIdx) => {
            const key = format(day, 'yyyy-MM-dd');
            const reqs = requestsByDay[key] || [];
            const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
            const totalRows = Math.ceil((startDay + days.length) / 7);
            const currentRow = Math.floor((startDay + dayIdx) / 7);
            const isBottomHalf = currentRow >= totalRows - 2;
            const isWeekend = getDay(day) === 0 || getDay(day) === 6;
            return (
              <div key={key} className={`relative bg-white dark:bg-charcoal-900 p-1.5 h-[100px] flex flex-col ${isWeekend ? 'bg-gray-50/50 dark:bg-gray-800/30' : ''}`}>
                <span className={`text-xs font-medium shrink-0 ${isToday ? 'bg-primary-500 text-white rounded-full w-6 h-6 inline-flex items-center justify-center' : 'text-gray-500'}`}>
                  {format(day, 'd')}
                </span>
                <div className="mt-1 flex-1 min-h-0 flex flex-col">
                  {reqs.slice(0, reqs.length > 3 ? 2 : 3).map((req: any, i: number) => (
                    <div key={i} className={`text-[10px] px-1 py-0.5 mb-0.5 rounded truncate text-white ${req.status === 'PENDING' ? 'opacity-60' : ''}`} style={{ backgroundColor: policyColor(req, policies) }}>
                      {req.employee?.firstName?.[0]}.{req.employee?.lastName}
                    </div>
                  ))}
                  {reqs.length > 3 && (
                    <button
                      type="button"
                      onClick={() => setPopoverDay(popoverDay === key ? null : key)}
                      className="text-[11px] text-primary-500 hover:text-primary-600 font-semibold cursor-pointer mt-auto"
                    >
                      +{reqs.length - 2} more
                    </button>
                  )}
                </div>

                {/* Day detail popover — positioned relative to this cell */}
                {popoverDay === key && (
                  <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setPopoverDay(null)} />
                    <div className={`absolute left-0 z-[101] bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 min-w-[260px] max-w-[320px] max-h-[320px] overflow-y-auto bottom-full mb-1`}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-semibold text-sm">{format(day, 'EEEE, MMMM d')}</h3>
                        <button onClick={() => setPopoverDay(null)} className="text-gray-400 hover:text-gray-600 p-0.5">
                          <X size={14} />
                        </button>
                      </div>
                      <div className="space-y-2">
                        {reqs.map((req: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${req.status === 'PENDING' ? 'opacity-60' : ''}`} style={{ backgroundColor: policyColor(req, policies) }} />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{req.employee?.firstName} {req.employee?.lastName}</p>
                              <p className="text-[11px] text-gray-500">
                                {req.policy?.name} · {format(new Date(req.startDate), 'MMM d')}–{format(new Date(req.endDate), 'MMM d')}
                                {req.status === 'PENDING' && <span className="ml-1 text-amber-500">(pending)</span>}
                              </p>
                            </div>
                            {req.employee?.department?.name && (
                              <span className="text-[10px] text-gray-400 shrink-0">{req.employee.department.name}</span>
                            )}
                          </div>
                        ))}
                      </div>
                      <p className="text-[11px] text-gray-400 mt-3 pt-2 border-t dark:border-gray-700">{reqs.length} request{reqs.length !== 1 ? 's' : ''} on this day</p>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>

      </CardContent>
    </Card>
  );
}

// ─── Main Page ───
export default function TimeOffPage() {
  const { data: session } = useSession();
  const employeeId = session?.user?.employeeId;
  const isManager = session?.user?.role === "SUPER_ADMIN" || session?.user?.role === "ADMIN" || session?.user?.role === "MANAGER" || session?.user?.role === "HR";
  const utils = trpc.useUtils();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState<any>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [addPolicyOpen, setAddPolicyOpen] = useState(false);
  const [newPolicyColor, setNewPolicyColor] = useState('#3b82f6');
  const [editingPolicyId, setEditingPolicyId] = useState<string | null>(null);

  const { data: policyBalances, isLoading: balancesLoading, error: balancesError, refetch: refetchBalances } = trpc.timeoff.getPolicyBalances.useQuery(
    { employeeId: employeeId! },
    { enabled: !!employeeId, retry: 1 }
  );

  const { data: allRequestsData, isLoading: requestsLoading, refetch: refetchRequests } =
    trpc.timeoff.listRequests.useQuery({ limit: 500 });

  const { data: employeesData } = trpc.employee.list.useQuery({ limit: 100 });
  const { data: policiesData } = trpc.timeoff.listPolicies.useQuery();

  const cancelMutation = trpc.timeoff.cancelRequest.useMutation({
    onSuccess: () => { utils.timeoff.listRequests.invalidate(); utils.timeoff.getPolicyBalances.invalidate(); },
  });

  const editMutation = trpc.timeoff.editRequest.useMutation({
    onSuccess: () => { utils.timeoff.listRequests.invalidate(); utils.timeoff.getPolicyBalances.invalidate(); setEditingRequest(null); },
  });

  const createPolicyMutation = trpc.timeoff.createPolicy.useMutation({
    onSuccess: () => { utils.timeoff.listPolicies.invalidate(); utils.timeoff.getPolicyBalances.invalidate(); setAddPolicyOpen(false); },
  });

  const updatePolicyMutation = trpc.timeoff.updatePolicy.useMutation({
    onSuccess: () => { utils.timeoff.listPolicies.invalidate(); utils.timeoff.teamCalendar.invalidate(); setEditingPolicyId(null); },
  });

  const myRequests = useMemo(() => {
    return allRequestsData?.requests.filter(r => r.employeeId === employeeId) || [];
  }, [allRequestsData, employeeId]);

  const handleRefresh = async () => {
    await Promise.all([
      refetchBalances(),
      refetchRequests(),
      utils.timeoff.listRequests.invalidate(),
      utils.timeoff.getPolicyBalances.invalidate(),
      utils.timeoff.teamCalendar.invalidate(),
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Time Off</h1>
        <Button onClick={() => setModalOpen(true)} className="gap-2">
          <Plus size={16} /> Request Time Off
        </Button>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {balancesError && (
          <Card><CardContent className="p-6 text-sm text-red-500">
            Failed to load balances: {balancesError.message}
          </CardContent></Card>
        )}
        {balancesLoading
          ? [0, 1, 2].map(i => (
              <Card key={i}><CardContent className="p-6">
                <div className="h-4 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-24 mb-3" />
                <div className="h-8 bg-gray-100 dark:bg-gray-800 rounded animate-pulse w-16" />
              </CardContent></Card>
            ))
          : policyBalances?.filter((p: any) => p.accrualRate > 0).map(p => (
              <PolicyBalanceCard
                key={p.policyId}
                policyName={p.policyName}
                accrued={p.accrued}
                used={p.used}
                available={p.available}
                projectedYearEnd={p.projectedYearEnd}
              />
            ))}
      </div>

      {/* Tabbed content */}
      <Tabs defaultValue="calendar">
        <TabsList>
          <TabsTrigger value="calendar">Calendar</TabsTrigger>
          <TabsTrigger value="my-requests">My Requests</TabsTrigger>
          {isManager && <TabsTrigger value="team-approvals">Approvals</TabsTrigger>}
        </TabsList>

        <TabsContent value="calendar" className="mt-4 space-y-4">
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-bold">{format(currentMonth, 'MMMM yyyy')}</h2>
            <div className="flex border dark:border-gray-700 rounded-md">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
                <ChevronLeft size={16} />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
                <ChevronRight size={16} />
              </Button>
            </div>
          </div>
          <TeamCalendarGrid currentMonth={currentMonth} policies={policiesData || []} />
          <div className="flex items-center justify-between">
            <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
              {(policiesData || []).map((p: any) => (
                <span key={p.id} className="flex items-center gap-1 relative">
                  {isManager && editingPolicyId === p.id ? (
                    <input
                      type="color"
                      defaultValue={p.color || DEFAULT_COLOR}
                      autoFocus
                      onChange={e => updatePolicyMutation.mutate({ id: p.id, color: e.target.value })}
                      onBlur={() => setEditingPolicyId(null)}
                      className="w-4 h-4 rounded cursor-pointer border-0 p-0"
                    />
                  ) : (
                    <span
                      className={`w-3 h-3 rounded ${isManager ? 'cursor-pointer hover:ring-2 hover:ring-primary-300' : ''}`}
                      style={{ backgroundColor: p.color || DEFAULT_COLOR }}
                      onClick={() => isManager && setEditingPolicyId(p.id)}
                      title={isManager ? 'Click to change color' : undefined}
                    />
                  )}
                  {p.name}
                </span>
              ))}
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400 opacity-60" /> Pending</span>
            </div>
            {isManager && (
              <Button variant="outline" size="sm" className="text-xs gap-1" onClick={() => setAddPolicyOpen(true)}>
                <Plus size={14} /> Add Leave Type
              </Button>
            )}
          </div>
        </TabsContent>

        <TabsContent value="my-requests" className="mt-4">
          {requestsLoading ? (
            <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}</div>
          ) : !myRequests.length ? (
            <div className="text-center py-12 text-gray-500">
              <Calendar size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No time-off requests yet.</p>
              <p className="text-sm mb-4">Submit your first request to get started.</p>
              <Button onClick={() => setModalOpen(true)} className="gap-2">
                <Plus size={16} /> Request Time Off
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {myRequests.map(req => (
                <Card key={req.id} className="group">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-1.5 h-12 rounded-full" style={{ backgroundColor: policyColor(req, policiesData || []) }} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold">{req.policy.name}</p>
                          <Badge variant={STATUS_VARIANT[req.status] || "default"}>{req.status}</Badge>
                        </div>
                        <p className="text-sm text-gray-500">
                          {format(new Date(req.startDate), "MMM d")} — {format(new Date(req.endDate), "MMM d, yyyy")} · {req.days} day{req.days !== 1 ? 's' : ''}
                        </p>
                        {req.reason && <p className="text-xs text-gray-400 mt-0.5">{req.reason}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(req.status === 'PENDING' || req.status === 'APPROVED') && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1"
                            onClick={() => setEditingRequest(req)}
                          >
                            <Pencil size={14} /> Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 gap-1"
                            onClick={() => { if (confirm('Cancel this request?')) cancelMutation.mutate({ requestId: req.id }); }}
                          >
                            <X size={14} /> Cancel
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {isManager && (
          <TabsContent value="team-approvals" className="mt-4">
            <ApprovalQueue onMutationSuccess={handleRefresh} />
          </TabsContent>
        )}

      </Tabs>

      {employeeId && (
        <RequestFormModal
          employeeId={employeeId}
          open={modalOpen}
          onOpenChange={open => { setModalOpen(open); if (!open) handleRefresh(); }}
        />
      )}

      {/* Edit Request Dialog */}
      {editingRequest && (
        <Dialog open onOpenChange={open => { if (!open) setEditingRequest(null); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Edit Request</DialogTitle></DialogHeader>
            {(() => {
              const req = editingRequest;
              const startVal = format(new Date(req.startDate), 'yyyy-MM-dd');
              const endVal = format(new Date(req.endDate), 'yyyy-MM-dd');
              return (
                <form onSubmit={e => {
                  e.preventDefault();
                  const fd = new FormData(e.target as HTMLFormElement);
                  editMutation.mutate({
                    requestId: req.id,
                    startDate: new Date(fd.get('startDate') as string),
                    endDate: new Date(fd.get('endDate') as string),
                    reason: (fd.get('reason') as string) || undefined,
                  });
                }} className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-1">Leave Type</p>
                    <p className="text-sm text-gray-500">{req.policy.name}</p>
                  </div>
                  <div>
                    <label htmlFor="edit-start" className="block text-sm font-medium mb-1">Start Date</label>
                    <Input id="edit-start" name="startDate" type="date" defaultValue={startVal} required />
                  </div>
                  <div>
                    <label htmlFor="edit-end" className="block text-sm font-medium mb-1">End Date</label>
                    <Input id="edit-end" name="endDate" type="date" defaultValue={endVal} required />
                  </div>
                  <div>
                    <label htmlFor="edit-reason" className="block text-sm font-medium mb-1">Reason</label>
                    <Input id="edit-reason" name="reason" defaultValue={req.reason || ''} placeholder="Optional reason" />
                  </div>
                  {editMutation.error && <p className="text-sm text-red-500">{editMutation.error.message}</p>}
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" onClick={() => setEditingRequest(null)}>Cancel</Button>
                    <Button type="submit" disabled={editMutation.isLoading}>Save Changes</Button>
                  </div>
                </form>
              );
            })()}
          </DialogContent>
        </Dialog>
      )}

      {/* Add Leave Type Dialog */}
      {addPolicyOpen && (
        <Dialog open onOpenChange={open => { if (!open) setAddPolicyOpen(false); }}>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Add Leave Type</DialogTitle></DialogHeader>
            <form onSubmit={e => {
              e.preventDefault();
              const fd = new FormData(e.target as HTMLFormElement);
              const name = fd.get('name') as string;
              createPolicyMutation.mutate({
                name,
                type: name.toUpperCase().replace(/\s+/g, '_'),
                color: newPolicyColor,
              });
              setNewPolicyColor('#3b82f6');
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <Input name="name" required placeholder="e.g. Maternity Leave, Study Day" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Color</label>
                <div className="flex items-center gap-3">
                  <input type="color" value={newPolicyColor} onChange={e => setNewPolicyColor(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                  <span className="text-xs text-gray-500">Pick a color for the calendar</span>
                  <span className="text-xs font-mono text-gray-400">{newPolicyColor}</span>
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setAddPolicyOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={createPolicyMutation.isLoading}>Add Leave Type</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
