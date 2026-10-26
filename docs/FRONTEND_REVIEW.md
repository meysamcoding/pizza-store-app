# Frontend review and improvement plan

## Existing project

The site is a React and TypeScript application built with Vite. Its existing frontend is centered in `src/App.tsx`, with shared styling in `src/styles.css` and typed menu/cart/order data in `src/types.ts`.

| Area | Already implemented before this update |
| --- | --- |
| Home | Branded header, editorial hero, pizza illustration, quality ribbon, delivery callout, short story section, footer |
| Menu | Six pizza cards, prices and descriptions, vegetarian/spicy markers, category filters, ingredient search, loading/error/empty states |
| Cart | Add/remove, quantity controls, delivery/pickup mode, delivery-fee totals, local persistence, keyboard-accessible drawer |
| Checkout UI | Existing checkout form, validation, receipt, and saved-order lookup in the original full application |
| Practice demo | Static menu JSON, GitHub Pages asset paths, persistent cart, clearly disabled checkout, no order submission |
| Design | Cream canvas, tomato-red accents, sage green, yellow details, system sans-serif, rounded cards, original local SVG pizza art |
| Responsiveness | Three/two/one-column pizza layouts and a full-width mobile cart |
| Validation | API tests, full-application browser tests, and three static-demo browser tests |

There were no separate About or Contact pages. The desktop navigation disappeared on smaller screens without a mobile replacement. The footer lacked page navigation, and the site had no dedicated FAQ.

## Improvements in this update

1. Add an About page that expands the existing story and ingredient values using the established palette and illustrations.
2. Add a Contact page with a locally validated message preview. It explicitly does not send messages, submit orders, or store personal details.
3. Add shared desktop/mobile/footer links, an accessible mobile navigation disclosure, a skip link, page titles, and keyboard focus handling.
4. Add reusable native FAQ disclosures to answer menu, vegetarian, allergen, and demo questions.
5. Preserve the existing home sections, menu, filters, cart state, styling, and existing checkout behavior. No backend or database changes are part of this work.
6. Use hash URLs (`#/about`, `#/contact`) so direct links and refreshes work under the existing GitHub Pages project path without a server rewrite.

New pages are additive files in `src/pages/`; FAQ lives in `src/components/`; the small routing hook lives in `src/hooks/`. Existing application state remains in `App.tsx`.

## Recommended next steps after UI review

- Add verified business contact details, opening hours, location, and social links when those details are available. Avoid publishing invented addresses, phone numbers, reviews, or awards.
- Review final restaurant copy and imagery, and add approved food photographs if desired while keeping the original visual identity.
- Consider favorites, seasonal menu sections, and more dietary filters when the menu provides reliable data for them.
- Add a Privacy page if the site later collects or sends personal information; the current Contact preview remains local and unsent.
- If search-engine indexing of individual pages becomes important, consider pre-rendered page URLs as a separate improvement. Hash routing here prioritizes compatibility with the existing static deployment.

## UI verification

`npm run test:pages` builds and tests the static frontend under `/pizza-store-app/`, including page navigation, direct-link refreshes, mobile layouts, contact validation and preview, cart persistence, and the absence of backend requests.

The normal production build and original browser tests remain available to detect regressions in the preserved application.
