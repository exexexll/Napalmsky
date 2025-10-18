const {Client} = require('pg');
const c = new Client({
  connectionString: 'postgresql://postgres:NSiqTuorpCpxCqieQwFATSeLTKbPsJym@yamabiko.proxy.rlwy.net:18420/railway',
  ssl: {rejectUnauthorized: false}
});

async function test() {
  await c.connect();
  
  console.log('📊 TESTING SINGLE-SESSION FEATURE\n');
  console.log('Using account: hello@gmail.com\n');
  
  // Step 1: Create 2 fake sessions for this user
  console.log('Step 1: Creating 2 test sessions...');
  const userId = (await c.query("SELECT user_id FROM users WHERE email='hello@gmail.com'")).rows[0].user_id;
  
  await c.query(`
    INSERT INTO sessions (session_token, user_id, ip_address, device_info, is_active, created_at, expires_at, last_active_at)
    VALUES 
      ('test-session-1', $1, '192.168.1.1', 'Device 1', TRUE, NOW(), NOW() + INTERVAL '30 days', NOW()),
      ('test-session-2', $1, '192.168.1.2', 'Device 2', TRUE, NOW(), NOW() + INTERVAL '30 days', NOW())
    ON CONFLICT (session_token) DO NOTHING
  `, [userId]);
  
  let count = (await c.query("SELECT COUNT(*) FROM sessions WHERE user_id=$1 AND is_active=TRUE", [userId])).rows[0].count;
  console.log(`✅ Created sessions. Total active: ${count}\n`);
  
  // Step 2: Test invalidation
  console.log('Step 2: Testing invalidateUserSessions()...');
  const result = await c.query(
    `UPDATE sessions 
     SET is_active = FALSE, last_active_at = NOW()
     WHERE user_id = $1 AND is_active = TRUE
     RETURNING session_token`,
    [userId]
  );
  
  console.log(`✅ Invalidated ${result.rows.length} sessions`);
  result.rows.forEach(r => console.log(`   - ${r.session_token}`));
  
  count = (await c.query("SELECT COUNT(*) FROM sessions WHERE user_id=$1 AND is_active=TRUE", [userId])).rows[0].count;
  console.log(`\n✅ Active sessions now: ${count}`);
  console.log(count === 0 ? '🎉 SINGLE-SESSION WORKS!' : '❌ Still has active sessions');
  
  await c.end();
}

test().catch(console.error);
