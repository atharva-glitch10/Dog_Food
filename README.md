# DOGFOOD 2026 — Self-Hostable Hackathon Management & Judging Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Docker Ready](https://img.shields.io/badge/Docker-One--Command_Startup-2496ED?logo=docker&logoColor=white)](docker-compose.yml)
[![Tests: Vitest](https://img.shields.io/badge/Tests-19%20Passing%20(100%25)-success)](acceptance-report.txt)
[![Offline Capable](https://img.shields.io/badge/Offline-100%25_Self--Contained-success)](ARCHITECTURE.md)

**DOGFOOD 2026** is a production-grade, open-source, self-hostable hackathon management and judging platform built for **Hackathon Raptors**. Designed specifically for high-integrity, offline-first execution, it guarantees role isolation, deterministic judge assignment, defensible cross-judge score normalization (Z-score with Bayesian shrinkage fallbacks), Bradley-Terry pairwise ranking, community voting, and tamper-evident audit trails.

---

## 1. Quick Start (One-Command Startup)

The entire application runs locally using Docker Compose without external cloud dependencies:

```bash
docker compose up --build
```

This single command automatically:
1. Provisions and health-checks PostgreSQL 16 Alpine.
2. Applies the Prisma database schema migrations.
3. Seeds comprehensive fixture data (users, events, tracks, prizes, teams, rubrics, evaluations).
4. Starts the Express TypeScript backend on `http://localhost:4000` (OpenAPI Docs at `http://localhost:4000/api/docs`).
5. Serves the modern React frontend on `http://localhost:3000`.

---

## 2. Seed Data & Demo Credentials

All pre-seeded demo accounts use the standard password: `Dogfood2026!`

| Role | Email | Password | Pre-seeded Capabilities |
|---|---|---|---|
| **Admin** | `admin@dogfood.local` | `Dogfood2026!` | System-wide management, user role controls, global config |
| **Organizer** | `organizer@dogfood.local` | `Dogfood2026!` | Event configuration, tracks/prizes, judge assignments, normalization, result publishing, CSV exports |
| **Judge 1 (Harsh)** | `judge.harsh@dogfood.local` | `Dogfood2026!` | Pre-assigned evaluations with lower mean score (demonstrates Z-score normalization) |
| **Judge 2 (Lenient)** | `judge.lenient@dogfood.local` | `Dogfood2026!` | Pre-assigned evaluations with higher mean score |
| **Judge 3 (Balanced)** | `judge.balanced@dogfood.local` | `Dogfood2026!` | Pre-assigned evaluations with balanced distribution |
| **Participant 1** | `alice@dogfood.local` | `Dogfood2026!` | Team Captain of "Neural Nexus" (Submitted Project: Aegis AI) |
| **Participant 2** | `bob@dogfood.local` | `Dogfood2026!` | Team Member in "Neural Nexus" |
| **Participant 3** | `carol@dogfood.local` | `Dogfood2026!` | Team Captain of "Quantum Leap" (Submitted Project: HyperGraph) |

---

## 3. Running Automated Tests

Run the full automated test suite (unit tests, scoring formulas, normalization proofs, RBAC security, API integration):

```bash
# In the backend directory
cd backend
npm test
```

Test results summary:
- **Unit Tests**: Mulberry32 PRNG determinism, self-conflict exclusion, capacity bounds, weighted scoring math.
- **Normalization Proof Tests**: Z-score calculation, Bayesian shrinkage fallback ($N_j < 3$), zero-variance fallback ($\sigma_j = 0$), outlier clamping ($|z| \le 3.0$), 4-tier tie-breaking hierarchy.
- **Security Tests**: Role isolation, 403 forbidden rejection on unauthorized participant access.
- **Integration Tests**: Supertest endpoints for auth, events, submissions, and gallery.

---

## 4. End-to-End 5-Minute Event Lifecycle Walkthrough

1. **Organizer Login**: Log in as `organizer@dogfood.local` and open the Organizer Command Hub.
2. **Event & Tracks**: Inspect the flagship event "Dogfood 2026", view tracks ("AI", "Web3", "DevTools", "Social Impact"), prizes, and the weighted 4-criterion rubric.
3. **Participant Flow**: Log in as `alice@dogfood.local`, navigate to **My Team & Submission**, view the team roster for "Neural Nexus", and inspect the project submission.
4. **Judge Assignment**: In the Organizer Hub under **Judge Assignment Engine**, click **Run Auto Assignment Engine** with seed `42` to deterministically distribute project evaluations across judges.
5. **Judge Evaluation**: Log in as `judge.harsh@dogfood.local` or `judge.lenient@dogfood.local`, open the **Judge Evaluation Portal**, adjust criterion scores (0-10) with live weighted total calculation, and submit.
6. **Cross-Judge Score Normalization**: Return to the Organizer Hub under **Score Normalization & Ranks**, click **Calculate Score Normalization** to compute per-judge means, standard deviations, and Bayesian shrinkage adjustments.
7. **Publish & Leaderboard**: Click **Publish Official Results** to release the live rankings. Navigate to **Rankings & Results** (`/results/dogfood-2026`) to view the podium winners.
8. **Export & Verify**: Under **CSV Exports & Certs**, download the RFC 4180 CSVs and generate cryptographic HMAC-SHA256 certificates. Test verification in the **Verify Certs** portal (`/verify`).

---

## 5. Technical Documentation Index

- [REQUIREMENTS-TRACEABILITY.md](file:///d:/Dogfood/REQUIREMENTS-TRACEABILITY.md) — Requirement Traceability Matrix for T1, T2, T3, T4, and Bonuses.
- [ARCHITECTURE.md](file:///d:/Dogfood/ARCHITECTURE.md) — System, frontend, backend, security, and offline architecture.
- [DATA-MODEL.md](file:///d:/Dogfood/DATA-MODEL.md) — Complete relational schema, 22 entities, constraints, and indexes.
- [JUDGING.md](file:///d:/Dogfood/JUDGING.md) — Assignment algorithm, scoring math, Z-score normalization, Bayesian fallback, and Bradley-Terry pairwise engine.
- [THREAT-MODEL.md](file:///d:/Dogfood/THREAT-MODEL.md) — STRIDE security model, anti-Sybil voting mitigations, and collusion defense.
- [API-SPEC.md](file:///d:/Dogfood/API-SPEC.md) & [docs/openapi.yaml](file:///d:/Dogfood/docs/openapi.yaml) — OpenAPI 3.0 specification for all REST endpoints.
- [docs/ROLE-PERMISSION-MATRIX.md](file:///d:/Dogfood/docs/ROLE-PERMISSION-MATRIX.md) — Role & resource-level permission matrix.
- [docs/DATA-FLOW.md](file:///d:/Dogfood/docs/DATA-FLOW.md) — Application lifecycle sequence diagrams and state transitions.
- [acceptance-report.txt](file:///d:/Dogfood/acceptance-report.txt) — Formal acceptance test results.
- [LICENSE](file:///d:/Dogfood/LICENSE) — Open Source MIT License.
