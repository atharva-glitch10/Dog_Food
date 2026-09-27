# DOGFOOD 2026 REST API Specification

All endpoints are prefixed with `/api`. Responses conform to a standardized JSON envelope:
```json
{
  "success": true,
  "data": { ... },
  "meta": { "timestamp": "2026-09-26T08:00:00.000Z" }
}
```

---

## 1. Authentication & Session Management
- `POST /api/auth/register` - Create user account (`email`, `password`, `name`, optional `role`).
- `POST /api/auth/login` - Authenticate with email/password; returns JWT + sets HTTP-only session cookie.
- `POST /api/auth/logout` - Invalidate current session and clear cookie.
- `GET /api/auth/me` - Get current authenticated user profile & active role.
- `PUT /api/auth/profile` - Update profile (bio, avatarUrl).

## 2. Event Management
- `GET /api/events` - List public active/published events.
- `GET /api/events/:slugOrId` - Get detailed event info including tracks, prizes, and settings.
- `POST /api/events` - `[ORGANIZER, ADMIN]` Create new hackathon event.
- `PUT /api/events/:id` - `[ORGANIZER, ADMIN]` Update event dates, status, or descriptions.
- `GET /api/events/:id/settings` - `[ORGANIZER, ADMIN]` Get event configuration settings.
- `PUT /api/events/:id/settings` - `[ORGANIZER, ADMIN]` Update event settings (rubrics, voting rules, quotas).

## 3. Tracks & Prizes
- `GET /api/events/:eventId/tracks` - List tracks for an event.
- `POST /api/events/:eventId/tracks` - `[ORGANIZER, ADMIN]` Create track.
- `PUT /api/events/:eventId/tracks/:trackId` - `[ORGANIZER, ADMIN]` Update track.
- `DELETE /api/events/:eventId/tracks/:trackId` - `[ORGANIZER, ADMIN]` Delete track.
- `GET /api/events/:eventId/prizes` - List prizes.
- `POST /api/events/:eventId/prizes` - `[ORGANIZER, ADMIN]` Create prize.
- `PUT /api/events/:eventId/prizes/:prizeId` - `[ORGANIZER, ADMIN]` Update prize.
- `DELETE /api/events/:eventId/prizes/:prizeId` - `[ORGANIZER, ADMIN]` Delete prize.

## 4. Teams & Invitations
- `GET /api/events/:eventId/teams` - `[ORGANIZER, ADMIN]` List all teams in an event.
- `GET /api/events/:eventId/teams/my-team` - `[PARTICIPANT]` Get current user's team for an event.
- `POST /api/events/:eventId/teams` - `[PARTICIPANT]` Create a team (creator becomes leader).
- `GET /api/teams/:teamId` - Get team details & member roster.
- `POST /api/teams/:teamId/invites` - `[TEAM LEADER]` Generate email invite token.
- `POST /api/teams/join` - `[PARTICIPANT]` Join team via invite token or team invite code.
- `DELETE /api/teams/:teamId/members/:userId` - `[TEAM LEADER / SELF]` Leave or remove member.

## 5. Projects & Submissions
- `GET /api/events/:eventId/gallery` - Public searchable/filterable project gallery (only submitted/finalized projects).
- `GET /api/events/:eventId/submissions` - `[ORGANIZER, ADMIN]` List all submissions (including drafts).
- `GET /api/projects/:id` - Get project details.
- `POST /api/events/:eventId/submissions` - `[PARTICIPANT]` Create project draft for team.
- `PUT /api/projects/:id` - `[PARTICIPANT (Team member)]` Update draft / project details (enforces submission deadline).
- `POST /api/projects/:id/submit` - `[PARTICIPANT (Team member)]` Transition status from DRAFT -> SUBMITTED.
- `POST /api/projects/:id/finalize` - `[PARTICIPANT / ORGANIZER]` Lock submission status to FINALIZED.

## 6. Judges & Assignment Engine
- `GET /api/events/:eventId/judges` - `[ORGANIZER, ADMIN]` List event judges & current assignment metrics.
- `POST /api/events/:eventId/judges/invite` - `[ORGANIZER, ADMIN]` Invite judge by email.
- `POST /api/events/:eventId/judges/assign/auto` - `[ORGANIZER, ADMIN]` Run deterministic assignment algorithm.
- `POST /api/events/:eventId/judges/assign/manual` - `[ORGANIZER, ADMIN]` Manually create/remove judge assignments.
- `GET /api/events/:eventId/judges/my-assignments` - `[JUDGE]` Get assigned projects for current judge.

## 7. Rubrics, Scoring & Normalization
- `GET /api/events/:eventId/rubrics` - Get event judging rubric and criteria.
- `POST /api/events/:eventId/rubrics` - `[ORGANIZER, ADMIN]` Create or update rubric & criteria (validates $\sum weights = 1.0$).
- `GET /api/evaluations/project/:projectId` - `[JUDGE (Assigned)]` Get judge's evaluation form for a project.
- `POST /api/evaluations` - `[JUDGE (Assigned)]` Submit or save draft scores for an assigned project.
- `POST /api/events/:eventId/judging/normalize` - `[ORGANIZER, ADMIN]` Trigger cross-judge score normalization calculation.
- `GET /api/events/:eventId/results` - Get rankings and scores (checks `hideResultsUntilPublished` / `resultsPublishedAt`).
- `POST /api/events/:eventId/results/publish` - `[ORGANIZER, ADMIN]` Officially publish final results and ranks.

## 8. Community Voting & Anti-Abuse
- `POST /api/events/:eventId/vote/:projectId` - Cast community vote (enforces eligibility, limits, and rate limits).
- `GET /api/events/:eventId/vote/my-votes` - Get list of projects current user voted for.
- `GET /api/events/:eventId/vote/stats` - `[ORGANIZER, ADMIN]` View vote distributions and flagged abuse clusters.

## 9. Pairwise Ranking
- `GET /api/events/:eventId/pairwise/pairs` - `[JUDGE]` Fetch next randomized pair of projects for comparison.
- `POST /api/events/:eventId/pairwise/compare` - `[JUDGE]` Record preference ($A \succ B$, $B \succ A$, or Tie).
- `POST /api/events/:eventId/pairwise/compute` - `[ORGANIZER, ADMIN]` Compute Bradley-Terry MLE ranking vector.

## 10. Exports & Bulk Data
- `GET /api/events/:eventId/export/participants.csv` - `[ORGANIZER, ADMIN]` CSV of all registered participants.
- `GET /api/events/:eventId/export/teams.csv` - `[ORGANIZER, ADMIN]` CSV of teams and members.
- `GET /api/events/:eventId/export/projects.csv` - `[ORGANIZER, ADMIN]` CSV of all projects and track mappings.
- `GET /api/events/:eventId/export/scores.csv` - `[ORGANIZER, ADMIN]` CSV of raw and normalized scores per judge.
- `GET /api/events/:eventId/export/results.csv` - `[ORGANIZER, ADMIN]` CSV of final rankings and category winners.
- `POST /api/events/:eventId/import/bulk` - `[ORGANIZER, ADMIN]` Bulk CSV import for participants/judges.

## 11. Certificates, Webhooks & Audits
- `GET /api/certificates/:verificationCode` - Public verification of issued certificate.
- `POST /api/events/:eventId/certificates/generate` - `[ORGANIZER, ADMIN]` Generate batch certificates.
- `GET /api/events/:eventId/audit-logs` - `[ORGANIZER, ADMIN]` Query immutable audit trail.
- `GET /api/events/:eventId/webhooks` - `[ORGANIZER, ADMIN]` List webhook subscriptions.
- `POST /api/events/:eventId/webhooks` - `[ORGANIZER, ADMIN]` Register webhook subscriber.
- `GET /api/docs` - OpenAPI 3.0 interactive Swagger UI.
