# DOGFOOD 2026 Judging, Scoring & Normalization Specification

## 1. System Architecture & Integrity Principles

Fairness in hackathon judging is vulnerable to three major systemic distortions:
1. **Judge Leniency / Harshness Variance**: A project evaluated by strict judges receives lower raw scores than a comparable project evaluated by lenient judges.
2. **Judge Score Dispersion Variance**: Some judges use the full $0-100$ range, while others cluster all scores within $70-80$, artificially deflating or inflating their influence on the final average.
3. **Non-Overlapping Partial Matchings**: In large events, no single judge evaluates all projects.

DOGFOOD 2026 eliminates these biases through a **deterministic, capacity-constrained assignment engine**, **weighted rubric formulation**, **cross-judge Z-score normalization with Bayesian shrinkage fallbacks**, and **Bradley-Terry pairwise maximum-likelihood ranking**.

---

## 2. Deterministic Judge Assignment Engine

### 2.1 Formal Constraints
Let $J = \{j_1, j_2, \dots, j_n\}$ be the set of active judges and $P = \{p_1, p_2, \dots, p_m\}$ be the set of finalized project submissions for event $E$.

1. **Self-Conflict Exclusion**: Let $\text{TeamMembers}(p)$ be the set of users who authored project $p$. If user $u(j) \in \text{TeamMembers}(p)$, then $(j, p)$ is strictly invalid.
2. **Judge Capacity**: $\forall j \in J, \quad |\text{Assigned}(j)| \le \text{Capacity}(j)$.
3. **Project Target Quorum**: $\forall p \in P, \quad |\text{Assigned}(p)| = K$ (where $K$ is configured via `EventSetting.assignmentsPerProject`, default $K=3$).
4. **Reproducibility**: For any fixed tuple $(J, P, K, \text{Seed})$, the generated assignment mapping $A: P \to \mathcal{P}(J)$ is 100% identical.

### 2.2 Algorithm: Deterministic Greedy Load-Balancing (Mulberry32 PRNG)
```typescript
function assignJudges(
  judges: Judge[],
  projects: Project[],
  conflicts: Map<string, Set<string>>, // judgeId -> Set of prohibited projectIds
  targetPerProject: number,
  seed: number
): Map<string, string[]> {
  const prng = new Mulberry32(seed);
  const assignments = new Map<string, string[]>(); // projectId -> judgeId[]
  const judgeLoads = new Map<string, number>(); // judgeId -> count

  for (const j of judges) judgeLoads.set(j.id, 0);
  for (const p of projects) assignments.set(p.id, []);

  // Sort projects deterministically
  const sortedProjects = [...projects].sort((a, b) => a.id.localeCompare(b.id));

  for (let round = 0; round < targetPerProject; round++) {
    for (const project of sortedProjects) {
      const alreadyAssigned = new Set(assignments.get(project.id)!);
      const prohibited = conflicts.get(project.id) || new Set();

      // Find eligible judges
      const candidates = judges.filter(j => 
        !alreadyAssigned.has(j.id) &&
        !prohibited.has(j.id) &&
        (judgeLoads.get(j.id)! < j.capacity)
      );

      if (candidates.length === 0) continue; // Capacity ceiling reached

      // Sort candidates by current workload ascending, breaking ties with deterministic PRNG
      candidates.sort((a, b) => {
        const loadDiff = (judgeLoads.get(a.id)!) - (judgeLoads.get(b.id)!);
        if (loadDiff !== 0) return loadDiff;
        return prng.next() - 0.5;
      });

      const selectedJudge = candidates[0];
      assignments.get(project.id)!.push(selectedJudge.id);
      judgeLoads.set(selectedJudge.id, judgeLoads.get(selectedJudge.id)! + 1);
    }
  }

  return assignments;
}
```

---

## 3. Rubric & Weighted Scoring Model

Let a rubric consist of $M$ criteria $C = \{c_1, c_2, \dots, c_M\}$ with normalized weights $w_m \in (0, 1]$ satisfying:
$$\sum_{m=1}^M w_m = 1.0 \quad (100\%)$$
Each criterion $c_m$ specifies an integer maximum score $R_m$ (e.g., $R_m = 10$).

When judge $j$ evaluates project $p$, they award criterion scores $s_{j, p, m} \in [0, R_m]$.

### 3.1 Raw Evaluation Score Formula
The total raw evaluation score $S_{\text{raw}}(j, p) \in [0, 100]$ is computed as:
$$S_{\text{raw}}(j, p) = \sum_{m=1}^M \left( \frac{s_{j, p, m}}{R_m} \times w_m \right) \times 100$$

---

## 4. Cross-Judge Score Normalization

### 4.1 Classical Z-Score Transformation
Let $P_j$ be the set of projects evaluated by judge $j$, with $N_j = |P_j|$.

1. **Judge Sample Mean**:
   $$\mu_j = \frac{1}{N_j} \sum_{p \in P_j} S_{\text{raw}}(j, p)$$

2. **Judge Sample Standard Deviation**:
   $$\sigma_j = \sqrt{\frac{1}{N_j - 1} \sum_{p \in P_j} (S_{\text{raw}}(j, p) - \mu_j)^2}$$

3. **Standardized Score**:
   $$z_{j, p} = \frac{S_{\text{raw}}(j, p) - \mu_j}{\sigma_j}$$

4. **Outlier Clamping**:
   $$z_{j, p}^{\text{clamped}} = \max\left(-3.0, \min\left(3.0, z_{j, p}\right)\right)$$

5. **Rescaling to Standard Hackathon Distribution (Target $\mu_0 = 70, \sigma_0 = 15$)**:
   $$S_{\text{norm}}(j, p) = \text{clamp}\left(70 + 15 \cdot z_{j, p}^{\text{clamped}},\, 0,\, 100\right)$$

---

### 4.2 Robust Fallbacks for Statistical Edge Cases

#### Edge Case A: Small Sample Size ($N_j < 3$)
When a judge evaluates only 1 or 2 projects, sample variance $\sigma_j$ is mathematically undefined or statistically erratic.

**Bayesian Prior Shrinkage**: We blend the judge's observed statistics with the global event-wide parameters ($\mu_{\text{global}}, \sigma_{\text{global}}$) using a pseudo-observation weight $k = 3$:
$$\mu_j^* = \frac{N_j \mu_j + k \mu_{\text{global}}}{N_j + k}$$
$$\sigma_j^* = \sqrt{\frac{(N_j - 1)\sigma_j^2 + k \sigma_{\text{global}}^2 + \frac{N_j k}{N_j + k}(\mu_j - \mu_{\text{global}})^2}{N_j + k - 1}}$$
The normalized score is then computed using $\mu_j^*$ and $\sigma_j^*$.

#### Edge Case B: Zero Variance ($\sigma_j = 0$)
If a judge awards the exact same score (e.g. 80.0) to all assigned projects, division by zero occurs ($\sigma_j = 0$).

**Fallback Rule**:
Set the standardized deviation to 0 ($z = 0$), mapping to the baseline target:
$$S_{\text{norm}}(j, p) = \text{clamp}\left(70.0 + (S_{\text{raw}}(j, p) - \mu_{\text{global}}), 0, 100\right)$$

#### Edge Case C: Incomplete Judging / Missing Evaluations
If an assigned judge fails to submit before the deadline:
1. The project's score is computed as the mean of all completed normalized scores.
2. A quorum flag `isComplete` is set to `false` if completed evaluations $< \lceil K / 2 \rceil$, alerting the organizer on the judging dashboard.

---

## 5. Aggregation, Tie-Breaking & Ranking Engine

For project $p$ evaluated by completed judges $J_p$:
1. **Aggregated Normalized Project Score**:
   $$\overline{S}_{\text{norm}}(p) = \frac{1}{|J_p|} \sum_{j \in J_p} S_{\text{norm}}(j, p)$$
2. **Aggregated Raw Project Score**:
   $$\overline{S}_{\text{raw}}(p) = \frac{1}{|J_p|} \sum_{j \in J_p} S_{\text{raw}}(j, p)$$

### 5.1 Tie-Breaking Hierarchy
In the event that two or more projects have identical normalized scores ($\Delta < 0.0001$):
1. **Tier 1 (Primary Score)**: Highest aggregated normalized score $\overline{S}_{\text{norm}}$.
2. **Tier 2 (Core Criterion Priority)**: Highest raw score in the highest-weighted rubric criterion (e.g., "Technical Implementation").
3. **Tier 3 (Judge Consensus / Low Dispersion)**: Lowest standard deviation across judges' scores for that project:
   $$\sigma_{\text{eval}}(p) = \sqrt{\frac{1}{|J_p| - 1}\sum_{j \in J_p} (S_{\text{norm}}(j, p) - \overline{S}_{\text{norm}}(p))^2}$$
   *(Lower dispersion indicates broad consensus over a polarizing score).*
4. **Tier 4 (Submission Timestamp)**: Earliest finalized submission timestamp `submittedAt`.

---

## 6. Bradley-Terry Pairwise Ranking Engine

In pairwise mode, judges compare two projects $A$ and $B$, recording $A \succ B$ (win), $B \succ A$ (loss), or a tie.

Let $\pi_i = e^{\theta_i}$ denote the latent quality parameter of project $i$. The Bradley-Terry probability of project $i$ defeating project $j$ is:
$$P(i \succ j) = \frac{\pi_i}{\pi_i + \pi_j}$$

We solve for the optimal latent vector $\boldsymbol{\pi}$ using the **Minorization-Maximization (MM)** iteration:
$$\pi_i^{(t+1)} = \frac{W_i}{\sum_{j \ne i} \frac{n_{ij}}{\pi_i^{(t)} + \pi_j^{(t)}}}$$
Where:
- $W_i$ is the total wins credited to project $i$ (ties award 0.5 wins).
- $n_{ij}$ is the total number of comparisons between $i$ and $j$.
- Regularization $\lambda = 10^{-4}$ is added to guarantee convergence on disconnected graphs or undefeated entries.
- Iteration terminates when $||\boldsymbol{\pi}^{(t+1)} - \boldsymbol{\pi}^{(t)}||_\infty < 10^{-6}$.
- The resulting latent scores $\boldsymbol{\pi}$ are normalized to $[0, 100]$ to yield final pairwise ranks.
