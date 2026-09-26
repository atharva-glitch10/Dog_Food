# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |

---

## Reporting a Vulnerability

We take the security of DOGFOOD 2026 very seriously. If you suspect you have found a security vulnerability, please follow responsible disclosure guidelines:

1. **Do not open a public GitHub issue.**
2. Send a detailed report to `security@dogfood.local` or contact the core maintainers privately.
3. Include:
   - Type of vulnerability (e.g. XSS, CSRF, SSRF, IDOR, Privilege Escalation, SQLi).
   - Step-by-step reproduction instructions or proof-of-concept.
   - Affected endpoints or files.
   - Potential impact assessment.
4. Maintainers will acknowledge receipt within 48 hours and provide a remediation timeline.

---

## Security Architecture & Defenses in DOGFOOD 2026

- **Authentication**: bcrypt password hashing (12 rounds), HTTP-only SameSite cookies, JWT sessions with unique `jti` nonces.
- **Role Isolation**: Strict server-side RBAC middleware (`ADMIN`, `ORGANIZER`, `JUDGE`, `PARTICIPANT`).
- **Judging Integrity**: Conflict of Interest (COI) prevention blocking judges from evaluating or comparing their own projects.
- **Voting Anti-Abuse**: Duplicate vote prevention, self-voting blocks, and sliding-window rate limiters.
- **SSRF Protection**: Strict URL parser rejecting private/loopback IP ranges and cloud metadata services.
- **File Upload Security**: Random hashed filenames, strict MIME-type allowlists, and 10MB size limits.
- **Data Protection**: Parameterized queries via Prisma ORM preventing SQL injection.
