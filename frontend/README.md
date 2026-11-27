# WayQuant Frontend

React 18, Vite, and TypeScript frontend for the WayQuant Open FAIR cyber risk quantification platform.

## Development

Install dependencies and start the Vite development server:

```bash
npm ci
npm run dev
```

## Production build

```bash
npm run build
```

Run builds from a complete repository checkout: Architecture & Code embeds the
actual backend source. Default development uses the local API. For the static
Pages edition set `VITE_EXECUTION_MODE=browser` and `VITE_BASE_PATH=/WayQuant/`
before building. See [deployment](../docs/DEPLOYMENT.md) for PowerShell commands
and the automated verification/deployment workflow.
