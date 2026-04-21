# Dependency Residual Risk Report

Audit snapshot date: 2026-04-21

## Current Exposure

- Critical: `0`
- High: `0`
- Policy baseline enforced in CI: `critical <= 0`, `high <= 0`

## Recently Mitigated

- `protobufjs` (critical RCE class) mitigated by pinning `7.5.5`.
- High-risk direct/transitive packages mitigated in batches with overrides (`minimatch`, `tar`, `undici`, `ws`, `node-forge`, `tar-fs`, `picomatch`, `vite`, `hono`, `@hono/node-server`, `h3`, `defu`, `kysely`, `drizzle-orm`, `next`, `nodemailer`, `lodash`, `immutable`, `fast-xml-parser`, `@xmldom/xmldom`, `effect`).

## Residual High-Risk Dependencies (Short-Term Not Fully Remediated)

- No remaining `high`/`critical` vulnerabilities in current audit snapshot.
- Remaining exposure is `moderate/low` and should be reduced incrementally with the same block strategy.

## Compensating Controls

- CI gate blocks introduction of new high/critical vulnerabilities above baseline.
- Security hardening already implemented for auth, webhooks, origin checks, rate limiting, and build constraints.
- Rollout uses canary + smoke tests with rollback runbook.

## Next Remediation Plan

1. Prioritize moderate vulnerabilities by exploitability and runtime reachability.
2. Keep isolated dependency blocks + smoke/integration checks per block.
3. Maintain CI baseline at `high=0` and `critical=0`.
