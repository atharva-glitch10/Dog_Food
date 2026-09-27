# DOGFOOD 2026: End-to-End Evaluation Guide

A role-by-role walkthrough of the platform on a fresh install. Every step uses the web UI at
**http://localhost:3000** unless it says otherwise. The shorter version is [DEMO-SCRIPT.md](DEMO-SCRIPT.md).

## 0. Start from a clean state

```bash
docker compose down -v        # only if you ran it before and want the original demo data back
docker compose up --build
```

Wait until `docker compose ps` shows the backend as `healthy` (first build takes a few minutes). All seeded
accounts use the password **`Dogfood2026!`**. The login page has one-click buttons for the organizer, the harsh judge,
the admin and a participant; to switch roles use the logout icon in the top bar.

What the seed contains (event slug `dogfood-2026`, status `JUDGING_ACTIVE`, results not published):

| Project | Team (members) | Status | Judges assigned (✓ = scored) |
|---|---|---|---|
| Aegis AI | Neural Nexus (`alice`, `bob`) | submitted | harsh ✓, lenient ✓, balanced ✓ |
| HyperGraph | Quantum Leap (`carol`, `dave`) | submitted | harsh ✓, lenient ✓, specialist ✓ |
| KubeFlow CLI | DevCraft (`eve`) | submitted | lenient ✓, balanced ✓, specialist ✓ |
| VerdantSense | TerraGuardians (`frank`) | submitted | harsh ✓, balanced ✓, specialist ✓ |
| PulseMesh | PulseWave Health (`grace`) | submitted | lenient ✓, balanced ✓, **harsh (pending)** |
| SonicForge | Synthetix Audio (`liam`, `judge.specialist`) | submitted | harsh ✓, lenient ✓ (specialist excluded: own team) |
| GhostProtocol | StealthSec (`zack`) | **draft** | none (drafts are never assigned) |

All emails are `<name>@dogfood.local`.

## 1. Participant: register, form a team, submit

1. Click **Register** (top right), enter a name, email and password (8+ characters) and create the account. New
   accounts are always participants.
2. Click **Team Hub**. Under **Create New Team**, enter a team name and click **Create Team**. The page now shows your
   team and its **invite code**.
3. Click **Create Project Submission**, fill in title, problem statement, solution (10+ characters each), optional
   links (must start with `http://` or `https://`) and click **Save Draft Project**.
4. Back in the Team Hub, click **Submit Project (Before Deadline)**. The project appears under **Projects** (the
   public gallery).
5. Optional: register a second account, open **Team Hub**, and join with the invite code under **Join Existing
   Team**.

Server-side rules to try (each returns a clear error): submitting after the deadline, creating a second team in the
same event, or submitting with a link like `javascript:alert(1)`.

## 2. Participant: gallery, voting, draft privacy

1. Log in as `alice@dogfood.local`. **Team Hub** shows *Neural Nexus* and its submitted project.
2. Open **Projects**. Search by keyword or filter by track. *GhostProtocol* (Zack's draft) is not listed.
3. Click **Vote** on another team's project. Voting on your own project is refused, voting twice for the same
   project is refused, and each account has 3 votes in this event.
4. Open a draft directly: while logged in as `zack@dogfood.local`, open *GhostProtocol* from his Team Hub
   (**View Public Project Page** is only offered after submission; the project URL is `/project/<id>`). Copy that URL,
   log in as `alice`, and open it: the API returns **403** and the page does not show the draft.
5. **Leaderboard** shows **Results Pending Publication** because results are not published yet.

## 3. Judge: score the pending project

1. Log in as `judge.harsh@dogfood.local` (one-click button **Judge (Active)**) and click **Judging Queue**. Four
   projects are scored; *PulseMesh* shows **Pending Evaluation**.
2. Click **Grade Project** on *PulseMesh*. Move the rubric sliders; the weighted total updates live. Optionally add
   feedback, then click **Submit Evaluation**. The queue now shows all five as completed. **Update Evaluation**
   lets a judge revise a score until the judging deadline (each revision is audit-logged).
3. Access control: a judge can only open projects assigned to them. Copy the URL of a project the harsh judge is not
   assigned to (e.g. *KubeFlow CLI* from **Projects**, `/project/<id>`), then open
   `/evaluate/dogfood-2026/<id>`: the page reports that the project is not in your queue (API: `403 NOT_ASSIGNED`).
4. Conflict of interest: log in as `judge.specialist@dogfood.local`. Their queue has three projects and never
   *SonicForge*, their own team's project.
5. Click **Bradley-Terry Pairwise Mode** to compare two random projects (**Select Project A as Winner**, **Select
   Project B as Winner** or **Declare Exact Tie**). Rankings from these comparisons are computed via the API
   (`POST /api/events/{id}/pairwise/compute`, see Swagger).

## 4. Organizer: normalize, publish, export, certificates

Log in as `organizer@dogfood.local` and click **Organizer Hub**.

1. **Overview & Stats**: 6 submitted projects, 4 judges, evaluations completed vs assigned.
2. **Score Normalization** → **Calculate Normalization**. The table shows each project's raw average vs normalized
   score and final rank, and per-judge diagnostics (mean, standard deviation, whether Bayesian shrinkage was applied).
   The harsh judge's low scores and the lenient judge's high scores no longer decide the ranking.
3. **Jury Assignment** (optional): **Run Auto Assignment Engine** re-runs the deterministic assignment with the given
   seed. It **replaces** existing assignments, so use it after new projects are submitted (for example the one from
   step 1); the same seed and data always give the same assignment.
4. **Publish Final Results** (top right) and confirm. **Leaderboard** is now visible to everyone, including logged-out
   visitors.
5. **CSV Exports & Certs**: download participants, teams, projects, scores or results as CSV. Then click **Issue
   Participant Certificates** (or Judge / Winner (Top 3)). A message shows how many were issued.
6. **Webhooks**: enter an `https://` URL you control (e.g. a request-bin), tick event types such as
   `RESULTS_PUBLISHED`, and click **Create Webhook**. The signing secret is shown once. Deliveries (with HTTP status)
   appear in the list after matching actions; private or loopback URLs such as `http://127.0.0.1/...` are rejected.
7. **Bulk Import**: choose a CSV with header `name,email,role,password` (role and password optional). The dry run lists
   each row as valid, skipped (existing or duplicate email) or error (e.g. invalid email, `ADMIN` role) before anything
   is written; **Import N users** creates them, and **Download ... temporary passwords** gives the generated
   passwords for rows without one.
8. **Audit Trail**: every successful action above (assignment, evaluation, normalization, publication, exports,
   certificates, webhooks, import) with actor, time and client IP. Passwords and secrets are redacted.

## 5. Certificates and public pages

1. Log in as a participant who received a certificate (e.g. `alice@dogfood.local`) and click **Verify Cert**. **Your
   certificates** lists each certificate and its code; click **Verify** to check its HMAC signature.
2. Logged out, paste a code into **Verify Cert** to verify it publicly. An unknown code is rejected; an altered
   certificate record would show a signature-mismatch warning.
3. **Leaderboard** (logged out) shows the published ranking with raw and normalized scores.
4. The embeddable gallery widget is at http://localhost:3000/embed/gallery/dogfood-2026.

## 6. Admin and API

1. `admin@dogfood.local` can do everything an organizer can. Role changes and user deactivation are API-only:
   `PATCH /api/users/{userId}/role`, `PATCH /api/users/{userId}/toggle-active`.
2. **API Docs** → Swagger UI (http://localhost:3000/api/docs) lists all 70 operations with required roles and
   request bodies. Log in through the web UI first; Swagger requests then use the session cookie.
3. `GET http://localhost:4000/api/health` returns `{"status":"healthy",...}`.

## 7. Persistence check

```bash
docker compose restart backend
```

Everything created above (accounts, teams, scores, votes, certificates, webhooks) is still there, and you stay
logged in: the seed is skipped on non-empty databases and the generated secrets live in a volume.
