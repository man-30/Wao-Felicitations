import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Warm-up: 10 utilisateurs
    { duration: '1m', target: 50 },    // Montée: 50 utilisateurs
    { duration: '3m', target: 100 },   // Pic: 100 utilisateurs
    { duration: '30s', target: 0 },    // Descente: 0 utilisateurs
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500', 'p(99)<1000'], // 95% < 500ms, 99% < 1s
    'http_req_failed': ['rate<0.01'],                 // < 1% erreurs
    'errors': ['rate<0.01'],                          // < 1% erreurs métier
  },
};

const BASE_URL = 'http://localhost:3001';

// Credentials pour les tests
const ADMIN_CREDS = {
  email: 'admin@staging.test',
  password: 'AdminStaging123!'
};

const CASHIER_CREDS = {
  email: 'cashier@staging.test',
  password: 'CashierStaging123!'
};

// Get auth token
function login(credentials) {
  const payload = JSON.stringify(credentials);
  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);
  
  check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => r.json('token') !== undefined,
  }) || errorRate.add(1);
  
  return res.json('token');
}

// Scenario 1: Admin workflow
export function adminWorkflow() {
  const token = login(ADMIN_CREDS);
  if (!token) return;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  // Get dashboard stats
  let res = http.get(`${BASE_URL}/api/dashboard/stats`, params);
  check(res, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard returns json': (r) => r.json() !== null,
  }) || errorRate.add(1);
  
  sleep(1);
  
  // Get audit logs
  res = http.get(`${BASE_URL}/api/audit-logs`, params);
  check(res, {
    'audit logs status 200': (r) => r.status === 200,
    'audit logs has logs array': (r) => r.json().logs && Array.isArray(r.json().logs),
    'audit logs accessible': (r) => r.json().count !== undefined,
  }) || errorRate.add(1);
  
  sleep(1);
}

// Scenario 2: Cashier workflow
export function cashierWorkflow() {
  const token = login(CASHIER_CREDS);
  if (!token) return;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  // First, get an admin token to create a client
  const adminToken = login(ADMIN_CREDS);
  if (!adminToken) return;
  
  const adminParams = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${adminToken}`,
    },
  };
  
  // Create a client first
  const clientPayload = JSON.stringify({
    name: `Load Test Client ${Date.now()}`,
    type: 'apprenant',
    phone: `+24381234${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`,
    address: 'Kinshasa, Test',
    assignedCommercialId: 'staging-u-commercial',
  });
  
  const clientRes = http.post(`${BASE_URL}/api/clients`, clientPayload, adminParams);
  if (!check(clientRes, {
    'client creation status 201': (r) => r.status === 201,
  })) {
    errorRate.add(1);
    return;
  }
  
  const client = clientRes.json();
  const clientId = client.id || client.client?.id;
  
  if (!clientId) {
    errorRate.add(1);
    return;
  }
  
  sleep(0.5);
  
  // Create a transaction for this client
  const txPayload = JSON.stringify({
    clientId: clientId,
    clientName: client.name || 'Test Client',
    amount: Math.floor(Math.random() * 100000) + 10000,
    type: 'depot',
    collectedBy: 'staging-u-cashier',
    collectedByName: 'Staging Cashier',
    description: `Load test transaction ${Date.now()}`,
  });
  
  const res = http.post(`${BASE_URL}/api/transactions`, txPayload, params);
  check(res, {
    'transaction status 201': (r) => r.status === 201,
  }) || errorRate.add(1);
  
  sleep(1);
}

// Scenario 3: Read-only operations (GET requests)
export function readOnlyWorkflow() {
  const token = login(ADMIN_CREDS);
  if (!token) return;
  
  const params = {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  };
  
  // Get audit logs (read-only endpoint that works without parameters)
  const res = http.get(`${BASE_URL}/api/audit-logs`, params);
  check(res, {
    'audit logs accessible': (r) => r.status === 200,
  }) || errorRate.add(1);
  
  sleep(0.5);
}

// Default scenario - mixed load
export default function () {
  const scenarios = [adminWorkflow, cashierWorkflow, readOnlyWorkflow];
  const scenario = scenarios[Math.floor(Math.random() * scenarios.length)];
  
  scenario();
  
  sleep(Math.random() * 2 + 1); // Random sleep between 1-3 seconds
}
