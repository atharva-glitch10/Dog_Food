# DOGFOOD 2026: 5-Minute Demo Script

Start with `docker compose up --build`, open http://localhost:3000. Password for every seeded account: `Dogfood2026!`.
Full walkthrough: [END_TO_END_EVALUATION_GUIDE.md](END_TO_END_EVALUATION_GUIDE.md).

1. **Judge (1 min)**: log in with **Judge (Active)** (`judge.harsh@dogfood.local`) → **Judging Queue** → **Grade Project**
   on *PulseMesh* → move sliders → **Submit Evaluation**.
2. **Organizer (2 min)**: log in with **Organizer** → **Organizer Hub** → **Score Normalization** → **Calculate
   Normalization** (raw vs normalized, per-judge diagnostics) → **Publish Final Results** → **CSV Exports & Certs** →
   **Issue Participant Certificates** → **Webhooks** / **Bulk Import** / **Audit Trail** tabs.
3. **Participant (1 min)**: log in with **Participant** (`alice@dogfood.local`) → **Projects** → **Vote** on another
   team → **Leaderboard** (now published) → **Verify Cert** → **Your certificates** → **Verify**.
4. **API (30 s)**: **API Docs** → Swagger UI with all endpoints; http://localhost:4000/api/health.
5. **Persistence (30 s)**: `docker compose restart backend`, reload: data and session are intact.
