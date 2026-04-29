"use client";
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Pencil, Key, UserPlus, X, Download } from "lucide-react";
import { format } from "date-fns";
import { currencySymbol } from "@/lib/currency";
import * as XLSX from "xlsx";

const CATEGORIES = ['Identity', 'Communication', 'AI', 'Development', 'Security', 'General', 'Other'];
const LICENSE_TYPES = ['Monthly', 'Yearly', 'Perpetual'];
const STATUSES = ['Active', 'Inactive', 'Expired'];

const CAT_COLORS: Record<string, string> = {
  Identity: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  Communication: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30',
  AI: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
  Development: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
  Security: 'bg-red-100 text-red-700 dark:bg-red-900/30',
  General: 'bg-gray-100 text-gray-600 dark:bg-gray-800',
  Other: 'bg-gray-100 text-gray-600 dark:bg-gray-800',
};

export default function ITLicensesPage() {
  const utils = trpc.useContext();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [assignLicenseId, setAssignLicenseId] = useState<string | null>(null);
  const [assignEmployeeId, setAssignEmployeeId] = useState('');

  const { data: licenses, isLoading } = trpc.itLicenses.list.useQuery();
  const { data: stats } = trpc.itLicenses.stats.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({ limit: 500 });

  const createMutation = trpc.itLicenses.create.useMutation({ onSuccess: () => { utils.itLicenses.invalidate(); setCreateOpen(false); } });
  const updateMutation = trpc.itLicenses.update.useMutation({ onSuccess: () => { utils.itLicenses.invalidate(); setEditId(null); } });
  const deleteMutation = trpc.itLicenses.delete.useMutation({ onSuccess: () => utils.itLicenses.invalidate() });
  const assignMutation = trpc.itLicenses.assign.useMutation({ onSuccess: () => { utils.itLicenses.invalidate(); setAssignEmployeeId(''); } });
  const unassignMutation = trpc.itLicenses.unassign.useMutation({ onSuccess: () => utils.itLicenses.invalidate() });

  const editLicense = editId ? licenses?.find((l: any) => l.id === editId) : null;
  const assignLicense = assignLicenseId ? licenses?.find((l: any) => l.id === assignLicenseId) : null;

  function LicenseForm({ onSubmit, defaults, submitLabel }: { onSubmit: (data: any) => void; defaults?: any; submitLabel: string }) {
    return (
      <form onSubmit={e => {
        e.preventDefault();
        const fd = new FormData(e.target as HTMLFormElement);
        const data: any = {};
        for (const [k, v] of fd.entries()) {
          if (v === '') continue;
          if (k === 'totalSeats') { data[k] = parseInt(v as string); continue; }
          if (k === 'pricePerSeat') { data[k] = parseFloat(v as string); continue; }
          data[k] = v;
        }
        onSubmit(data);
      }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Item *</label><Input name="item" required defaultValue={defaults?.item || ''} placeholder="e.g. Google Workspace" /></div>
          <div><label className="block text-sm font-medium mb-1">Publisher</label><Input name="publisher" defaultValue={defaults?.publisher || ''} placeholder="e.g. Google" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Plan Name</label><Input name="planName" defaultValue={defaults?.planName || ''} placeholder="e.g. Business Starter" /></div>
          <div>
            <label className="block text-sm font-medium mb-1">Category</label>
            <select name="category" defaultValue={defaults?.category || 'General'} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">License Type</label>
            <select name="licenseType" defaultValue={defaults?.licenseType || 'Monthly'} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
              {LICENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Renewal Date</label><Input type="date" name="renewalDate" defaultValue={defaults?.renewalDate ? format(new Date(defaults.renewalDate), 'yyyy-MM-dd') : ''} /></div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select name="status" defaultValue={defaults?.status || 'Active'} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div><label className="block text-sm font-medium mb-1">Total Seats</label><Input type="number" name="totalSeats" defaultValue={defaults?.totalSeats ?? 0} /></div>
          <div><label className="block text-sm font-medium mb-1">Price per Seat</label><Input type="number" step="0.01" name="pricePerSeat" defaultValue={defaults?.pricePerSeat ?? 0} /></div>
          <div>
            <label className="block text-sm font-medium mb-1">Currency</label>
            <select name="currency" defaultValue={defaults?.currency || 'USD'} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
              {['USD', 'ILS', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div><label className="block text-sm font-medium mb-1">Notes</label><Input name="notes" defaultValue={defaults?.notes || ''} /></div>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => { setCreateOpen(false); setEditId(null); }}>Cancel</Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">IT Licenses</h1>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => {
            if (!licenses?.length) return;
            const rows = licenses.map((l: any) => {
              const assigned = l._count.assignments;
              const monthlyCost = l.licenseType === 'Yearly' ? (l.pricePerSeat * assigned) / 12 : l.pricePerSeat * assigned;
              const annualCost = l.licenseType === 'Yearly' ? l.pricePerSeat * assigned : l.pricePerSeat * assigned * 12;
              return {
                Item: l.item, Publisher: l.publisher || '', 'Plan Name': l.planName || '',
                Category: l.category, 'License Type': l.licenseType,
                'Renewal Date': l.renewalDate ? format(new Date(l.renewalDate), 'yyyy-MM-dd') : '',
                Status: l.status, 'Total Seats': l.totalSeats, 'Assigned Seats': assigned,
                'Price/Seat': l.pricePerSeat, Currency: l.currency,
                'Monthly Cost': Math.round(monthlyCost), 'Annual Cost': Math.round(annualCost),
                'Assigned Users': l.assignments.map((a: any) => `${a.employee.firstName} ${a.employee.lastName}`).join(', '),
                Notes: l.notes || '',
              };
            });
            const ws = XLSX.utils.json_to_sheet(rows);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'IT Licenses');
            XLSX.writeFile(wb, 'it-licenses.xlsx');
          }}><Download size={16} /> Export</Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus size={16} /> Add License</Button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-4">
          {[
            { label: "Total Licenses", value: stats.totalLicenses, color: "text-gray-600" },
            { label: "Active", value: stats.activeLicenses, color: "text-emerald-500" },
            { label: "Total Seats", value: stats.totalSeats, color: "text-blue-500" },
            { label: "Assigned", value: stats.usedSeats, color: "text-violet-500" },
            { label: "Est. Monthly Cost", value: `$${stats.monthlyCost.toLocaleString()}`, color: "text-amber-500" },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 dark:bg-charcoal-800 rounded animate-pulse" />)}</div>
      ) : !licenses?.length ? (
        <div className="text-center py-12 text-gray-500">
          <Key size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No licenses configured.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                {['Item', 'Publisher', 'Plan', 'Category', 'Type', 'Renewal', 'Status', 'Seats', 'Price/Seat', 'Monthly Cost', 'Annual Cost', ''].map(h => (
                  <th key={h || 'actions'} className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {licenses.map((l: any) => {
                const assigned = l._count.assignments;
                const monthlyCost = l.licenseType === 'Yearly' ? (l.pricePerSeat * assigned) / 12 : l.pricePerSeat * assigned;
                const annualCost = l.licenseType === 'Yearly' ? l.pricePerSeat * assigned : l.pricePerSeat * assigned * 12;
                const sym = currencySymbol(l.currency);
                return (
                  <React.Fragment key={l.id}>
                    <tr className="border-b hover:bg-gray-50 dark:hover:bg-charcoal-800 group">
                      <td className="px-3 py-2 font-medium">{l.item}</td>
                      <td className="px-3 py-2 text-gray-500">{l.publisher || '—'}</td>
                      <td className="px-3 py-2 text-gray-500">{l.planName || '—'}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${CAT_COLORS[l.category] || ''}`}>{l.category}</span></td>
                      <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{l.licenseType}</Badge></td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{l.renewalDate ? format(new Date(l.renewalDate), 'MMM d') : '—'}</td>
                      <td className="px-3 py-2"><Badge variant={l.status === 'Active' ? 'success' : l.status === 'Expired' ? 'destructive' : 'default'}>{l.status}</Badge></td>
                      <td className="px-3 py-2 text-center">{assigned}/{l.totalSeats}</td>
                      <td className="px-3 py-2 text-gray-500">{sym}{l.pricePerSeat}</td>
                      <td className="px-3 py-2 font-medium">{sym}{Math.round(monthlyCost).toLocaleString()}</td>
                      <td className="px-3 py-2 text-gray-500">{sym}{Math.round(annualCost).toLocaleString()}</td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setAssignLicenseId(l.id)} className="p-1 text-emerald-400 hover:text-emerald-600" title="Manage users"><UserPlus size={14} /></button>
                          <button onClick={() => setEditId(l.id)} className="p-1 text-gray-400 hover:text-gray-600"><Pencil size={14} /></button>
                          <button onClick={() => { if (confirm('Delete this license?')) deleteMutation.mutate({ id: l.id }); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                    {/* Show assigned users inline (collapsible via the UserPlus button) */}
                    {assignLicenseId === l.id && (
                      <tr className="bg-gray-50 dark:bg-charcoal-800/50">
                        <td colSpan={12} className="px-6 py-3">
                          <div className="flex items-center gap-2 mb-2">
                            <p className="text-xs font-medium text-gray-500">Assigned Users ({assigned})</p>
                            <select
                              value={assignEmployeeId}
                              onChange={e => setAssignEmployeeId(e.target.value)}
                              className="text-xs border rounded px-2 py-1 bg-white dark:bg-charcoal-800 dark:border-charcoal-600"
                            >
                              <option value="">Add user...</option>
                              {(employees as any)?.employees
                                ?.filter((e: any) => !l.assignments.some((a: any) => a.employeeId === e.id))
                                .map((e: any) => (
                                  <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
                                ))
                              }
                            </select>
                            {assignEmployeeId && (
                              <Button size="sm" className="h-6 text-xs" onClick={() => {
                                assignMutation.mutate({ licenseId: l.id, employeeId: assignEmployeeId });
                              }}>Assign</Button>
                            )}
                            <button onClick={() => setAssignLicenseId(null)} className="ml-auto text-gray-400 hover:text-gray-600"><X size={14} /></button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {l.assignments.map((a: any) => (
                              <span key={a.id} className="inline-flex items-center gap-1 px-2 py-1 bg-white dark:bg-charcoal-900 border rounded-md text-xs group/user">
                                {a.employee.firstName} {a.employee.lastName}
                                <button onClick={() => unassignMutation.mutate({ id: a.id })} className="opacity-0 group-hover/user:opacity-100 text-red-400 hover:text-red-600"><X size={10} /></button>
                              </span>
                            ))}
                            {l.assignments.length === 0 && <span className="text-xs text-gray-400">No users assigned</span>}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add License</DialogTitle></DialogHeader>
          <LicenseForm onSubmit={data => createMutation.mutate(data)} submitLabel="Add License" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={open => { if (!open) setEditId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit License</DialogTitle></DialogHeader>
          {editLicense && <LicenseForm defaults={editLicense} onSubmit={data => updateMutation.mutate({ id: editId!, ...data })} submitLabel="Save Changes" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
