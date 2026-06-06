import fetch from 'node-fetch'

async function testEndpoint() {
  console.log('\n=== Test: GET /api/clients/me ===\n')
  
  try {
    // Test 1: Sans token (doit retourner 401)
    console.log('Test 1: Requête SANS token')
    const res1 = await fetch('https://wao-felicitations-api.fly.dev/api/clients/me', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    })
    console.log(`  Status: ${res1.status}`)
    if (res1.status === 404) {
      console.log('  ❌ ERREUR 404: Endpoint /api/clients/me n\'existe pas!')
      console.log('  Le code déployé n\'a pas le nouvel endpoint')
    } else if (res1.status === 401) {
      console.log('  ✅ Status 401 (attendu - besoin d\'authentification)')
      console.log('  ✅ L\'endpoint existe et est protégé')
    } else {
      console.log(`  ⚠️  Status inattendu: ${res1.status}`)
    }
    
    // Test 2: Avec un token invalide
    console.log('\nTest 2: Requête avec token invalide')
    const res2 = await fetch('https://wao-felicitations-api.fly.dev/api/clients/me', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer invalid_token_xxx'
      }
    })
    console.log(`  Status: ${res2.status}`)
    if (res2.status === 403) {
      console.log('  ✅ Status 403 (attendu - token invalide)')
      console.log('  ✅ L\'endpoint existe et valide le token')
    } else if (res2.status === 404) {
      console.log('  ❌ ERREUR 404: Endpoint /api/clients/me n\'existe pas!')
    }
    
  } catch (error) {
    console.error('❌ ERREUR:', error)
  }
}

testEndpoint()
