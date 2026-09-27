# Security Policy

## Reporting a vulnerability

Please do not open a public issue for security problems. Report privately to the maintainers (GitHub security
advisories on this repository, or a direct message to a maintainer) with:

- the type of issue (e.g. XSS, IDOR, privilege escalation, SSRF),
- steps to reproduce or a proof of concept,
- affected endpoints or files, and the impact you expect.

## Defenses

- **Secrets**: no secret is hardcoded. In production the backend refuses to start with a missing secret, one shorter
  than 32 characters, or a known placeholder (including every value that earlier versions shipped as a fallback).
  Under Docker, `JWT_SECRET` and `COOKIE_SECRET` are generated randomly on first boot and kept in the
  `backend_secrets` volume; `setup.sh` / `setup.bat` write random values into `.env`.
- **Authentication**: bcrypt (12 rounds); JWT with a unique `jti` plus a server-side session row, so logout revokes the
  token; HTTP-only `SameSite=Lax` cookie, `Secure` whenever the request arrived over HTTPS (`COOKIE_SECURE`).
- **Registration**: public sign-up can only create participants.
- **Authorization**: server-side role checks on every route, plus team-ownership, judge-assignment and
  conflict-of-interest checks in the services. Role and active-flag changes take effect immediately.
- **Input validation**: Zod on every JSON body and on pagination/search query parameters; update payloads use strict
  field allowlists; user-supplied URLs must be `http(s)`; Prisma parameterizes all queries.
- **Uploads**: authenticated only, ≤ 10 MB, type detected from the file's magic bytes (JPEG, PNG, WEBP, GIF, PDF; SVG
  rejected), random server-chosen name with an extension derived from the detected type; `/uploads` is served with
  `X-Content-Type-Options: nosniff`, a sandbox Content-Security-Policy and `Content-Disposition: attachment` for
  anything that is not an image.
- **Exports**: CSV cells that start with `=`, `+`, `-`, `@`, tab or carriage return are prefixed with `'`.
- **Voting**: vote limit checked and written atomically; database unique indexes (including a partial index for
  anonymous votes) make duplicates impossible even under concurrency.
- **Audit log**: successful mutations are recorded with actor and real client IP; passwords, secrets and tokens are
  redacted at any depth.
- **Webhooks**: HMAC-SHA256 signatures, SSRF-filtered targets, no redirect following, masked secrets in listings.
- **Bulk import**: row-level validation, dry-run preview, ADMIN never importable, organizers limited to participants and
  judges, random temporary passwords (never a shared default).
- **HTTP headers**: `nosniff`, `X-Frame-Options: SAMEORIGIN`, a restrictive API Content-Security-Policy, referrer and
  permissions policies; HSTS when `NODE_ENV=production`.
- **Container**: the backend drops root to the `node` user; PostgreSQL is not published on the host.

## Fixes in this revision

These were found in review and fixed; each has automated tests (see the Testing section of the [README](README.md)).

| Issue | Fix |
|---|---|
| Anyone could self-register as `ADMIN` or `ORGANIZER` (register accepted a `role` field; the UI offered it) | Registration is participant-only |
| Uploads trusted the client MIME type and extension and allowed SVG (stored XSS on the app origin) | Magic-byte detection, allowlisted extensions, SVG dropped, safe serving headers |
| `repoUrl` / `demoUrl` / `videoUrl` accepted `javascript:` URLs (stored XSS on judge and gallery pages) | `http(s)` only on the API and in the UI |
| CSV exports allowed formula injection | Formula neutralization |
| Anonymous duplicate votes were possible (NULL `userId` bypassed the unique constraint) and the vote limit was racy | Partial unique index, transactional limit check under an advisory lock, `DUPLICATE_VOTE` mapping |
| Organizers could create ADMIN accounts through bulk import; imported users got the public demo password | Role allowlist, random temporary passwords |
| Bulk-import passwords were stored in plaintext in the audit log | Recursive redaction |
| Track/prize updates passed the raw request body to Prisma (mass assignment) | Strict Zod allowlists |
| Several routes had no body validation; junk query strings (`?page=abc`) caused 500 errors | Zod on every body and on pagination/search |
| Docker/`.env.example` shipped fixed fallback secrets that passed the production guard | Blocklisted; random secrets generated instead |
| `req.ip` was the Nginx container, not the client | `trust proxy` + `X-Forwarded-For` from Nginx |
| Role changes and deactivation took up to 60 s to apply (auth cache) | Cache invalidated on change |
| Webhook secrets were returned in every listing | Shown once at creation, masked afterwards |

Known limitations are listed in [THREAT-MODEL.md](THREAT-MODEL.md) and the README.
