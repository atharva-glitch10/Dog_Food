# DOGFOOD 2026 — Hackathon Judging Platform: Write-Up Quest

> **Platform:** Dogfood (Self-Hostable Hackathon Submission & Judging Platform)  
> **Challenge:** 72-Hour Open-Source Judging & Submission Engine  
> **Core Focus:** Server-Side Rule Enforcement, Load-Balanced Assignment, and Bayesian Cross-Judge Normalization

---

## 1. Key Schema & Architectural Decisions

When designing the relational data model for Dogfood ([schema.prisma](file:///c:/Users/RUTUJA%20PATOLE/Dog_Food/backend/prisma/schema.prisma)), our primary constraint was **absolute integrity under concurrent evaluation** without relying on external cloud microservices.

### A. First-Class `JudgeAssignment` Relation Table
Rather than storing assigned projects as an array of IDs on the `Judge` model (`projectIds: String[]`), we established `JudgeAssignment` as a normalized join entity:
```prisma
model JudgeAssignment {
  id          String   @id @default(uuid())
  eventId     String
  judgeId     String
  projectId   String
  isCompleted Boolean  @default(false)
  assignedAt  DateTime @default(now())

  @@unique([judgeId, projectId])
  @@index([judgeId])
  @@index([projectId])
}
```
**Why this matters:**
1. **Database-Level Concurrency & Uniqueness:** The `@@unique([judgeId, projectId])` constraint prevents duplicate assignments even under race conditions in multi-threaded environments.
2. **Instant Capacity Audits:** `prisma.judgeAssignment.count({ where: { judgeId } })` allows $O(1)$ capacity enforcement without deserializing large JSON blobs.
3. **Strict Completion Tracking:** Judges' progress is tracked independently per assignment, driving live progress bars in the Organizer Command Hub.

### B. Two-Tier Header/Line Item Scoring Model
Scores are structured into `Evaluation` (the evaluation session header) and `EvaluationScore` (the criterion-level score records):
```prisma
model Evaluation {
  id            String            @id @default(uuid())
  eventId       String
  judgeId       String
  projectId     String
  isDraft       Boolean           @default(false)
  weightedTotal Float             @default(0)
  feedback      String?
  scores        EvaluationScore[]

  @@unique([judgeId, projectId])
}
```
**Why this matters:**
- **Zero Incomplete Evaluations:** Evaluations are atomic. A judge cannot save a finalized evaluation missing rubric criteria because the service validates criterion cardinality before transaction commit.
- **Draft Isolation:** Judges can draft evaluations (`isDraft: true`) without polluting the active normalization pool. The normalization engine queries strictly `where: { isDraft: false }`.

### C. Append-Only Transactional Audit Trail
Every scoring action, edit, or organizer score override writes an immutable entry into the `AuditLog` table within the same database transaction:
- Scorer user ID and target judge ID
- Project ID and Event ID
- Action taxonomy: `EVALUATION_CREATED`, `EVALUATION_UPDATED`, or `SCORE_OVERRIDE`
- Previous weighted total vs. new weighted total
- Previous criterion scores vs. new criterion scores

---

## 2. Normalization Math & Edge Cases

The most critical prize category in this challenge is the **Judging Engine**. In hackathons, raw arithmetic averages are mathematically indefensible because judges exhibit strong cognitive grading biases:
1. **Leniency / Harshness Bias (Location Shift):** Judge A averages 88/100, while Judge B averages 62/100.
2. **Scale Compression / Dispersion Bias (Scale Shift):** Judge C grades only within $[75, 85]$, while Judge D utilizes the full $[10, 100]$ spectrum.

### The Algorithm: Z-Score with Empirical Bayes Prior Shrinkage
We standardize each judge $j$'s evaluation $x_{ij}$ for project $i$:
$$z_{ij} = \frac{x_{ij} - \mu_j^*}{\sigma_j^*}$$
Then rescale to a standard hackathon benchmark distribution ($\mu_0 = 70, \sigma_0 = 15$):
$$S_{\text{norm}} = \text{clamp}\left(70 + 15 \times \text{clamp}(z_{ij}, -3.0, 3.0),\, 0,\, 100\right)$$

### What Was Tricky: The Small-Sample ($N_j < 3$) Degeneracy
In typical hackathons, volunteer judges may evaluate only 1, 2, or 3 projects.
Standard sample variance:
$$s_j^2 = \frac{1}{N_j - 1} \sum_{k=1}^{N_j} (x_{kj} - \bar{x}_j)^2$$
- If $N_j = 1$: $N_j - 1 = 0$, producing **division by zero** and `NaN`.
- If $N_j = 2$: the sample variance has extreme standard error, causing wildly distorted $z$-scores (e.g., $z = \pm 12.0$).

### How We Solved It
We implemented an **Empirical Bayes Shrinkage Prior** using $k = 3$ pseudo-observations weighted toward the hackathon global population mean $\mu_{\text{global}}$ and variance $\sigma_{\text{global}}^2$:
$$\mu_j^* = \frac{N_j \bar{x}_j + k \mu_{\text{global}}}{N_j + k}$$
$$\sigma_j^{*2} = \frac{(N_j - 1)s_j^2 + k \sigma_{\text{global}}^2 + \frac{N_j k}{N_j + k}(\bar{x}_j - \mu_{\text{global}})^2}{N_j + k - 1}$$

**Mathematical Behavior:**
- As $N_j \to \infty$, the judge's empirical observations dominate ($\mu_j^* \to \bar{x}_j$).
- When $N_j$ is small ($N_j = 1$ or $2$), the judge's parameters are shrunk toward the global population prior, preventing a harsh single score from destroying a team's standing.

### Zero-Variance & Outlier Guards
- **Zero Variance Fallback:** If a judge gives identical scores to all projects ($s_j = 0$), the engine uses $\sigma_{\text{global}}$ to avoid division by zero.
- **Outlier Clamping:** $z$-scores are clamped to $[-3.0, +3.0]$, preventing extreme 3-sigma outliers from warping the leaderboard.
- **Alternative Min-Max Normalization:** Organizers can also select linear per-judge feature scaling $S = \frac{x - \min}{\max - \min} \times 100$.

---

## 3. Bugs Found Late in Development

During our Phase 10 deep audit (commit `0620b54`), we uncovered four subtle bugs:

### Bug A: Bradley-Terry Pairwise Convergence Always Hardcoded `true`
- **What happened:** In the Bradley-Terry ranking Minorization-Maximization (MM) algorithm, the `converged` response flag was hardcoded to `true` at the end of the method, regardless of whether the loop exited via convergence threshold ($\epsilon < 10^{-6}$) or exhausted `maxIterations = 200`.
- **The fix:** We introduced an explicit delta tracker:
  $$\Delta = \max_{i} |\pi_i^{(t+1)} - \pi_i^{(t)}|$$
  If $\Delta < 10^{-6}$, `converged = true`; otherwise, it accurately reports `false`, allowing organizers to inspect poorly connected comparison subgraphs.

### Bug B: Webhook Failure Counter Computed Lifetime Failures Instead of Consecutive Failures
- **What happened:** The webhook auto-disabler counted *total lifetime HTTP failures* across all deliveries. If an endpoint had 5 failures over 3 months, it was permanently disabled even if it had 500 successful deliveries in between.
- **The fix:** Refactored the query to walk deliveries newest-first, counting only *consecutive failures* until the first successful HTTP 2xx response.

### Bug C: SSRF Bypass via HTTP Redirects
- **What happened:** Initial webhook URL validation blocked `127.0.0.1` and `169.254.169.254`. However, an attacker could supply an innocent public domain that issued a `302 Found` redirecting to `http://169.254.169.254/latest/meta-data/`.
- **The fix:** Enforced `redirect: 'manual'` in Node fetch, inspecting every intermediate `Location` header against private IP / cloud metadata filters before following any redirect.

### Bug D: IPv4-Mapped IPv6 Loopback Bypass
- **What happened:** Standard dot-decimal checks missed IPv4-mapped IPv6 loopbacks like `::ffff:127.0.0.1` and `0x7f.0.0.1`.
- **The fix:** Added normalized CIDR and hex parsing to catch all alternate loopback representations.

---

## 4. Consciously Cut Features & Scope Rationale

In high-stakes hackathons, leaving half-implemented or brittle features creates a poor user experience. We intentionally cut the following features to prioritize reliability, security, and the judging engine:

1. **In-Browser Code Execution (Web Sandboxes):**
   - *Why cut:* Executing arbitrary contestant code in containers (Docker-in-Docker / WebAssembly) introduces severe Remote Code Execution (RCE) and fork-bomb DoS risks.
   - *Alternative provided:* Submissions accept verified repository URLs and live deployment links. Judges review source code and interact with deployed production applications.
2. **Native Video Transcoding Server:**
   - *Why cut:* Bundling ffmpeg and video encoding pipelines adds significant RAM overhead and slows down clean container startup.
   - *Alternative provided:* Embeddable video URLs (YouTube, Loom, Vimeo, direct MP4) with thumbnail image upload.
3. **Fiat Payment Gateways (Stripe/PayPal):**
   - *Why cut:* Hackathons require self-contained offline capability. Requiring external Stripe webhooks would break air-gapped or localhost evaluation.
   - *Alternative provided:* Native participant registration and free team ticketing.
4. **Real-Time Video Calling:**
   - *Why cut:* WebRTC SFU infrastructure is fragile across firewalls and NATs.
   - *Alternative provided:* Multi-criterion rubric judging, pairwise comparisons, and audit logs are fully asynchronous and reliable.
