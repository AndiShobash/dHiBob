/**
 * Slack channel: sends DM notifications via bot token.
 * Extracted from notification-dispatcher.ts for the centralized notify service.
 */
import { WebClient } from "@slack/web-api";

const slackToken = process.env.SLACK_BOT_TOKEN;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

const slack = slackToken ? new WebClient(slackToken) : null;

export interface SlackRecipient {
  email: string;
}

export interface SlackPayload {
  subject: string;
  body: string;
  linkPath?: string;
}

export function isSlackConfigured(): boolean {
  return !!slack;
}

/**
 * Escape Slack mrkdwn special characters to prevent injection.
 * Slack mrkdwn uses angle brackets for links/mentions/channels,
 * so we escape `<`, `>`, and `&` using Slack's entity encoding.
 * See: https://api.slack.com/reference/surfaces/formatting#escaping
 */
function escapeSlackMrkdwn(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export async function sendSlackDM(recipient: SlackRecipient, payload: SlackPayload): Promise<void> {
  if (!slack) return;
  try {
    const lookup = await slack.users.lookupByEmail({ email: recipient.email });
    if (!lookup.ok || !lookup.user?.id) return;
    const safeSubject = escapeSlackMrkdwn(payload.subject);
    const safeBody = escapeSlackMrkdwn(payload.body);
    const safeLinkPath = payload.linkPath ? escapeSlackMrkdwn(payload.linkPath) : undefined;
    const link = safeLinkPath ? ` <${appUrl}${safeLinkPath}|View in DHiBob>` : "";
    await slack.chat.postMessage({
      channel: lookup.user.id,
      text: `*${safeSubject}*\n${safeBody}${link}`,
    });
  } catch (err: any) {
    // users_not_found just means the email isn't on the workspace — expected, skip silently
    if (err?.data?.error !== "users_not_found") {
      console.error("[notify:slack] send failed:", err?.data?.error ?? err?.message ?? err);
    }
  }
}
