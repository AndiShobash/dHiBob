"use client";
import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Monitor, Trash2, Pencil } from "lucide-react";
import { format } from "date-fns";

const TYPES = ['Laptop', 'Monitor', 'Phone', 'Keyboard', 'Mouse', 'Headset', 'Tablet', 'Other'];
const STATUSES = ['Available', 'In Use', 'Repair', 'Retired'];
const WARRANTY = ['Under warranty', 'Out of warranty'];
const OS_OPTIONS = ['Windows', 'macOS', 'Ubuntu', 'Linux', 'ChromeOS', 'Other'];

const STATUS_COLORS: Record<string, string> = {
  'Available': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
  'In Use': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30',
  'Repair': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30',
  'Retired': 'bg-gray-100 text-gray-500 dark:bg-gray-800',
};

const WARRANTY_COLORS: Record<string, string> = {
  'Under warranty': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30',
  'Out of warranty': 'bg-red-100 text-red-700 dark:bg-red-900/30',
};

export default function ITAssetsPage() {
  const utils = trpc.useContext();
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  const { data: assets, isLoading } = trpc.itAssets.list.useQuery({
    type: typeFilter || undefined,
    status: statusFilter || undefined,
  });
  const { data: stats } = trpc.itAssets.stats.useQuery();
  const { data: employees } = trpc.employee.list.useQuery({ limit: 500 });

  const createMutation = trpc.itAssets.create.useMutation({ onSuccess: () => { utils.itAssets.invalidate(); setCreateOpen(false); } });
  const updateMutation = trpc.itAssets.update.useMutation({ onSuccess: () => { utils.itAssets.invalidate(); setEditId(null); } });
  const deleteMutation = trpc.itAssets.delete.useMutation({ onSuccess: () => utils.itAssets.invalidate() });

  const filtered = assets?.filter((a: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return [a.item, a.serialNumber, a.model, a.assignee?.firstName, a.assignee?.lastName].some(v => (v || '').toLowerCase().includes(q));
  }) ?? [];

  const editAsset = editId ? assets?.find((a: any) => a.id === editId) : null;

  function AssetForm({ onSubmit, defaults, submitLabel }: { onSubmit: (data: any) => void; defaults?: any; submitLabel: string }) {
    return (
      <form onSubmit={e => {
        e.preventDefault();
        const fd = new FormData(e.target as HTMLFormElement);
        const data: any = {};
        for (const [k, v] of fd.entries()) {
          if (v === '') continue;
          if (k === 'purchaseCost') { data[k] = parseFloat(v as string); continue; }
          if (k === 'totalSeats') { data[k] = parseInt(v as string); continue; }
          data[k] = v;
        }
        if (!fd.get('assigneeId')) data.assigneeId = null;
        onSubmit(data);
      }} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Item/Brand *</label><Input name="item" required defaultValue={defaults?.item || ''} placeholder="e.g. Lenovo" /></div>
          <div><label className="block text-sm font-medium mb-1">Model</label><Input name="model" defaultValue={defaults?.model || ''} placeholder="e.g. ThinkPad P14s Gen 2" /></div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-sm font-medium mb-1">Serial Number</label><Input name="serialNumber" defaultValue={defaults?.serialNumber || ''} /></div>
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select name="type" defaultValue={defaults?.type || 'Laptop'} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
              {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Assigned To</label>
            <select name="assigneeId" defaultValue={defaults?.assigneeId || ''} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
              <option value="">Unassigned</option>
              {(employees as any)?.employees?.map((e: any) => (
                <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Factory OS</label>
            <select name="factoryOS" defaultValue={defaults?.factoryOS || ''} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
              <option value="">—</option>
              {OS_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select name="status" defaultValue={defaults?.status || 'Available'} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
              {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Warranty</label>
            <select name="warrantyStatus" defaultValue={defaults?.warrantyStatus || ''} className="w-full border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
              <option value="">—</option>
              {WARRANTY.map(w => <option key={w} value={w}>{w}</option>)}
            </select>
          </div>
          <div><label className="block text-sm font-medium mb-1">Warranty End</label><Input type="date" name="warrantyEndDate" defaultValue={defaults?.warrantyEndDate ? format(new Date(defaults.warrantyEndDate), 'yyyy-MM-dd') : ''} /></div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          <div><label className="block text-sm font-medium mb-1">CPU</label><Input name="cpu" defaultValue={defaults?.cpu || ''} placeholder="i7-1165G7" /></div>
          <div><label className="block text-sm font-medium mb-1">RAM</label><Input name="ram" defaultValue={defaults?.ram || ''} placeholder="16" /></div>
          <div><label className="block text-sm font-medium mb-1">Storage</label><Input name="storage" defaultValue={defaults?.storage || ''} placeholder="512" /></div>
          <div><label className="block text-sm font-medium mb-1">GPU</label><Input name="gpu" defaultValue={defaults?.gpu || ''} /></div>
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
        <h1 className="text-2xl font-bold">IT Assets</h1>
        <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus size={16} /> Add Asset</Button>
      </div>

      {stats && (
        <div className="grid grid-cols-4 gap-4">
          {[
            { label: "Total", value: stats.total, color: "text-gray-600" },
            { label: "In Use", value: stats.inUse, color: "text-blue-500" },
            { label: "Available", value: stats.available, color: "text-emerald-500" },
            { label: "In Repair", value: stats.repair, color: "text-amber-500" },
          ].map(s => (
            <Card key={s.label}><CardContent className="p-4 text-center">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      <div className="flex gap-3 flex-wrap">
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search assets..." className="max-w-[200px]" />
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
          <option value="">All Types</option>
          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 dark:border-charcoal-600">
          <option value="">All Statuses</option>
          {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-charcoal-800 rounded animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Monitor size={48} className="mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">No assets found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                {['Item', 'Serial Number', 'Model', 'Type', 'Assigned', 'OS', 'Status', 'Warranty', 'Warranty End', 'CPU', 'RAM', 'Storage', ''].map(h => (
                  <th key={h || 'actions'} className="px-3 py-2 text-xs font-medium text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((a: any) => (
                <tr key={a.id} className="border-b hover:bg-gray-50 dark:hover:bg-charcoal-800 group">
                  <td className="px-3 py-2 font-medium">{a.item}</td>
                  <td className="px-3 py-2 text-gray-500 font-mono text-xs">{a.serialNumber || '—'}</td>
                  <td className="px-3 py-2 text-gray-600">{a.model || '—'}</td>
                  <td className="px-3 py-2"><Badge variant="outline" className="text-[10px]">{a.type}</Badge></td>
                  <td className="px-3 py-2">{a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : '—'}</td>
                  <td className="px-3 py-2 text-gray-500">{a.factoryOS || '—'}</td>
                  <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-[10px] font-medium ${STATUS_COLORS[a.status] || ''}`}>{a.status}</span></td>
                  <td className="px-3 py-2">{a.warrantyStatus ? <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${WARRANTY_COLORS[a.warrantyStatus] || ''}`}>{a.warrantyStatus}</span> : '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{a.warrantyEndDate ? format(new Date(a.warrantyEndDate), 'MMM d, yyyy') : '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{a.cpu || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{a.ram || '—'}</td>
                  <td className="px-3 py-2 text-gray-500 text-xs">{a.storage || '—'}</td>
                  <td className="px-3 py-2">
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setEditId(a.id)} className="p-1 text-gray-400 hover:text-gray-600"><Pencil size={14} /></button>
                      <button onClick={() => { if (confirm('Delete this asset?')) deleteMutation.mutate({ id: a.id }); }} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Asset</DialogTitle></DialogHeader>
          <AssetForm onSubmit={data => createMutation.mutate(data)} submitLabel="Add Asset" />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editId} onOpenChange={open => { if (!open) setEditId(null); }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Asset</DialogTitle></DialogHeader>
          {editAsset && <AssetForm defaults={editAsset} onSubmit={data => updateMutation.mutate({ id: editId!, ...data })} submitLabel="Save Changes" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
