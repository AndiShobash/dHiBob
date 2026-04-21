/**
 * External-channel notification dispatcher: email via Resend, Slack DM via bot.
 * Only called for "big" events (new time-off request, final approval, final rejection).
 * Degrades gracefully: if a channel's env var is missing we skip that channel.
 */
import { Resend } from "resend";
import { WebClient } from "@slack/web-api";

const resendApiKey = process.env.RESEND_API_KEY;
const fromEmail = process.env.NOTIFICATION_FROM_EMAIL;
const slackToken = process.env.SLACK_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const resend = resendApiKey ? new Resend(resendApiKey) : null;
const slack = slackToken ? new WebClient(slackToken) : null;

export interface ExternalRecipient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  personalInfo?: string | null;
}

export interface ExternalPayload {
  subject: string;
  /** Short plain-text body (1-3 lines). */
  body: string;
  /** Optional relative path (e.g. "/time-off") — rendered as "View in DHiBob" CTA. */
  linkPath?: string;
}

interface NotifyPrefs {
  email: boolean;
  slack: boolean;
}

function parsePrefs(personalInfo?: string | null): NotifyPrefs {
  try {
    const p = personalInfo ? JSON.parse(personalInfo) : {};
    return {
      email: p.notifyEmail !== false, // default on
      slack: p.notifySlack !== false, // default on
    };
  } catch {
    return { email: true, slack: true };
  }
}

export async function sendExternal(recipients: ExternalRecipient[], payload: ExternalPayload) {
  if (!recipients.length) return;
  await Promise.all(recipients.map(r => sendToOne(r, payload)));
}

async function sendToOne(recipient: ExternalRecipient, payload: ExternalPayload) {
  const prefs = parsePrefs(recipient.personalInfo);
  await Promise.all([
    prefs.email ? sendEmail(recipient, payload) : Promise.resolve(),
    prefs.slack ? sendSlackDM(recipient, payload) : Promise.resolve(),
  ]);
}

async function sendEmail(recipient: ExternalRecipient, payload: ExternalPayload) {
  if (!resend || !fromEmail) return;
  try {
    await resend.emails.send({
      from: fromEmail,
      to: recipient.email,
      subject: payload.subject,
      html: buildHtml(recipient, payload),
      text: buildText(payload),
    });
  } catch (err) {
    // Swallow — we still have the in-app notification as source of truth
    console.error("[notify] email send failed:", (err as Error)?.message ?? err);
  }
}

async function sendSlackDM(recipient: ExternalRecipient, payload: ExternalPayload) {
  if (!slack) return;
  try {
    const lookup = await slack.users.lookupByEmail({ email: recipient.email });
    if (!lookup.ok || !lookup.user?.id) return;
    const link = payload.linkPath ? ` <${appUrl}${payload.linkPath}|View in DHiBob>` : "";
    await slack.chat.postMessage({
      channel: lookup.user.id,
      text: `*${payload.subject}*\n${payload.body}${link}`,
    });
  } catch (err: any) {
    // users_not_found just means the email isn't on the workspace — expected, skip silently
    if (err?.data?.error !== "users_not_found") {
      console.error("[notify] slack send failed:", err?.data?.error ?? err?.message ?? err);
    }
  }
}

function buildHtml(recipient: ExternalRecipient, payload: ExternalPayload): string {
  const link = payload.linkPath
    ? `<p style="margin: 16px 0;"><a href="${appUrl}${payload.linkPath}" style="background:#E33054; color:#fff; padding:10px 18px; border-radius:6px; text-decoration:none; display:inline-block; font-weight:600;">View in DHiBob</a></p>`
    : "";
  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <p style="font-size: 14px; color: #6b7280; margin: 0 0 8px 0;">Hi ${recipient.firstName},</p>
      <h1 style="font-size: 18px; font-weight: 600; margin: 0 0 12px 0; color: #111827;">${escapeHtml(payload.subject)}</h1>
      <p style="font-size: 14px; line-height: 1.6; margin: 0 0 16px 0; white-space: pre-line;">${escapeHtml(payload.body)}</p>
      ${link}
      <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0 16px 0;" />
      <p style="font-size: 12px; color: #9ca3af; margin: 0;">
        DHiBob · Develeap<br />
        Notification preferences can be changed in your profile.
      </p>
    </div>
  `.trim();
}

function buildText(payload: ExternalPayload): string {
  const link = payload.linkPath ? `\n\n${appUrl}${payload.linkPath}` : "";
  return `${payload.subject}\n\n${payload.body}${link}`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
