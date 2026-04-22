# Enterprise License Offline/Degraded Mode

Dokploy periodically validates enterprise licenses against the licensing endpoint. In self-hosted environments with intermittent internet access, run in a controlled degraded mode.

## Current Behavior

- Default in this fork is local provider (`ENTERPRISE_LICENSE_PROVIDER=local`).
- Local keys are verified offline with `FORK_LICENSE_SECRET` (HMAC signature).
- Remote provider remains optional (`ENTERPRISE_LICENSE_PROVIDER=remote`) and uses `https://licenses-api.dokploy.com`.

## Recommended Operational Policy

- Treat network outages as a temporary degraded state, not an immediate outage trigger.
- Keep documented grace-period expectations with your operations team.
- Monitor connectivity to licensing endpoint and alert before grace period expires.
- For remote provider, grace-period behavior is controlled by `ENTERPRISE_LICENSE_GRACE_PERIOD_HOURS` (default `72`).

## Local Provider Setup (Fork)

- Set `ENTERPRISE_LICENSE_PROVIDER=local`.
- Set a strong `FORK_LICENSE_SECRET` in environment (required).
- Optionally set `LOCAL_LICENSE_ISSUER` for token issuer metadata.
- Generate keys using the proprietary license router mutation `licenseKey.generateLocal`.

## Offline-Ready Deployment Practices

- Pre-stage required container images and build dependencies in a private registry/mirror.
- Maintain local mirrors for package managers where possible.
- Keep emergency runbooks for operating without internet access.

## Suggested Safeguards

- Define explicit incident playbook for enterprise feature degradation.
- Maintain clear communication templates for operators and stakeholders.
- Validate backup/restore and rollback paths for license-related incidents.
