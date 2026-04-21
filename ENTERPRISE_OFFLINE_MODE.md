# Enterprise License Offline/Degraded Mode

Dokploy periodically validates enterprise licenses against the licensing endpoint. In self-hosted environments with intermittent internet access, run in a controlled degraded mode.

## Current Behavior

- License validation requests are sent to `https://licenses-api.dokploy.com`.
- If validation fails, enterprise validity may be marked as false.

## Recommended Operational Policy

- Treat network outages as a temporary degraded state, not an immediate outage trigger.
- Keep documented grace-period expectations with your operations team.
- Monitor connectivity to licensing endpoint and alert before grace period expires.

## Offline-Ready Deployment Practices

- Pre-stage required container images and build dependencies in a private registry/mirror.
- Maintain local mirrors for package managers where possible.
- Keep emergency runbooks for operating without internet access.

## Suggested Safeguards

- Define explicit incident playbook for enterprise feature degradation.
- Maintain clear communication templates for operators and stakeholders.
- Validate backup/restore and rollback paths for license-related incidents.
