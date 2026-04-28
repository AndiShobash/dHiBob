"use client";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Upload, FileText, File, Image, Download, Loader2, AlertCircle, PenTool } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { UploadModal } from "@/components/documents/upload-modal";
import { format } from "date-fns";

const SIG_BADGE: Record<string, { variant: "success" | "warning" | "default" | "destructive"; label: string }> = {
  SIGNED:             { variant: "success",     label: "Signed" },
  PENDING_SIGNATURE:  { variant: "warning",     label: "Pending Signature" },
  DECLINED:           { variant: "destructive", label: "Declined" },
  VIEW_ONLY:          { variant: "default",     label: "View Only" },
  PENDING:            { variant: "warning",     label: "Pending" },
};

export default function DocumentsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [search, setSearch] = useState("");
  const [signDoc, setSignDoc] = useState<{ id: string; name: string } | null>(null);
  const [signerEmail, setSignerEmail] = useState("");
  const [signerName, setSignerName] = useState("");
  const { data: documents, isLoading, error, refetch } = trpc.document.list.useQuery({});
  const { data: docuSignStatus } = trpc.employee.isDocuSignConfigured.useQuery();
  const sendMutation = trpc.employee.sendForSignature.useMutation({
    onSuccess: () => { refetch(); setSignDoc(null); setSignerEmail(""); setSignerName(""); },
  });

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getIcon = (name: string, mimeType: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    const mime = mimeType.toLowerCase();
    
    if (ext === 'pdf' || mime.includes('pdf')) return FileText;
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext || '') || mime.startsWith('image/')) return Image;
    return File;
  };

  const filteredDocuments = documents?.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Documents</h1>
        <Button onClick={() => setShowUpload(true)}>
          <Upload size={16} className="mr-2" aria-hidden="true" />
          Upload
        </Button>
      </div>
      
      <div className="relative max-w-sm">
        <label htmlFor="search-documents" className="sr-only">Search documents</label>
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} aria-hidden="true" />
        <Input 
          id="search-documents"
          placeholder="Search documents..." 
          className="pl-10" 
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="animate-spin mb-2" size={32} aria-hidden="true" />
            <p>Loading documents...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 text-destructive bg-destructive/5 rounded-lg border border-destructive/20">
            <AlertCircle size={32} className="mb-2" aria-hidden="true" />
            <p>Error loading documents: {error.message}</p>
            <Button variant="outline" className="mt-4" onClick={() => refetch()}>
              Try Again
            </Button>
          </div>
        ) : filteredDocuments?.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            {search ? "No documents match your search." : "No documents found."}
          </div>
        ) : (
          filteredDocuments?.map(d => {
            const Icon = getIcon(d.name, d.mimeType);
            return (
              <Card key={d.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icon size={24} className="text-gray-400" aria-hidden="true" />
                    <div>
                      <p className="font-medium">{d.name}</p>
                      <p className="text-sm text-gray-500">
                        {d.type} · {formatSize(d.fileSize)} · Updated {format(new Date(d.createdAt), 'MMM dd')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {d.signatureStatus && SIG_BADGE[d.signatureStatus] && (
                      <Badge variant={SIG_BADGE[d.signatureStatus].variant}>
                        {SIG_BADGE[d.signatureStatus].label}
                      </Badge>
                    )}
                    <Badge variant="outline" className="capitalize">{d.folder}</Badge>
                    {d.type === 'CONTRACT' && d.signatureStatus !== 'SIGNED' && d.signatureStatus !== 'PENDING_SIGNATURE' && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => setSignDoc({ id: d.id, name: d.name })}
                      >
                        <PenTool size={12} /> Send for Signature
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label={`Download ${d.name}`}>
                      <Download size={16} aria-hidden="true" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      <UploadModal
        open={showUpload}
        onOpenChange={setShowUpload}
        onSuccess={refetch}
      />

      {/* Send for Signature dialog */}
      <Dialog open={!!signDoc} onOpenChange={(open) => { if (!open) setSignDoc(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Send for Signature</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 mb-2">
            Send <span className="font-medium text-gray-700 dark:text-gray-300">{signDoc?.name}</span> for e-signature via DocuSign.
          </p>
          {!docuSignStatus?.configured && (
            <div className="text-xs bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-md p-3 mb-2 text-amber-800 dark:text-amber-300">
              DocuSign is not configured yet. The signature request will be tracked in the system but won't actually send until an admin sets the DocuSign API keys in the server environment.
            </div>
          )}
          <form onSubmit={e => {
            e.preventDefault();
            if (!signDoc) return;
            sendMutation.mutate({ documentId: signDoc.id, signerEmail, signerName });
          }} className="space-y-3">
            <div>
              <label className="block text-sm font-medium mb-1">Signer Name</label>
              <Input value={signerName} onChange={e => setSignerName(e.target.value)} required placeholder="e.g. Andi Shobash" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Signer Email</label>
              <Input type="email" value={signerEmail} onChange={e => setSignerEmail(e.target.value)} required placeholder="e.g. andi@develeap.com" />
            </div>
            {sendMutation.error && (
              <p className="text-sm text-red-500">{sendMutation.error.message}</p>
            )}
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setSignDoc(null)}>Cancel</Button>
              <Button type="submit" disabled={sendMutation.isPending} className="gap-1">
                <PenTool size={14} />
                {sendMutation.isPending ? 'Sending...' : 'Send'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
