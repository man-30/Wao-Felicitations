import { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";

// Load environment files
const envPath = path.join(process.cwd(), ".env.backend");
const envProdPath = path.join(process.cwd(), ".env.production");

console.log("🔍 Testing Neon Database Connections...\n");

async function testConnection(envFile: string, label: string) {
  console.log(`📌 Testing ${label} (${envFile}):`);
  
  try {
    // Read the env file
    const envContent = fs.readFileSync(envFile, "utf-8");
    const dbUrlMatch = envContent.match(/DATABASE_URL="([^"]+)"/);
    
    if (!dbUrlMatch) {
      console.log(`❌ DATABASE_URL not found in ${envFile}\n`);
      return;
    }
    
    const databaseUrl = dbUrlMatch[1];
    console.log(`   URL: ${databaseUrl.substring(0, 80)}...`);
    
    // Create Prisma client
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl,
        },
      },
    });
    
    // Test connection with timeout
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Connection timeout (10s)")), 10000)
    );
    
    const queryPromise = prisma.$queryRaw`SELECT 1`;
    
    await Promise.race([queryPromise, timeoutPromise]);
    
    console.log(`✅ Connection successful!\n`);
    
    // Get database stats
    const userCount = await prisma.user.count();
    const clientCount = await prisma.client.count();
    const txCount = await prisma.transaction.count();
    
    console.log(`   Stats:`);
    console.log(`   - Users: ${userCount}`);
    console.log(`   - Clients: ${clientCount}`);
    console.log(`   - Transactions: ${txCount}\n`);
    
    await prisma.$disconnect();
  } catch (error: any) {
    console.log(`❌ Connection failed: ${error.message}`);
    
    // Parse error for common issues
    if (error.message.includes("ENOTFOUND")) {
      console.log(`   → Host not found - check credentials URL`);
    } else if (error.message.includes("ECONNREFUSED")) {
      console.log(`   → Connection refused - Neon server may be offline`);
    } else if (error.message.includes("password authentication failed")) {
      console.log(`   → Authentication failed - credentials are EXPIRED or INVALID`);
    } else if (error.message.includes("timeout")) {
      console.log(`   → Timeout - network issue or server overload`);
    }
    console.log();
  }
}

(async () => {
  await testConnection(envPath, "DEVELOPMENT (Staging branch)");
  await testConnection(envProdPath, "PRODUCTION (Main branch)");
  
  console.log("✅ Test completed!");
})();
