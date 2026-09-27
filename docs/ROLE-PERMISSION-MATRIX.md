# DOGFOOD 2026 Role-Based & Resource-Level Permission Matrix

## 1. System Roles

1. **`ANONYMOUS / GUEST`**: Unauthenticated public visitor.
2. **`PARTICIPANT`**: Registered hacker building and submitting a project.
3. **`JUDGE`**: Invited evaluator scoring assigned projects.
4. **`ORGANIZER`**: Hackathon administrator managing event lifecycles, tracks, rubrics, and judging.
5. **`ADMIN`**: Superuser with platform-level operational access.

---

## 2. Resource-Level Permission Matrix

| Resource / Action | Public / Guest | Participant | Judge | Organizer | Admin | Resource Ownership & ABAC Constraint |
|---|---|---|---|---|---|---|
| **Auth & Profile** |
| Register Account | Allowed | Allowed | Allowed | Allowed | Allowed | Validates email uniqueness & strong password |
| Login / Refresh Session | Allowed | Allowed | Allowed | Allowed | Allowed | Returns JWT & sets HTTP-only session cookie |
| View Own Profile | Denied | Allowed | Allowed | Allowed | Allowed | Matches session `userId` |
| Update Own Profile | Denied | Allowed | Allowed | Allowed | Allowed | Matches session `userId` |
| **Event Management** |
| List Public Events | Allowed | Allowed | Allowed | Allowed | Allowed | Returns active/published events |
| View Event Details | Allowed | Allowed | Allowed | Allowed | Allowed | Public metadata, tracks, prizes |
| Create Event | Denied | Denied | Denied | Allowed | Allowed | Creator assigned as organizer |
| Edit Event Details & Dates | Denied | Denied | Denied | Allowed | Allowed | Validates date consistency |
| Update Event Settings | Denied | Denied | Denied | Allowed | Allowed | Min/max team size, voting rules |
| **Tracks & Prizes** |
| List Tracks & Prizes | Allowed | Allowed | Allowed | Allowed | Allowed | Read-only |
| Create / Update / Delete Tracks | Denied | Denied | Denied | Allowed | Allowed | Organizer of event |
| Create / Update / Delete Prizes | Denied | Denied | Denied | Allowed | Allowed | Organizer of event |
| **Teams & Invitations** |
| Create Team | Denied | Allowed | Denied | Allowed | Allowed | User cannot be in >1 active team per event |
| View Own Team Roster | Denied | Allowed | Denied | Allowed | Allowed | Must be a member of the team |
| Invite Member (Token) | Denied | Allowed (Leader) | Denied | Allowed | Allowed | Must be team Leader; validates team capacity |
| Join Team (Invite Code/Token)| Denied | Allowed | Denied | Allowed | Allowed | Validates token expiry & max team size |
| Leave / Remove Member | Denied | Allowed (Self/Leader)| Denied | Allowed | Allowed | Self removal, or leader removing member |
| Delete Team | Denied | Allowed (Leader) | Denied | Allowed | Allowed | Only if no finalized submission exists |
| **Submissions & Gallery** |
| Browse Public Gallery | Allowed | Allowed | Allowed | Allowed | Allowed | Only `SUBMITTED` / `FINALIZED` projects |
| Search & Filter Gallery | Allowed | Allowed | Allowed | Allowed | Allowed | Sanitized query string |
| Create Project Draft | Denied | Allowed | Denied | Allowed | Allowed | 1 project per team |
| Update Project Details | Denied | Allowed (Member) | Denied | Allowed | Allowed | Enforces `submissionDeadline` & team membership |
| Submit Project (`SUBMITTED`)| Denied | Allowed (Member) | Denied | Allowed | Allowed | Validates required fields before deadline |
| Lock Project (`FINALIZED`) | Denied | Allowed (Leader) | Denied | Allowed | Allowed | Enforces deadline |
| View Draft Project | Denied | Allowed (Member) | Denied | Allowed | Allowed | Strictly isolated from non-members |
| **Judges & Assignments** |
| Invite Judge | Denied | Denied | Denied | Allowed | Allowed | Generates secure judge invite token |
| Activate Judge Profile | Denied | Denied | Allowed | Allowed | Allowed | Matches invited email |
| Run Deterministic Assignment| Denied | Denied | Denied | Allowed | Allowed | Validates seed, capacity, conflict rules |
| Manual Assignment Override | Denied | Denied | Denied | Allowed | Allowed | Validates capacity and non-conflict |
| View Assigned Projects | Denied | Denied | Allowed (Assigned)| Allowed | Allowed | Judge sees ONLY their assigned projects |
| **Rubrics & Scoring** |
| View Rubric Criteria | Allowed | Allowed | Allowed | Allowed | Allowed | Public transparency |
| Create / Update Rubric | Denied | Denied | Denied | Allowed | Allowed | Validates criteria weights sum to 1.0 (100%) |
| Save Draft Evaluation | Denied | Denied | Allowed (Assigned)| Allowed | Allowed | Project must be assigned to judge; `isDraft=true` |
| Submit Final Evaluation | Denied | Denied | Allowed (Assigned)| Allowed | Allowed | Enforces `judgingDeadline`; locks score |
| View Other Judges' Scores | Denied | Denied | Denied | Allowed | Allowed | Judges only see their own evaluations |
| **Normalization & Results** |
| Trigger Normalization | Denied | Denied | Denied | Allowed | Allowed | Computes Z-scores & Bayesian fallbacks |
| View Draft / Raw Rankings | Denied | Denied | Denied | Allowed | Allowed | Pre-publication results hidden from public |
| Publish Official Results | Denied | Denied | Denied | Allowed | Allowed | Sets `resultsPublishedAt` & unlocks public view |
| View Final Results | If published | If published | If published | Allowed | Allowed | Enforced on API layer |
| **Community Voting** |
| Cast Community Vote | If allowed | Allowed | Allowed | Allowed | Allowed | Enforces rate limit, eligibility, max votes/user |
| View Own Cast Votes | Denied | Allowed | Allowed | Allowed | Allowed | Filtered by session `userId` |
| View Live Vote Tallies | Denied | Denied | Denied | Allowed | Allowed | Hidden from voters if `hideResultsUntilPublished` |
| **Data Exports & Imports** |
| Export CSVs (Scores, Teams) | Denied | Denied | Denied | Allowed | Allowed | RFC 4180 escaping, redacts passwords/hashes |
| Bulk Import CSV | Denied | Denied | Denied | Allowed | Allowed | Schema validation with row error reporting |
| **Audit Logs & Webhooks** |
| View Audit Trail | Denied | Denied | Denied | Allowed | Allowed | Read-only access |
| Manage Webhooks | Denied | Denied | Denied | Allowed | Allowed | Add URL, secret, subscribed event topics |
| **Certificates** |
| Generate Batch Certificates | Denied | Denied | Denied | Allowed | Allowed | Signs certificates with HMAC-SHA256 |
| Verify Certificate Code | Allowed | Allowed | Allowed | Allowed | Allowed | Public verification endpoint |
| Download Own Certificate | Denied | Allowed | Allowed | Allowed | Allowed | Matches session `userId` |

---

## 3. Backend Enforcement Architecture

Every API route uses a composite middleware chain:
```typescript
router.put(
  '/api/projects/:id',
  requireAuth,
  enforceSubmissionDeadline,
  requireProjectMembership, // ABAC: Checks if req.user is a member of project.teamId
  validateBody(UpdateProjectSchema),
  projectController.updateProject
);
```
No frontend state or client claims are trusted. If an unauthorized role attempts access, the backend terminates the request immediately with HTTP 401 Unauthorized or HTTP 403 Forbidden.
