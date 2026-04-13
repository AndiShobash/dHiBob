"use client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Building, Shield, Bell, Table as TableIcon } from "lucide-react";
import Link from "next/link";

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
        </TabsList>
        <TabsContent value="company"><Card><CardHeader><CardTitle>Company Information</CardTitle></CardHeader><CardContent className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="text-sm font-medium">Company Name</label><Input defaultValue="Acme Technologies" /></div><div><label className="text-sm font-medium">Industry</label><Input defaultValue="Technology" /></div><div><label className="text-sm font-medium">Website</label><Input defaultValue="https://acme.tech" /></div><div><label className="text-sm font-medium">Timezone</label><Input defaultValue="America/New_York" /></div></div><Button>Save Changes</Button></CardContent></Card></TabsContent>
        <TabsContent value="roles"><Card><CardHeader><CardTitle>Role Management</CardTitle></CardHeader><CardContent><div className="space-y-3">{["Admin", "HR Manager", "Manager", "Employee"].map(role => <div key={role} className="flex items-center justify-between p-3 border dark:border-charcoal-700 rounded-lg"><div><p className="font-medium">{role}</p><p className="text-sm text-gray-500 dark:text-gray-400">System role with predefined permissions</p></div><Button variant="outline" size="sm">Edit</Button></div>)}</div></CardContent></Card></TabsContent>
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
                  <p className="text-sm text-gray-500 max-w-xs mx-auto">Define columns like dates, selects, and text fields to track arbitrary data.</p>
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
      </Tabs>
    </div>
  );
}
