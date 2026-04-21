# Operational Runbook (Rollout, Validation, Rollback)

## 1) Pre-Rollout Checklist

- Confirm backup snapshot for database and `/etc/dokploy`.
- Confirm target version changelog and dependency risk notes.
- Confirm alerting is active for auth/deploy/build/logging failures.

## 2) Validation Suite (No-Break Gate)

Run before and after rollout:

```bash
pnpm install --frozen-lockfile
pnpm --filter=dokploy test
pnpm --filter=dokploy typecheck
pnpm audit --audit-level high
```

Optional heavier checks for staging:

- Integration tests for deploy webhooks and build pipeline.
- E2E smoke: login, create project, trigger deploy, inspect logs.
- Light load test on API/webhook endpoints.

## 3) Gradual Rollout Strategy

- Deploy to a canary instance first.
- Observe for at least one full deploy/build cycle.
- Promote to production only if error budget remains healthy.

## 4) Upgrade Validation Scenario (Old -> New)

1. Start from a snapshot of previous stable release.
2. Upgrade Dokploy image/tag and run migrations.
3. Validate existing projects still deploy and route correctly.
4. Validate auth/session continuity and webhook behavior.
5. Validate logs/terminal/build screens for regressions.

## 5) Operational Metrics to Monitor

- Authentication failures and session errors.
- Deploy/build timeout rates.
- Webhook signature/token rejection rates.
- Docker/Traefik health and restart counts.
- Log ingestion errors and websocket terminal failures.

## 6) Rollback Procedure

1. Stop rollout and freeze new upgrades.
2. Revert to previous known-good image tag.
3. Restore database/config backups if schema or state corruption is detected.
4. Re-run smoke tests and reopen traffic.

## 7) Risk Changelog Template

For each release, capture:

- What changed (security, dependencies, operations).
- Known residual risks and compensating controls.
- Rollback trigger conditions.
- Runbook owner and last validation date.
