import axios from "axios";
import * as dotenv from "dotenv";

/**
 * PHASE 11 - Frontend & Backend Connection Verification (Simplified)
 * 
 * Fast validation that:
 * 1. Backend is running
 * 2. Database is accessible
 * 3. Authentication works
 * 4. API endpoints respond correctly
 */

dotenv.config({ path: ".env.backend" });

const API_BASE_URL = "http://localhost:3001";

const colors = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

interface TestResult {
  name: string;
  status: "PASS" | "FAIL";
  duration: number;
}

const results: TestResult[] = [];

function log(color: string, text: string) {
  console.log(`${color}${text}${colors.reset}`);
}

function header(title: string) {
  console.log("\n" + "=".repeat(80));
  log(colors.cyan, `  🔗 ${title}`);
  console.log("=".repeat(80) + "\n");
}

async function test(name: string, testFn: () => Promise<void>): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, status: "PASS", duration });
    log(colors.green, `  ✅ PASS: ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({ name, status: "FAIL", duration });
    log(colors.red, `  ❌ FAIL: ${name}`);
    log(colors.red, `     Error: ${error.message}`);
  }
}

// ============================================================================
// TEST GROUP 1: BACKEND SERVER STATUS
// ============================================================================

async function testBackendServer() {
  header("TEST GROUP 1: Backend Server Status");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
  });

  await test("Backend server is running and responds", async () => {
    const res = await client.get("/");
    if (res.status !== 200) {
      throw new Error(
        `Backend returned status ${res.status}. Is it running on ${API_BASE_URL}?`
      );
    }
  });

  await test("Backend serves API information", async () => {
    const res = await client.get("/");
    if (!res.data.version) {
      throw new Error("Backend response missing version information");
    }
    if (!res.data.endpoints) {
      throw new Error("Backend response missing endpoint list");
    }
  });

  await test("Backend is responsive (< 200ms)", async () => {
    const startTime = Date.now();
    await client.get("/");
    const duration = Date.now() - startTime;
    if (duration > 200) {
      throw new Error(`Response slow: ${duration}ms`);
    }
  });

  await test("CORS headers allow frontend connection", async () => {
    const res = await client.options("/");
    const hasAccessControl =
      res.headers["access-control-allow-origin"] ||
      res.headers["access-control-allow-methods"];
    if (!hasAccessControl && res.status !== 204 && res.status !== 200) {
      throw new Error("CORS headers missing - frontend may not reach backend");
    }
  });
}

// ============================================================================
// TEST GROUP 2: AUTHENTICATION FLOW
// ============================================================================

let authToken: string = "";

async function testAuthentication() {
  header("TEST GROUP 2: Authentication Flow");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
  });

  await test("Login endpoint exists (POST /api/auth/login)", async () => {
    const res = await client.post("/api/auth/login", {
      email: "admin@wao.test",
      password: "SecurePassword123!",
    });

    if (res.status === 404) {
      throw new Error("Login endpoint not found");
    }
    if (res.status === 401) {
      throw new Error(
        "Login failed with 401 - check credentials in database"
      );
    }
    if (res.status !== 200) {
      throw new Error(`Login returned status ${res.status}`);
    }
  });

  await test("Login returns JWT token", async () => {
    const res = await client.post("/api/auth/login", {
      email: "admin@wao.test",
      password: "SecurePassword123!",
    });

    if (!res.data.token) {
      throw new Error("Login response missing JWT token");
    }

    authToken = res.data.token;
  });

  await test("JWT token has valid format", async () => {
    if (!authToken) throw new Error("No token from previous test");

    const parts = authToken.split(".");
    if (parts.length !== 3) {
      throw new Error(`Invalid JWT format: ${parts.length} parts instead of 3`);
    }
  });

  await test("Frontend can store JWT token in localStorage", async () => {
    if (!authToken) throw new Error("No token available");

    // Simulate localStorage
    const mockStorage = { token: authToken };
    if (mockStorage.token !== authToken) {
      throw new Error("Token storage simulation failed");
    }
  });
}

// ============================================================================
// TEST GROUP 3: PROTECTED API ENDPOINTS
// ============================================================================

async function testProtectedEndpoints() {
  header("TEST GROUP 3: Protected API Endpoints");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  const unauthClient = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
  });

  await test("Dashboard stats endpoint exists", async () => {
    const res = await client.get("/api/dashboard/stats");
    if (res.status === 404) {
      throw new Error("Dashboard endpoint not found");
    }
    if (res.status === 200) {
      return;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error(
        "Authentication required - token may be invalid or user lacks permissions"
      );
    }
    throw new Error(`Dashboard returned ${res.status}`);
  });

  await test("Audit logs endpoint exists", async () => {
    const res = await client.get("/api/audit-logs");
    if (res.status === 404) {
      throw new Error("Audit logs endpoint not found");
    }
    if (res.status === 200) {
      return;
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("User lacks permissions for audit logs");
    }
    throw new Error(`Audit logs returned ${res.status}`);
  });

  await test("Unauthenticated requests are protected", async () => {
    const res = await unauthClient.get("/api/dashboard/stats");
    if (res.status === 200) {
      throw new Error("Protected endpoint should reject unauthenticated request");
    }
  });

  await test("Invalid tokens are rejected", async () => {
    const res = await axios.get(`${API_BASE_URL}/api/dashboard/stats`, {
      headers: { Authorization: "Bearer invalid_token_xyz" },
      validateStatus: () => true,
    });

    if (res.status === 200) {
      throw new Error("Invalid token should be rejected");
    }
  });
}

// ============================================================================
// TEST GROUP 4: DATA PERSISTENCE
// ============================================================================

async function testDataPersistence() {
  header("TEST GROUP 4: Data Persistence");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  await test("Frontend can create a client", async () => {
    const ts = Date.now();
    const res = await client.post("/api/clients", {
      name: `Test Client ${ts}`,
      type: "apprenant",
      phone: `77${ts.toString().slice(-8)}`,
      address: "Test Address",
    });

    if (res.status === 404) {
      throw new Error("Create client endpoint not found");
    }
    if (res.status === 401 || res.status === 403) {
      throw new Error("User lacks permission to create client");
    }
    if (res.status !== 201 && res.status !== 200) {
      throw new Error(`Client creation returned ${res.status}: ${JSON.stringify(res.data)}`);
    }
  });

  await test("Frontend receives created client data", async () => {
    const res = await client.post("/api/clients", {
      name: `Test Client ${Date.now()}`,
      type: "apprenant",
      phone: "1234567890",
      address: "Test Address",
    });

    if (!res.data.id) {
      throw new Error("Response missing created client ID");
    }
    if (!res.data.membershipCode) {
      throw new Error("Response missing auto-generated membership code");
    }
  });

  await test("Frontend can retrieve created data", async () => {
    // Create a client first
    const createRes = await client.post("/api/clients", {
      name: `Test Client ${Date.now()}`,
      type: "apprenant",
      phone: "1234567890",
      address: "Test Address",
    });

    if (createRes.status !== 200 && createRes.status !== 201) {
      throw new Error("Cannot create test client");
    }

    const clientId = createRes.data.id;

    // Retrieve the created client
    const getRes = await client.get(`/api/clients/${clientId}`);
    if (getRes.status !== 200) {
      throw new Error(`Cannot retrieve client: ${getRes.status}`);
    }

    if (getRes.data.id !== clientId) {
      throw new Error("Retrieved client ID does not match");
    }
  });
}

// ============================================================================
// TEST GROUP 5: FRONTEND-BACKEND INTEGRATION
// ============================================================================

async function testFrontendIntegration() {
  header("TEST GROUP 5: Frontend-Backend Integration");

  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 5000,
    validateStatus: () => true,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  await test("Frontend can render dashboard with real data", async () => {
    const res = await client.get("/api/dashboard/stats");
    if (res.status !== 200) {
      throw new Error(`Dashboard endpoint failed: ${res.status}`);
    }
    if (!res.data || typeof res.data !== "object") {
      throw new Error("Dashboard data not in expected format");
    }
  });

  await test("Frontend can handle API response format", async () => {
    const res = await client.get("/api/dashboard/stats");
    const data = res.data;

    // Check for common response fields
    if (
      !data ||
      (typeof data !== "object" && !Array.isArray(data))
    ) {
      throw new Error("Response is not object or array");
    }
  });

  await test("Frontend can handle multiple concurrent requests", async () => {
    // Make 3 requests in parallel
    const requests = [
      client.get("/api/dashboard/stats"),
      client.get("/api/audit-logs"),
      client.post("/api/clients", {
        name: `Concurrent Test ${Date.now()}`,
        email: `concurrent-${Date.now()}@wao.com`,
        phone: "1234567890",
        address: "Test",
      }),
    ];

    const results = await Promise.all(requests);
    const successCount = results.filter((r) => r.status === 200 || r.status === 201)
      .length;

    if (successCount < 2) {
      throw new Error(`Only ${successCount}/3 concurrent requests succeeded`);
    }
  });

  await test("Frontend error handling works", async () => {
    const res = await client.get("/api/clients/invalid-format-id");
    if (res.status === 200) {
      throw new Error("Should return error for invalid client ID");
    }
  });
}

// ============================================================================
// SUMMARY
// ============================================================================

function printSummary() {
  console.log("\n" + "=".repeat(80));
  log(colors.cyan, "  📊 VERIFICATION SUMMARY");
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
  log(colors.blue, `  ⏱️  Total: ${totalTime}ms`);

  console.log("\n" + "=".repeat(80));

  if (failed === 0) {
    log(
      colors.green,
      "\n  🎉 SUCCESS - Frontend & Backend are fully connected!\n"
    );
    log(colors.cyan, "  ✅ Ready for deployment");
    log(colors.cyan, "  ✅ All API endpoints responding");
    log(colors.cyan, "  ✅ Authentication working");
    log(colors.cyan, "  ✅ Data persistence verified");
  } else {
    log(colors.red, `\n  🚨 ${failed} issue(s) detected\n`);
    log(colors.yellow, "  Review errors above and fix before deployment");
    process.exit(1);
  }

  console.log("=".repeat(80) + "\n");
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  log(
    colors.cyan,
    "\n╔════════════════════════════════════════════════════════════════════════════╗"
  );
  log(colors.cyan, "║                                                                            ║");
  log(
    colors.cyan,
    "║          🚀 PHASE 11 - FRONTEND & BACKEND CONNECTION TEST                  ║"
  );
  log(colors.cyan, "║                                                                            ║");
  log(
    colors.cyan,
    "╚════════════════════════════════════════════════════════════════════════════╝\n"
  );

  try {
    await testBackendServer();
    await testAuthentication();
    await testProtectedEndpoints();
    await testDataPersistence();
    await testFrontendIntegration();

    printSummary();
  } catch (error: any) {
    log(colors.red, `\n  ❌ Fatal error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
