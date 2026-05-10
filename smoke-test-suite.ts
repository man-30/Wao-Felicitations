#!/usr/bin/env node
/**
 * PHASE 11 - SMOKE TESTS SUITE
 * Comprehensive validation of backend + frontend + database connectivity
 * 
 * Usage: npm run smoke:test
 */

import axios from "axios";
import * as fs from "fs";
import * as path from "path";
import * as dotenv from "dotenv";

// Load environment
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env.backend";
dotenv.config({ path: envFile });

const API_URL = process.env.VITE_API_URL || "http://localhost:3001";
const API_TIMEOUT = 5000;

// Color codes for terminal output
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
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  message?: string;
  error?: string;
}

const results: TestResult[] = [];

function log(color: string, text: string) {
  console.log(`${color}${text}${colors.reset}`);
}

function header(title: string) {
  console.log("\n" + "=".repeat(70));
  log(colors.cyan, `🧪 ${title}`);
  console.log("=".repeat(70) + "\n");
}

async function runTest(
  name: string,
  testFn: () => Promise<void>
): Promise<void> {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    results.push({ name, status: "PASS", duration });
    log(colors.green, `✅ PASS: ${name} (${duration}ms)`);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    results.push({
      name,
      status: "FAIL",
      duration,
      error: error.message,
    });
    log(colors.red, `❌ FAIL: ${name}`);
    log(colors.red, `   Error: ${error.message}`);
  }
}

// ============================================================================
// TEST SUITE 1: DATABASE CONNECTIVITY
// ============================================================================

async function testDatabaseConnection() {
  header("TEST SUITE 1: Database Connectivity");

  const client = axios.create({
    baseURL: API_URL,
    timeout: API_TIMEOUT,
    validateStatus: () => true,
  });

  await runTest("Database is accessible (via backend)", async () => {
    const res = await client.get("/health");
    if (res.status !== 200) throw new Error("Backend health check failed");
  });

  await runTest("Users table is accessible", async () => {
    const res = await client.post("/api/auth/login", {
      email: "admin@wao.com",
      password: "password123",
    });
    if (res.status !== 200) {
      throw new Error("Cannot access users table");
    }
  });

  await runTest("Database connection is responsive (< 2s)", async () => {
    const startTime = Date.now();
    const res = await client.get("/health");
    const duration = Date.now() - startTime;
    if (duration > 2000) {
      throw new Error(`Database too slow: ${duration}ms`);
    }
  });

  await runTest("API can execute transactions", async () => {
    const res = await client.post("/api/auth/login", {
      email: "admin@wao.com",
      password: "password123",
    });
    if (!res.data.token) {
      throw new Error("Cannot execute database queries");
    }
  });
}

// ============================================================================
// TEST SUITE 2: BACKEND API HEALTH
// ============================================================================

async function testBackendAPI() {
  header("TEST SUITE 2: Backend API Health");

  const client = axios.create({
    baseURL: API_URL,
    timeout: API_TIMEOUT,
    validateStatus: () => true, // Don't throw on any status
  });

  await runTest("Health endpoint (GET /health)", async () => {
    const res = await client.get("/health");
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
    if (!res.data.status) {
      throw new Error("Health check missing 'status' field");
    }
  });

  await runTest("Server is responsive (< 1s)", async () => {
    const startTime = Date.now();
    await client.get("/health");
    const duration = Date.now() - startTime;
    if (duration > 1000) {
      throw new Error(`Response too slow: ${duration}ms`);
    }
  });
}

// ============================================================================
// TEST SUITE 3: AUTHENTICATION & JWT
// ============================================================================

let authToken: string = "";

async function testAuthentication() {
  header("TEST SUITE 3: Authentication & JWT");

  const client = axios.create({
    baseURL: API_URL,
    timeout: API_TIMEOUT,
    validateStatus: () => true,
  });

  await runTest("Login endpoint (POST /api/auth/login)", async () => {
    const res = await client.post("/api/auth/login", {
      email: "admin@wao.com",
      password: "password123",
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}: ${res.data?.message || ""}`);
    }

    if (!res.data.token) {
      throw new Error("Login response missing JWT token");
    }

    authToken = res.data.token;
  });

  await runTest("JWT token is valid", async () => {
    if (!authToken || authToken.length < 10) {
      throw new Error("Invalid JWT token received");
    }
    const parts = authToken.split(".");
    if (parts.length !== 3) {
      throw new Error("JWT token malformed (expected 3 parts)");
    }
  });

  await runTest("Authenticated request (GET /api/dashboard/stats)", async () => {
    const res = await client.get("/api/dashboard/stats", {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  });

  await runTest("Unauthenticated request is rejected", async () => {
    const res = await client.get("/api/dashboard/stats");

    if (res.status === 200) {
      throw new Error("Endpoint should require authentication");
    }
  });

  await runTest("Invalid token is rejected", async () => {
    const res = await client.get("/api/dashboard/stats", {
      headers: { Authorization: "Bearer invalid_token" },
    });

    if (res.status === 200) {
      throw new Error("Invalid token should be rejected");
    }
  });
}

// ============================================================================
// TEST SUITE 4: API ENDPOINTS
// ============================================================================

async function testAPIEndpoints() {
  header("TEST SUITE 4: API Endpoints");

  const client = axios.create({
    baseURL: API_URL,
    timeout: API_TIMEOUT,
    validateStatus: () => true,
    headers: { Authorization: `Bearer ${authToken}` },
  });

  await runTest("GET /api/audit-logs", async () => {
    const res = await client.get("/api/audit-logs");
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  });

  await runTest("GET /api/clients", async () => {
    const res = await client.get("/api/clients");
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  });

  await runTest("GET /api/transactions", async () => {
    const res = await client.get("/api/transactions");
    if (res.status !== 200) {
      throw new Error(`Expected 200, got ${res.status}`);
    }
  });

  await runTest("POST /api/clients (create client)", async () => {
    const res = await client.post("/api/clients", {
      name: "Test Client",
      email: `test-${Date.now()}@wao.com`,
      phone: "1234567890",
      address: "Test Address",
    });

    if (res.status !== 201 && res.status !== 200) {
      throw new Error(`Expected 201 or 200, got ${res.status}: ${res.data?.message || ""}`);
    }
  });
}

// ============================================================================
// TEST SUITE 5: FRONTEND BUILD
// ============================================================================

async function testFrontendBuild() {
  header("TEST SUITE 5: Frontend Build");

  await runTest("Frontend build exists (dist folder)", async () => {
    const distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(distPath)) {
      throw new Error("dist folder not found - run 'npm run frontend:build'");
    }
  });

  await runTest("Frontend index.html exists", async () => {
    const indexPath = path.join(process.cwd(), "dist", "index.html");
    if (!fs.existsSync(indexPath)) {
      throw new Error("dist/index.html not found");
    }
  });

  await runTest("Frontend assets are built", async () => {
    const distPath = path.join(process.cwd(), "dist");
    const files = fs.readdirSync(distPath);
    if (files.length === 0) {
      throw new Error("dist folder is empty");
    }
  });
}

// ============================================================================
// TEST SUITE 6: ENVIRONMENT CONFIGURATION
// ============================================================================

async function testEnvironmentConfig() {
  header("TEST SUITE 6: Environment Configuration");

  await runTest("DATABASE_URL is configured", async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set");
    }
  });

  await runTest("JWT_SECRET is configured", async () => {
    if (!process.env.JWT_SECRET) {
      throw new Error("JWT_SECRET not set");
    }
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error(`JWT_SECRET too short (${process.env.JWT_SECRET.length} < 32)`);
    }
  });

  await runTest("ENCRYPTION_KEY is configured", async () => {
    if (!process.env.ENCRYPTION_KEY) {
      throw new Error("ENCRYPTION_KEY not set");
    }
    if (process.env.ENCRYPTION_KEY.length !== 32) {
      throw new Error(`ENCRYPTION_KEY invalid length (${process.env.ENCRYPTION_KEY.length} !== 32)`);
    }
  });

  await runTest("NODE_ENV is set", async () => {
    if (!process.env.NODE_ENV) {
      throw new Error("NODE_ENV not set");
    }
  });

  await runTest("PORT is configured", async () => {
    if (!process.env.PORT) {
      throw new Error("PORT not set");
    }
  });
}

// ============================================================================
// SUMMARY & RESULTS
// ============================================================================

function printSummary() {
  console.log("\n" + "=".repeat(70));
  log(colors.cyan, "📊 TEST RESULTS SUMMARY");
  console.log("=".repeat(70) + "\n");

  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;
  const skipped = results.filter((r) => r.status === "SKIP").length;

  results.forEach((result) => {
    const icon =
      result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⏭️";
    const color = result.status === "PASS" ? colors.green : colors.red;
    log(color, `${icon} ${result.name} (${result.duration}ms)`);
  });

  console.log("\n" + "-".repeat(70));
  log(colors.green, `✅ Passed: ${passed}`);
  if (failed > 0) log(colors.red, `❌ Failed: ${failed}`);
  if (skipped > 0) log(colors.yellow, `⏭️  Skipped: ${skipped}`);
  log(colors.cyan, `📊 Total: ${results.length}`);

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  log(colors.blue, `⏱️  Total Duration: ${totalDuration}ms`);

  console.log("\n" + "=".repeat(70));

  if (failed === 0) {
    log(colors.green, "🎉 ALL TESTS PASSED - System is ready for deployment!");
  } else {
    log(colors.red, `🚨 ${failed} TEST(S) FAILED - Fix issues before deploying`);
    process.exit(1);
  }

  console.log("=".repeat(70) + "\n");
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  log(colors.cyan, "\n🚀 PHASE 11 - COMPREHENSIVE SMOKE TEST SUITE\n");

  try {
    await testEnvironmentConfig();
    await testDatabaseConnection();
    await testBackendAPI();
    await testAuthentication();
    await testAPIEndpoints();
    await testFrontendBuild();

    printSummary();
  } catch (error: any) {
    log(colors.red, `\n❌ Fatal error: ${error.message}\n`);
    process.exit(1);
  }
}

main();
