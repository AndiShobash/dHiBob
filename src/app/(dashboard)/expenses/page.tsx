"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatCard } from "@/components/ui/stat-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Plus, DollarSign, Clock, CheckCircle, XCircle, Download, FileText, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";

const EXPENSE_TYPES = [
  'Travel',
  'Meals & Entertainment',
  'Office Supplies',
  'Software & Subscriptions',
  'Training & Education',
  'Equipment',
  'Communication',
  'Transportation',
  'Accommodation',
  'Other',
];

const STATUS_VARIANT: Record<string, "success" | "warning" | "destructive" | "default"> = {
  APPROVED: "success",
  PENDING: "warning",
  REJECTED: "destructive",
};

export default function ExpensesPage() {
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === 'SUPER_ADMIN' || session?.user?.role === 'ADMIN' || session?.user?.role === 'HR';
  const utils = trpc.useUtils();
  const [addOpen, setAddOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  const { data: expenses, isLoading } = trpc.expenses.list.useQuery({
    status: statusFilter ? statusFilter as any : undefined,
    month: monthFilter || undefined,
  });
  const { data: summary } = trpc.expenses.summary.useQuery();

  const submitMutation = trpc.expenses.submit.useMutation({ onSuccess: () => { utils.expenses.invalidate(); setAddOpen(false); } });
  const approveMutation = trpc.expenses.approve.useMutation({ onSuccess: () => utils.expenses.invalidate() });
  const rejectMutation = trpc.expenses.reject.useMutation({ onSuccess: () => utils.expenses.invalidate() });
  const deleteMutation = trpc.expenses.delete.useMutation({ onSuccess: () => utils.expenses.invalidate() });

  const [form, setForm] = useState({
    expenseType: '', supplierName: '', amount: '', currency: 'USD',
    expenseDate: '', payrollMonth: '', invoiceFile: '', invoiceFileName: '', notes: '',
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setForm(f => ({ ...f, invoiceFileName: file.name }));
    const reader = new FileReader();
    reader.onload = () => setForm(f => ({ ...f, invoiceFile: reader.result as string }));
    reader.readAsDataURL(file);
  }

  function handleExport() {
    if (!expenses || expenses.length === 0) return;
    const data = expenses.map((e: any) => ({
      'Full Name': `${e.employee.firstName} ${e.employee.lastName}`,
      'Department': e.employee.department?.name ?? '',
      'Expense Type': e.expenseType,
      'Supplier': e.supplierName ?? '',
      'Amount': e.amount,
      'Currency': e.currency,
      'Date': new Date(e.expenseDate).toISOString().slice(0, 10),
      'Payroll Month': e.payrollMonth ?? '',
      'Status': e.status,
      'Notes': e.notes ?? '',
      'Submitted': new Date(e.createdAt).toISOString().slice(0, 10),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, "expense-report.xlsx");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Expenses</h1>
        <div className="flex gap-2">
          {isAdmin && expenses && expenses.length > 0 && (
            <Button variant="outline" onClick={handleExport} className="gap-2">
              <Download size={16} /> Export
            </Button>
          )}
          <Button onClick={() => setAddOpen(true)} className="gap-2">
            <Plus size={16} /> Submit Expense
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Pending" value={summary?.pending ?? '—'} icon={<Clock size={20} />} />
        <StatCard title="Approved" value={summary?.approvedCount ?? '—'} icon={<CheckCircle size={20} />} />
        <StatCard title="Total Approved" value={summary?.approvedTotal ? `$${summary.approvedTotal.toLocaleString()}` : '—'} icon={<DollarSign size={20} />} />
        <StatCard title="Rejected" value={summary?.rejected ?? '—'} icon={<XCircle size={20} />} />
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 text-gray-900 dark:text-white min-w-[140px]">
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 text-gray-900 dark:text-white min-w-[140px]">
          <option value="">All Months</option>
          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((name, i) => {
            const now = new Date();
            const val = `${now.getFullYear()}-${String(i + 1).padStart(2, '0')}`;
            return <option key={i} value={val}>{name} {now.getFullYear()}</option>;
          })}
        </select>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />)}</div>
          ) : !expenses || expenses.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <DollarSign size={48} className="mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No expenses found.</p>
              <p className="text-sm">Submit your first expense claim.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
                    <th className="text-left p-3 font-medium">Employee</th>
                    <th className="text-left p-3 font-medium">Type</th>
                    <th className="text-left p-3 font-medium">Supplier</th>
                    <th className="text-left p-3 font-medium">Amount</th>
                    <th className="text-left p-3 font-medium">Date</th>
                    <th className="text-left p-3 font-medium">Payroll Month</th>
                    <th className="text-left p-3 font-medium">Invoice</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map((expense: any) => (
                    <tr key={expense.id} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 group">
                      <td className="p-3 font-medium">{expense.employee.firstName} {expense.employee.lastName}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{expense.expenseType}</td>
                      <td className="p-3 text-gray-600 dark:text-gray-400">{expense.supplierName || '—'}</td>
                      <td className="p-3 font-semibold">${expense.amount.toLocaleString()}</td>
                      <td className="p-3 text-gray-500">{new Date(expense.expenseDate).toISOString().slice(0, 10)}</td>
                      <td className="p-3 text-gray-500">{expense.payrollMonth || '—'}</td>
                      <td className="p-3">
                        {expense.invoiceFile ? (
                          <a href={expense.invoiceFile} download={expense.invoiceFileName} className="text-primary-500 hover:text-primary-600 flex items-center gap-1">
                            <FileText size={14} /> {expense.invoiceFileName || 'Download'}
                          </a>
                        ) : '—'}
                      </td>
                      <td className="p-3"><Badge variant={STATUS_VARIANT[expense.status]}>{expense.status}</Badge></td>
                      <td className="p-3">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {isAdmin && expense.status === 'PENDING' && (
                            <>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-emerald-600" onClick={() => approveMutation.mutate({ id: expense.id })}>Approve</Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs text-red-600" onClick={() => rejectMutation.mutate({ id: expense.id })}>Reject</Button>
                            </>
                          )}
                          <button onClick={() => deleteMutation.mutate({ id: expense.id })} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Submit Expense Modal */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Submit Expense</DialogTitle></DialogHeader>
          <form onSubmit={e => {
            e.preventDefault();
            submitMutation.mutate({
              expenseType: form.expenseType,
              supplierName: form.supplierName || undefined,
              amount: parseFloat(form.amount),
              currency: form.currency,
              expenseDate: new Date(form.expenseDate),
              payrollMonth: form.payrollMonth || undefined,
              invoiceFile: form.invoiceFile || undefined,
              invoiceFileName: form.invoiceFileName || undefined,
              notes: form.notes || undefined,
            });
            setForm({ expenseType: '', supplierName: '', amount: '', currency: 'USD', expenseDate: '', payrollMonth: '', invoiceFile: '', invoiceFileName: '', notes: '' });
          }} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Expense Type</label>
              <select value={form.expenseType} onChange={e => setForm(f => ({ ...f, expenseType: e.target.value }))} required
                className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800 text-gray-900 dark:text-white">
                <option value="">Select type...</option>
                {EXPENSE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Amount</label>
                <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} required placeholder="0.00" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Currency</label>
                <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 text-sm bg-white dark:bg-charcoal-800">
                  {['USD','EUR','GBP','ILS','CAD','AUD'].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Supplier Name</label>
              <Input value={form.supplierName} onChange={e => setForm(f => ({ ...f, supplierName: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Expense Date</label>
                <Input type="date" value={form.expenseDate} onChange={e => setForm(f => ({ ...f, expenseDate: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Payroll Month</label>
                <Input type="month" value={form.payrollMonth} onChange={e => setForm(f => ({ ...f, payrollMonth: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Invoice File</label>
              <input type="file" onChange={handleFileChange} className="text-sm" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              {form.invoiceFileName && <p className="text-xs text-gray-500 mt-1">{form.invoiceFileName}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes..." />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitMutation.isLoading || !form.expenseType || !form.amount || !form.expenseDate}>
                {submitMutation.isLoading ? "Submitting..." : "Submit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
