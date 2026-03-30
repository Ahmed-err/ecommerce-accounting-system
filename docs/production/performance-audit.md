# Performance Audit Runbook

## Target Pages
- `/`
- `/products`
- `/products/[slug]`
- `/cart`
- `/login`
- `/admin`

## Baselines To Capture
- Lighthouse mobile score per target page
- Core Web Vitals (LCP, INP, CLS) from production telemetry
- API p95 latency for checkout and order updates
- Database slow queries (>= 250ms)

## Checklist
- [ ] `revalidate`/`dynamic` strategy reviewed for traffic-heavy pages.
- [ ] Product listing/detail avoid N+1 queries.
- [ ] Bundle size reviewed for heavy client components.
- [ ] Images use optimized delivery and lazy-loading.
- [ ] SSE and notification polling do not spike CPU/network.
- [ ] Build output checked for route-level JS and rendering mode.

## Acceptance Targets
- Storefront LCP < 2.5s on mobile 4G median.
- INP < 200ms on catalog and product detail pages.
- Checkout/API p95 < 500ms (excluding third-party gateway delays).
- No sustained DB slow-query alerts during load test window.
