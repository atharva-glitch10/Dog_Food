-- Anonymous votes have userId = NULL, and PostgreSQL treats NULLs as distinct,
-- so @@unique([eventId, userId, projectId]) does not stop an anonymous voter
-- from voting for the same project twice. This partial unique index does.
-- (Prisma schema cannot express partial indexes; it is managed here only.)
CREATE UNIQUE INDEX "votes_anonymous_event_ip_project_key"
  ON "votes" ("eventId", "ipAddress", "projectId")
  WHERE "userId" IS NULL;
