import "dotenv/config";
import { OAuth2Client } from "google-auth-library";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { GMAIL_SCOPES } from "./gmail";

type InstalledCredentials = {
  client_id: string;
  client_secret: string;
  redirect_uris: string[];
};

type CredentialsFile = {
  installed?: InstalledCredentials;
  web?: InstalledCredentials;
};

function readCredentialsFromEnv(): InstalledCredentials | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();

  if (!clientId && !clientSecret && !redirectUri) {
    return null;
  }

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Incomplete Google OAuth environment configuration. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI together.",
    );
  }

  return {
    client_id: clientId,
    client_secret: clientSecret,
    redirect_uris: [redirectUri],
  };
}

function getProjectRoot(): string {
  return path.resolve(__dirname, "..");
}

function getCredentialsPath(): string {
  return path.join(getProjectRoot(), "credentials.json");
}

function readCredentials(): InstalledCredentials {
  const envCredentials = readCredentialsFromEnv();
  if (envCredentials) {
    return envCredentials;
  }

  const credentialsPath = getCredentialsPath();
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(
      `Google OAuth credentials are not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REDIRECT_URI, or place credentials.json at ${credentialsPath}.`,
    );
  }

  const raw = fs.readFileSync(credentialsPath, "utf8");
  const parsed = JSON.parse(raw) as CredentialsFile;
  const credentials = parsed.installed ?? parsed.web;

  if (!credentials?.client_id || !credentials.client_secret || !credentials.redirect_uris?.length) {
    throw new Error("credentials.json is missing client_id, client_secret, or redirect_uris.");
  }

  return credentials;
}

function createOAuthClient(): OAuth2Client {
  const credentials = readCredentials();
  return new OAuth2Client(
    credentials.client_id,
    credentials.client_secret,
    credentials.redirect_uris[0],
  );
}

function applyEnvTokens(client: OAuth2Client): boolean {
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN;
  const accessToken = process.env.GMAIL_ACCESS_TOKEN;

  if (!refreshToken && !accessToken) {
    return false;
  }

  client.setCredentials({
    refresh_token: refreshToken,
    access_token: accessToken,
  });

  return true;
}

async function runInteractiveAuth(client: OAuth2Client): Promise<void> {
  if (process.env.VERCEL === "1" || process.env.CI === "true") {
    throw new Error(
      "Interactive OAuth is not available in this environment. Set GMAIL_REFRESH_TOKEN for non-interactive execution.",
    );
  }

  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: GMAIL_SCOPES,
  });

  console.log("Open this URL in your browser and authorize the application:");
  console.log(url);

  const rl = readline.createInterface({ input, output });

  try {
    const code = (await rl.question("Paste the authorization code here: ")).trim();
    if (!code) {
      throw new Error("Authorization code was not provided.");
    }

    const { tokens } = await client.getToken(code);
    client.setCredentials(tokens);

    if (tokens.refresh_token) {
      console.log(`Set GMAIL_REFRESH_TOKEN=${tokens.refresh_token} for future non-interactive runs.`);
    } else {
      console.log("No refresh token returned. Re-run auth with a fresh consent grant if you need non-interactive execution.");
    }
  } finally {
    rl.close();
  }
}

export async function getAuthenticatedClient(): Promise<OAuth2Client> {
  const client = createOAuthClient();

  if (!applyEnvTokens(client)) {
    await runInteractiveAuth(client);
  }

  return client;
}
