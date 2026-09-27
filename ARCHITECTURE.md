# DOGFOOD 2026 Platform Architecture Specification

## 1. Executive System Overview

**DOGFOOD 2026** is a production-grade, self-hostable hackathon management and judging platform built specifically for high-integrity, offline-capable hackathon execution. The system runs entirely within a local Docker Compose topology without external cloud dependencies (no Firebase, Supabase, Auth0, Clerk, AWS, or external CDNs).

```mermaid
graph TD
    subgraph Client Tier
        Browser[Modern Web Browser]
        Embed[Third-Party Embeddable Gallery Widget]
    end

    subgraph Presentation & Gateway Tier
        Nginx[Frontend Container: Nginx / Vite Dev Server]
        StaticAssets[Pre-bundled Static Assets: Fonts, Icons, JS/CSS]
    end

    subgraph Application Tier [Node.js 20 LTS + Express + TypeScript]
        Middleware[Express Middleware Pipeline: Auth, RBAC Guard, Rate Limiter, Audit Logger, Error Envelope]
        
        subgraph Core Domain Services
            AuthSvc[Auth & Session Service]
            EventSvc[Event & Settings Service]
            TrackPrizeSvc[Tracks & Prizes Service]
            TeamSvc[Team & Invite Service]
            SubSvc[Project Submission & Deadline Guard]
            JudgeAssignSvc[Deterministic Judge Assignment Engine]
            RubricSvc[Rubric & Weighted Scoring Service]
            NormSvc[Cross-Judge Score Normalization Engine]
            PairwiseSvc[Bradley-Terry Pairwise Ranking Engine]
            VoteSvc[Community Voting & Abuse Filter]
            CertSvc[Cryptographic Certificate & Signature Generator]
            ExportSvc[RFC 4180 CSV Export & Bulk Import Service]
            WebhookSvc[Webhook Dispatcher & Delivery Logger]
            AuditSvc[Immutable Audit Trail Service]
        end
    end

    subgraph Persistence Tier
        PrismaORM[Prisma ORM: Parameterized Queries, Migrations, Connection Pool]
        Postgres[(PostgreSQL 16 Engine)]
        LocalStorage[(Local File Storage: /uploads)]
    end

    Browser -->|HTTP/HTTPS :3000| Nginx
    Embed -->|HTTP/HTTPS :3000/embed/gallery| Nginx
    Nginx --> StaticAssets
    Nginx -->|Reverse Proxy /api/* :4000| Middleware

    Middleware --> AuthSvc
    Middleware --> EventSvc
    Middleware --> TrackPrizeSvc
    Middleware --> TeamSvc
    Middleware --> SubSvc
    Middleware --> JudgeAssignSvc
    Middleware --> RubricSvc
    Middleware --> NormSvc
    Middleware --> PairwiseSvc
    Middleware --> VoteSvc
    Middleware --> CertSvc
    Middleware --> ExportSvc
    Middleware --> WebhookSvc
    Middleware --> AuditSvc

    Core Domain Services --> PrismaORM
    Core Domain Services --> LocalStorage
    PrismaORM --> Postgres
```

---

## 2. Frontend Architecture

### 2.1 Technology Stack
- **Core**: React 18 with TypeScript in strict mode.
- **Build Tooling**: Vite 5 for instant HMR and optimized tree-shaken static production builds.
- **Styling**: Tailwind CSS with custom theme variables (modern dark/light palette, glassmorphism accents).
- **Component Architecture**: Modular component structure (UI Primitives, Composite Domain Components, Layouts, Pages).
- **Icons**: Lucide React (bundled locally, zero runtime CDN fetch).
- **Data Visualizations**: Recharts for judge scoring distributions, normalization bell curves, and submission metrics.
- **State Management & Server Cache**: TanStack Query (React Query v5) for query caching, automatic deduplication, background invalidation, and optimistic mutations.
- **Routing**: React Router v6 with declarative Protected Route wrappers checking authenticated session status and RBAC permissions.

### 2.2 Frontend Directory Structure
```
frontend/
├── src/
│   ├── assets/              # Local static media and icons
│   ├── components/
│   │   ├── ui/              # Reusable UI primitives (Button, Modal, Input, Badge, Table, Card)
│   │   ├── layout/          # Navbar, Sidebar, Footer, PageHeader, DashboardLayout
│   │   ├── auth/            # LoginForm, RegisterForm, ProtectedRoute
│   │   ├── events/          # EventCard, EventSettingsForm, TrackList, PrizeList
│   │   ├── teams/           # TeamCard, MemberList, InviteModal, JoinTeamModal
│   │   ├── submissions/     # ProjectEditor, MediaUploader, DeadlineBanner, StatusBadge
│   │   ├── gallery/         # GalleryGrid, ProjectCard, FilterBar, SearchInput, EmbedWidget
│   │   ├── judging/         # EvaluationForm, RubricScoreSlider, AssignmentList, JudgeProgressCard
│   │   ├── organizer/       # NormalizationViewer, AssignmentMatrix, ResultsTable, CSVExportMenu
│   │   ├── voting/          # VotingCard, VoterEligibilityBanner
│   │   └── common/          # ErrorBoundary, ToastNotification, ConfirmDialog
│   ├── hooks/               # useAuth, useEvent, useSubmissions, useJudging, useDebounce
│   ├── services/            # Axios / Fetch API client modules mapped 1:1 to backend endpoints
│   ├── types/               # TypeScript interfaces matching backend DTOs & schemas
│   ├── App.tsx              # Route table definition and Global Providers
│   ├── main.tsx             # React DOM root mounting
│   └── index.css            # Tailwind directives and design system tokens
├── index.html
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
└── Dockerfile
```

---

## 3. Backend Architecture

### 3.1 Layered Design & Modularity
The backend follows a strictly decoupled **Controller-Service-Repository** pattern:
1. **Routing Layer (`/routes`)**: Express routers registering endpoint paths, attaching rate limiters, authentication middleware, role isolation guards, and Zod request payload validators.
2. **Controller Layer (`/controllers`)**: Decodes HTTP requests, unpacks typed params/body, invokes domain services, handles success responses with standard envelopes, and catches errors.
3. **Service Layer (`/services`)**: Encapsulates 100% of business logic, mathematical algorithms, statistical normalization routines, transactional workflows, and webhook dispatching.
4. **Data Access Layer (`/prisma`)**: Strongly-typed database interactions via Prisma Client with explicit connection pooling and parameterized query execution.
5. **Middleware Layer (`/middleware`)**: Cross-cutting concerns including session extraction, RBAC/ABAC policy enforcement, rate limiting, error formatting, and audit trail logging.

### 3.2 Backend Directory Structure
```
backend/
├── src/
│   ├── config/              # Environment variables and system constants
│   ├── auth/                # Session manager, bcrypt password hasher, JWT token handler
│   ├── middleware/          # requireAuth, requireRole, validatePayload, rateLimiter, auditLogger
│   ├── modules/
│   │   ├── users/           # User registration, profile updates, account management
│   │   ├── events/          # Event CRUD, lifecycle state transitions, event settings
│   │   ├── tracks-prizes/   # Tracks and prizes CRUD, eligibility constraints
│   │   ├── teams/           # Team formation, member roster, invite tokens
│   │   ├── submissions/     # Project lifecycle (DRAFT -> SUBMITTED -> FINALIZED), deadline guard
│   │   ├── judges/          # Judge invitations, activation, capacity management
│   │   ├── assignments/     # Deterministic greedy assignment engine, manual overrides
│   │   ├── rubrics/         # Rubric & criterion configuration, 100% weight validation
│   │   ├── scoring/         # Raw score evaluation, weighted score math, draft evaluations
│   │   ├── normalization/   # Z-score normalization, Bayesian shrinkage fallback, outlier clamping
│   │   ├── pairwise/        # Bradley-Terry pairwise comparison engine 
│   │   ├── voting/          # Community voting: eligibility rules, per-voter limits, duplicate prevention
│   │   ├── results/         # Ranking engine, tie-breaking hierarchy, visibility control
│   │   ├── exports/         # RFC 4180 CSV export generation, bulk CSV data import
│   │   ├── certificates/    # Local cryptographic certificate generation and signature verification
│   │   ├── webhooks/        # Webhook subscription manager and async delivery worker
│   │   └── audit/           # Immutable audit log query and recording service
│   ├── utils/               # Math utilities, PRNG, CSV formatter, crypto helpers
│   ├── validators/          # Zod validation schemas for all requests
│   ├── app.ts               # Express application initialization and middleware setup
│   └── server.ts            # HTTP server startup and graceful shutdown hooks
├── prisma/
│   ├── schema.prisma        # Complete relational schema
│   ├── migrations/          # Version-controlled SQL migration scripts
│   └── seed.ts              # Deterministic fixture seeder (events, users, submissions, scores)
├── tests/
│   ├── unit/                # Unit tests for normalization, scoring math, PRNG assignment
│   ├── integration/         # Supertest integration tests for all API modules
│   └── security/            # RBAC and role isolation security test suite
├── package.json
├── tsconfig.json
└── Dockerfile
```

---

## 4. Database Architecture & Storage

### 4.1 PostgreSQL Engine
- **Engine**: PostgreSQL 16 Alpine.
- **Connection Management**: Managed Prisma Connection Pool with configurable `connection_limit` and timeout thresholds.
- **Integrity**: Full ACID compliance with database transactions (`prisma.$transaction`) for multi-entity workflows (e.g. team creation with owner membership, judge assignment batch operations, rubric updates).
- **Indexing Strategy**: B-Tree indexes on foreign keys, unique constraint columns (`slug`, `email`, `inviteCode`, `token`), and composite query indexes (`[eventId, status]`, `[judgeId, projectId]`, `[eventId, userId]`).

### 4.2 File Storage
- **Strategy**: Local filesystem storage inside the container with Docker named volume persistence (`uploads_data` mounted at `/app/uploads`).
- **Path Resolution**: Secure content-addressed hashing (`/uploads/:eventId/:sha256_filename`) preventing path traversal attacks.
- **MIME Validation**: Magic byte validation on uploaded project assets (PNG, JPEG, PDF, SVG) with configurable size limits (max 10MB per file).

---

## 5. Component Communication & Integration Flow

1. **Client -> Backend**: All client interaction occurs via RESTful JSON APIs over HTTP.
2. **Backend -> Database**: Synchronous, parameterized queries via Prisma ORM.
3. **Background Jobs / Async Operations**:
   - Webhook deliveries are sent asynchronously after the response (single attempt, logged); certificates are generated synchronously.
4. **Audit Log Integration**: The `auditLogger` middleware intercepts state-mutating requests (`POST`, `PUT`, `DELETE`), captures the actor identity, request IP, entity type, and delta payload, and commits an immutable record in the `AuditLog` table.
