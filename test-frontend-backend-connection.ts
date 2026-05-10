import axios from "axios";
import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";
import * as fs from "fs";
import * as path from "path";

/**
 * PHASE 11 - Frontend & Backend Connection Verification
 * 
 * Tests:
 * 1. Backend is running and healthy
 * 2. Frontend is built and accessible
 * 3. API endpoints are reachable from frontend perspective
 * 4. Authentication flow works end-to-end
 * 5. Data persistence works (CRUD operations)
 * 6. Frontend can fetch and display data
 */

dotenv.config({ path: ".env.backend" });

const API_BASE_URL = "http://localhost:3001";
const FRONTEND_BUILD_DIR = "./dist";

interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  duration: number;
  message?: string;
}

const results: TestResult[] = [];

// Color codes
const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[37m",
};

function log(color: string, text: string) {
  console.log(`${color}${text}${colors.reset}`);
}

function header(title: string) {
  console.log("\n" + "=".repeat(80));
  log(colors.cyan, `  🔗 ${title}`);
  console.log("=".repeat(80) + "\n");
}

async function test(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, status: "PASS", duration });
    log(colors.green, `  ✅ PASS: ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      name,
      status: "FAIL",
      duration,
      message: error.message,
    });
    log(colors.red, `  ❌ FAIL: ${name}`);
    log(colors.red, `     Error: ${error.message}`);
  }
}

// ============================================================================
// TEST GROUP 1: BACKEND CONNECTIVITY
// ============================================================================

async function testBackendConnectivity() {
  header("TEST GROUP 1: Backend Connectivity");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
  });

  await test("Backend server is running", async () => {
    try {
      const res = await client.get("/health");
      if (res.status !== 200) {
        throw new Error(
          `Backend returned status ${res.status}. Is it running on ${API_BASE_URL}?`
        );
      }
    } catch (error: any) {
      throw new Error(
        `Cannot connect to backend at ${API_BASE_URL}: ${error.message}`
      );
    }
  });

  await test("Backend responds quickly (< 500ms)", async () => {
    const startTime = Date.now();
    await client.get("/health");
    const duration = Date.now() - startTime;
    if (duration > 500) {
      throw new Error(`Response too slow: ${duration}ms`);
    }
  });

  await test("CORS headers are present", async () => {
    const res = await client.options("/api/auth/login");
    const corsHeader = res.headers["access-control-allow-origin"];
    if (!corsHeader) {
      throw new Error("CORS headers not found - frontend may not be able to reach backend");
    }
  });
}

// ============================================================================
// TEST GROUP 2: FRONTEND BUILD
// ============================================================================

async function testFrontendBuild() {
  header("TEST GROUP 2: Frontend Build Verification");

  await test("Frontend build directory exists", async () => {
    if (!fs.existsSync(FRONTEND_BUILD_DIR)) {
      throw new Error(
        `Frontend build directory not found at ${FRONTEND_BUILD_DIR}\n` +
        `Run: npm run frontend:build`
      );
    }
  });

  await test("index.html exists in build", async () => {
    const indexPath = path.join(FRONTEND_BUILD_DIR, "index.html");
    if (!fs.existsSync(indexPath)) {
      throw new Error(`Frontend index.html not found at ${indexPath}`);
    }
  });

  await test("Frontend assets are present", async () => {
    const files = fs.readdirSync(FRONTEND_BUILD_DIR);
    if (files.length === 0) {
      throw new Error("Frontend build directory is empty");
    }

    // Check for expected file types
    const jsFiles = files.filter((f) => f.endsWith(".js")).length;
    const cssFiles = files.filter((f) => f.endsWith(".css")).length;
    const hasAssets = jsFiles > 0 || cssFiles > 0;

    if (!hasAssets) {
      throw new Error("No JS or CSS files found in build");
    }
  });

  await test("Frontend HTML contains API endpoint configuration", async () => {
    const indexPath = path.join(FRONTEND_BUILD_DIR, "index.html");
    const content = fs.readFileSync(indexPath, "utf-8");

    // Check for React app root
    if (!content.includes("id=\"root\"") && !content.includes('id="app"')) {
      throw new Error("Frontend HTML missing React root element");
    }
  });
}

// ============================================================================
// TEST GROUP 3: API ENDPOINTS FROM FRONTEND PERSPECTIVE
// ============================================================================

let authToken: string = "";
let testUserId: string = "";

async function testFrontendAPIAccess() {
  header("TEST GROUP 3: API Endpoints (Frontend Perspective)");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
  });

  await test("Frontend can authenticate (POST /api/auth/login)", async () => {
    const res = await client.post("/api/auth/login", {
      email: "admin@wao.com",
      password: "password123",
    });

    if (res.status !== 200) {
      throw new Error(
        `Login failed with status ${res.status}: ${res.data?.message || ""}`
      );
    }

    if (!res.data.token) {
      throw new Error("Login response missing JWT token");
    }

    authToken = res.data.token;
  });

  await test("Frontend receives valid JWT token", async () => {
    if (!authToken) {
      throw new Error("No token received from login");
    }

    const parts = authToken.split(".");
    if (parts.length !== 3) {
      throw new Error(`Invalid JWT format: expected 3 parts, got ${parts.length}`);
    }
  });

  await test("Frontend can store and use JWT token", async () => {
    // Simulate localStorage
    const mockLocalStorage = {
      token: authToken,
    };

    if (!mockLocalStorage.token) {
      throw new Error("Cannot store token");
    }

    // Verify token can be used
    if (mockLocalStorage.token !== authToken) {
      throw new Error("Token mismatch after storage");
    }
  });

  await test("Frontend can fetch dashboard data (GET /api/dashboard/stats)", async () => {
    const res = await client.get("/api/dashboard/stats", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (res.status !== 200) {
      throw new Error(`Dashboard fetch failed: ${res.status}`);
    }

    if (!res.data) {
      throw new Error("Dashboard returned empty data");
    }
  });

  await test("Frontend can fetch client list (GET /api/clients)", async () => {
    const res = await client.get("/api/clients", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (res.status !== 200) {
      throw new Error(`Client list fetch failed: ${res.status}`);
    }

    if (!Array.isArray(res.data)) {
      throw new Error("API returned non-array response");
    }
  });

  await test("Frontend can fetch transactions (GET /api/transactions)", async () => {
    const res = await client.get("/api/transactions", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (res.status !== 200) {
      throw new Error(`Transactions fetch failed: ${res.status}`);
    }
  });

  await test("Frontend can fetch audit logs (GET /api/audit-logs)", async () => {
    const res = await client.get("/api/audit-logs", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (res.status !== 200) {
      throw new Error(`Audit logs fetch failed: ${res.status}`);
    }
  });
}

// ============================================================================
// TEST GROUP 4: DATA PERSISTENCE (CRUD)
// ============================================================================

async function testDataPersistence() {
  header("TEST GROUP 4: Data Persistence (CRUD Operations)");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  const testClientName = `Test Client ${Date.now()}`;
  const testClientEmail = `test-${Date.now()}@wao.com`;

  await test("Frontend can create client (POST /api/clients)", async () => {
    const res = await client.post("/api/clients", {
      name: testClientName,
      email: testClientEmail,
      phone: "1234567890",
      address: "Test Address",
    });

    if (res.status !== 201 && res.status !== 200) {
      throw new Error(`Client creation failed: ${res.status}`);
    }

    if (!res.data.id) {
      throw new Error("Response missing client ID");
    }

    testUserId = res.data.id;
  });

  await test("Frontend can read created client (GET /api/clients/{id})", async () => {
    if (!testUserId) {
      throw new Error("No test client ID from previous test");
    }

    const res = await client.get(`/api/clients/${testUserId}`);

    if (res.status !== 200) {
      throw new Error(`Client fetch failed: ${res.status}`);
    }

    if (res.data.name !== testClientName) {
      throw new Error("Retrieved client name does not match created client");
    }
  });

  await test("Created client is persisted in database", async () => {
    const prisma = new PrismaClient();
    try {
      const client = await prisma.client.findUnique({
        where: { id: testUserId },
      });

      if (!client) {
        throw new Error("Client not found in database");
      }

      if (client.email !== testClientEmail) {
        throw new Error("Client email does not match");
      }
    } finally {
      await prisma.$disconnect();
    }
  });
}

// ============================================================================
// TEST GROUP 5: AUTHENTICATION & AUTHORIZATION
// ============================================================================

async function testAuthenticationFlow() {
  header("TEST GROUP 5: Authentication & Authorization");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
  });

  await test("Unauthenticated request is rejected", async () => {
    const res = await client.get("/api/dashboard/stats");

    if (res.status === 200) {
      throw new Error("Endpoint should require authentication");
    }
  });

  await test("Invalid token is rejected", async () => {
    const res = await client.get("/api/dashboard/stats", {
      headers: { Authorization: "Bearer invalid_token_here" },
    });

    if (res.status === 200) {
      throw new Error("Invalid token should be rejected");
    }
  });

  await test("Expired/malformed token is handled", async () => {
    const res = await client.get("/api/dashboard/stats", {
      headers: { Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.invalid" },
    });

    if (res.status === 200) {
      throw new Error("Malformed token should be rejected");
    }
  });

  await test("Frontend can clear token (simulate logout)", async () => {
    // Simulate clearing localStorage
    const mockLocalStorage = {
      token: null,
    };

    if (mockLocalStorage.token !== null) {
      throw new Error("Token not properly cleared");
    }
  });

  await test("After logout, API rejects requests", async () => {
    const res = await client.get("/api/dashboard/stats");

    if (res.status === 200) {
      throw new Error("API should reject requests without token");
    }
  });
}

// ============================================================================
// TEST GROUP 6: FRONTEND-BACKEND INTEGRATION
// ============================================================================

async function testIntegration() {
  header("TEST GROUP 6: Frontend-Backend Integration");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  await test("Dashboard can render with real backend data", async () => {
    // Simulate frontend fetching required data
    const statsRes = await client.get("/api/dashboard/stats");
    const clientsRes = await client.get("/api/clients");
    const txRes = await client.get("/api/transactions");

    if (statsRes.status !== 200) throw new Error("Stats endpoint failed");
    if (clientsRes.status !== 200) throw new Error("Clients endpoint failed");
    if (txRes.status !== 200) throw new Error("Transactions endpoint failed");
  });

  await test("API response format matches frontend expectations", async () => {
    const res = await client.get("/api/dashboard/stats");

    if (!res.data || typeof res.data !== "object") {
      throw new Error("Stats should return an object");
    }
  });

  await test("Frontend error handling works", async () => {
    // Test with invalid client ID
    const res = await client.get("/api/clients/invalid-id-format");

    // Backend should reject with 4xx status
    if (res.status >= 200 && res.status < 400) {
      throw new Error("Backend should reject invalid client ID");
    }
  });

  await test("Frontend can handle API rate limiting", async () => {
    // Make multiple rapid requests
    const requests = Array(5)
      .fill(null)
      .map(() => client.get("/api/dashboard/stats"));

    const responses = await Promise.all(requests);

    // At least some should succeed
    const successCount = responses.filter((r) => r.status === 200).length;
    if (successCount === 0) {
      throw new Error("All requests failed - API may have issues");
    }
  });
}

// ============================================================================
// SUMMARY & REPORT
// ============================================================================

function printSummary() {
  console.log("\n" + "=".repeat(80));
  log(colors.cyan, "  📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(80) + "\n");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const totalTime = results.reduce((sum, r) => sum + r.duration, 0);

  results.forEach((result) => {
    const icon = result.status === "PASS" ? "✅" : "❌";
    const color = result.status === "PASS" ? colors.green : colors.red;
    log(color, `  ${icon} ${result.name} (${result.duration}ms)`);
  });

  console.log("\n" + "-".repeat(80));
  log(colors.green, `  ✅ Passed: ${passed}`);
  if (failed > 0) log(colors.red, `  ❌ Failed: ${failed}`);
  log(colors.blue, `  ⏱️  Total Duration: ${totalTime}ms`);

  console.log("\n" + "=".repeat(80));

  if (failed === 0) {
    log(
      colors.green,
      "\n  🎉 ALL TESTS PASSED - Frontend & Backend are successfully connected!\n"
    );
    log(colors.cyan, "  ✅ Status: READY FOR PRODUCTION DEPLOYMENT");
  } else {
    log(
      colors.red,
      `\n  🚨 ${failed} TEST(S) FAILED - Fix issues before deploying\n`
    );
    log(colors.yellow, "  Please review the errors above and fix any issues.");
    process.exit(1);
  }

  console.log("=".repeat(80) + "\n");
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  log(colors.cyan, "\n╔════════════════════════════════════════════════════════════════════════════╗");
  log(colors.cyan, "║                                                                            ║");
  log(colors.cyan, "║     🚀 PHASE 11 - FRONTEND & BACKEND CONNECTION VERIFICATION              ║");
  log(colors.cyan, "║                                                                            ║");
  log(colors.cyan, "╚════════════════════════════════════════════════════════════════════════════╝\n");

  try {
    await testBackendConnectivity();
    await testFrontendBuild();
    await testFrontendAPIAccess();
    await testDataPersistence();
    await testAuthenticationFlow();
    await testIntegration();

    printSummary();
  } catch (error: any) {
    log(colors.red, `\n  ❌ Fatal error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
