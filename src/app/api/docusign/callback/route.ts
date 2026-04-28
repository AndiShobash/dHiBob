import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

/**
 * DocuSign Connect webhook — receives envelope-status updates.
 * When an envelope is completed (all signers signed), updates the
 * Document.signatureStatus to SIGNED.
 *
 * In production, validate the HMAC signature from DocuSign headers.
 * For the placeholder flow this is a no-op endpoint.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const status = body?.status ?? body?.event;
    const envelopeId = body?.envelopeId ?? body?.data?.envelopeId;

    console.log(`[docusign/callback] envelopeId=${envelopeId} status=${status}`);

    if (status === 'completed' || status === 'signing_complete') {
      // Find the document that has this envelope ID in its signatureStatus
      // For real DocuSign, we'd store envelopeId on the Document record
      // and look it up here. Placeholder: just log.
      console.log(`[docusign/callback] Envelope ${envelopeId} completed — document signed`);
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[docusign/callback] error:', err);
    return NextResponse.json({ error: 'callback failed' }, { status: 500 });
  }
}
