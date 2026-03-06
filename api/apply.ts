import type { VercelRequest, VercelResponse } from "@vercel/node";
import { isAuthorized } from "./_auth";
import { formatError, runCommand } from "../src/runtime";

export const config = {
  maxDuration: 60,
};

export default async function handler(request: VercelRequest, response: VercelResponse): Promise<void> {
  if (request.method !== "GET" && request.method !== "POST") {
    response.status(405).json({ ok: false, error: "Method not allowed" });
    return;
  }

  if (!isAuthorized(request)) {
    response.status(401).json({ ok: false, error: "Unauthorized" });
    return;
  }

  try {
    await runCommand("apply");
    response.status(200).json({ ok: true, action: "apply" });
  } catch (error) {
    response.status(500).json({ ok: false, error: formatError(error) });
  }
}
