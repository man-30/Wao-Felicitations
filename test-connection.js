#!/usr/bin/env node
// Script simple de seed pour tester la connection
import 'dotenv/config'

console.log('🔍 Vérification des variables d\'environnement:')
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Défini' : '❌ Non défini')
console.log('DATABASE_URL_POOLED:', process.env.DATABASE_URL_POOLED ? '✅ Défini' : '❌ Non défini')
console.log()

if (!process.env.DATABASE_URL && !process.env.DATABASE_URL_POOLED) {
  console.error('❌ Aucune variable DATABASE_URL trouvée!')
  console.error('Veuillez vérifier le fichier .env')
  process.exit(1)
}

const url = process.env.DATABASE_URL_POOLED || process.env.DATABASE_URL
console.log('URL utilisée:', url.substring(0, 100) + '...')

// Tester avec pg directement
import pg from 'pg'

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false }
})

try {
  await client.connect()
  console.log('✅ Connexion réussie à Neon!')
  
  const result = await client.query('SELECT NOW()')
  console.log('Heure serveur:', result.rows[0].now)
  
  // Vérifier que les tables existent
  const tables = await client.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' 
    LIMIT 5
  `)
  
  console.log('✅ Tables trouvées:', tables.rows.length)
  tables.rows.forEach(row => {
    console.log('  -', row.table_name)
  })
  
} catch (error) {
  console.error('❌ Erreur:', error.message)
  process.exit(1)
} finally {
  await client.end()
}
