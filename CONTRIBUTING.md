# Contributing to DOGFOOD 2026

Thank you for your interest in contributing to **DOGFOOD 2026**, the open-source, self-hostable hackathon management and judging platform!

---

## 1. Code of Conduct

We are committed to providing a welcoming, inclusive, and harassment-free environment. All contributors are expected to follow the principles outlined in [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

---

## 2. Local Development Setup

### Prerequisites
- Node.js >= 20.x
- Docker and Docker Compose
- PostgreSQL 16 (or use Docker container)

### Quick Start
1. Clone repository:
   ```bash
   git clone https://github.com/dogfood-platform/dogfood-2026.git
   cd dogfood-2026
   ```
2. Start the complete stack with Docker Compose:
   ```bash
   docker compose up --build
   ```
3. Alternatively, run backend and frontend natively:
   ```bash
   # Backend
   cd backend
   npm install
   npx prisma generate
   npx prisma db push
   npm run prisma:seed
   npm run dev

   # Frontend (in another terminal)
   cd frontend
   npm install
   npm run dev
   ```

---

## 3. Running Automated Tests

Before submitting pull requests, ensure all unit, security, and integration test suites pass:
```bash
cd backend
npm test
```

Frontend build check:
```bash
cd frontend
npm run build
```

---

## 4. Pull Request Guidelines

1. Fork the repo and create your feature branch: `git checkout -b feature/amazing-feature`.
2. Ensure consistent TypeScript strict typing and Zod schema validations.
3. Add unit or integration tests in `backend/tests/` for new functionality.
4. Update relevant documentation (`API-SPEC.md`, `ARCHITECTURE.md`, or `JUDGING.md`).
5. Open a Pull Request with a clear summary of changes and verification evidence.

---

## 5. Security Vulnerabilities

If you discover a security vulnerability, please do NOT create a public issue. Follow the disclosure process in [SECURITY.md](SECURITY.md).
