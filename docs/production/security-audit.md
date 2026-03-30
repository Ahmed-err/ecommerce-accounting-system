# Security Audit Runbook

## Scope
- Server actions in `src/app/actions`
- API routes in `src/app/api`
- Auth/session layer in `src/auth.js`
- Upload and external integrations (`cloudinary`, email, sms)

## Severity Policy
- Critical/High: must be fixed before release.
- Medium: fix or mitigate with explicit risk acceptance.
- Low: backlog after launch.

## Checklist
- [ ] Authorization checks exist for every admin/staff write path.
- [ ] Ownership checks exist for all customer data read/write operations.
- [ ] Every mutation validates input server-side (`zod` or equivalent).
- [ ] File upload route only allows safe MIME types, max size, allowed folders.
- [ ] Rate limits exist for login/register/contact/review/checkout/upload.
- [ ] CSP has no `unsafe-eval`; third-party domains are minimal.
- [ ] No secrets are committed; env vars validated on startup.
- [ ] Dependency vulnerabilities triaged (`npm audit --audit-level=high`).

## Required Evidence Before Launch
- Security findings report with status (fixed/accepted).
- Re-test proof for all fixed High/Critical issues.
- Approval from owner for any remaining Medium risks.
