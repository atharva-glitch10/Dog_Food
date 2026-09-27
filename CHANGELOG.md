# Changelog

## [1.1.0] - 2026-09-27: review fixes

### Docker & self-hosting
- `docker compose up --build` needs no `.env`: committed Prisma migrations (`migrate deploy`), random secrets generated on first boot and kept in a volume, idempotent seed that only runs on an empty database (`SEED_DEMO_DATA`), seed compiled into the image, OpenAPI spec shipped in the image.
- Nginx proxies `/api` and `/uploads`; frontend uses `/api`; Express `trust proxy`; session cookie `Secure` follows the request protocol; Postgres no longer published; fonts bundled (no CDN).

### Security
- See the table in [SECURITY.md](SECURITY.md): privileged self-registration, upload XSS, `javascript:` links, CSV injection, vote races/duplicates, bulk-import privilege escalation, audit-log password leak, mass assignment, missing validation, fallback secrets.

### Fixed
- Four UI actions called non-existent routes (score submit, publish results, certificates, gallery vote); the audit trail tab called a wrong route; results/evaluation pages showed fabricated data on errors; certificate verification showed "authentic" for tampered records.
- Webhooks were never dispatched; rubric percentages were not validated; judge lookup ignored the event; `assignmentsPerProject` was ignored.

### Added
- Organizer UI for webhooks and bulk CSV import; "Your certificates" on the Verify page; complete OpenAPI spec (70 operations) with a coverage test.
- Pure, tested engines for normalization, assignment, scoring, Bradley-Terry and voting rules; unit tests import real code; real-database integration tests; GitHub Actions CI; doc path checker.
- Documentation rebuilt from the code; old reports moved to `docs/archive/`.

All notable changes to the **Dogfood** Hackathon Judging and Submission Platform are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-27: Hackathon Judging Platform Challenge Final Release

### 1. Backend Rule Enforcement (Highest Priority)
- **Submission Window Invariants (`submissions.service.ts`)**:
  - Enforced strict server-side validation against `submissionStartDate` (`SUBMISSION_NOT_STARTED`) and `submissionDeadline` (`DEADLINE_EXCEEDED`).
  - Added event status validation (`EVENT_NOT_ACTIVE`, `EVENT_ARCHIVED`) rejecting participant submission operations during draft or closed states.
  - Implemented team size validation on project submission: enforces `event.settings.minTeamSize` (`TEAM_SIZE_TOO_SMALL`) and `maxTeamSize` (`TEAM_SIZE_TOO_LARGE`).
  - Added track isolation: cross-event track assignment attempts are rejected (`INVALID_TRACK`).
  - Enforced unsubmitted draft privacy: projects in `DRAFT` status return `403 FORBIDDEN` when queried by non-team members or unprivileged users.
  - Hardened rapid double-submission defense: rejects re-submitting an already submitted project (`PROJECT_ALREADY_SUBMITTED`).
- **Team Formation & Registration (`teams.service.ts`)**:
  - Enforced registration periods on `createTeam`, `joinTeam`, and `inviteMember` (`REGISTRATION_NOT_STARTED`, `REGISTRATION_CLOSED`).
- **Scoring & Judging Window Enforcement (`scoring.service.ts`, `pairwise.service.ts`)**:
  - Enforced active judging periods (`JUDGING_NOT_STARTED`, `DEADLINE_EXCEEDED`).
  - Added guard prohibiting evaluation of unsubmitted draft projects (`PROJECT_NOT_SUBMITTED`).
  - Strict judge assignment scope isolation: judges cannot view or score evaluations outside their assignment queue (`NOT_ASSIGNED`, `FORBIDDEN_EVALUATION_ACCESS`).
  - Defense-in-depth Conflict of Interest (COI) prevention: judges cannot evaluate projects submitted by their own team (`SELF_EVALUATION_FORBIDDEN` in scoring, `SELF_COMPARISON_FORBIDDEN` in pairwise comparisons, `SELF_CONFLICT` in manual assignment).

---

### 2. Judging Engine & Mathematical Scoring
- **Conflict-Free Load-Balanced Assignment (`assignment.service.ts`)**:
  - Implemented bipartite conflict-of-interest graph precluding judges from scoring their own teams or tracks they are affiliated with.
  - Added 32-bit Mulberry32 seedable pseudo-random number generator (`seed: number`) for deterministic, auditable shuffles.
  - Greedy load-balancing honoring `maxProjectsPerJudge` and target `judgesPerProject`.
  - Manual assignment hardening: validates judge capacity, active status, draft project prohibition, and coverage diagnostic reporting.
- **Empirical Bayes Z-Score Normalization (`normalization.service.ts`)**:
  - Standardizes per-judge scoring distributions ($z_i = \frac{x_i - \mu_j}{\sigma_j}$) to eliminate leniency and scale-compression bias.
  - Solved small-sample degeneracy ($N_j < 3$) and zero-variance ($s_j = 0$) using an **Empirical Bayes Shrinkage Prior** with $k = 3$ pseudo-observations:
    $$\mu_j^* = \frac{N_j \bar{x}_j + k \mu_{\text{global}}}{N_j + k}, \quad \sigma_j^{*2} = \frac{(N_j - 1)s_j^2 + k \sigma_{\text{global}}^2 + \frac{N_j k}{N_j + k}(\bar{x}_j - \mu_{\text{global}})^2}{N_j + k - 1}$$
  - Added configurable **Min-Max Feature Scaling** alternative ($S = \frac{x - \min}{\max - \min} \times 100$) accessible via `?method=MIN_MAX`.
  - Implemented 4-tier deterministic tie-breaking hierarchy:
    1. Highest normalized aggregate score.
    2. Highest median raw score.
    3. Lowest score variance (highest inter-judge consensus).
    4. Earliest submission timestamp.
- **Immutable Scoring Audit Trail (`scoring.service.ts`)**:
  - Transactional append-only `AuditLog` records for every evaluation action: `EVALUATION_CREATED`, `EVALUATION_UPDATED`, and `SCORE_OVERRIDE`.
  - Captures scorer user ID, project ID, previous vs. new weighted total score, and full criterion breakdown diffs.

---

### 3. One-Command Setup & Portability
- Created zero-configuration startup scripts: [setup.sh](setup.sh) (Linux/macOS) and [setup.bat](setup.bat) (Windows).
- Automated `.env` generation from `.env.example` with fallback defaults.
- Fixed `.env.example` `COOKIE_SECRET` length to exceed the required 32-character production security threshold (preventing production boot crash).
- Docker Compose orchestration provisioning PostgreSQL 16, Express API with automatic entrypoint migrations and seeding, and Nginx frontend proxy.
- Added graceful fallback to local Node.js mode when Docker engine is offline.

---

### 4. Verification, Testing & Stress-Testing Pass
- **Standalone Mathematical Verification (`scripts/verify-normalization-math.ts`)**:
  - Hand-verified normalization math against 4 distinct edge cases:
    - Standard judge ($N=5$) with natural variance.
    - Single-evaluation judge ($N=1$) testing division-by-zero guard and prior shrinkage.
    - Zero-variance judge ($N=4$, identical scores) verifying fallback to global population variance.
    - Harsh small-sample judge ($N=2$) verifying shrinkage toward global mean.
  - Confirmed 0 `NaN`, 0 `Infinity`, and 0 division-by-zero occurrences across all evaluations.
- **Adversarial Security Test Suite (`tests/security/business-rule-bypass.test.ts`)**:
  - 25 dedicated attack simulation tests covering:
    - Post-deadline submissions and early submissions via direct API calls.
    - Unassigned judge evaluation tampering and ID spoofing.
    - Rapid succession duplicate submission race conditions.
    - Conflict-of-interest scoring attempts on self-authored projects.
    - Participant unauthorized draft snooping and premature results access.
- **Fact-Checked Documentation**:
  - Cross-referenced [WRITEUP.md](WRITEUP.md) against git commit `0620b54` (Bradley-Terry delta convergence, webhook consecutive failure counting, SSRF manual redirect handling, IPv6 loopback filters).
  - Updated [README.md](README.md) with an explicit plain-language introduction detailing what the platform is and why it is structured this way before the architectural diagram.
