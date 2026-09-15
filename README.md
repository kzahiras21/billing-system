# ISP Billing System

Internal billing and subscriber-management prototype for an ISP. The current implementation reflects the first confirmed company requirements and intentionally leaves unresolved automation disabled by default.

## Confirmed business rules implemented

- One customer can own multiple service sites/subscriptions.
- Registration is followed by installation, then a 3-day trial, then activation.
- Minimum contract period is stored as 12 months from activation. Penalty calculation is **not implemented yet** because the company has not defined the amount/formula.
- Monthly invoice cycle is the 1st, with due date on the 15th.
- First-month/service changes use actual-days-in-month proration logic.
- Existing customers keep an agreed monthly price snapshot when product master pricing changes.
- Package prices are stored exclusive of PPN; current confirmed PPN is 11%.
- Invoice items support service and registration/site-related charges.

## Security baseline

This system handles billing data, so production must be treated as a high-sensitivity deployment. The repository now includes:

- signed 1-hour JWT sessions with issuer/audience validation;
- HttpOnly, Secure-in-production, SameSite=Strict session cookies;
- mandatory TOTP for `SUPER_ADMIN` and `FINANCE`;
- account lockout after repeated failed passwords;
- RBAC checks inside sensitive server actions, not only in navigation UI;
- protected cron endpoints with a required secret and no fallback credential;
- HMAC verification for payment webhooks until the selected gateway's official signature scheme is integrated;
- payment idempotency by transaction ID and exact-amount auto-settlement only;
- automatic network isolation/un-isolation disabled until company policy is finalized;
- audit logs for authentication and sensitive master-data/billing changes;
- browser security headers/CSP;
- no committed local database and no default admin password.

No application can be guaranteed "unhackable". Production security also depends on deployment, database/network isolation, secret management, backups, monitoring, dependency patching, gateway configuration, and operational access controls.

## Local setup

1. Copy `.env.example` to `.env.local` and replace every placeholder with strong random values.
2. Install dependencies.
3. Generate/apply the development schema:

```bash
npx prisma generate
npx prisma db push
```

4. Create a strong TOTP secret for the bootstrap admin and set the three `BOOTSTRAP_ADMIN_*` environment variables.
5. Seed users:

```bash
node prisma/seed.js
```

6. Start development:

```bash
npm run dev
```

## Important before production

- Move from local SQLite to a managed production relational database (recommended: PostgreSQL) with encrypted backups and restricted network access.
- Replace the generic payment HMAC adapter with the chosen Payment Gateway's official signature verification and reconciliation API.
- Confirm Freeze/grace-period/isolation semantics before enabling `ENABLE_AUTOMATIC_ISOLATION` or `ENABLE_AUTOMATIC_UNISOLATION`.
- Configure HTTPS only, secret storage outside the repo, centralized logs/alerts, database backups, and dependency scanning.
- Because an old development SQLite file existed in Git history, do not reuse any credential or customer data that may ever have been stored in it; rotate exposed development credentials before using a real environment.
