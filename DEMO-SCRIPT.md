# DOGFOOD 2026 — Comprehensive Evaluation & Demo Script

This document provides a complete, step-by-step walkthrough for evaluating and demonstrating the **DOGFOOD 2026 Hackathon Management and Judging Platform**.

---

## 1. Quick Start & System Requirements

### Prerequisites
- **Docker & Docker Compose** (for containerized single-command launch) OR **Node.js 20+** and **PostgreSQL 16+** (for manual local execution).
- Offline-ready: Zero external cloud services, zero analytics trackers, and zero external CDNs required.

### Launch with Docker Compose
```bash
# Clone the repository and navigate to the project root
git clone <repo-url>
cd Dogfood

# Launch entire platform (PostgreSQL, Backend API, Frontend App)
docker compose up -d

# Verify all services are healthy and running
docker compose ps
```

The system will automatically initialize the database schema (`npx prisma db push`) and seed demo records (`npx tsx prisma/seed.ts`).

### Access Endpoints
- **Web Application Portal:** [http://localhost:3000](http://localhost:3000)
- **Backend API & Health Check:** [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Interactive OpenAPI 3.0 Documentation:** [http://localhost:4000/api/docs](http://localhost:4000/api/docs) or [http://localhost:3000/api-docs](http://localhost:3000/api-docs)
- **Public Embeddable Gallery Widget:** [http://localhost:3000/embed/gallery/dogfood-2026](http://localhost:3000/embed/gallery/dogfood-2026)

---

## 2. Pre-Seeded Demo Accounts

All demo accounts share the password: `Dogfood2026!`

| Role | Email | Password | Primary Responsibility |
| :--- | :--- | :--- | :--- |
| **Platform Admin** | `admin@dogfood.local` | `Dogfood2026!` | Global configuration, security audit review, user management |
| **Event Organizer** | `organizer@dogfood.local` | `Dogfood2026!` | Event administration, rubric setup, judge assignments, results publishing |
| **Judge (Harsh)** | `judge.harsh@dogfood.local` | `Dogfood2026!` | Rigorous evaluation profile (demonstrates Z-score normalization) |
| **Judge (Lenient)** | `judge.lenient@dogfood.local` | `Dogfood2026!` | Generous evaluation profile (demonstrates Z-score normalization) |
| **Judge (Balanced)** | `judge.balanced@dogfood.local` | `Dogfood2026!` | Centered evaluation profile |
| **Judge (Specialist)**| `judge.specialist@dogfood.local` | `Dogfood2026!` | Domain-specific evaluation profile |
| **Team Leader (Team 1)** | `alice@dogfood.local` | `Dogfood2026!` | Aegis AI submission owner |
| **Team Member (Team 1)** | `bob@dogfood.local` | `Dogfood2026!` | Team member on Aegis AI |
| **Team Leader (Team 2)** | `charlie@dogfood.local` | `Dogfood2026!` | Helix Health submission owner |
| **Team Leader (Team 3)** | `eve@dogfood.local` | `Dogfood2026!` | ChronoGraph submission owner |
| **Team Leader (Team 4)** | `frank@dogfood.local` | `Dogfood2026!` | VerdantSense IoT submission owner |

---

## 3. Step-by-Step Demonstration Walkthrough

### Scenario A: Organizer Event Management & Configuration
1. Navigate to [http://localhost:3000/login](http://localhost:3000/login).
2. Log in as `organizer@dogfood.local` with password `Dogfood2026!`.
3. Open the **Organizer Dashboard** for the `dogfood-2026` event:
   - URL: [http://localhost:3000/dashboard/organizer/dogfood-2026](http://localhost:3000/dashboard/organizer/dogfood-2026)
4. Review the configured Tracks:
   - *AI & Intelligent Systems*
   - *Decentralized & Web3 Infrastructure*
   - *Developer Tooling & DevOps*
   - *Climate, Healthcare & Social Impact*
5. Review the custom Rubrics:
   - Notice weights must strictly total **100%** (Technical Execution 30%, Innovation 30%, Practical Impact 20%, Design & UX 20%).
6. Inspect the Community Voting configuration toggle:
   - Voting eligibility mode (Public, Verified Users, or Participants Only).
   - Hidden results during voting toggle.

### Scenario B: Participant Team Formation & Project Submission
1. In an incognito window or alternate browser, navigate to [http://localhost:3000/login](http://localhost:3000/login).
2. Log in as `alice@dogfood.local` (`Dogfood2026!`).
3. Open the **Team Dashboard**: [http://localhost:3000/dashboard/team/dogfood-2026](http://localhost:3000/dashboard/team/dogfood-2026).
   - View team name: *CyberDefenders*.
   - View the unique 8-character invite code. Teammates enter this code to join without administrative approval.
4. Navigate to the **Submit Project** page: [http://localhost:3000/submit/dogfood-2026](http://localhost:3000/submit/dogfood-2026).
   - Review Project Metadata: Title, Tagline, Problem Statement, Solution Description, Technologies used, GitHub Repository URL, and Live Demo URL.
   - Edit fields and toggle between **Save Draft** and **Submit Finalized Project**.
   - Note that deadline enforcement is enforced strictly on the server: submissions attempted after the deadline timestamp are rejected with HTTP 403 Forbidden.

### Scenario C: Deterministic Judge Assignment & Double-Blind Rubric Scoring
1. Return to the **Organizer Dashboard** as `organizer@dogfood.local`.
2. Click **Run Automated Judge Assignment**:
   - The Mulberry32 deterministic PRNG algorithm assigns judges while balancing workload (max projects per judge limit).
   - Conflict of Interest (COI) prevention ensures that participants are never assigned to judge their own team's submissions.
3. Log out and log in as `judge.harsh@dogfood.local` (`Dogfood2026!`).
4. Go to the **Judge Dashboard**: [http://localhost:3000/dashboard/judge/dogfood-2026](http://localhost:3000/dashboard/judge/dogfood-2026).
   - View assigned projects.
   - Click **Evaluate** on an assigned project:
     * Review problem statement, tech stack, and links.
     * Score each criterion on the designated 1–10 scale.
     * Leave qualitative feedback notes.
     * Click **Save Draft** (resumable) or **Submit Final Evaluation**.
   - Double-blind isolation: Judges cannot see evaluations submitted by other judges.

### Scenario D: Bradley-Terry Pairwise Judging (Bonus REQ-BONUS-02)
1. In the Judge portal, navigate to the **Pairwise Comparison** tab:
   - URL: [http://localhost:3000/dashboard/pairwise/dogfood-2026](http://localhost:3000/dashboard/pairwise/dogfood-2026).
2. The system presents two randomly paired, non-conflicting submissions side by side:
   - Compare Project A vs. Project B.
   - Select the superior project with one click.
   - The engine logs the comparison and serves the next pair.
3. The backend calculates continuous latent skill scores using the **Bradley-Terry Maximum Likelihood Estimation (MM algorithm)** with iterative log-likelihood convergence.

### Scenario E: Public Gallery & Community Voting
1. Navigate to [http://localhost:3000/gallery/dogfood-2026](http://localhost:3000/gallery/dogfood-2026).
2. Filter projects by track or enter keyword searches in the search bar.
3. Click the **Vote** button on any project:
   - Rate limiting prevents bot spam.
   - Self-voting prevention stops team members from voting for their own submissions.
   - Duplicate prevention ensures each user cannot exceed `votesPerUser`.
   - Result counts remain hidden until the organizer officially closes voting and publishes results.

### Scenario F: Z-Score Statistical Normalization & 4-Tier Tie-Breaking
1. Log in as `organizer@dogfood.local`.
2. Open the **Organizer Dashboard** -> **Judging & Results Management**.
3. Click **Compute Normalized Results**:
   - The platform calculates judge-specific means ($\mu_j$) and standard deviations ($\sigma_j$).
   - Raw scores are converted to Z-scores ($z_{ij} = \frac{s_{ij} - \mu_j}{\sigma_j}$).
   - **Bayesian shrinkage** pulls low-sample variance toward the global prior to prevent harsh or lenient graders from skewing outcomes.
   - The 4-tier tie-breaking hierarchy resolves identical composite scores:
     1. Highest raw total score across judges.
     2. Highest score on highest-weighted rubric criterion.
     3. Lowest standard deviation (highest consensus across judges).
     4. Earliest final submission timestamp.
4. Click **Publish Results**:
   - The public leaderboard at [http://localhost:3000/results/dogfood-2026](http://localhost:3000/results/dogfood-2026) is instantly revealed with podium badges and breakdown statistics.

### Scenario G: Administrative RFC 4180 CSV Exports
1. In the **Organizer Dashboard**, click the **Export CSV** dropdown:
   - Download **Participants CSV** (names, emails, roles, team associations).
   - Download **Teams & Submissions CSV** (submission links, statuses, tracks).
   - Download **Raw Score Sheet CSV** (all judge evaluations and criterion scores).
   - Download **Final Normalized Results CSV** (final ranks, Z-scores, and tie-break metrics).
2. All CSVs are strictly formatted with RFC 4180 compliant escaping.

### Scenario H: Cryptographic Certificate Verification Portal
1. Navigate to [http://localhost:3000/verify](http://localhost:3000/verify).
2. Enter a certificate verification ID (e.g., generated for winning teams).
3. The platform verifies the HMAC-SHA256 digital signature against the server key, certifying authenticity, recipient identity, event name, and timestamp.

### Scenario I: Sandboxed Embeddable Gallery Widget
1. Access the standalone embeddable widget:
   - URL: [http://localhost:3000/embed/gallery/dogfood-2026](http://localhost:3000/embed/gallery/dogfood-2026)
2. This route renders a lightweight, isolated grid suitable for embedding in external university or corporate portals via standard HTML:
```html
<iframe
  src="http://localhost:3000/embed/gallery/dogfood-2026"
  width="100%"
  height="700"
  frameborder="0"
  sandbox="allow-scripts allow-same-origin allow-popups"
></iframe>
```

---

## 4. Automated Test Suite Execution

Run the complete test suite to verify end-to-end correctness across all modules:

```bash
cd backend
npm test
```

Expected result:
- **16 test files**
- **107 passing automated tests** (0 failures)
- Tests verify:
  * RBAC and permission isolation
  * SSRF-hardened webhook dispatch
  * Z-score statistical normalization and zero-variance edge cases
  * Bradley-Terry MLE convergence
  * Scoring bounds validation and COI prevention
  * Team formation and invite code expiry
  * Community voting anti-abuse rules
  * HMAC-SHA256 certificate generation and verification
