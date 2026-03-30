# Authorization Audit Matrix

## API Routes

| Route | Auth | Ownership/Role check | Status |
|---|---|---|---|
| `src/app/api/auth/[...nextauth]/route.js` | NextAuth handlers | handled by provider/session | Pass |
| `src/app/api/contact/route.js` | Public | rate-limited public endpoint | Pass |
| `src/app/api/upload/route.js` | `auth()` required | authenticated user + folder allowlist + rate limit | Pass |
| `src/app/api/orders/[id]/invoice/route.js` | `auth()` required | `where: { id, userId: session.user.id }` | Pass |
| `src/app/api/notifications/route.js` | `auth()` required | user-bound filter + admin constraint for delete | Pass |
| `src/app/api/notifications/read-all/route.js` | `auth()` required | user-bound update, customer type filter | Pass |
| `src/app/api/notifications/[id]/read/route.js` | `auth()` required | user-bound read update, customer type filter | Pass |
| `src/app/api/notifications/stream/route.js` | `auth()` required | session validation + user-bound query | Pass |
| `src/app/api/health/route.js` | Public | no sensitive data returned | Pass |

## Route Protection Middleware

| File | Coverage | Status |
|---|---|---|
| `src/proxy.js` | protects `/admin*`, `/pos*`, auth routes; role checks for restricted admin sections | Pass |

## Server Actions (Critical)

| File group | Access guard pattern | Status |
|---|---|---|
| `src/app/actions/orders.js` | `ensureStaff` / `ensureAdmin` | Pass |
| `src/app/actions/inventory.js` | `ensureStaff` / `ensureManager` | Pass |
| `src/app/actions/pos.js` | `ensureStaff` | Pass |
| `src/app/actions/reviews.js` | admin-only moderation methods + rate limited submit | Pass |
| `src/app/actions/contact-admin.js` | admin/manager ensure | Pass |
| `src/app/actions/register.js` | public but rate-limited + uniqueness checks | Pass |

## Notes
- Remaining work is mainly **operational verification** in staging/production logs, not missing code guards in core flows.
