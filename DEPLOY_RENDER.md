# Deploy NAYL on Render Free with persistent Supabase data

This is the lowest-friction persistent deployment path for the current NAYL production pilot:

```text
GitHub repository
       │
       ▼
Render Free Docker web service
       │
       ├── OpenAI Responses API
       ├── Google Places API (New)
       ├── Brave Search API
       ├── Resend email API
       └── Supabase Postgres/PostgREST
```

## 1. Prepare Supabase

1. Create a Supabase project.
2. In **SQL Editor**, open a new query.
3. Paste and run the full contents of `SUPABASE_SETUP.sql`.
4. In project settings, copy:
   - Project URL → `SUPABASE_URL`
   - Backend secret key beginning `sb_secret_` → `SUPABASE_SECRET_KEY`

Never put the secret key in browser JavaScript, GitHub, screenshots, or a client-side environment variable. The NAYL backend sends current `sb_secret_` keys only through the `apikey` header; legacy service-role JWTs are supported through `SUPABASE_SERVICE_ROLE_KEY`.

## 2. Prepare GitHub

Upload every extracted file to the repository root. The front page of the GitHub repository should directly show files such as:

```text
Dockerfile
package.json
render.yaml
server.js
backend-app.js
index.html
business.html
admin.html
```

This flat edition intentionally contains no subfolders. Do not upload only the ZIP file; Render must see `Dockerfile` at the repository root.

## 3. Create the Render service

The easiest path is **New → Blueprint** and select the GitHub repository. The checked-in `render.yaml` defines:

- Docker runtime
- Free plan
- `/api/health` health check
- generated `SESSION_SECRET`
- all required connector variable names

You can alternatively create a Web Service manually with:

| Field | Value |
|---|---|
| Runtime | Docker |
| Branch | `main` |
| Root directory | blank, when Dockerfile is at repository root |
| Dockerfile path | `./Dockerfile` |
| Docker command | blank; the Dockerfile `CMD` is used |
| Health check path | `/api/health` |
| Instance type | Free |

## 4. Enter required environment variables

Render will prompt for variables marked `sync: false`. Use:

```dotenv
APP_BASE_URL=https://your-render-domain.onrender.com
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
ADMIN_EMAIL=operations@yourdomain.com
ADMIN_PASSWORD=<strong unique password>
```

`APP_BASE_URL` can be entered after the first deployment assigns the domain. Redeploy after setting it so email buttons point to the correct host.

Do not manually set `PORT`; Render injects it and NAYL reads it automatically.

## 5. Activate live search and AI

### OpenAI buyer intelligence and deep search

Set:

```dotenv
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-mini
OPENAI_DEEP_MODEL=gpt-5.5
```

The standard search path uses structured output for intent extraction. The **Deep search** switch invokes the Responses API `web_search` tool with required live search, GCC location context, source collection, and URL verification. OpenAI API usage is billed separately from ChatGPT subscriptions.

### Google Places

In Google Cloud:

1. Enable **Places API (New)**.
2. Enable billing for the project.
3. Create an API key.
4. Restrict the key to Places API (New) and, where practical for a server-side key, restrict source IPs after choosing hosting with stable egress.
5. Set:

```dotenv
GOOGLE_MAPS_API_KEY=...
```

NAYL uses `POST https://places.googleapis.com/v1/places:searchText` with a specific response field mask.

### Brave web search

Create a Brave Search API subscription/token and set:

```dotenv
BRAVE_SEARCH_API_KEY=...
```

NAYL sends the token server-side through `X-Subscription-Token`.

### Email notifications

Create a Resend API key, verify a sending domain, and set:

```dotenv
RESEND_API_KEY=re_...
EMAIL_FROM=NAYL <quotes@your-verified-domain.com>
```

Without Resend, the transaction still works in the web portals; the connector is simply reported as not configured.

## 6. Verify the deployment

Open:

```text
https://your-render-domain.onrender.com/api/health
```

Expected shape:

```json
{
  "status": "ok",
  "service": "nayl-production-v1",
  "version": "1.0.0",
  "storage": "supabase-postgres"
}
```

Then open `/admin`. The connector panel must show:

- **live / ready** for configured connectors
- **not configured** for missing credentials
- **Supabase PostgreSQL Storage** for persistence

Do not launch when it says `Local JSON Storage`; data on Render Free will disappear after restart or redeployment.

## 7. Run the marketplace lifecycle

1. Register a provider at `/business`.
2. Verify it at `/admin`.
3. Search at `/` in the provider's market, city, and category.
4. Create a quote request.
5. Submit a quote at `/business`.
6. Accept it from the originating consumer browser.
7. Confirm the booking and GMV in `/admin`.

## Troubleshooting

### Docker says a folder is missing

Confirm the repository includes `src`, `public`, `scripts`, and `docs`. The supplied Dockerfile copies all four.

### Render starts but health check fails

- Health path must be `/api/health`.
- Do not override the Docker command.
- Do not set `PORT` manually.
- `HOST` must be `0.0.0.0`.

### Storage reports `json-local`

One or both Supabase variables are absent or blank. Set both `SUPABASE_URL` and `SUPABASE_SECRET_KEY`, then redeploy.

### Supabase reports `Invalid JWT`

Use the current package. It sends modern `sb_secret_` values through `apikey` only. Remove accidental quotes or whitespace from the Render value. A legacy `eyJ...` service-role key belongs in `SUPABASE_SERVICE_ROLE_KEY`.

### Search has no NAYL businesses

This is expected until a business registers and an administrator changes its status from `pending` to `verified`. NAYL does not include fabricated providers.

### External connector says `not-configured`

Add its exact server-side environment variable and redeploy. Never prefix secret variables with `PUBLIC_`, `NEXT_PUBLIC_`, or expose them in client code.

### OpenAI returns a billing or model error

Confirm the OpenAI Platform project has API billing, the API key belongs to that project, and the configured models are enabled for it. A ChatGPT subscription does not fund API calls.
