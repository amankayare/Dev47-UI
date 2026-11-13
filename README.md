# Dev47 UI

Standalone frontend for the Dev47 portfolio application. It is a React single
page application (SPA), built as static files with Vite. The API is maintained
in the separate Dev47 Service repository.

## Runtime and deployment status

| Area | Current status |
| --- | --- |
| Local development | Vite development server on port 3000 |
| Production build | Static site output in `dist/` |
| Backend integration | Configurable API base URL; Vite proxies local API and upload requests |
| Docker | No UI Dockerfile or Compose service is currently provided |
| CI/CD | No deployment workflow is currently configured in this repository |

The existing deployment workflow in the original Dev47 monorepo does not
deploy this standalone repository.

## Quick start

### Prerequisites

- Git
- Node.js 18 or newer
- npm
- The Dev47 Service backend, either locally or in a development Docker stack

Install dependencies from the committed lockfile:

```bash
npm ci
```

Create local environment configuration:

```powershell
Copy-Item .env.example .env
```

Start the Vite development server:

```bash
npm run dev
```

Open `http://localhost:3000`. By default, API and upload requests are proxied
to `http://localhost:5000`, where the Service backend is expected to run.

To run the Service using its local Docker setup, start that repository's
Compose stack separately. The UI is not part of that stack:

```powershell
Set-Location D:\Workspace\Dev47-Service
docker compose up --build
```

Then start the UI in a second terminal from the UI repository.

## Environment configuration

The checked-in `.env.example` contains:

| Variable | Purpose |
| --- | --- |
| `VITE_API_BASE_URL` | Optional API origin or API base URL, embedded in the frontend at build time. Leave empty to use relative `/api` requests. |
| `API_PROXY_TARGET` | Backend origin used by Vite's development proxy for `/api` and `/static/uploads`; defaults to `http://localhost:5000`. |
| `VITE_APP_ENV` | Present in the example file but not currently read by application code. |

### Same-origin deployment (recommended)

Leave `VITE_API_BASE_URL` empty and configure the public web server or reverse
proxy to route `/api/*` and `/static/uploads/*` to the matching Service
backend. This avoids browser cross-origin configuration and allows the same
frontend build to be promoted between environments, provided the routing is
configured per environment.

For local development, the Vite server provides the equivalent proxy using
`API_PROXY_TARGET`.

### Separate frontend and backend origins

Set `VITE_API_BASE_URL` to the backend's public origin when building the UI,
for example:

```env
VITE_API_BASE_URL=https://api.example.com
```

The shared `src/utils/api.ts` helper applies this base to API requests and
backend-hosted upload assets. Ensure the backend allows the exact frontend
origin in its CORS configuration. The value is public because it is compiled
into browser JavaScript; never put tokens, passwords, or other secrets in a
`VITE_*` variable.

Vite mode-specific files such as `.env.production` may be used for local
builds, but do not commit environment-specific credentials. Build-time values
are fixed in `dist/`; changing a hosting environment variable after the build
does not rewrite an already-built bundle.

## Development commands

```bash
# Start the local development server
npm run dev

# Check TypeScript
npm run check

# Create an optimized production build
npm run build

# Preview the production build locally
npm run preview
```

The production output is written to `dist/`. `npm run preview` is a local
preview server, not a production web server.

## Project structure

```text
src/
  components/   Reusable UI and page components
  hooks/        React hooks
  lib/          Shared libraries and query client
  pages/        Application pages and routes
  styles/       Global and component styles
  utils/        Helpers, including API URL construction
public/         Static files copied as-is into the build
dist/           Generated production build (not committed)
```

The application uses Wouter for client-side routing. Configure static hosting
to serve `index.html` for SPA routes such as `/blog/:id`, `/login`, and
`/admin/*`, while still serving real static assets normally. Without this
fallback, direct navigation or page refreshes on client-side routes may return
a hosting-platform 404.

## Deployment guide for DevOps

This repository currently provides the frontend source and build scripts, not
a deployment workflow or hosting configuration.

1. Select the matching Service backend for the target environment.
2. Set `VITE_API_BASE_URL` during the build if using separate API and UI
   origins. For same-origin deployments, leave it empty and configure reverse
   proxy routes for `/api/*` and `/static/uploads/*`.
3. Install dependencies with `npm ci` and create the static bundle with
   `npm run build`.
4. Publish the contents of `dist/` to a static web host or CDN. Do not publish
   the repository root or `node_modules/`.
5. Configure SPA fallback to `index.html`, HTTPS, and environment-specific
   API routing/CORS.
6. Verify public pages, login flows, API calls, upload previews, and direct
   refreshes on nested routes after deployment.

For cache policy, use the hosting platform's recommended immutable caching for
Vite's fingerprinted assets, while ensuring `index.html` can be refreshed to
pick up new asset references. Do not place backend secrets in the UI build.

## Troubleshooting

- **API calls fail locally:** Confirm the backend is listening on port 5000 or
  set `API_PROXY_TARGET` to its origin, then restart Vite.
- **Browser CORS errors:** Confirm the backend's CORS allowlist includes the
  exact frontend origin, including scheme and port.
- **Uploaded images or resume files fail:** Confirm `/static/uploads/` is
  routed to the backend, or set `VITE_API_BASE_URL` to the backend origin for
  a separate-origin deployment.
- **Nested page refresh returns 404:** Add an SPA rewrite/fallback to
  `index.html` on the static host.
- **A changed API URL has no effect:** Rebuild and redeploy; Vite embeds
  `VITE_API_BASE_URL` during `npm run build`.
