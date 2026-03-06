import { gmail_v1, google } from "googleapis";
import { OAuth2Client } from "google-auth-library";

export const GMAIL_SCOPES = ["https://www.googleapis.com/auth/gmail.settings.basic"];

export function createGmailClient(auth: OAuth2Client): gmail_v1.Gmail {
  return google.gmail({ version: "v1", auth });
}

export async function listLabels(gmail: gmail_v1.Gmail): Promise<gmail_v1.Schema$Label[]> {
  const response = await gmail.users.labels.list({ userId: "me" });
  return response.data.labels ?? [];
}

export async function listFilters(gmail: gmail_v1.Gmail): Promise<gmail_v1.Schema$Filter[]> {
  const response = await gmail.users.settings.filters.list({ userId: "me" });
  return response.data.filter ?? [];
}
