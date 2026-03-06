import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized } from "./_auth";

export const config = {
  maxDuration: 10,
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

  response.status(200).json({
    ok: true,
    service: "gmail-config",
    timestamp: new Date().toISOString(),
  });
}
