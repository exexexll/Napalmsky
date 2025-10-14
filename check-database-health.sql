-- Database Health Check for Napalm Sky
-- Run with: railway run psql $DATABASE_URL < check-database-health.sql

\echo '=== NAPALM SKY DATABASE HEALTH CHECK ==='
\echo ''

\echo '1. Tables Exist:'
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
\echo ''

\echo '2. Record Counts:'
SELECT 
  (SELECT COUNT(*) FROM users) as total_users,
  (SELECT COUNT(*) FROM sessions WHERE expires_at > NOW()) as active_sessions,
  (SELECT COUNT(*) FROM chat_history) as total_chats,
  (SELECT COUNT(*) FROM cooldowns WHERE expires_at > NOW()) as active_cooldowns,
  (SELECT COUNT(*) FROM invite_codes WHERE is_active = TRUE) as active_codes,
  (SELECT COUNT(*) FROM reports) as total_reports;
\echo ''

\echo '3. Recent Users (Last 5):'
SELECT name, paid_status, created_at FROM users ORDER BY created_at DESC LIMIT 5;
\echo ''

\echo '4. Active Sessions:'
SELECT session_token, user_id, created_at, expires_at FROM sessions WHERE expires_at > NOW() ORDER BY created_at DESC LIMIT 5;
\echo ''

\echo '5. Recent Calls:'
SELECT partner_name, duration, started_at FROM chat_history ORDER BY started_at DESC LIMIT 5;
\echo ''

\echo '=== HEALTH CHECK COMPLETE ==='
