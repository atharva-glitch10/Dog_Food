# DOGFOOD 2026 Threat Model

STRIDE analysis of the platform as implemented. Each mitigation names where it lives so it can be checked; the
"Residual risk" column states what is **not** covered. See [SECURITY.md](SECURITY.md) for the list of fixes and how to
report issues.

## 1. Assets and trust boundaries

- **Assets**: judge scores and rankings, unpublished results, draft submissions, participant emails (exports),
  session cookies/JWTs, certificate signatures, webhook signing secrets, uploaded files.
- **Boundaries**: browser → Nginx (`:3000`) → Express (`:4000`, also published directly) → PostgreSQL (internal
  Compose network only); Express → organizer-configured webhook URLs (outbound).

## 2. STRIDE

| Threat | Attack | Mitigation (where) | Residual risk |
|---|---|---|---|
| **Spoofing** | Register as an organizer/admin to take over events | Self-registration only creates `PARTICIPANT`; any other `role` is rejected (`auth.validator.ts`, `auth.service.ts`). Judges are promoted per event by organizers; organizers by admins. | — |
| **Spoofing** | Sybil accounts to stuff community voting | Configurable eligibility (`PUBLIC`, `VERIFIED_USERS`, `PARTICIPANTS_ONLY`); per-voter vote budget; rate limits on register/login (15/min per IP per route) and voting (20/min) (`middleware/rateLimiter.ts`) | No email verification or CAPTCHA; `VERIFIED_USERS` means "logged in". `PUBLIC` voting is limited per IP only. |
| **Spoofing** | Forge a session | JWT signed with a ≥ 32-char secret (random per install) **and** a matching session row that logout deletes (`middleware/requireAuth.ts`) | — |
| **Tampering** | Submit or edit after the deadline | Service-layer window checks with typed errors (`DEADLINE_EXCEEDED`, `SUBMISSION_NOT_STARTED`, `JUDGING_NOT_STARTED`) in `submissions.service.ts` and `scoring.service.ts`; covered by integration tests | Organizers/admins may edit projects outside the window by design. |
| **Tampering** | Score an unassigned project, your own team's project, or a draft | Assignment, conflict-of-interest and draft checks in `scoring.service.ts`; COI also excluded at assignment time (`assignment.engine.ts`) | Judges can revise their own evaluation until the judging deadline; every revision is audit-logged with the previous and new totals. |
| **Tampering** | Mass assignment (e.g. move a track to another event, nested writes) | Strict Zod allowlists on update payloads (`*.validator.ts`) | — |
| **Tampering** | Forge a certificate | HMAC-SHA256 over event, user, type and code, checked on `/api/certificates/verify/:code` (`cert.service.ts`) | Signed with `JWT_SECRET`; rotating it invalidates existing certificates. |
| **Tampering** | Double-vote / race the vote limit | Limit check + insert in one transaction under a per-voter advisory lock; unique index on `(eventId, userId, projectId)` and a partial unique index on `(eventId, ipAddress, projectId) WHERE userId IS NULL` (`voting.service.ts`, migration `20260927010000_anonymous_vote_unique`) | — |
| **Repudiation** | Deny changing scores or data | Audit log of successful mutations with actor, IP (real client IP via `trust proxy`), entity and redacted request body (`middleware/auditLogger.ts`); evaluation edits record previous vs new totals | Audit rows are not cryptographically chained; a database administrator could alter them. |
| **Information disclosure** | Read drafts or unpublished results | Drafts visible only to their team and staff; results return `403 RESULTS_NOT_PUBLISHED` to non-staff until published (`submissions.service.ts`, `results.service.ts`) | Judges see team names (not blind judging). |
| **Information disclosure** | Read other judges' scores | `GET /evaluations/project/:id` returns only the caller's own evaluation for judges, scoped to the project's event | — |
| **Information disclosure** | Leak secrets through logs or listings | Passwords/secrets/tokens redacted recursively in audit payloads; webhook secrets shown once and masked in listings; 500 responses never include internals in production | — |
| **Information disclosure** | Stored XSS via uploads or links | Upload type from magic bytes (JPEG/PNG/WEBP/GIF/PDF, no SVG), server-chosen extension, `nosniff` + sandbox CSP + `Content-Disposition: attachment` for non-images (`media.routes.ts`, `app.ts`); project/profile links must be `http(s)` and the UI refuses other schemes (`utils/safeHref.ts`) | — |
| **Information disclosure** | CSV formula injection in exports | Cells starting with `= + - @ \t \r` are prefixed with `'` (`csv.service.ts`) | — |
| **Denial of service** | Flood auth or voting | In-memory rate limiters (per backend process) | No limits on other endpoints; in-memory counters reset on restart and are not shared across replicas. Bulk import is capped at 200 rows per request; uploads at 10 MB. |
| **Elevation of privilege** | Participant calls organizer APIs | `requireRole` on every privileged route; the OpenAPI spec lists the roles each route requires | **Organizers are global**: any organizer can manage every event. |
| **Elevation of privilege** | Organizer creates admins via bulk import | Import role allowlist: organizers may import participants/judges only; admins may add organizers; ADMIN is never importable (`bulk-import.service.ts`) | — |
| **SSRF** | Webhook to internal services / cloud metadata | URL validation rejects private, loopback, link-local and metadata targets (IPv4, IPv6, mapped forms); redirects are not followed (`webhook.service.ts`) | Validation is on the URL at registration; a public DNS name that later resolves to a private address is not re-checked. |
| **Spoofed client IP** | Forge `X-Forwarded-For` to evade limits | Nginx overwrites `X-Forwarded-For` with the connecting address; Express trusts it only from loopback/private proxies (`TRUST_PROXY`) | Clients that reach `:4000` directly from a private network can still set the header. |

## 3. Judging integrity

1. **Conflict of interest**: judges are never assigned (or allowed to score, or compare in pairwise mode) a project
   whose team they belong to.
2. **Independent scoring**: judges only ever see their own evaluations.
3. **Normalization**: per-judge z-scores (with Bayesian shrinkage for judges with < 3 evaluations) or min-max
   scaling blunt a single harsh or lenient judge's effect on the ranking. A judge can still move a project within their
   own scale; normalization does not detect deliberate collusion.
