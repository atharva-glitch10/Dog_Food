# DOGFOOD 2026: End-to-End Judge Evaluation Guide

This guide contains everything required to test and evaluate the DOGFOOD 2026 platform end-to-end, exactly as a hackathon judge or adjudicator would.

---

## 1. Verified Live System State

Both services are active, connected to the local PostgreSQL database, and listening:

| Service | Port | Base URL | Healthcheck / Status |
| :--- | :--- | :--- | :--- |
| **Frontend (React + Vite)** | `3000` | [http://localhost:3000/](http://localhost:3000/) | **HTTP 200 OK** |
| **Backend (Express + Prisma)** | `4000` | [http://localhost:4000/](http://localhost:4000/) | **HTTP 200 `{"status":"healthy"}`** |
| **Database (PostgreSQL)** | `5433` | `localhost:5433/dogfood` | **Connected & Seeded** |

### Direct Navigation Hub

* **Login / Authentication**: [http://localhost:3000/login](http://localhost:3000/login)
* **Judge Scoring Queue**: [http://localhost:3000/dashboard/judge/dogfood-2026](http://localhost:3000/dashboard/judge/dogfood-2026)
* **Unscored Project (Ready to Grade)**: [http://localhost:3000/evaluate/dogfood-2026/b1be96e4-0a80-4227-9798-fd789aa9d8a4](http://localhost:3000/evaluate/dogfood-2026/b1be96e4-0a80-4227-9798-fd789aa9d8a4)
* **Organizer Command Hub**: [http://localhost:3000/dashboard/organizer/dogfood-2026](http://localhost:3000/dashboard/organizer/dogfood-2026)
* **Public Verified Results**: [http://localhost:3000/results/dogfood-2026](http://localhost:3000/results/dogfood-2026)
* **Submissions Gallery**: [http://localhost:3000/gallery/dogfood-2026](http://localhost:3000/gallery/dogfood-2026)
* **Console Preferences / Settings**: [http://localhost:3000/settings](http://localhost:3000/settings)
* **Interactive OpenAPI Swagger Docs**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)

---

## 2. Seeded Test Accounts & Role Access Matrix

> **Universal Password for ALL Seed Accounts**:
> ```text
> Dogfood2026!
> ```
> *(Tip: On [http://localhost:3000/login](http://localhost:3000/login), clicking any preset button under "PRESET DEMO ACCOUNTS" will 1-click auto-fill credentials).*

| Role | Email | Name / Archetype | Role Privileges & Test Scenario |
| :--- | :--- | :--- | :--- |
| **ORGANIZER** | `organizer@dogfood.local` | Olivia Organizer | **Full Event Admin**: Triggers round-robin judge assignment, views Bayesian variance calculations, publishes official results, downloads CSV exports, views immutable audit logs. |
| **JUDGE (Strict)** | `judge.harsh@dogfood.local` | Dr. Strict Scaler | **Harsh Grader (Mean ~65)**: Assigned to evaluate 5 projects. **Has 1 UNSCORED project (`PulseMesh`) pending in queue for live scoring.** |
| **JUDGE (Lenient)** | `judge.lenient@dogfood.local` | Dr. Larry Lenient | **Generous Grader (Mean ~90)**: Completed all evaluations; demonstrates high-mean leniency corrected by normalization. |
| **JUDGE (Balanced)** | `judge.balanced@dogfood.local` | Barbara Balanced | **Median Grader (Mean ~80)**: Standard grading distribution with balanced criterion weights. |
| **JUDGE (Specialist / COI)** | `judge.specialist@dogfood.local` | Sam Specialist | **Conflict of Interest Target**: Judge who is ALSO an active team member of *Synthetix Audio* (`SonicForge`). **Prohibited from evaluating own project.** |
| **PARTICIPANT** | `alice@dogfood.local` | Alice Chen (Team 1) | **Team Lead (*Neural Nexus*)**: Can view team hub, edit project, invite members, view public gallery. Cannot access jury queue or organizer tools. |
| **PARTICIPANT** | `zack@dogfood.local` | Zack Taylor (Team 7) | **Draft Privacy Target (*StealthSec*)**: Author of unsubmitted draft project *GhostProtocol*. Demonstrates private draft isolation. |
| **ADMIN (Root)** | `admin@dogfood.local` | System Admin | **Superuser**: Platform-wide unrestricted administration. |

---

## 3. Seeded Project Portfolio

| # | Project Title | Team | Track | Status | Scoring State |
| :---: | :--- | :--- | :--- | :---: | :--- |
| **1** | **Aegis AI: Autonomous Incident Defense** | Neural Nexus (Alice & Bob) | AI & Agents | `SUBMITTED` | **Scored by 3 judges** (Harsh: 66, Lenient: 93, Balanced: 83) |
| **2** | **HyperGraph: Zero-Knowledge Graph DB** | Quantum Leap (Carol & Dave) | Web3 & ZK | `SUBMITTED` | **Scored by 3 judges** (Harsh: 62, Lenient: 89, Specialist: 86) |
| **3** | **KubeFlow CLI: Multi-Cluster Mesh** | DevCraft (Eve) | DevTools | `SUBMITTED` | **Scored by 3 judges** (Balanced: 80, Specialist: 83, Lenient: 92) |
| **4** | **VerdantSense: IoT Micro-Climate Monitor** | TerraGuardians (Frank) | Social Impact | `SUBMITTED` | **Scored by 3 judges** (Harsh: 65, Balanced: 75, Specialist: 76) |
| **5** | **PulseMesh: Vital Signs Triage Mesh** | PulseWave Health (Grace) | Social Impact | `SUBMITTED` | **UNSCORED by Judge Harsh** (Scored by Balanced: 78, Lenient: 88). **Target for live scoring test!** |
| **6** | **SonicForge: Neural Speech Watermark** | Synthetix Audio (Judge Specialist + Liam) | AI & Agents | `SUBMITTED` | **Conflict of Interest Demo**: Specialist is judge & team member; cannot score. |
| **7** | **GhostProtocol: Timing-Channel Defense** | StealthSec (Zack) | DevTools | `DRAFT` | **Draft Privacy Demo**: Completely hidden from other teams and public gallery. |

---

## 4. Step-by-Step Judge Walkthrough Script

Follow these 7 sequential testing steps to verify all platform capabilities:

### Step 1: Organizer Hub & Normalization Engine
1. Navigate to [http://localhost:3000/login](http://localhost:3000/login).
2. Click **`[ORGANIZER]`** preset button (or enter `organizer@dogfood.local` / `Dogfood2026!`) and sign in.
3. You are redirected to the **Organizer Command Hub** ([/dashboard/organizer/dogfood-2026](http://localhost:3000/dashboard/organizer/dogfood-2026)).
4. Inspect the **4-column stat-strip**:
   - `TOTAL SUBMITTED PROJECTS: 6`
   - `ENLISTED JURY MEMBERS: 4`
   - `COMPLETION RATE: ~93%` (due to PulseMesh waiting for Judge Harsh).
5. Click the **"JURY ASSIGNMENT ENGINE"** tab:
   - Notice the deterministic Mulberry32 assignment controls and cross-judge workload breakdown.
6. Click the **"BAYESIAN NORMALIZATION"** tab:
   - Click **"RE-CALCULATE NORMALIZATION"**.
   - Notice how Judge Harsh's lower mean and Judge Lenient's higher mean are normalized into standardized z-scores with prior variance shrinkage.
7. Click **"PUBLISH OFFICIAL RESULTS"** in the top right to verify publishing works.

---

### Step 2: Live Judge Scoring Flow (Unscored Project)
1. In the top right command bar, click the **Disconnect (Logout)** icon.
2. Go to [http://localhost:3000/login](http://localhost:3000/login).
3. Click **`[JUDGE // ACTIVE]`** preset button (or enter `judge.harsh@dogfood.local` / `Dogfood2026!`).
4. Click **`JURY QUEUE`** in the top command bar ([/dashboard/judge/dogfood-2026](http://localhost:3000/dashboard/judge/dogfood-2026)).
5. You will see your queue with **1 Pending Evaluation**:
   - Locate **"PulseMesh: Decentralized Vital Signs Triage"**. Notice the amber badge `PENDING EVALUATION`.
6. Click **"EVALUATE PROJECT"** (or open [PulseMesh Evaluation](http://localhost:3000/evaluate/dogfood-2026/b1be96e4-0a80-4227-9798-fd789aa9d8a4)).
7. You are now on the **Judge Scoring Screen**:
   - Read the problem statement, solution description, and stack badges.
   - Adjust the 4 interactive rubric sliders (*Technical Depth 30%*, *Innovation 30%*, *Impact 20%*, *UX 20%*).
   - Observe the **real-time calculated weighted total** updating in monospace tracking.
   - Enter private qualitative feedback in the feedback box (e.g., *"Tested via judge live walkthrough: clean BLE mesh protocol"*).
   - Click **"SUBMIT OFFICIAL EVALUATION"**.
8. Notice the success confirmation: PulseMesh is now marked as `EVALUATED`, and your queue shows `5 OF 5 COMPLETED`.

---

### Step 3: Try to Break It as a Judge (Access Control & COI Defense)
1. **Unassigned Project Tampering Test**:
   - While still logged in as `judge.harsh`, note that Project 3 (*KubeFlow CLI*, ID: `c8d23824-51bb-488e-b018-d8fa1c472f9a`) was assigned to Balanced, Specialist, and Lenient—**NOT Harsh**.
   - Manually type the URL in your browser:
     [http://localhost:3000/evaluate/dogfood-2026/c8d23824-51bb-488e-b018-d8fa1c472f9a](http://localhost:3000/evaluate/dogfood-2026/c8d23824-51bb-488e-b018-d8fa1c472f9a)
   - **Expected Result**: The platform rejects the attempt with **`403 Forbidden`** (*"You are not assigned to evaluate this project"*).
2. **Conflict of Interest (COI) Self-Evaluation Blocking**:
   - Logout and sign in as `judge.specialist@dogfood.local` / `Dogfood2026!`.
   - Recall that Sam Specialist is an active member of *Synthetix Audio* (*SonicForge*, ID: `d0adc174-d0a8-4fd6-9609-4274f86d42d0`).
   - Attempt to evaluate your own project by visiting:
     [http://localhost:3000/evaluate/dogfood-2026/d0adc174-d0a8-4fd6-9609-4274f86d42d0](http://localhost:3000/evaluate/dogfood-2026/d0adc174-d0a8-4fd6-9609-4274f86d42d0)
   - **Expected Result**: Blocked with **`403 Forbidden`** (*"Conflict of Interest: You cannot evaluate your own project submission"*).

---

### Step 4: Participant Team Hub & Draft Privacy Verification
1. Logout and sign in as `alice@dogfood.local` / `Dogfood2026!`.
2. Click **`TEAM HUB`** in the command bar ([/dashboard/team/dogfood-2026](http://localhost:3000/dashboard/team/dogfood-2026)):
   - View *Neural Nexus*, project submission status, team invite codes (`NEXUS1`), and repository links.
3. Open the public project gallery: [http://localhost:3000/gallery/dogfood-2026](http://localhost:3000/gallery/dogfood-2026):
   - You will see the 6 submitted projects (*Aegis AI*, *HyperGraph*, *KubeFlow*, *VerdantSense*, *PulseMesh*, *SonicForge*).
   - Notice that Zack's draft project *GhostProtocol* is **nowhere to be found**.
4. Attempt to access the draft project directly by ID:
   [http://localhost:3000/project/62fc59b1-8c41-4276-81d1-347d348f3f9d](http://localhost:3000/project/62fc59b1-8c41-4276-81d1-347d348f3f9d)
   - **Expected Result**: Blocked / 404. Draft privacy holds.

---

### Step 5: Public Verified Results & Leaderboard (Unauthenticated)
1. Logout so you are completely unauthenticated.
2. Navigate directly to [http://localhost:3000/results/dogfood-2026](http://localhost:3000/results/dogfood-2026).
3. Confirm that the public verified standings display:
   - Clear distinction between **RAW SCORE** vs **NORMALIZED SCORE**.
   - Track pills and prize bounty badges.
   - Expandable judge score breakdowns.
   - Prior variance calibration explanation banner.

---

### Step 6: CSV Export (Organizer Only)
1. Log back in as `organizer@dogfood.local` / `Dogfood2026!`.
2. Go to the **Organizer Hub** -> **"CSV EXPORTS & CERTS"** tab ([/dashboard/organizer/dogfood-2026](http://localhost:3000/dashboard/organizer/dogfood-2026)).
3. Click **"EXPORT SUBMISSIONS CSV"** or **"EXPORT NORMALIZED STANDINGS CSV"**.
4. Verify that the CSV file downloads immediately with formatted tabular hackathon data.

---

### Step 7: Audit Trail Verification
1. On the Organizer Hub, click the **"AUDIT LOGS"** tab.
2. Confirm the tamper-evident chronological timeline:
   - `EVENT_STATUS_UPDATED` (Lifecycle advancement)
   - `JUDGES_ASSIGNED_AUTO` (Mulberry32 algorithm run)
   - `EVALUATION_SUBMITTED` (Entries from each judge, including the PulseMesh score you submitted in Step 2!)
   - `RESULTS_PUBLISHED` (Timestamped and signed)
