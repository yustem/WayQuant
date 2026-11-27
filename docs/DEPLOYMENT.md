# Deployment

## GitHub Pages

The `main` branch workflow verifies Python, independent mathematical references,
the frontend and API/browser regressions, then builds and tests the actual static
bundle before deploying it. Actions are pinned to official commit SHAs.

The Pages build uses `VITE_EXECUTION_MODE=browser`, `VITE_BASE_PATH=/WayQuant/`
and `VITE_CODE_REVISION` from the commit SHA. Simulations route directly to the
existing Web Worker. No API request or timeout is needed; provenance remains
`browser-mulberry32`. Source, parameters, formulas, seed semantics and resource
limits are shared with the audited implementation. Subpath-aware logo/favicon
URLs and the bundled worker work under the repository URL.

To reproduce a static build from the complete checkout:

```sh
npm --prefix frontend ci
VITE_EXECUTION_MODE=browser VITE_BASE_PATH=/WayQuant/ npm --prefix frontend run build
VITE_BASE_PATH=/WayQuant/ npm --prefix frontend run preview -- --host 127.0.0.1 --port 4179
```

On PowerShell set the variables with `$env:VITE_EXECUTION_MODE='browser'` and
`$env:VITE_BASE_PATH='/WayQuant/'` before the build. The architecture viewer embeds
the real backend source at build time, so retain the repository root. Upload
`frontend/dist`, not the Vite development server or Python environment.

Static simulations stay in the visitor's browser. GitHub serves the application
assets; the application has no tracking, external fonts or analytics. Language
preference is stored locally. Currency selection changes units, not FX values.
Public verification evidence is linked from the release verification document.

## Local application and API

Leave `VITE_EXECUTION_MODE` unset or set it to `api` for API-first local use.
The existing browser fallback handles service unavailability. Application/API
validation failures remain errors. Run `start.bat` on Windows, or follow README
manual commands. Both launchers are maintained source files, not generated output.

For a separate API, set `VITE_API_BASE_URL` at frontend build time and configure
`WAYQUANT_CORS_ORIGINS` on the backend. Restrict origins and apply request-size,
rate, timeout and memory limits at the hosting proxy. Never expose Vite dev mode
as a production web service.

## Container application

`docker compose up --build` serves the application on http://localhost:3000.
Nginx forwards `/api` to the API container. The health endpoint gates startup;
the API uses one unprivileged worker. Docker execution remains unverified in
the publication environment, where Docker is unavailable. Pages deployment does
not depend on Docker. Hardened enterprise infrastructure is a separate target
from the verified public static distribution.
