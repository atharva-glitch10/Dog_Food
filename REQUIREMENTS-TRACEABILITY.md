# Requirements Traceability

Built from the code in this repository. Status: **Complete** (implemented, reachable from the UI where that makes
sense, tested), **Partial** (works, with the stated gap), **Not implemented**. docs/PROBLEM_STATEMENT.md is not in
the repository, so no bonus point values are claimed. Backend paths are under `backend/src`, frontend under
`frontend/src`. Tests: `backend/tests`.

| ID | Requirement | Status | Implementation | UI | Tests / evidence |
|---|---|---|---|---|---|
| T1-01 | Auth & sessions | Complete | `backend/src/modules/auth/`, `backend/src/middleware/requireAuth.ts` | Login / Register pages | `tests/integration/auth-lifecycle.test.ts`, `tests/integration/platform-flow.test.ts` |
| T1-02 | Role-based access | Complete (organizers are global, no per-event ownership) | `backend/src/middleware/requireRole.ts`, service checks | Role-specific nav | `tests/security/rbac.test.ts`, `tests/security/business-rule-bypass.test.ts` |
| T1-03 | Events & dates | Complete (each window's start < end is validated; windows are not cross-ordered) | `backend/src/modules/events/` | Create Event, event page | `tests/integration/event-teams-submissions.test.ts` |
| T1-04 | Tracks & prizes | Partial (API only for create/edit) | `backend/src/modules/tracks-prizes/` | Shown on event page | OpenAPI; `tests/unit/input-validation.test.ts` |
| T1-05 | Teams & invites | Complete (email invites return a token, no email is sent) | `backend/src/modules/teams/` | Team Hub | `tests/integration/platform-flow.test.ts` |
| T1-06 | Submissions (draft → submitted → finalized, deadlines, team size) | Complete (finalize is API only) | `backend/src/modules/submissions/` | Submit page, Team Hub | `tests/integration/platform-flow.test.ts` (deadlines) |
| T1-07 | Searchable gallery | Complete (case-insensitive substring search, track filter, drafts hidden) | `backend/src/modules/gallery/gallery.controller.ts` | Projects page | `tests/integration/platform-flow.test.ts` |
| T2-01 | Judge management | Partial (add judge is API only) | `backend/src/modules/judges/` | Judging Queue | `tests/integration/platform-flow.test.ts` |
| T2-02 | Assignment (seeded, COI-aware, capacity, near-even load) | Complete | `backend/src/modules/assignments/assignment.engine.ts` | Organizer Hub → Jury Assignment | `tests/unit/assignment.test.ts` |
| T2-03 | Rubrics (weights must total 100%) | Partial (rubric editing is API only) | `backend/src/modules/scoring/scoring.engine.ts`, `backend/src/modules/rubrics/` | Shown on event and scoring pages | `tests/unit/scoring.test.ts` |
| T2-04 | Weighted scoring | Complete | `backend/src/modules/scoring/` | Evaluate page | `tests/unit/scoring-validation.test.ts` |
| T2-05 | Judging isolation (assigned only, no own team, own evaluations only; not blind to team names) | Complete | `backend/src/modules/scoring/scoring.service.ts` | Judging Queue | `tests/security/user-adversarial-scenarios.test.ts` |
| T2-06 | Judge & organizer dashboards | Complete | `backend/src/modules/judges/`, `backend/src/modules/scoring/` | Judging Queue, Organizer Hub | Browser walkthrough |
| T2-07 | Normalization (z-score + shrinkage, min-max, tie-breaks) | Complete | `backend/src/modules/normalization/normalization.engine.ts` | Organizer Hub → Score Normalization | `tests/unit/normalization.test.ts` |
| T2-08 | Results & publishing | Complete (`hideResultsUntilPublished` has no effect; results always hidden until published) | `backend/src/modules/results/` | Leaderboard, Publish button | `tests/integration/platform-flow.test.ts` |
| T3-01 | Community voting (eligibility, per-voter limit, no self-vote) | Complete | `backend/src/modules/voting/voting.rules.ts`, `backend/src/modules/voting/voting.service.ts` | Gallery / project page | `tests/unit/voting.test.ts`, integration (incl. concurrency) |
| T3-02 | Vote abuse prevention | Partial: rate limit, unique indexes, transactional limit; no IP/fingerprint clustering detection | `backend/src/middleware/rateLimiter.ts` | — | Integration concurrency tests |
| T3-03 | Randomized gallery order | Partial (unseeded shuffle of up to 50 when `sort=randomized`; `randomizeGallery` setting unused) | `backend/src/modules/gallery/gallery.controller.ts` | Gallery sort | — |
| T3-04 | Audit trail | Complete (not cryptographically chained) | `backend/src/middleware/auditLogger.ts`, `backend/src/modules/audit/` | Organizer Hub → Audit Trail | Integration flow |
| T4-01 | REST API + OpenAPI | Complete (70 operations) | `backend/docs/openapi.yaml` | Swagger UI `/api/docs` | `tests/api/openapi-coverage.test.ts` |
| T4-02 | Webhooks (HMAC, SSRF filter, delivery log) | Complete (single attempt, no retries) | `backend/src/modules/webhooks/` | Organizer Hub → Webhooks | `tests/unit/webhook-ssrf-failures.test.ts`, integration |
| T4-03 | Certificates (HMAC-signed records, verification) | Complete (no PDF/image rendering) | `backend/src/modules/certificates/cert.service.ts` | Organizer Hub, Verify Cert | Integration (incl. tamper) |
| T4-04 | Exports (CSV) | Complete (formula-injection safe) | `backend/src/modules/exports/csv.service.ts` | Organizer Hub → CSV Exports | `tests/unit/csv-injection.test.ts` |
| T4-05 | Bulk import | Complete (users only; per-row validation, dry run) | `backend/src/modules/exports/bulk-import.service.ts` | Organizer Hub → Bulk Import | `tests/unit/input-validation.test.ts`, browser |
| T4-06 | Embeddable gallery | Complete | `frontend/src/components/gallery/EmbedWidget.tsx` | `/embed/gallery/:slug` | Browser |

## Beyond the core tiers

What the project does in addition to the tiers above (no point values claimed):

1. **Bradley-Terry pairwise ranking** (MM algorithm, convergence reported): `backend/src/modules/pairwise/bradley-terry.ts`, UI for comparisons, compute via API; `tests/unit/pairwise.test.ts`.
2. **One-command self-hosting** with persistent data, generated secrets and an Nginx same-origin proxy: `docker-compose.yml`.
3. **STRIDE threat model**: [THREAT-MODEL.md](THREAT-MODEL.md).
4. **Real-database integration tests and CI**: `backend/tests/integration/platform-flow.test.ts`, `.github/workflows/ci.yml`.
