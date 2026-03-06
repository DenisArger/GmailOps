import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized } from "./_auth";
import { getAuthenticatedClient } from "../src/auth";
import { createGmailClient, listFilters } from "../src/gmail";
import { formatError } from "../src/runtime";

export const config = {
  maxDuration: 60,
};

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method !== "GET") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!isAuthorized(request)) {
    response.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  try {
    const auth = await getAuthenticatedClient();
    const gmail = createGmailClient(auth);
    const filters = await listFilters(gmail);

    response.status(200).json({
      ok: true,
      count: filters.length,
      filters: filters.map((filter) => ({
        id: filter.id ?? null,
        query: filter.criteria?.query ?? null,
        addLabelIds: filter.action?.addLabelIds ?? [],
        removeLabelIds: filter.action?.removeLabelIds ?? [],
      })),
    });
  } catch (error) {
    response.status(500).json({ ok: false, error: formatError(error) });
  }
}
