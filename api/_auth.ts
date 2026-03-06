import type { VercelRequest } from "@vercel/node";

function readExpectedToken(): string | null {
  return process.env.API_AUTH_TOKEN?.trim() || process.env.CRON_SECRET?.trim() || null;
}

export function isAuthorized(request: VercelRequest): boolean {
  const expectedToken = readExpectedToken();
  if (!expectedToken) {
    return true;
  }

  const authHeader = request.headers.authorization;
  return authHeader === `Bearer ${expectedToken}`;
}
