"use client";
import React, { useState, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, MapPin, FileText, Plus, Camera, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { useSession } from "next-auth/react";
import { profileDocsFolder, avatarsFolder } from "@/lib/people-folder";

function statusVariant(status: string): "success" | "warning" | "secondary" | "destructive" {
  if (status === 'ACTIVE') return 'success';
  if (status === 'ON_LEAVE') return 'warning';
  if (status === 'TERMINATED') return 'destructive';
  return 'secondary';
}

function statusLabel(status: string): string {
  if (status === 'ACTIVE') return 'Active';
  if (status === 'ON_LEAVE') return 'On Leave';
  if (status === 'INACTIVE') return 'Inactive';
  if (status === 'TERMINATED') return 'Terminated';
  return status;
}

function getInitials(firstName: string, lastName: string) {
  return `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase();
}

const tabTriggerClass =
  "data-[state=active]:bg-transparent data-[state=active]:shadow-none data-[state=active]:border-b-2 data-[state=active]:border-primary-500 rounded-none px-4 pb-3 text-sm font-medium text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 data-[state=active]:text-charcoal-900 dark:data-[state=active]:text-white transition-colors";

function FieldCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      {label && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
      <p className="text-sm text-charcoal-900 dark:text-white">{value || '—'}</p>
    </div>
  );
}

function EditableField({
  label,
  value,
  onSave,
}: {
  label: string;
  value?: string | null;
  onSave: (val: string) => unknown;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? '')) {
      onSave(trimmed);
    }
  };

  return (
    <div>
      {label && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { setEditing(false); }
          }}
          className="text-sm w-full border-b border-primary-400 dark:border-primary-500 outline-none bg-transparent text-charcoal-900 dark:text-white py-0.5"
        />
      ) : (
        <p
          onClick={() => { setDraft(value || ''); setEditing(true); }}
          className="text-sm text-charcoal-900 dark:text-white cursor-text hover:bg-gray-50 dark:hover:bg-charcoal-800 rounded px-1 -mx-1 min-h-[1.25rem]"
        >
          {value || '—'}
        </p>
      )}
    </div>
  );
}

/** Date picker field — click to open native date picker, saves on change */
function DateField({ label, value, onSave }: {
  label: string;
  value?: string | null;
  onSave?: (val: string) => unknown;
}) {
  const [editing, setEditing] = useState(false);

  // Convert display value to YYYY-MM-DD for the date input
  function toIso(v: string | null | undefined): string {
    if (!v) return '';
    const s = String(v);
    // Already YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    // ISO string with time — extract date part
    if (s.includes('T')) return s.slice(0, 10);
    // Try parsing but use UTC parts to avoid timezone shift
    try {
      const d = new Date(s);
      if (isNaN(d.getTime())) return '';
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    } catch { return ''; }
  }

  // Format for display
  function toDisplay(v: string | null | undefined): string {
    if (!v) return '';
    const iso = toIso(v);
    if (!iso) return String(v);
    const [year, month, day] = iso.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[month - 1]} ${day}, ${year}`;
  }

  if (!onSave) {
    return (
      <div>
        {label && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
        <p className="text-sm text-charcoal-900 dark:text-white min-h-[1.25rem]">{toDisplay(value) || '—'}</p>
      </div>
    );
  }

  return (
    <div>
      {label && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
      {editing ? (
        <input
          type="date"
          autoFocus
          defaultValue={toIso(value)}
          onBlur={e => { setEditing(false); if (e.target.value && e.target.value !== toIso(value)) onSave(e.target.value); }}
          onChange={e => { if (e.target.value) { onSave(e.target.value); setEditing(false); } }}
          className="text-sm w-full border-b border-primary-400 dark:border-primary-500 outline-none bg-transparent text-charcoal-900 dark:text-white py-0.5"
        />
      ) : (
        <p
          onClick={() => setEditing(true)}
          className="text-sm text-charcoal-900 dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-charcoal-800 rounded px-1 -mx-1 min-h-[1.25rem]"
        >
          {toDisplay(value) || <span className="text-gray-400">Select date...</span>}
        </p>
      )}
    </div>
  );
}

const BADGE_COLORS: Record<string, string> = {
  intern:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  contract:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  promotion:    'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  adjustment:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  // Contract Type
  'full-time':  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'part-time':  'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  freelance:    'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  // Salary Type
  'base salary':'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  bonus:        'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  commission:   'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  equity:       'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  // Worker Type
  'in-house':   'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  // Currency
  usd:          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  eur:          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  gbp:          'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  ils:          'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  cad:          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  aud:          'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
  chf:          'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  jpy:          'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  inr:          'bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300',
  brl:          'bg-lime-100 text-lime-700 dark:bg-lime-900/30 dark:text-lime-300',
};
function badgeColor(val: string) {
  return BADGE_COLORS[val.toLowerCase()] ?? 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300';
}

const CONTRACT_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contract', 'Freelance', 'Intern'];
const SALARY_TYPE_OPTIONS   = ['Base Salary', 'Bonus', 'Commission', 'Equity', 'Other'];
const CURRENCY_OPTIONS      = ['USD', 'EUR', 'GBP', 'ILS', 'CAD', 'AUD', 'CHF', 'JPY', 'INR', 'BRL'];

function DropdownBadgeField({
  label,
  value,
  options,
  onSave,
}: {
  label: string;
  value?: string | null;
  options: string[];
  onSave?: (val: string) => unknown;
}) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; openAbove: boolean } | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);

  function openDropdown() {
    if (!onSave) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      // Check if dropdown would go off-screen bottom — if so, open above
      const spaceBelow = window.innerHeight - rect.bottom;
      const openAbove = spaceBelow < 200;
      setCoords({
        top: openAbove ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        openAbove,
      });
    }
    setOpen(true);
  }

  return (
    <div className="relative">
      {label && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
      {value ? (
        <span
          ref={triggerRef as React.Ref<HTMLSpanElement>}
          onClick={openDropdown}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeColor(value)} ${onSave ? 'cursor-pointer hover:opacity-80' : ''}`}
        >
          {value}{onSave && <span className="ml-1 opacity-60">▾</span>}
        </span>
      ) : (
        <p
          ref={triggerRef as React.Ref<HTMLParagraphElement>}
          onClick={openDropdown}
          className={`text-sm text-gray-400 dark:text-gray-500 min-h-[1.25rem] ${onSave ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-charcoal-800 rounded px-1 -mx-1' : ''}`}
        >
          {onSave ? 'Select…' : '—'}
        </p>
      )}
      {open && onSave && coords && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div
            className="fixed z-[101] bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-charcoal-700 rounded-md shadow-xl py-1 min-w-[140px]"
            style={coords.openAbove
              ? { bottom: window.innerHeight - coords.top, left: coords.left }
              : { top: coords.top, left: coords.left }}
          >
            {options.map(opt => (
              <button
                key={opt}
                type="button"
                onClick={() => { onSave(opt); setOpen(false); }}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 dark:hover:bg-charcoal-800 transition-colors flex items-center gap-2"
              >
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeColor(opt)}`}>{opt}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function EditableBadgeField({
  label,
  value,
  onSave,
}: {
  label: string;
  value?: string | null;
  onSave?: (val: string) => unknown;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const commit = () => {
    setEditing(false);
    const trimmed = draft.trim();
    if (trimmed !== (value ?? '')) onSave?.(trimmed);
  };

  return (
    <div>
      {label && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
      {editing ? (
        <input
          autoFocus
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={e => {
            if (e.key === 'Enter') { e.preventDefault(); commit(); }
            if (e.key === 'Escape') setEditing(false);
          }}
          className="text-sm w-full border-b border-primary-400 dark:border-primary-500 outline-none bg-transparent text-charcoal-900 dark:text-white py-0.5"
        />
      ) : value ? (
        <span
          onClick={() => onSave && (setDraft(value), setEditing(true))}
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${badgeColor(value)} ${onSave ? 'cursor-text' : ''}`}
        >
          {value}
        </span>
      ) : (
        <p
          onClick={() => onSave && (setDraft(''), setEditing(true))}
          className={`text-sm text-gray-400 dark:text-gray-500 min-h-[1.25rem] ${onSave ? 'cursor-text hover:bg-gray-50 dark:hover:bg-charcoal-800 rounded px-1 -mx-1' : ''}`}
        >
          —
        </p>
      )}
    </div>
  );
}

interface DocEntry {
  name: string;
  key?: string;
  url?: string;
}

/** Parse the stored JSON value into a normalized array of file entries.
 *  Backward-compat: single-object values are wrapped into a one-element array. */
function parseDocEntries(value?: string | null): DocEntry[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((e: any) => e && (e.key || e.url || e.name));
    if (parsed && typeof parsed === 'object' && (parsed.key || parsed.url || parsed.name)) return [parsed];
    return [];
  } catch {
    // Legacy plain-text value — treat as a single entry with just a name
    return value.trim() ? [{ name: value }] : [];
  }
}

function docEntryHref(entry: DocEntry): string {
  if (entry.key) return `/api/files/redirect?key=${encodeURIComponent(entry.key)}`;
  if (entry.url) return entry.url;
  return '#';
}

function DocumentField({
  label,
  value,
  onSave,
  folder = 'profile_docs',
  mode = 'multi',
}: {
  label: string;
  value?: string | null;
  onSave?: (val: string) => unknown;
  folder?: string;
  /** "multi" = unlimited uploads, appends to list. "single" = one file, upload replaces. */
  mode?: 'single' | 'multi';
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const entries = parseDocEntries(value);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onSave) return;
    e.target.value = '';
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', folder);
      const res = await fetch('/api/files/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      const { key, name } = await res.json();
      const updated = mode === 'single'
        ? [{ name, key }]               // replace — caller handles archiving
        : [...entries, { name, key }];   // append
      await onSave(JSON.stringify(updated));
    } catch (err) {
      console.error('[DocumentField] upload error:', err);
      alert(`Upload failed: ${(err as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = async (index: number) => {
    if (!onSave) return;
    const updated = entries.filter((_, i) => i !== index);
    await onSave(updated.length > 0 ? JSON.stringify(updated) : '');
  };

  return (
    <div>
      {label && <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>}
      <div className="space-y-1">
        {entries.length > 0 ? (
          entries.map((entry, i) => (
            <div key={`${entry.key ?? entry.name}-${i}`} className="flex items-center gap-1.5 group">
              <a
                href={docEntryHref(entry)}
                target="_blank"
                rel="noopener noreferrer"
                download={entry.name}
                className="flex items-center gap-1.5 text-sm text-primary-600 dark:text-primary-400 hover:underline max-w-[160px] truncate"
                title={entry.name}
              >
                <FileText size={14} className="shrink-0" />
                <span className="truncate">{entry.name}</span>
              </a>
              {onSave && (
                <button
                  type="button"
                  onClick={() => handleRemove(i)}
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity shrink-0"
                  title="Remove file"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          ))
        ) : (
          <span className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
            <FileText size={14} />
            <span>{uploading ? 'Uploading…' : 'No files'}</span>
          </span>
        )}
        {onSave && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-primary-500 hover:text-primary-600 disabled:opacity-50 mt-1"
            title="Add another file"
          >
            <Plus size={12} strokeWidth={2.5} />
            <span>{uploading ? 'Uploading…' : 'Add file'}</span>
          </button>
        )}
        <input ref={inputRef} type="file" className="hidden" onChange={handleFile} />
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-gray-100 dark:border-charcoal-800 shadow-sm bg-white dark:bg-charcoal-900 mb-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-bold text-charcoal-900 dark:text-white">{title}</CardTitle>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function StatusDropdown({
  status,
  onChange,
  onTerminate,
}: {
  status: string;
  onChange: (s: 'ACTIVE' | 'INACTIVE') => unknown;
  onTerminate: (endDate: string, reason: string) => unknown;
}) {
  const [open, setOpen] = useState(false);
  const [showTermModal, setShowTermModal] = useState(false);
  const [termDate, setTermDate] = useState(new Date().toISOString().slice(0, 10));
  const [termReason, setTermReason] = useState('');

  function submitTerminate() {
    if (!termDate) return;
    onTerminate(termDate, termReason);
    setShowTermModal(false);
    setTermReason('');
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="focus:outline-none"
        title="Change status"
      >
        <Badge variant={statusVariant(status)} className="cursor-pointer hover:opacity-80 transition-opacity pr-1.5">
          {statusLabel(status)}<span className="ml-1 opacity-70">▾</span>
        </Badge>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full mt-1 z-20 bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-charcoal-700 rounded-md shadow-lg py-1 min-w-[140px]">
            {(['ACTIVE', 'INACTIVE'] as const).map(val => (
              <button
                key={val}
                type="button"
                onClick={() => { onChange(val); setOpen(false); }}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-gray-50 dark:hover:bg-charcoal-800 transition-colors ${status === val ? 'font-semibold' : ''}`}
              >
                {val === 'ACTIVE' ? 'Active' : 'Not Active'}
              </button>
            ))}
            {status !== 'TERMINATED' && (
              <>
                <div className="my-1 border-t border-gray-100 dark:border-charcoal-700" />
                <button
                  type="button"
                  onClick={() => { setOpen(false); setShowTermModal(true); }}
                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  Terminate…
                </button>
              </>
            )}
          </div>
        </>
      )}

      {/* Termination modal */}
      {showTermModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-charcoal-900 rounded-lg shadow-xl p-6 w-full max-w-sm mx-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Terminate Employee</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Last working day <span className="text-red-500">*</span></label>
                <input
                  type="date"
                  value={termDate}
                  onChange={e => setTermDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-charcoal-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason</label>
                <select
                  value={termReason}
                  onChange={e => setTermReason(e.target.value)}
                  className="w-full border border-gray-300 dark:border-charcoal-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400"
                >
                  <option value="">Select a reason…</option>
                  <option value="Company Decision">Company Decision</option>
                  <option value="Employee Decision">Employee Decision</option>
                  <option value="Resignation">Resignation</option>
                  <option value="Layoff">Layoff</option>
                  <option value="Performance">Performance</option>
                  <option value="Contract End">Contract End</option>
                  <option value="Mutual Agreement">Mutual Agreement</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowTermModal(false)}
                className="flex-1 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-charcoal-600 rounded-md hover:bg-gray-50 dark:hover:bg-charcoal-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitTerminate}
                disabled={!termDate}
                className="flex-1 px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Terminate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/** Renders EditableField when onSave is provided, FieldCell otherwise.
 *  Must be defined at module level — never inside a render function — so
 *  React keeps a stable component identity and doesn't reset local state. */
function F({ label, value, onSave }: { label: string; value: string; onSave?: (v: string) => unknown }) {
  return onSave
    ? <EditableField label={label} value={value || null} onSave={onSave} />
    : <FieldCell label={label} value={value || null} />;
}

/** Manager picker — dropdown to select who this employee reports to */
function ManagerPicker({ label, currentManagerId, currentManagerName, onSave }: {
  label: string;
  currentManagerId?: string | null;
  currentManagerName: string;
  onSave?: (managerId: string) => unknown;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = React.useRef<HTMLDivElement>(null);
  const { data: employees } = trpc.employee.list.useQuery({ limit: 100 }, { enabled: open });

  const empList = ((employees as any)?.employees ?? []).filter((e: any) =>
    !search || `${e.firstName} ${e.lastName}`.toLowerCase().includes(search.toLowerCase())
  );

  function openPicker() {
    if (!onSave) return;
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      setCoords({ top: rect.bottom + 4, left: rect.left });
    }
    setOpen(true);
    setSearch('');
  }

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
      <div
        ref={triggerRef}
        onClick={openPicker}
        className={`text-sm min-h-[1.25rem] ${onSave ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-charcoal-800 rounded px-1 -mx-1' : ''}`}
      >
        {currentManagerName || (onSave ? <span className="text-gray-400">Select manager...</span> : <span className="text-gray-400">—</span>)}
      </div>
      {open && coords && onSave && (
        <>
          <div className="fixed inset-0 z-[100]" onClick={() => setOpen(false)} />
          <div className="fixed z-[101] bg-white dark:bg-charcoal-900 border border-gray-200 dark:border-charcoal-700 rounded-lg shadow-xl py-1 min-w-[240px] max-h-[300px]" style={{ top: coords.top, left: coords.left }}>
            <div className="px-3 py-2 border-b border-gray-100 dark:border-charcoal-700">
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search..."
                className="w-full text-sm border-0 outline-none bg-transparent"
                autoFocus
              />
            </div>
            <div className="max-h-[240px] overflow-y-auto">
              <button
                type="button"
                onClick={() => { onSave(''); setOpen(false); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:bg-gray-50 dark:hover:bg-charcoal-800"
              >
                No manager
              </button>
              {empList.map((emp: any) => (
                <button
                  key={emp.id}
                  type="button"
                  onClick={() => { onSave(emp.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-charcoal-800 flex items-center gap-2 ${emp.id === currentManagerId ? 'font-semibold' : ''}`}
                >
                  {emp.avatar ? (
                    <img src={emp.avatar} className="w-5 h-5 rounded-full object-cover" alt="" />
                  ) : (
                    <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-[10px] font-medium inline-flex items-center justify-center">
                      {emp.firstName?.[0]}{emp.lastName?.[0]}
                    </span>
                  )}
                  {emp.firstName} {emp.lastName}
                  {(emp as any).department?.name && <span className="text-[10px] text-gray-400 ml-auto">{(emp as any).department.name}</span>}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function EmployeeProfilePage({ params }: { params: { id: string } }) {
  const { data: session } = useSession();
  const role = session?.user.role;
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = isSuperAdmin || role === 'ADMIN' || role === 'HR';
  const isSelf = session?.user.employeeId === params.id;
  const canEditAvatar = isAdmin || isSelf;
  const canSeeSensitive = isAdmin || isSelf;
  const canSeeFiles = isAdmin || isSelf; // employees can't see other employees' files

  const { data: employee, isLoading, error } = trpc.employee.getById.useQuery(
    { id: params.id },
    { retry: false }
  );

  const utils = trpc.useContext();
  const invalidate = () => utils.employee.getById.invalidate({ id: params.id });

  const updateEmployee = trpc.employee.update.useMutation({ onSuccess: invalidate });
  const terminateEmployee = trpc.employee.terminate.useMutation({ onSuccess: invalidate });
  const updateRole = trpc.employee.updateRole.useMutation({ onSuccess: invalidate });
  const updatePersonalInfo = trpc.employee.updatePersonalInfo.useMutation({ onSuccess: invalidate });
  const updateWorkInfo = trpc.employee.updateWorkInfo.useMutation({ onSuccess: invalidate });

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', avatarsFolder({ id: params.id, firstName: employee?.firstName, lastName: employee?.lastName }));
      const res = await fetch('/api/files/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(err.error || 'Upload failed');
      }
      const { key } = await res.json();
      // Store the redirect URL so any <img src> resolves to a fresh presigned URL per fetch.
      await updateEmployee.mutateAsync({ id: params.id, avatar: `/api/files/redirect?key=${encodeURIComponent(key)}` } as any);
    } catch (err) {
      console.error('[avatar] upload error:', err);
      alert(`Avatar upload failed: ${(err as Error).message}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="space-y-6">
        <p className="text-gray-500 dark:text-gray-400">Employee not found.</p>
      </div>
    );
  }

  const personalInfo = JSON.parse(employee.personalInfo || '{}');
  const workInfo = JSON.parse(employee.workInfo || '{}');

  // Per-person S3 folder for any uploads done from this profile
  const docsFolder = profileDocsFolder({ id: employee.id, firstName: employee.firstName, lastName: employee.lastName });

  const jobTitle = workInfo.jobTitle || '';
  const fullName = `${employee.firstName} ${employee.lastName}`;
  // relational display — text override wins if set by admin
  const managerDisplay = workInfo.reportsTo || (employee.manager
    ? `${employee.manager.firstName} ${employee.manager.lastName}`
    : '');
  const officeDisplay = workInfo.office || (employee as any).site?.name || '';
  const departmentName = (employee as any).department?.name ?? '—';
  const startDateFormatted = employee.startDate
    ? format(new Date(employee.startDate), 'MMM d, yyyy')
    : '—';

  // personalInfo fields
  const middleName = personalInfo.middleName || '';
  const phone = personalInfo.phone || '';
  const dateOfBirth = personalInfo.dateOfBirth || '';
  const gender = personalInfo.gender || '';
  const personalEmail = personalInfo.personalEmail || '';
  const allergies = personalInfo.allergies || '';
  const shirtSize = personalInfo.shirtSize || '';
  const nationality = personalInfo.nationality || '';
  const nationalId = personalInfo.nationalId || '';
  const passportNumber = personalInfo.passportNumber || '';
  const address = personalInfo.address || '';
  const city = personalInfo.city || '';
  const stateProvince = personalInfo.stateProvince || '';
  const country = personalInfo.country || '';
  const zipCode = personalInfo.zipCode || '';
  const addressNotes = personalInfo.addressNotes || '';
  const emergencyContactName = personalInfo.emergencyContactName || '';
  const emergencyContactRelationship = personalInfo.emergencyContactRelationship || '';
  const emergencyContactPhone = personalInfo.emergencyContactPhone || '';
  const bankName = personalInfo.bankName || '';
  const bankBranch = personalInfo.bankBranch || '';
  const bankAccount = personalInfo.bankAccount || '';
  const bankAccountName = personalInfo.bankAccountName || '';
  const FAMILY_ROWS = 10;
  const familyDetails: Array<{ fullName?: string; relationship?: string; dateOfBirth?: string; note?: string }> =
    Array.isArray(personalInfo.familyDetails) ? personalInfo.familyDetails : [];
  const familyRows = Array.from({ length: FAMILY_ROWS }, (_, i) => familyDetails[i] ?? {});

  // workInfo fields
  const team = workInfo.team || '';
  const hrContact = workInfo.hrContact || '';
  const bootcampNo = workInfo.bootcampNo || '';
  const mindspaceCardNo = workInfo.mindspaceCardNo || '';
  const terminationDate = workInfo.terminationDate || (employee.endDate ? format(new Date(employee.endDate), 'MMM d, yyyy') : '');
  const terminationReason = workInfo.terminationReason || '';
  const compensationDate = workInfo.compensationDate || startDateFormatted;
  const contractType = workInfo.contractType || '';
  const salaryType = workInfo.salaryType || '';
  const salaryAmount = workInfo.salaryAmount || '';
  const salaryCurrency = workInfo.salaryCurrency || '';
  const compensationNote = workInfo.compensationNote || '';
  const assets: Array<{ category?: string; description?: string; dateLoaned?: string; dateReturned?: string; assetsCost?: string; notes?: string }> =
    Array.isArray(workInfo.assets) ? workInfo.assets : [];
  const salaryHistory: Array<{ effectiveDate?: string; contractType?: string; salaryType?: string; salaryAmount?: string; contractDoc?: string; salaryCurrency?: string; note?: string }> =
    Array.isArray(workInfo.salaryHistory) ? workInfo.salaryHistory : [];

  // Save helpers
  const pi = (field: string) => isAdmin
    ? (val: string) => updatePersonalInfo.mutateAsync({ id: params.id, [field]: val } as any)
    : undefined;
  const wi = (field: string) => isAdmin
    ? (val: string) => updateWorkInfo.mutateAsync({ id: params.id, [field]: val } as any)
    : undefined;

  // Per-row save helpers for arrays
  const saveFamilyField = (idx: number, field: string) => isAdmin
    ? (val: string) => {
        const rows = Array.from({ length: FAMILY_ROWS }, (_, i) => familyDetails[i] ?? {});
        const updated = rows.map((m, i) => i === idx ? { ...m, [field]: val } : m);
        return updatePersonalInfo.mutateAsync({ id: params.id, familyDetails: updated } as any);
      }
    : undefined;

  const saveSalaryField = (idx: number, field: string) => isAdmin
    ? (val: string) => {
        const base = salaryHistory.length > 0 ? salaryHistory : [{}];
        const updated = base.map((e, i) => i === idx ? { ...e, [field]: val } : e);
        return updateWorkInfo.mutateAsync({ id: params.id, salaryHistory: updated } as any);
      }
    : undefined;

  const addSalaryEntry = () => {
    const updated = [...salaryHistory, { effectiveDate: '', contractType: '', salaryType: '', salaryAmount: '', contractDoc: '', salaryCurrency: '', note: '' }];
    updateWorkInfo.mutateAsync({ id: params.id, salaryHistory: updated } as any);
  };
  const deleteSalaryEntry = (idx: number) => {
    const updated = salaryHistory.filter((_, i) => i !== idx);
    updateWorkInfo.mutateAsync({ id: params.id, salaryHistory: updated } as any);
  };

  const saveAssetField = (idx: number, field: string) => isAdmin
    ? (val: string) => {
        const base = assets.length > 0 ? assets : [{}];
        const updated = base.map((a, i) => i === idx ? { ...a, [field]: val } : a);
        return updateWorkInfo.mutateAsync({ id: params.id, assets: updated } as any);
      }
    : undefined;

  const addAssetEntry = () => {
    const updated = [...assets, { category: '', description: '', dateLoaned: '', dateReturned: '', assetsCost: '', notes: '' }];
    updateWorkInfo.mutateAsync({ id: params.id, assets: updated } as any);
  };

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card className="border-none shadow-sm bg-white dark:bg-charcoal-900">
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="relative group shrink-0">
              <Avatar className="h-20 w-20">
                {employee.avatar && <AvatarImage src={employee.avatar} alt={fullName} className="object-cover" />}
                <AvatarFallback className="text-2xl bg-primary-100 text-primary-600 font-bold">
                  {getInitials(employee.firstName, employee.lastName)}
                </AvatarFallback>
              </Avatar>
              {canEditAvatar && (
                <>
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Upload photo"
                  >
                    <Camera size={22} className="text-white" />
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFile} />
                </>
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold">{fullName}</h1>
                {isAdmin ? (
                  <div className="relative">
                    <StatusDropdown
                      status={employee.status}
                      onChange={(s) => updateEmployee.mutateAsync({ id: params.id, status: s } as any)}
                      onTerminate={(endDate, reason) => terminateEmployee.mutateAsync({ id: params.id, endDate: new Date(endDate), reason })}
                    />
                  </div>
                ) : (
                  <Badge variant={statusVariant(employee.status)}>{statusLabel(employee.status)}</Badge>
                )}
                {isAdmin && (employee as any).user && (
                  <select
                    value={(employee as any).user.role}
                    onChange={e => updateRole.mutateAsync({ employeeId: params.id, role: e.target.value as any })}
                    className="text-xs border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-charcoal-800 text-gray-700 dark:text-gray-300"
                  >
                    <option value="EMPLOYEE">Employee</option>
                    <option value="IT">IT</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                )}
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">
                {jobTitle || '—'} • {departmentName}
                {managerDisplay && <span className="text-gray-400"> • Reports to <a href={employee.manager ? `/people/${employee.manager.id}` : '#'} className="text-primary-500 hover:underline">{managerDisplay}</a></span>}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                <span className="flex items-center gap-1 font-medium"><Mail size={14} className="text-gray-400" />{employee.email}</span>
                {officeDisplay && (
                  <span className="flex items-center gap-1 font-medium"><MapPin size={14} className="text-gray-400" />{officeDisplay}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7-tab layout */}
      <Tabs defaultValue="profile">
        <TabsList className="bg-transparent border-b border-gray-200 dark:border-charcoal-800 rounded-none h-auto p-0 w-full justify-start gap-1">
          <TabsTrigger value="profile" className={tabTriggerClass}>Profile</TabsTrigger>
          {canSeeSensitive && <TabsTrigger value="work" className={tabTriggerClass}>Work</TabsTrigger>}
          {canSeeSensitive && <TabsTrigger value="assets" className={tabTriggerClass}>Assets</TabsTrigger>}
          {canSeeSensitive && <TabsTrigger value="bank" className={tabTriggerClass}>Bank Details</TabsTrigger>}
          {canSeeSensitive && <TabsTrigger value="pension" className={tabTriggerClass}>Pension</TabsTrigger>}
        </TabsList>

        {/* Profile tab (merged Profile + Personal) */}
        <TabsContent value="profile" className="mt-6 space-y-4">
          <SectionCard
            title="General Info"
            subtitle="See and edit the employee's personal and public information"
          >
            <div className="grid grid-cols-5 gap-4 mb-4">
              <F label="First Name" value={employee.firstName}
                onSave={isAdmin ? (val) => updateEmployee.mutateAsync({ id: params.id, firstName: val }) : undefined} />
              <F label="Middle Name" value={middleName} onSave={pi('middleName')} />
              <F label="Last Name" value={employee.lastName}
                onSave={isAdmin ? (val) => updateEmployee.mutateAsync({ id: params.id, lastName: val }) : undefined} />
              <F label="Work Email" value={employee.email}
                onSave={isAdmin ? (val) => updateEmployee.mutateAsync({ id: params.id, email: val } as any) : undefined} />
              <F label="Phone Number" value={phone} onSave={pi('phone')} />
            </div>
            <div className="grid grid-cols-5 gap-4 mb-4">
              <DateField label="Date of Birth" value={dateOfBirth} onSave={pi('dateOfBirth')} />
              <F label="Gender" value={gender} onSave={pi('gender')} />
              <F label="Personal Email" value={personalEmail} onSave={pi('personalEmail')} />
              <F label="Allergies/food preference" value={allergies} onSave={pi('allergies')} />
              <F label="Shirt Size" value={shirtSize} onSave={pi('shirtSize')} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {canSeeFiles && <DocumentField label="Documents" value={personalInfo.documents} folder={docsFolder} onSave={isAdmin ? pi('documents') : undefined} />}
              {canSeeFiles && <DocumentField label="CV" value={personalInfo.cv} folder={docsFolder} mode="single" onSave={isAdmin ? async (val) => {
                // Auto-archive: push the current CV into the cvOld array before replacing
                const currentCvEntries = parseDocEntries(personalInfo.cv);
                const oldEntries = parseDocEntries(personalInfo.cvOld);
                const mergedOld = [...oldEntries, ...currentCvEntries];
                await updatePersonalInfo.mutateAsync({
                  id: params.id,
                  cv: val,
                  cvOld: mergedOld.length > 0 ? JSON.stringify(mergedOld) : undefined,
                } as any);
              } : undefined} />}
              {canSeeFiles && <DocumentField label="CV Old" value={personalInfo.cvOld} folder={docsFolder} onSave={isAdmin ? pi('cvOld') : undefined} />}
            </div>
          </SectionCard>

          {canSeeSensitive && <SectionCard
            title="Identification"
            subtitle="Store all forms of personal identification here"
          >
            <div className="grid grid-cols-4 gap-4">
              <F label="Nationality" value={nationality} onSave={pi('nationality')} />
              <F label="Employee ID" value={personalInfo.employeeNumber || employee.id} onSave={pi('employeeNumber')} />
              <F label="National ID" value={nationalId} onSave={pi('nationalId')} />
              <F label="Passport Number" value={passportNumber} onSave={pi('passportNumber')} />
            </div>
          </SectionCard>}

          {canSeeSensitive && <SectionCard
            title="Address"
            subtitle="See and edit the employee's current address"
          >
            <div className="grid grid-cols-5 gap-4 mb-4">
              <F label="Address" value={address} onSave={pi('address')} />
              <F label="City" value={city} onSave={pi('city')} />
              <F label="State/Province" value={stateProvince} onSave={pi('stateProvince')} />
              <F label="Country" value={country} onSave={pi('country')} />
              <F label="Zip Code" value={zipCode} onSave={pi('zipCode')} />
            </div>
            <div>
              <F label="Notes" value={addressNotes} onSave={pi('addressNotes')} />
            </div>
          </SectionCard>}

          {canSeeSensitive && <SectionCard
            title="Emergency Contact"
            subtitle="See and edit the contact details of the employee's emergency contact"
          >
            <div className="grid grid-cols-3 gap-4">
              <F label="Full Name" value={emergencyContactName} onSave={pi('emergencyContactName')} />
              <F label="Relationship" value={emergencyContactRelationship} onSave={pi('emergencyContactRelationship')} />
              <F label="Phone Number" value={emergencyContactPhone} onSave={pi('emergencyContactPhone')} />
            </div>
          </SectionCard>}

          {canSeeSensitive && <SectionCard title="Family Details">
            {familyRows.map((member, i) => (
              <div key={i} className="grid grid-cols-4 gap-4 mb-3">
                <F label="Full name" value={member.fullName || ''} onSave={saveFamilyField(i, 'fullName')} />
                <F label="Relationship" value={member.relationship || ''} onSave={saveFamilyField(i, 'relationship')} />
                <DateField label="Date of Birth" value={member.dateOfBirth || ''} onSave={saveFamilyField(i, 'dateOfBirth')} />
                <F label="Note" value={member.note || ''} onSave={saveFamilyField(i, 'note')} />
              </div>
            ))}
          </SectionCard>}
        </TabsContent>

        {/* Work tab */}
        {canSeeSensitive && <TabsContent value="work" className="mt-6 space-y-4">
          <SectionCard
            title="Initiation"
            subtitle="Information of when the employee's contract with the company started"
          >
            <div className="grid grid-cols-3 gap-4">
              <DateField label="Start Date" value={startDateFormatted}
                onSave={isAdmin ? (val) => updateEmployee.mutateAsync({ id: params.id, startDate: val } as any) : undefined} />
              <F label="Bootcamp No." value={bootcampNo} onSave={wi('bootcampNo')} />
              <F label="Mindspace Card No." value={mindspaceCardNo} onSave={wi('mindspaceCardNo')} />
            </div>
          </SectionCard>

          <SectionCard
            title="Termination"
            subtitle="Optional information for when the employee's contract with the company ends"
          >
            <div className="grid grid-cols-2 gap-4">
              <DateField label="Termination Date" value={terminationDate} onSave={wi('terminationDate')} />
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Termination Reason</p>
                <select
                  value={terminationReason}
                  onChange={e => wi('terminationReason')?.(e.target.value)}
                  disabled={!isAdmin}
                  className="w-full border border-gray-200 dark:border-charcoal-600 rounded-md px-3 py-1.5 text-sm bg-white dark:bg-charcoal-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-400"
                >
                  <option value="">Select a reason…</option>
                  <option value="Company Decision">Company Decision</option>
                  <option value="Employee Decision">Employee Decision</option>
                  <option value="Resignation">Resignation</option>
                  <option value="Layoff">Layoff</option>
                  <option value="Performance">Performance</option>
                  <option value="Contract End">Contract End</option>
                  <option value="Mutual Agreement">Mutual Agreement</option>
                  <option value="Retirement">Retirement</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
          </SectionCard>

          {/* Role section */}
          {canSeeSensitive && (
          <SectionCard
            title="Role"
            subtitle="See and edit the employee's role and work environment"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-gray-500">Effective Date:</span>
              <DateField label="" value={startDateFormatted}
                onSave={isAdmin ? (val) => updateEmployee.mutateAsync({ id: params.id, startDate: val } as any) : undefined} />
            </div>
            <div className="grid grid-cols-6 gap-4">
              <F label="Job" value={jobTitle} onSave={wi('jobTitle')} />
              <ManagerPicker
                label="Reports To"
                currentManagerId={employee.manager?.id}
                currentManagerName={managerDisplay}
                onSave={isAdmin ? (managerId) => updateEmployee.mutateAsync({ id: params.id, manager: managerId || undefined } as any) : undefined}
              />
              <F label="Team" value={team} onSave={wi('team')} />
              <F label="Office" value={officeDisplay} onSave={wi('office')} />
              <F label="HR" value={hrContact} onSave={wi('hrContact')} />
              <DropdownBadgeField label="Worker Type" value={workInfo.workerType || ''} options={['In-house', 'Freelance']} onSave={isAdmin ? (val) => { const fn = wi('workerType'); if (fn) fn(val); } : undefined} />
            </div>
            {(employee as any).directReports?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-charcoal-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-medium">Direct Reports ({(employee as any).directReports.length})</p>
                <div className="flex flex-wrap gap-2">
                  {(employee as any).directReports.map((dr: any) => (
                    <a key={dr.id} href={`/people/${dr.id}`} className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-charcoal-800 rounded-lg hover:bg-gray-100 dark:hover:bg-charcoal-700 transition-colors">
                      <span className="w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/30 text-primary-600 text-[10px] font-bold inline-flex items-center justify-center">{dr.firstName?.[0]}{dr.lastName?.[0]}</span>
                      <span className="text-sm font-medium">{dr.firstName} {dr.lastName}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </SectionCard>
          )}

          {/* Compensation History table */}
          {canSeeSensitive && (() => {
            const displayHistory = salaryHistory.length > 0 ? salaryHistory : [{}];
            const sortedHistory = displayHistory
              .map((entry, idx) => ({ entry, idx }))
              .sort((a, b) => {
                const da = a.entry.effectiveDate ? new Date(a.entry.effectiveDate).getTime() : 0;
                const db = b.entry.effectiveDate ? new Date(b.entry.effectiveDate).getTime() : 0;
                return db - da;
              });
            return (
              <SectionCard title="Compensation History">
                <div className="overflow-x-auto overflow-y-visible">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 dark:border-charcoal-700">
                        {['Effective date', 'Contract Type', 'Salary Type', 'Salary Amount', 'Base (80%)', 'Additional (20%)', 'Contract Documents', 'Salary Currency', 'Note', ...(isAdmin ? [''] : [])].map(col => (
                          <th key={col || 'actions'} className="text-left text-xs font-medium text-gray-500 dark:text-gray-400 pb-2 pr-4 whitespace-nowrap">{col}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {sortedHistory.map(({ entry, idx }) => (
                        <tr key={idx} className="border-b border-gray-100 dark:border-charcoal-800 last:border-0">
                          <td className="py-3 pr-6 min-w-[130px]">
                            <DateField label="" value={entry.effectiveDate || ''} onSave={saveSalaryField(idx, 'effectiveDate')} />
                          </td>
                          <td className="py-3 pr-6 min-w-[140px]">
                            <DropdownBadgeField label="" value={entry.contractType || ''} options={CONTRACT_TYPE_OPTIONS} onSave={isAdmin ? saveSalaryField(idx, 'contractType') : undefined} />
                          </td>
                          <td className="py-3 pr-6 min-w-[140px]">
                            <DropdownBadgeField label="" value={entry.salaryType || ''} options={SALARY_TYPE_OPTIONS} onSave={isAdmin ? saveSalaryField(idx, 'salaryType') : undefined} />
                          </td>
                          <td className="py-3 pr-6 min-w-[120px]">
                            <F label="" value={entry.salaryAmount || ''} onSave={saveSalaryField(idx, 'salaryAmount')} />
                          </td>
                          <td className="py-3 pr-6 min-w-[110px]">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {entry.salaryAmount ? `$${Math.round(parseFloat(entry.salaryAmount) * 0.8).toLocaleString()}` : '—'}
                            </span>
                          </td>
                          <td className="py-3 pr-6 min-w-[110px]">
                            <span className="text-sm text-gray-600 dark:text-gray-400">
                              {entry.salaryAmount ? `$${Math.round(parseFloat(entry.salaryAmount) * 0.2).toLocaleString()}` : '—'}
                            </span>
                          </td>
                          <td className="py-3 pr-6 min-w-[160px]">
                            <DocumentField label="" value={entry.contractDoc || null} folder={docsFolder} onSave={isAdmin ? saveSalaryField(idx, 'contractDoc') : undefined} />
                          </td>
                          <td className="py-3 pr-6 min-w-[120px]">
                            <DropdownBadgeField label="" value={entry.salaryCurrency || ''} options={CURRENCY_OPTIONS} onSave={isAdmin ? saveSalaryField(idx, 'salaryCurrency') : undefined} />
                          </td>
                          <td className="py-3 min-w-[160px]">
                            <F label="" value={entry.note || ''} onSave={saveSalaryField(idx, 'note')} />
                          </td>
                          {isAdmin && (
                            <td className="py-3 pl-2">
                              <button
                                onClick={() => deleteSalaryEntry(idx)}
                                className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded text-red-400 hover:text-red-600 transition-colors"
                                title="Delete entry"
                              >
                                <Trash2 size={14} />
                              </button>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {isAdmin && (
                  <button onClick={addSalaryEntry} className="mt-4 flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 font-medium">
                    <Plus size={14} /> Add salary entry
                  </button>
                )}
              </SectionCard>
            );
          })()}
        </TabsContent>}

        {/* Assets tab */}
        {canSeeSensitive && <TabsContent value="assets" className="mt-6 space-y-4">
          {(assets.length > 0 ? assets : [{}]).map((asset: any, i) => (
            <SectionCard key={i} title="Assets">
              <div className="grid grid-cols-5 gap-4 mb-4">
                <F label="Category" value={asset.category || ''} onSave={saveAssetField(i, 'category')} />
                <F label="Description" value={asset.description || ''} onSave={saveAssetField(i, 'description')} />
                <DateField label="Date Loaned" value={asset.dateLoaned || ''} onSave={saveAssetField(i, 'dateLoaned')} />
                <DateField label="Date Returned" value={asset.dateReturned || ''} onSave={saveAssetField(i, 'dateReturned')} />
                <F label="Assets Cost" value={asset.assetsCost || ''} onSave={saveAssetField(i, 'assetsCost')} />
              </div>
              <div>
                <F label="Notes" value={asset.notes || ''} onSave={saveAssetField(i, 'notes')} />
              </div>
            </SectionCard>
          ))}
          {isAdmin && (
            <button
              onClick={addAssetEntry}
              className="flex items-center gap-1 text-sm text-primary-500 hover:text-primary-600 font-medium"
            >
              <Plus size={14} /> Add asset
            </button>
          )}
        </TabsContent>}

        {/* Salary tab */}
        {/* Bank Details tab */}
        {canSeeSensitive && <TabsContent value="bank" className="mt-6 space-y-4">
          <SectionCard
            title="Bank Details"
            subtitle="See and edit the employee's bank account information"
          >
            <div className="grid grid-cols-4 gap-4 mb-4">
              <F label="Bank Name" value={bankName} onSave={pi('bankName')} />
              <F label="Branch Name" value={bankBranch} onSave={pi('bankBranch')} />
              <F label="Account Number" value={bankAccount} onSave={pi('bankAccount')} />
              <F label="Account Name" value={bankAccountName} onSave={pi('bankAccountName')} />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <DocumentField
                label="Bank Management Approval"
                value={personalInfo.bankApprovalDoc}
                folder={docsFolder}
                onSave={isAdmin ? pi('bankApprovalDoc') : undefined}
              />
            </div>
          </SectionCard>
        </TabsContent>}

        {/* Pension tab */}
        {canSeeSensitive && <TabsContent value="pension" className="mt-6 space-y-4">
          <SectionCard
            title="Pension"
            subtitle="See and edit the employee's pension fund details"
          >
            <div className="grid grid-cols-4 gap-4 mb-4">
              <F label="Pension Fund Name" value={workInfo.pensionFundName || ''} onSave={wi('pensionFundName')} />
              <F label="Pension ID" value={workInfo.pensionId || ''} onSave={wi('pensionId')} />
              <DateField label="Start Date" value={workInfo.pensionStartDate || ''} onSave={wi('pensionStartDate')} />
              <F label="Employee Contribution (%)" value={workInfo.pensionEmployeeContribution || ''} onSave={wi('pensionEmployeeContribution')} />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <F label="Employer Contribution (%)" value={workInfo.pensionEmployerContribution || ''} onSave={wi('pensionEmployerContribution')} />
              <DocumentField
                label="Pension Document"
                value={workInfo.pensionDoc}
                folder={docsFolder}
                onSave={isAdmin ? wi('pensionDoc') : undefined}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Training Fund"
            subtitle="See and edit the employee's training fund details"
          >
            <div className="grid grid-cols-4 gap-4 mb-4">
              <F label="Training Fund Name" value={workInfo.trainingFundName || ''} onSave={wi('trainingFundName')} />
              <F label="Training Fund ID" value={workInfo.trainingFundId || ''} onSave={wi('trainingFundId')} />
              <DateField label="Start Date" value={workInfo.trainingFundStartDate || ''} onSave={wi('trainingFundStartDate')} />
              <F label="Employee Contribution (%)" value={workInfo.trainingFundEmployeeContribution || ''} onSave={wi('trainingFundEmployeeContribution')} />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <F label="Employer Contribution (%)" value={workInfo.trainingFundEmployerContribution || ''} onSave={wi('trainingFundEmployerContribution')} />
              <DocumentField
                label="Training Fund Document"
                value={workInfo.trainingFundDoc}
                folder={docsFolder}
                onSave={isAdmin ? wi('trainingFundDoc') : undefined}
              />
            </div>
          </SectionCard>
        </TabsContent>}

      </Tabs>
    </div>
  );
}
