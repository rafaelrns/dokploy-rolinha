# Self-Hosted Production Hardening Guide

This guide is focused on reducing operational and security risk for self-hosted Dokploy deployments.

## 1) TLS and Reverse Proxy

- Terminate TLS at Traefik with valid certificates (Let's Encrypt or internal PKI).
- Keep `DOKPLOY_ENABLE_INSECURE_TRAEFIK_API` unset (or explicitly `false`) in production.
- If dashboard access is required, expose it only on a private network and protect it with authentication.
- Enforce HTTPS redirects and HSTS for public-facing endpoints.

## 2) Network and Firewall

- Expose only required ports (`80`, `443`, and explicitly required service ports).
- Restrict Docker API socket access and manager-node access to trusted admins.
- Apply inbound IP allowlists for administrative surfaces when possible.
- Segment environments (prod/staging/dev) using separate hosts or strict network isolation.

## 3) Secrets and Credentials

- Prefer Docker secrets (`POSTGRES_PASSWORD_FILE`, provider tokens, webhook secrets).
- Rotate API keys and webhook secrets periodically.
- Avoid storing secrets in repository files or image layers.
- Set `BETTER_AUTH_SECRET` explicitly for production.

## 4) Supply Chain Controls

- Avoid `curl | bash` in production procedures; download installers first and verify checksums.
- Pin versions for external installers and critical dependencies.
- Keep a signed internal mirror for artifacts where possible.
- Review release notes before bumping major dependencies.

## 5) Backup and Restore

- Back up Postgres data, Dokploy config under `/etc/dokploy`, and dynamic Traefik state (`acme.json`).
- Test restores on a staging instance regularly (at least monthly).
- Keep at least one offline backup copy with retention policy.
- Document RPO/RTO expectations and ownership.

## 6) Monitoring and Alerting

- Alert on auth failures, webhook signature failures, and build timeouts.
- Track deploy/build failure rates and queue delays.
- Keep centralized logs with retention suitable for incident response.

## 7) Upgrade and Rollback

- Perform canary rollout first.
- Keep previous image tags and database backups for fast rollback.
- Execute post-upgrade smoke tests for login, deploy, logs, and terminal access.
