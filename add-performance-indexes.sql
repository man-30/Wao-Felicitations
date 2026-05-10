-- PHASE 10 Performance Optimization
-- Add indexes for frequently queried columns
-- Date: May 10, 2026
-- Note: Many indexes already exist in schema.prisma, adding only critical missing ones

-- Index for Account lookups by clientId
CREATE INDEX IF NOT EXISTS "Account_clientId_idx" ON "Account"("clientId");

-- Index for Account lookups by type
CREATE INDEX IF NOT EXISTS "Account_type_idx" ON "Account"("type");

-- Index for Transaction lookups by clientId
CREATE INDEX IF NOT EXISTS "Transaction_clientId_idx" ON "Transaction"("clientId");

-- Index for Transaction lookups by status
CREATE INDEX IF NOT EXISTS "Transaction_status_idx" ON "Transaction"("status");

-- Index for Transaction filtering by type
CREATE INDEX IF NOT EXISTS "Transaction_type_idx" ON "Transaction"("type");

-- Index for Transaction date range queries
CREATE INDEX IF NOT EXISTS "Transaction_createdAt_idx" ON "Transaction"("createdAt" DESC);

-- Index for ActionLog sorting by timestamp
CREATE INDEX IF NOT EXISTS "ActionLog_timestamp_idx" ON "ActionLog"("timestamp" DESC);

-- Index for ActionLog filtering by userId
CREATE INDEX IF NOT EXISTS "ActionLog_userId_idx" ON "ActionLog"("userId");

-- Index for ActionLog filtering by action type
CREATE INDEX IF NOT EXISTS "ActionLog_action_idx" ON "ActionLog"("action");

-- Composite index for common transaction queries (status + createdAt)
CREATE INDEX IF NOT EXISTS "Transaction_status_createdAt_idx" ON "Transaction"("status", "createdAt" DESC);

-- Composite index for common account queries (clientId + type)
CREATE INDEX IF NOT EXISTS "Account_clientId_type_idx" ON "Account"("clientId", "type");

-- Analyze tables to update statistics
ANALYZE "Client";
ANALYZE "Account";
ANALYZE "Transaction";
ANALYZE "ActionLog";
ANALYZE "Cotisation";
ANALYZE "User";

-- Success message
SELECT 'Performance indexes created successfully!' AS status;
