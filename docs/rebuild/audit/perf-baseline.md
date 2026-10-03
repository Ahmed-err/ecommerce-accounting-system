# Performance baseline (P0.2)

Reference numbers for every rebuild part's before/after comparison. Re-run with **Actions → Performance Baseline → Run workflow** (leave the URL empty) on the part's branch and compare against this table.

- Run: [37141052567](https://github.com/Ahmed-err/ecommerce-accounting-system/actions/runs/37141052567), `rebuild/p0-2-audit` @ `60f7c10` code, 2026-10-03
- Setup: production build (`next build` + `next start`) on a GitHub runner, Node 24, fresh Postgres with the P0.1 seed, caches warmed once. Production was not touched.
- Lighthouse 12, default mobile preset (simulated slow 4G, 4× CPU), median of 3 runs.

## Lighthouse (mobile)

| Page | Perf | LCP ms | TBT ms | CLS | FCP ms | Speed Index ms | Transfer KB | A11y | Best pr. | SEO |
|---|---|---|---|---|---|---|---|---|---|---|
| `/` | 77 | 4967 | 256 | 0 | 1370 | 1845 | 614 | 79 | 96 | 100 |
| `/products` | 77 | 4198 | 370 | 0 | 1219 | 1858 | 564 | 82 | 100 | 92 |
| `/products/[slug]` | 82 | 4238 | 226 | 0.001 | 1366 | 1762 | 534 | 88 | 100 | 92 |
| `/cart` | 87 | 3787 | 150 | 0.019 | 1065 | 1065 | 470 | 90 | 100 | 100 |
| `/login` | 89 | 3662 | 96 | 0 | 1068 | 1068 | 449 | 96 | 100 | 100 |

## Server timings (5 runs, warm)

| Path | Avg TTFB ms | Avg total ms | Worst total ms | HTML KB |
|---|---|---|---|---|
| `/` | 27.9 | 32.6 | 77.4 | 181 |
| `/products` | 16.9 | 31.5 | 47.9 | 158 |
| `/about` | 18.3 | 32.5 | 95.8 | 62 |
| `/contact` | 13.2 | 18.2 | 24.9 | 60 |
| `/api/health` | 4.3 | 4.5 | 6.4 | 0.1 |

## Reading

- **LCP is the problem, not the server.** Every page is 3.7–5.0 s (good is < 2.5 s) while TTFB is under 30 ms, so the time goes to downloading and running JavaScript and loading the LCP image.
- **The shared bundle is heavy:** even `/login` (a form) transfers 449 KB. Pages ship mostly the same client JS. → A-44.
- **HTML is large:** `/` and `/products` render ~160–180 KB of HTML (likely serialized RSC payload for product data). → A-44.
- **Accessibility** is lowest on `/` (79) and `/products` (82). → A-45.
- CLS is fine everywhere.
- Lab numbers with seed data and `images.unsplash.com` images; real catalog images (Cloudinary) are measured again in P1.3. A production run (real DB latency, real images) can be done by passing the site URL to the same workflow.
