import pg from 'pg'
import 'dotenv/config'

const { Client } = pg

async function main() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL
  })

  try {
    await client.connect()
    console.log('--- Database Counts ---')
    
    const queries = [
      'SELECT count(*) FROM "User"',
      'SELECT count(*) FROM "Client"',
      'SELECT count(*) FROM "Transaction"',
      'SELECT count(*) FROM "Account"',
      'SELECT count(*) FROM "TontineAccount"'
    ]

    for (const q of queries) {
      const res = await client.query(q)
      console.log(`${q}: ${res.rows[0].count}`)
    }

    const adminQuery = 'SELECT name, email, role FROM "User" WHERE role = \'admin\' LIMIT 1'
    const adminRes = await client.query(adminQuery)
    if (adminRes.rows.length > 0) {
      console.log('Admin user found:', adminRes.rows[0])
    } else {
      console.log('No admin user found!')
    }

  } catch (err) {
    console.error('Error connecting to DB:', err)
  } finally {
    await client.end()
  }
}

main()
