"use client";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Shield, Bell, Table as TableIcon, Lock } from "lucide-react";
import Link from "next/link";
import { NotificationPreferences } from "@/components/settings/notification-preferences";
import { trpc } from "@/lib/trpc";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Tabs defaultValue="company">
        <TabsList>
          <TabsTrigger value="company"><Building size={16} className="mr-1" />Company</TabsTrigger>
          <TabsTrigger value="roles"><Shield size={16} className="mr-1" />Roles</TabsTrigger>
          <TabsTrigger value="custom-tables"><TableIcon size={16} className="mr-1" />Custom Tables</TabsTrigger>
          <TabsTrigger value="notifications"><Bell size={16} className="mr-1" />Notifications</TabsTrigger>
          <TabsTrigger value="security"><Lock size={16} className="mr-1" />Security</TabsTrigger>
        </TabsList>
        <TabsContent value="company"><Card><CardHeader><CardTitle>Company Information</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Company Name</label><Input defaultValue="Acme Technologies" /></div><div><label className="text-sm font-medium">Industry</label><Input defaultValue="Technology" /></div><div><label className="text-sm font-medium">Website</label><Input defaultValue="https://acme.tech" /></div><div><label className="text-sm font-medium">Timezone</label><Input defaultValue="America/New_York" /></div></div><Button>Save Changes</Button></CardContent></Card></TabsContent>
        <TabsContent value="roles"><Card><CardHeader><CardTitle>Role Management</CardTitle></CardHeader><CardContent><div className="space-y-3">{["Admin", "HR Manager", "Manager", "Employee"].map(role => <div key={role} className="flex items-center justify-between p-3 border dark:border-charcoal-700 rounded-lg"><div><p className="font-medium">{role}</p><p className="text-sm text-gray-500 dark:text-gray-300">System role with predefined permissions</p></div><Button variant="outline" size="sm">Edit</Button></div>)}</div></CardContent></Card></TabsContent>
        <TabsContent value="custom-tables">
          <Card>
            <CardHeader>
              <CardTitle>Custom Table Management</CardTitle>
              <CardDescription>Create and manage flexible data tables for employee profiles.</CardDescription>
            </CardHeader>
            <CardContent className="py-8 text-center border-t dark:border-charcoal-800">
              <div className="space-y-4">
                <TableIcon size={48} className="mx-auto text-gray-300 dark:text-charcoal-700" />
                <div>
                  <p className="text-lg font-bold">Metadata Engine Ready</p>
                  <p className="text-sm text-gray-500 dark:text-gray-300 max-w-xs mx-auto">Define columns like dates, selects, and text fields to track arbitrary data.</p>
                </div>
                <Link href="/settings/custom-tables">
                  <Button className="bg-primary-500 hover:bg-primary-600 text-white font-bold uppercase tracking-tight">
                    Go to Table Designer
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>Configure how you receive notifications across different channels.</CardDescription>
            </CardHeader>
            <CardContent>
              <NotificationPreferences />
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your account password. You&apos;ll need to enter your current password for verification.</CardDescription>
            </CardHeader>
            <CardContent>
              <ChangePasswordForm />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const changePassword = trpc.user.changePassword.useMutation({
    onSuccess: () => {
      setSuccess(true);
      setError('');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (err) => {
      setError(err.message);
      setSuccess(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword === currentPassword) {
      setError('New password must be different from current password');
      return;
    }

    changePassword.mutate({ currentPassword, newPassword });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium mb-1">Current Password</label>
        <Input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">New Password</label>
        <Input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required placeholder="At least 8 characters" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Confirm New Password</label>
        <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && <p className="text-sm text-emerald-600">Password changed successfully.</p>}
      <Button type="submit" disabled={changePassword.isPending}>
        {changePassword.isPending ? 'Changing...' : 'Change Password'}
      </Button>
    </form>
  );
}
