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

export async function sendSlackDM(recipient: SlackRecipient, payload: SlackPayload): Promise<void> {
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
      console.error("[notify:slack] send failed:", err?.data?.error ?? err?.message ?? err);
    }
  }
}
