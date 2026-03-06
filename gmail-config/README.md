# Gmail Config CLI

Production-ready Node.js and TypeScript tool for managing Gmail labels and filters as code from a single JSON file. It works as a local CLI and as a Vercel-deployed automation endpoint.

## Highlights

- Configuration-as-code inbox automation from one JSON file
- Gmail label sync with idempotent creation
- Gmail filter sync with duplicate detection by `query + label + archive`
- OAuth2 via Google APIs with env-first secrets handling
- Local CLI workflow and Vercel serverless deployment support
- Cron-ready `/api/apply` endpoint plus `/api/list` and `/api/health`

## Portfolio Value

This project demonstrates:

- backend integration with a third-party API
- production-oriented error handling and idempotency
- TypeScript service design with separated auth, Gmail, labels, filters, and runtime layers
- deployment-aware architecture for both CLI and serverless environments
- operational hygiene: env templates, CI, ignore rules, and deployment docs

## Requirements

- Node.js 18 or newer
- Yarn 1.22 or newer
- A Google account with Gmail enabled

## Quick Start

```bash
nvm use
yarn install
cp .env.example .env
yarn apply
```

For hosted runs on Vercel, set the same secrets in Project Settings instead of using `.env`.

## Project Structure

```text
gmail-config/
  api/
    _auth.ts
    apply.ts
    health.ts
    list.ts
  src/
    auth.ts
    gmail.ts
    labels.ts
    filters.ts
    applyConfig.ts
    index.ts
  config/
    rules.json
  package.json
  tsconfig.json
  README.md
```

## Setup

1. Create a Google Cloud project.
2. Enable the Gmail API.
3. Configure the OAuth consent screen.
4. Create OAuth client credentials.
5. Choose one credentials source:
   - local development: download the JSON credentials file and save it as `credentials.json` in the project root;
   - Vercel or other hosted runtime: store the OAuth values in environment variables.
6. Select the project Node.js version:

```bash
nvm use
```

7. Install dependencies:

```bash
yarn install
```

8. Copy the env template if you want local env-based auth:

```bash
cp .env.example .env
```

## Authentication

The tool reads OAuth client credentials from environment variables first:

```bash
export GOOGLE_CLIENT_ID="your-client-id"
export GOOGLE_CLIENT_SECRET="your-client-secret"
export GOOGLE_REDIRECT_URI="your-redirect-uri"
```

If those variables are not set, it falls back to `credentials.json`.

For non-interactive runs, set:

```bash
export GMAIL_REFRESH_TOKEN="your-refresh-token"
```

Optional:

```bash
export GMAIL_ACCESS_TOKEN="your-access-token"
```

You can also keep these values in a local `.env` file for development, but do not commit it.

On the first interactive run, the CLI prints an authorization URL. After you grant access, paste the auth code into the terminal. If Google returns a refresh token, the CLI prints an `export GMAIL_REFRESH_TOKEN=...` line for reuse.

In Vercel or other non-interactive environments, interactive OAuth is disabled. Use `GMAIL_REFRESH_TOKEN`.

Required scope:

```text
https://www.googleapis.com/auth/gmail.settings.basic
```

## Configuration

Edit `config/rules.json`:

```json
{
  "labels": ["Dev", "Work", "Finance", "Accounts", "Newsletters", "Church"],
  "filters": [
    {
      "query": "from:supabase.com",
      "label": "Dev",
      "archive": true
    }
  ]
}
```

Rules:

- `labels` contains all labels that should exist in Gmail.
- `filters[].query` is a Gmail search query.
- `filters[].label` must reference an existing entry in `labels`.
- `filters[].archive=true` removes the message from Inbox by removing the `INBOX` label.

## Commands

Apply config:

```bash
yarn apply
```

List current filters:

```bash
yarn run list
```

Type-check without emitting files:

```bash
yarn check
```

## Vercel Environment Variables

For Vercel, configure these variables in the project settings:

```bash
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=...
GMAIL_REFRESH_TOKEN=...
API_AUTH_TOKEN=...
```

Optional:

```bash
GMAIL_ACCESS_TOKEN=...
CRON_SECRET=...
```

Notes for Vercel:

- Keep `config/rules.json` in the repository if you want configuration-as-code and version control.
- Do not upload `credentials.json` to Vercel.
- The OAuth redirect URI in Google Cloud must exactly match the URI you store in `GOOGLE_REDIRECT_URI`.
- If you move the config file, set `GMAIL_RULES_PATH`.
- Protect the endpoints with `API_AUTH_TOKEN`. `CRON_SECRET` remains supported as a fallback for compatibility.

## Vercel Endpoints

The project includes three serverless endpoints:

- `GET` or `POST` `/api/apply` runs the Gmail sync
- `GET` `/api/list` returns existing filters as JSON
- `GET` `/api/health` returns a small health payload without calling Gmail

Example local invocation after deploying:

```bash
curl -H "Authorization: Bearer $API_AUTH_TOKEN" https://your-app.vercel.app/api/health
curl -H "Authorization: Bearer $API_AUTH_TOKEN" https://your-app.vercel.app/api/apply
curl -H "Authorization: Bearer $API_AUTH_TOKEN" https://your-app.vercel.app/api/list
```

The included `vercel.json` also schedules `/api/apply` every 6 hours. Adjust the cron expression if you want a different cadence.

## Architecture

- `src/auth.ts`: OAuth client creation, env/file credential loading, interactive fallback for local runs
- `src/applyConfig.ts`: config loading and validation
- `src/labels.ts`: label lookup and creation
- `src/filters.ts`: filter listing, duplicate detection, and creation
- `src/runtime.ts`: shared runtime used by CLI and Vercel handlers
- `api/*.ts`: serverless entrypoints for deployment

## Example Config

The default `config/rules.json` demonstrates labels and filters for developer mail, work mail, finance mail, account verification messages, and newsletters.

## Expected Output

```text
✓ label Dev exists
✓ label Work created
✓ filter for from:supabase.com created
✓ filter for from:linkedin.com OR from:rabota.by exists
```

## Error Handling

The CLI reports:

- missing `credentials.json`
- missing Gmail permissions or wrong OAuth scopes
- invalid Gmail query syntax
- duplicate filter creation conflicts

## Notes

- Filters are treated as duplicates when `query + label + archive` already matches an existing Gmail filter.
- Tokens are not written to local files automatically.
- Existing filters are not updated in place; only missing filters are created.
- GitHub Actions CI validates the project on pushes and pull requests.
