/**
 * k6-quick-test.js
 * Test rapide de validation (2 min, 50 VUs max)
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '20s', target: 20 },  // Ramp up to 20
    { duration: '1m', target: 50 },   // Stay at 50
    { duration: '20s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'],
    errors: ['rate<0.01'],
  },
};

const BASE_URL = 'http://localhost:3001';
const ADMIN_CREDS = { email: 'admin@staging.test', password: 'AdminStaging123!' };
const CASHIER_CREDS = { email: 'cashier@staging.test', password: 'CashierStaging123!' };

function login(credentials) {
  const res = http.post(`${BASE_URL}/api/auth/login`, JSON.stringify(credentials), {
    headers: { 'Content-Type': 'application/json' },
  });
  
  const success = check(res, {
    'login status 200': (r) => r.status === 200,
    'login has token': (r) => r.json().token !== undefined,
  });
  
  if (!success) {
    errorRate.add(1);
    return null;
  }
  
  return res.json().token;
}

export default function () {
  const token = login(ADMIN_CREDS);
  if (!token) return;
  
  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  };
  
  // Dashboard
  let res = http.get(`${BASE_URL}/api/dashboard/stats`, params);
  check(res, {
    'dashboard status 200': (r) => r.status === 200,
    'dashboard returns json': (r) => r.json() !== null,
  }) || errorRate.add(1);
  
  sleep(0.5);
  
  // Audit logs
  res = http.get(`${BASE_URL}/api/audit-logs?limit=20`, params);
  check(res, {
    'audit logs status 200': (r) => r.status === 200,
    'audit logs has data': (r) => r.json().logs && r.json().logs.length >= 0,
  }) || errorRate.add(1);
  
  sleep(0.5);
}
