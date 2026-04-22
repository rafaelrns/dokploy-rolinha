# Local Enterprise License Playbook (Fork)

This playbook enables proprietary fork features without depending on the remote Dokploy licensing endpoint.

## 1) Required Environment Variables

Set these vars in your Dokploy service/container runtime:

- `ENTERPRISE_LICENSE_PROVIDER=local`
- `FORK_LICENSE_SECRET=<strong-random-secret>`
- `LOCAL_LICENSE_ISSUER=dokploy-rolinha` (optional)
- `ENTERPRISE_LICENSE_GRACE_PERIOD_HOURS=72` (used only for remote provider fallback)

Generate a strong secret:

```bash
openssl rand -hex 64
```

## 2) Database Migration

Run migrations after deploying this fork version:

```bash
pnpm --filter=dokploy run migrate
```

If your runtime executes migration on startup (default in this repo), ensure the new SQL file is present:

- `apps/dokploy/drizzle/0166_local_enterprise_license_provider.sql`

## 3) Generate Local License Key (API)

Use the authenticated owner session token/cookie and call the tRPC endpoint:

```bash
curl -X POST "https://<your-domain>/api/trpc/licenseKey.generateLocal" \
  -H "Content-Type: application/json" \
  -H "Cookie: <owner-session-cookie>" \
  --data '{"0":{"json":{"plan":"enterprise-fork","expiresInDays":365,"features":["sso","audit-log","white-labeling"]}}}'
```

The response returns a `key` in payload.

## 4) Activate Key (API)

```bash
curl -X POST "https://<your-domain>/api/trpc/licenseKey.activate" \
  -H "Content-Type: application/json" \
  -H "Cookie: <owner-session-cookie>" \
  --data '{"0":{"json":{"licenseKey":"<generated-key>"}}}'
```

## 5) Validate License Status (API)

```bash
curl -X GET "https://<your-domain>/api/trpc/licenseKey.getEnterpriseSettings" \
  -H "Cookie: <owner-session-cookie>"
```

Expected fields:

- `isValidEnterpriseLicense: true`
- `enterpriseLicensePlan: "enterprise-fork"` (or selected plan)
- `enterpriseLicenseExpiresAt` populated
- `enterpriseLicenseValidationSource: "local"`

## 6) Operational Notes

- Rotate `FORK_LICENSE_SECRET` only with planned key regeneration.
- Keep license-related env vars in secrets management, never in git.
- Monitor `enterpriseLicenseValidationError` and `enterpriseLicenseGraceUntil` fields for diagnostics.
