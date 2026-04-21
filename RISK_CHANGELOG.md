# Risk Changelog

## 2026-04-21

### Security / Self-Hosting

- Setup hardening reduced direct `curl | bash` patterns in automated server provisioning.
- Traefik `api.insecure` now defaults to disabled; explicit opt-in required via `DOKPLOY_ENABLE_INSECURE_TRAEFIK_API=true`.
- Added production hardening and offline enterprise operation guides.

### Supply Chain

- Mitigated `protobufjs` critical advisory via pinned override.
- Applied prioritized high-severity dependency override batch with smoke validation.
- Eliminated all remaining `high` vulnerabilities (current snapshot: `critical=0`, `high=0`).
- Added CI audit policy gate to block increased high/critical counts and updated baseline to `high=0`.

### Operational Readiness

- Added operational runbook for gradual rollout, rollback, and validation checklist.
- Added residual dependency risk register for short-term non-fixable items.
