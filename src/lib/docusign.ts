/**
 * DocuSign integration — send documents for e-signature.
 *
 * Gated by env vars. When DOCUSIGN_INTEGRATION_KEY is unset, isConfigured()
 * returns false and sendForSignature() throws. The UI checks isConfigured()
 * to decide whether to show "Send for Signature" or "DocuSign not configured".
 *
 * To enable:
 *   DOCUSIGN_INTEGRATION_KEY=<your Integration Key (client ID)>
 *   DOCUSIGN_USER_ID=<the API User ID (GUID) of the sending user>
 *   DOCUSIGN_ACCOUNT_ID=<the DocuSign Account ID>
 *   DOCUSIGN_RSA_PRIVATE_KEY=<base64-encoded RSA private key>
 *   DOCUSIGN_BASE_URL=https://demo.docusign.net/restapi  (or production URL)
 *
 * Uses JWT Grant (server-to-server, no user login pop-up).
 */

const integrationKey = process.env.DOCUSIGN_INTEGRATION_KEY;
const userId = process.env.DOCUSIGN_USER_ID;
const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
const baseUrl = process.env.DOCUSIGN_BASE_URL || 'https://demo.docusign.net/restapi';

export function isDocuSignConfigured(): boolean {
  return !!(integrationKey && userId && accountId);
}

export interface SignatureRequest {
  documentName: string;
  documentKey: string;        // S3 storage key
  documentBase64: string;     // base64-encoded file content
  signerEmail: string;
  signerName: string;
  callbackUrl?: string;       // webhook URL for status updates
}

export interface SignatureResult {
  envelopeId: string;
  status: 'sent' | 'error';
  message?: string;
}

/**
 * Send a document for e-signature via DocuSign.
 * Throws if DocuSign is not configured.
 */
export async function sendForSignature(req: SignatureRequest): Promise<SignatureResult> {
  if (!isDocuSignConfigured()) {
    throw new Error(
      'DocuSign is not configured. Set DOCUSIGN_INTEGRATION_KEY, DOCUSIGN_USER_ID, ' +
      'DOCUSIGN_ACCOUNT_ID, and DOCUSIGN_RSA_PRIVATE_KEY in your .env file.'
    );
  }

  // TODO: implement real DocuSign JWT Grant auth + Envelopes API call.
  // The architecture is ready:
  //   1. Generate JWT assertion with integrationKey + userId + RSA key
  //   2. Exchange for access token at account-d.docusign.com/oauth/token
  //   3. POST /v2.1/accounts/{accountId}/envelopes with the document + signer
  //   4. Return the envelope ID
  //
  // For now, return a placeholder result so the UI flow is testable.

  console.log(`[docusign] Would send "${req.documentName}" to ${req.signerEmail} for signature`);

  return {
    envelopeId: `placeholder-${Date.now()}`,
    status: 'sent',
    message: 'DocuSign envelope created (placeholder — real API call pending)',
  };
}
