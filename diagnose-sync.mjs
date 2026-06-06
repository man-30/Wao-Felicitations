// Diagnose Commercial Sync Issue in Production
// Tests the full chain: login -> JWT -> /api/clients/me -> data

const API_URL = 'https://wao-felicitations-api.fly.dev';

async function diagnose() {
  console.log('\n=== DIAGNOSTIC SYNCHRONISATION COMMERCIAL ===\n');
  
  // Step 1: Login as commercial
  console.log('1. Login as commercial...');
  const loginRes = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'pitala.hodabalo@waooo.com',
      password: 'Commercial2026!'
    })
  });
  
  if (!loginRes.ok) {
    const errText = await loginRes.text();
    console.log(`   ❌ Login failed: ${loginRes.status} - ${errText}`);
    
    // Try alternative emails
    console.log('\n   Trying alternative email formats...');
    for (const email of [
      'pitala.hodabalo@waoo.com',
      'pitala.hodabalo@waooof.com',
      'commercial@waoo.com',
      'commercial@waooof.com'
    ]) {
      const r = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'Commercial2026!' })
      });
      console.log(`   ${email}: ${r.status}`);
    }
    return;
  }
  
  const { token, user } = await loginRes.json();
  console.log(`   ✅ Logged in as: ${user.name} (${user.email})`);
  console.log(`   User ID: ${user.id}`);
  console.log(`   Role: ${user.role}`);
  console.log(`   Token prefix: ${token.substring(0, 30)}...`);
  
  // Step 2: Decode JWT
  console.log('\n2. JWT Payload:');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
  console.log('  ', JSON.stringify(payload, null, 2));
  
  // Step 3: Call /api/clients/me
  console.log('\n3. Calling /api/clients/me...');
  const meRes = await fetch(`${API_URL}/api/clients/me`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  console.log(`   Status: ${meRes.status}`);
  
  if (meRes.ok) {
    const clients = await meRes.json();
    console.log(`   ✅ Clients assignés: ${clients.length}`);
    if (clients.length > 0) {
      clients.slice(0, 5).forEach(c => {
        console.log(`     - ${c.name} (${c.membershipCode}) → assignedCommercialId: ${c.assignedCommercialId}`);
      });
    } else {
      console.log('   ⚠️ AUCUN CLIENT retourné par /api/clients/me');
    }
  } else {
    const errText = await meRes.text();
    console.log(`   ❌ Error: ${errText}`);
  }
  
  // Step 4: Call /api/clients (all) - to verify clients exist and compare
  console.log('\n4. Calling /api/clients (all clients)...');
  const allRes = await fetch(`${API_URL}/api/clients`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (allRes.ok) {
    const allClients = await allRes.json();
    console.log(`   Total clients in DB: ${allClients.length}`);
    
    // Filter by current user's ID
    const myClients = allClients.filter(c => c.assignedCommercialId === user.id);
    console.log(`   Clients with assignedCommercialId === "${user.id}": ${myClients.length}`);
    
    if (myClients.length > 0 && myClients.length !== 0) {
      console.log(`   ✅ Found ${myClients.length} clients assigned to this commercial:`);
      myClients.slice(0, 5).forEach(c => {
        console.log(`     - ${c.name} (${c.membershipCode})`);
      });
    }
    
    // Show distribution of assignedCommercialId values
    console.log('\n5. Distribution of assignedCommercialId values:');
    const distribution = {};
    allClients.forEach(c => {
      const id = c.assignedCommercialId || 'NULL';
      distribution[id] = (distribution[id] || 0) + 1;
    });
    
    for (const [id, count] of Object.entries(distribution)) {
      const match = id === user.id ? ' ← THIS COMMERCIAL' : '';
      console.log(`   "${id}": ${count} clients${match}`);
    }
  } else {
    console.log(`   ❌ Error: ${allRes.status}`);
  }
  
  // Step 5: Get list of all users to find commercial IDs
  console.log('\n6. All users in system:');
  const usersRes = await fetch(`${API_URL}/api/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (usersRes.ok) {
    const users = await usersRes.json();
    const commercials = users.filter(u => u.role === 'commercial');
    console.log(`   Commerciaux: ${commercials.length}`);
    commercials.forEach(c => {
      const isMe = c.id === user.id ? ' ← YOU' : '';
      console.log(`   - ${c.name} (${c.email}) → id: ${c.id}${isMe}`);
    });
  }
}

diagnose().catch(err => {
  console.error('❌ FATAL ERROR:', err.message);
  console.error(err.stack);
});
