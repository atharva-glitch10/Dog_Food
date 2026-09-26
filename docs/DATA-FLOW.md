# DOGFOOD 2026 Complete Application Lifecycle & Data Flow Specification

This document details how data moves through the presentation, application, and persistence tiers throughout the entire hackathon lifecycle.

```mermaid
sequenceDiagram
    autonumber
    actor Participant as Participant
    actor Organizer as Organizer
    actor Judge as Judge
    participant Frontend as React App (Client)
    participant Backend as Express API (Server)
    participant Database as PostgreSQL (Prisma)
    participant FileStorage as Local Disk Storage

    %% 1. Registration & Event Setup
    Note over Organizer, Database: Phase 1: Event Initialization
    Organizer->>Frontend: Creates Event & Configures Tracks/Prizes/Rubrics
    Frontend->>Backend: POST /api/events, POST /api/events/:id/rubrics
    Backend->>Database: INSERT events, event_settings, tracks, prizes, rubrics
    Database-->>Backend: Records Committed
    Backend-->>Frontend: 201 Created

    %% 2. Team Formation & Submission
    Note over Participant, Database: Phase 2: Team Formation & Project Submission
    Participant->>Frontend: Registers & Creates Team
    Frontend->>Backend: POST /api/auth/register, POST /api/events/:id/teams
    Backend->>Database: INSERT users, sessions, teams, team_members (Role=LEADER)
    Database-->>Backend: Committed
    Participant->>Frontend: Drafts Submission & Uploads Media
    Frontend->>Backend: POST /api/events/:id/submissions, POST /api/media/upload
    Backend->>FileStorage: Stream file to /uploads/:eventId/:hash
    Backend->>Database: INSERT projects (status=DRAFT), submission_history
    Participant->>Frontend: Clicks "Submit Project"
    Frontend->>Backend: POST /api/projects/:id/submit
    Backend->>Backend: Verify submissionDeadline NOT exceeded & required fields present
    Backend->>Database: UPDATE projects SET status='SUBMITTED', submittedAt=NOW()
    Backend-->>Frontend: 200 OK (Project Locked)

    %% 3. Judge Assignment
    Note over Organizer, Database: Phase 3: Judge Assignment
    Organizer->>Frontend: Invites Judges & Clicks "Run Auto-Assignment"
    Frontend->>Backend: POST /api/events/:id/judges/assign/auto { seed: 42 }
    Backend->>Database: SELECT active judges, submitted projects, team conflicts
    Backend->>Backend: Execute Deterministic PRNG Greedy Min-Load Balancer
    Backend->>Database: BEGIN TRANSACTION -> INSERT judge_assignments -> COMMIT
    Backend-->>Frontend: 200 OK (Assignment Stats Returned)

    %% 4. Judging & Evaluation
    Note over Judge, Database: Phase 4: Project Evaluation
    Judge->>Frontend: Logs in & Views Assigned Projects Dashboard
    Frontend->>Backend: GET /api/events/:id/judges/my-assignments
    Backend->>Database: SELECT judge_assignments JOIN projects WHERE judgeId = req.user.id
    Database-->>Backend: Assigned Project List
    Backend-->>Frontend: Projects DTO (Double-blind)
    Judge->>Frontend: Fills Rubric Scores (e.g. 9/10, 8/10) & Submits
    Frontend->>Backend: POST /api/evaluations
    Backend->>Backend: Verify judgingDeadline & compute S_raw = sum((s_m/R_m)*w_m)*100
    Backend->>Database: INSERT evaluations, evaluation_scores; UPDATE judge_assignments SET isCompleted=true
    Database-->>Backend: Committed
    Backend-->>Frontend: 201 Created

    %% 5. Normalization & Ranking
    Note over Organizer, Database: Phase 5: Score Normalization & Ranking
    Organizer->>Frontend: Reviews Judging Progress & Clicks "Run Normalization"
    Frontend->>Backend: POST /api/events/:id/judging/normalize
    Backend->>Database: SELECT all evaluations with rubric weights
    Backend->>Backend: Calculate mu_j, sigma_j; Apply Bayesian Shrinkage (N<3) & Zero-Variance Fallback
    Backend->>Backend: Calculate S_norm(j,p), aggregate project scores, execute 4-tier tie breaker
    Backend->>Database: BEGIN TRANSACTION -> UPDATE projects (rawScore, normalizedScore, finalRank) -> COMMIT
    Backend-->>Frontend: 200 OK (Full Normalization & Ranking Summary)

    %% 6. Publication, Exports & Certificates
    Note over Organizer, Database: Phase 6: Publication & Exports
    Organizer->>Frontend: Clicks "Publish Results" & "Download Results CSV"
    Frontend->>Backend: POST /api/events/:id/results/publish, GET /api/events/:id/export/results.csv
    Backend->>Database: UPDATE events SET status='RESULTS_PUBLISHED', resultsPublishedAt=NOW()
    Backend->>Backend: Format RFC 4180 CSV with sanitized fields
    Backend-->>Frontend: 200 OK + text/csv Stream
    Organizer->>Frontend: Clicks "Generate Certificates"
    Frontend->>Backend: POST /api/events/:id/certificates/generate
    Backend->>Backend: Generate HMAC-SHA256 Signatures & SVG/PDF Certs
    Backend->>Database: INSERT certificates
    Backend-->>Frontend: 201 Created
```

---

## 1. Key State Transitions & Invariants

### 1.1 Project Submission State Machine
```
[EMPTY] 
   │ (Create Draft)
   ▼
[DRAFT] ◄──────── (Edit draft before deadline)
   │ 
   │ (Submit - Validates required fields before submissionDeadline)
   ▼
[SUBMITTED] ◄──── (Assigned to judges; visible in public gallery)
   │
   │ (Finalize / Organizer Lock)
   ▼
[FINALIZED] (Locked from any further modifications)
```

### 1.2 Event Lifecycle State Machine
```
[DRAFT] ──> [REGISTRATION_OPEN] ──> [SUBMISSION_OPEN] ──> [JUDGING_ACTIVE] ──> [RESULTS_PUBLISHED] ──> [ARCHIVED]
```

### 1.3 Database Transaction Invariants
1. **Team Creation**: Inserting into `teams` and inserting the creator into `team_members` with role `LEADER` executes in an atomic transaction.
2. **Deterministic Judge Assignment**: Clearing previous assignments (if regenerating) and inserting all new `judge_assignments` occurs in an atomic transaction with foreign key integrity checks.
3. **Score Normalization**: Reading all submitted evaluations, computing $S_{\text{norm}}$, and updating all project records (`rawScore`, `normalizedScore`, `finalRank`) runs inside an atomic transaction.
