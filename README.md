# Forno — Pizza store

A full-stack pizza ordering app with a responsive React storefront and an Express API. Includes six pizzas, category and ingredient search, a persistent cart, delivery or pickup checkout, and saved order receipts.

## Run locally

Requires **Node.js 24 or newer** and npm. No API keys, external database, or environment variables are required.

```sh
npm ci --cache .npm
npm run dev
```

The frontend runs on port **5173** and proxies `/api` to the backend on port **3001**. Run commands from the repository root. Keep the development command running while using the app.

## Production build

```sh
npm run build
npm start
```

The backend serves both the built frontend and API on port **3001**. `npm run build` includes the TypeScript check. Deployment is separate from building the app.

## Checks

```sh
npm test
npm run test:e2e
```

The API tests cover menu data, order validation, server-calculated prices, delivery fees, pickup, and persistence across a server restart. Browser tests cover search/filtering, cart persistence and quantities, delivery checkout and receipt retrieval, keyboard dismissal, and mobile pickup checkout. Browser tests automatically build the app, start an isolated test server, and use a temporary order database.

Playwright uses `/usr/bin/chromium` when available. Otherwise install its browser with `npx playwright install chromium`. You can also set `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` to an installed Chromium executable.

## Ordering behavior

- All pizzas are 12 inches; prices are in USD.
- Delivery costs $3.50, waived when the pizza subtotal is at least $35. Pickup is free.
- Checkout collects customer details and accepts cash on delivery or at pickup.
- Orders are stored in `data/orders.sqlite`. The server computes prices from the menu and returns a private, random order ID and a readable order number.
- The browser remembers the cart and latest order ID. “My order” retrieves that saved receipt from the server.
- Confirmation records the order in this application. It does not send an order to an external restaurant, collect card payments, or provide live kitchen tracking.

Order data survives server restarts. Keep the `data` directory on persistent storage when deploying; it contains customer details and is excluded from Git. Development and test processes do not require a shared database.

## Optional server settings

Set `PORT` to change the backend port (default `3001`) or `DATA_DIR` to change the database directory (default `./data`). `.env.example` documents these settings; environment files are not loaded automatically. Export variables before running commands, or start the server using `node --env-file=.env server/index.js`.

The Vite development proxy expects the API on port 3001; adjust `vite.config.ts` if you choose another backend port.

## Project structure

| Path | Purpose |
| --- | --- |
| `src/App.tsx` | Storefront, cart, checkout, and receipts |
| `src/styles.css` | Responsive styling |
| `server/menu.js` | Menu and pricing rules |
| `server/app.js` | API, validation, and SQLite storage |
| `server/index.js` | Backend entry point |
| `public/images/` | Original local pizza illustrations; no image host required |
| `tests/` | API integration tests |
| `e2e/` | Browser ordering tests |

## Cloud development

Use the existing checkout at `/workspace/pizza-store-app`; cloud tasks are already isolated and do not need a Git worktree. Install with `npm ci --cache .npm`, then start `npm run dev`. Live processes must be restarted after an environment restore. For readiness, check `/api/health`, confirm the menu has six pizzas, and load the storefront with a local request or browser test. No external service credentials are needed for the included workflow.
