# DOGFOOD 2026 Security Threat Model & Attack Mitigation

## 1. System Threat Model (STRIDE)

| Threat Category | Potential Attack Vector | Impact Level | Architectural Mitigation in DOGFOOD 2026 |
|---|---|---|---|
| **Spoofing** | Sybil account creation to stuff community voting or flood registrations. | High | - Rate limiting on registration / voting.<br>- Configurable voting eligibility (`VERIFIED_USERS` or `PARTICIPANTS_ONLY`).<br>- IP and user-agent fingerprint clustering analysis.<br>- Rejection of disposable/unverified emails if configured. |
| **Tampering** | Modifying project submissions after deadline or altering submitted judge scores. | Critical | - Server-side deadline check middleware (`enforceSubmissionDeadline`, `enforceJudgingDeadline`).<br>- Immutable `submission_history` snapshots.<br>- Judge evaluations locked upon submission (`isDraft=false`); modifications strictly restricted to organizers with full audit trail. |
| **Repudiation** | An organizer denies changing judging weights or a participant denies editing a project. | Medium | - Centralized, immutable `AuditLog` recording actor ID, IP address, timestamp, target entity, and before/after JSON diffs. |
| **Information Disclosure** | Scraping unsubmitted drafts, viewing other judges' scores before normalization, or exposing vote tallies during live voting. | High | - Strict backend role isolation guards (`requireRole`, ownership checks).<br>- Project drafts visible ONLY to team members and organizers.<br>- Judges can only view assigned projects and cannot see peer scores.<br>- `hideResultsUntilPublished` enforced on the API layer (omitting vote counts / ranks from responses). |
| **Denial of Service** | Flooding auth endpoints, bulk export requests, or heavy normalization calculations. | High | - In-memory sliding-window rate limiters on `/api/auth/*`, `/api/vote/*`, `/api/export/*`.<br>- Computational endpoints (normalization, export) protected by organizer role and optimized with indexed SQL queries. |
| **Elevation of Privilege** | Participant calling organizer APIs to create tracks, reassign judges, or publish results. | Critical | - Server-side RBAC middleware (`requireRole([Role.ORGANIZER, Role.ADMIN])`) executed on every route before controller execution.<br>- Frontend UI visibility is never trusted for authorization. |

---

## 2. Judging Collusion & Integrity Mitigations
1. **Self-Conflict Invariance**: The assignment algorithm automatically detects if a judge is registered as a participant/team member for an event and strictly prohibits self-assignment.
2. **Double-Blind Evaluation**: Judges evaluate projects independently without visibility into evaluations submitted by other assigned judges.
3. **Cross-Judge Normalization**: Maliciously low scores (attempting to sink a competitor) or lenient scores (attempting to boost a friend) are mathematically centered and scaled via Z-score transformation with Bayesian shrinkage, drastically diminishing the leverage of outlier grading.
