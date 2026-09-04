# Publish NAYL on Render now

The current package is designed to deploy without entering credentials during the Render build.

## 1. Upload to GitHub

This is the flat GitHub package. Extract it and upload every file directly to the repository root. The root must contain files such as:

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

There are intentionally no folders, which makes the package compatible with GitHub's file-only browser uploader. Do not upload the ZIP itself.

## 2. Create the Render service

In Render:

1. Choose **New → Blueprint**.
2. Connect the GitHub repository.
3. Confirm the `nayl` service.
4. Deploy.

`render.yaml` configures:

```text
Runtime: Docker
Plan: Free
Health check: /api/health
Generated SESSION_SECRET: yes
Automatic provider activation: yes for the direct pilot
```

No provider API key is required for the build to succeed. Do not add `PORT`; Render injects it.

## 3. Create the owner

After the service becomes live, open:

```text
https://your-service.onrender.com/admin
```

The first launch shows **Create owner account** instead of a login form. Create the owner immediately. The setup endpoint closes after the first owner is persisted.

## 4. Activate live connectors without redeploying

In the protected admin dashboard, find **Connect NAYL**.

### OpenAI

Enter:

```text
OpenAI API key: sk-...
Buyer intelligence model: gpt-5.6-luna
Deep Search model: gpt-5.6-terra
```

Press **Save & test**. The same OpenAI key powers structured buyer-intent extraction and live Deep Search.

### Google Places

In Google Cloud, enable **Places API (New)** and billing, create a restricted server key, paste it into the Google Places card, and press **Save & test**.

### Brave Search

Create a Brave Search API token, paste it into the Brave card, and press **Save & test**.

### Email notifications

Create a Resend key, verify a sending domain, enter the key and a sender such as:

```text
NAYL <quotes@yourdomain.com>
```

Email is optional; the request, quote, and booking workflow functions in the portals without it.

## 5. Run the real marketplace flow

1. Register a provider at `/business`.
2. Confirm the account shows `verified` under the default direct-pilot policy.
3. Register a buyer at `/`.
4. Search in the provider's city and category.
5. Press **Request quote** and submit the requirement.
6. Return to `/business`, open the opportunity, and submit a quote.
7. Return to the consumer portal, refresh requests, and accept the quote.
8. Confirm the booking and KPIs at `/admin`.

The owner can disable automatic verification in `/admin`. Once disabled, new providers remain pending until the owner verifies them.

## 6. Keep data after restarts

The application works with local JSON immediately. Render services without a persistent disk can lose local files after restart or redeployment. For durable free-tier database storage:

1. Create a Supabase project.
2. Run `SUPABASE_SETUP.sql` in its SQL editor.
3. Add these two Render variables:

```dotenv
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SECRET_KEY=sb_secret_...
```

4. Redeploy once.

The admin dashboard will then report **Supabase PostgreSQL Storage**.

## Troubleshooting

### Docker reports a missing folder

Use the newest package. Its structured Dockerfile copies folders that are included, and the supplied flat package uses `COPY . .` with no subfolder dependency.

### `/admin` shows Sign in but no owner exists

Check `/api/admin/status`. A legacy `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment pair also counts as an administrator. Remove both and redeploy to use first-run owner setup, provided no owner has already been stored.

### A connector says Setup required

The provider key is absent. Add it in `/admin`. A ChatGPT consumer subscription is not an OpenAI Platform API key.

### A connector test fails

The returned provider message is shown directly in the connector card. Common causes are disabled billing, an API not enabled, a restricted key that blocks the Render server, an unavailable model, or an unverified Resend sender.

### NAYL Marketplace returns no provider

Register a business whose market, service area, and category match the consumer intent. The marketplace does not fabricate providers.
