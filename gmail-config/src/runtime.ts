import { GaxiosError } from "gaxios";
import { applyConfig } from "./applyConfig";
import { getAuthenticatedClient } from "./auth";
import { printFilters } from "./filters";
import { createGmailClient } from "./gmail";

export function formatError(error: unknown): string {
  if (error instanceof GaxiosError) {
    const status = error.response?.status;
    const payload = error.response?.data;
    const payloadMessage =
      typeof payload === "string" ? payload : JSON.stringify(payload ?? error.message);

    if (status === 401 || status === 403) {
      return `Missing Gmail permissions or invalid OAuth scopes. Ensure Gmail API is enabled and the app has https://www.googleapis.com/auth/gmail.settings.basic. Details: ${payloadMessage}`;
    }

    return `Gmail API error (${status ?? "unknown"}): ${payloadMessage}`;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

export async function runCommand(command: "apply" | "list"): Promise<void> {
  const auth = await getAuthenticatedClient();
  const gmail = createGmailClient(auth);

  if (command === "apply") {
    await applyConfig(gmail);
    return;
  }

  await printFilters(gmail);
}
