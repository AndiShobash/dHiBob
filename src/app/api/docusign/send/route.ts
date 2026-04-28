import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { isDocuSignConfigured, sendForSignature } from '@/lib/docusign';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { documentName, documentKey, signerName, signerEmail } = body;

  if (!documentName || !signerEmail || !signerName) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  if (!isDocuSignConfigured()) {
    // Placeholder: track the request but don't call DocuSign
    console.log(`[docusign/send] Placeholder: "${documentName}" → ${signerEmail} (DocuSign not configured)`);
    return NextResponse.json({
      status: 'sent',
      envelopeId: `placeholder-${Date.now()}`,
      message: `Signature request tracked for ${signerName}. DocuSign API keys not configured yet — the document will be sent automatically once configured.`,
    });
  }

  try {
    const result = await sendForSignature({
      documentName,
      documentKey: documentKey || '',
      documentBase64: '',
      signerEmail,
      signerName,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[docusign/send] error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
