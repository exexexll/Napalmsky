// Test if new security features are working
const { Client } = require('pg');

const DATABASE_URL = 'postgresql://postgres:NSiqTuorpCpxCqieQwFATSeLTKbPsJym@yamabiko.proxy.rlwy.net:18420/railway';

async function testFeatures() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔍 Testing Security Features...\n');

    // Test 1: Check if new sessions have device_info
    console.log('1️⃣ Testing Single-Session Enforcement:');
    const sessionTest = await client.query(`
      SELECT device_info, is_active 
      FROM sessions 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      LIMIT 5
    `);
    
    const hasDeviceInfo = sessionTest.rows.some(r => r.device_info !== null);
    console.log(hasDeviceInfo 
      ? '   ✅ New sessions have device_info (feature is working!)' 
      : '   ❌ device_info is NULL (server needs redeploy)');

    // Test 2: Check if any grace period users exist
    console.log('\n2️⃣ Testing QR Grace Period:');
    const gracePeriodTest = await client.query(`
      SELECT name, paid_status, successful_sessions, qr_unlocked
      FROM users
      WHERE paid_status = 'qr_grace_period'
      LIMIT 5
    `);
    
    console.log(`   Found ${gracePeriodTest.rows.length} users in grace period`);
    if (gracePeriodTest.rows.length > 0) {
      gracePeriodTest.rows.forEach(u => {
        console.log(`   - ${u.name}: ${u.successful_sessions}/4 sessions, QR: ${u.qr_unlocked ? 'unlocked' : 'locked'}`);
      });
    } else {
      console.log('   ⚠️  No grace period users yet (try creating account with invite code)');
    }

    // Test 3: Check session completions tracking
    console.log('\n3️⃣ Testing Session Completion Tracking:');
    const completionsTest = await client.query(`
      SELECT COUNT(*) as count FROM session_completions
    `);
    
    const completionCount = completionsTest.rows[0].count;
    console.log(completionCount > 0
      ? `   ✅ ${completionCount} completions tracked (feature is working!)`
      : '   ⚠️  0 completions (feature will work after next video call)');

    // Test 4: Check if server code is updated
    console.log('\n4️⃣ Server Deployment Status:');
    const recentSessions = await client.query(`
      SELECT 
        COUNT(*) FILTER (WHERE device_info IS NOT NULL) as with_device,
        COUNT(*) as total
      FROM sessions
      WHERE created_at > NOW() - INTERVAL '24 hours'
    `);
    
    const stats = recentSessions.rows[0];
    if (stats.with_device > 0) {
      console.log(`   ✅ Server is running NEW code (${stats.with_device}/${stats.total} sessions have device_info)`);
    } else if (stats.total > 0) {
      console.log(`   ❌ Server is running OLD code (${stats.total} sessions created, 0 have device_info)`);
      console.log('   📝 ACTION REQUIRED: Redeploy Railway backend service');
    } else {
      console.log('   ℹ️  No sessions created in last 24 hours');
    }

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY:');
    console.log('='.repeat(60));
    console.log(hasDeviceInfo 
      ? '✅ Features are WORKING - Server is using new code'
      : '❌ Features NOT working - Server needs REDEPLOY');
    console.log('');

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

testFeatures();

