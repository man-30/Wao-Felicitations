import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  vus: 50,        // 50 utilisateurs virtuels
  duration: '3m',  // 3 minutes de test
  thresholds: {
    'http_req_duration': ['p(99)<500'],  // 99% des requêtes < 500ms
    'http_req_failed': ['rate<0.01'],    // < 1% d'erreurs
    'http_reqs': ['rate>100'],           // Au moins 100 requêtes/sec
  },
};

export default function() {
  let adminToken = '';
  let cashierToken = '';
  let clientId = '';

  // ─────────────────────────────────────────────────────────
  // 1. LOGIN ADMIN
  // ─────────────────────────────────────────────────────────
  let loginRes = http.post('http://localhost:3001/api/auth/login', JSON.stringify({
    email: 'admin@staging.test',
    password: 'AdminStaging123!'
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(loginRes, {
    'admin login status is 200': (r) => r.status === 200,
    'admin login has token': (r) => r.json().token !== undefined,
  });

  if (loginRes.status === 200) {
    adminToken = loginRes.json().token;
  }
  sleep(0.5);

  // ─────────────────────────────────────────────────────────
  // 2. LOGIN CASHIER
  // ─────────────────────────────────────────────────────────
  let cashierLoginRes = http.post('http://localhost:3001/api/auth/login', JSON.stringify({
    email: 'cashier@staging.test',
    password: 'CashierStaging123!'
  }), {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  check(cashierLoginRes, {
    'cashier login status is 200': (r) => r.status === 200,
    'cashier login has token': (r) => r.json().token !== undefined,
  });

  if (cashierLoginRes.status === 200) {
    cashierToken = cashierLoginRes.json().token;
  }
  sleep(0.5);

  // ─────────────────────────────────────────────────────────
  // 3. GET EXISTING CLIENT
  // ─────────────────────────────────────────────────────────
  let getClientRes = http.get('http://localhost:3001/api/clients/staging-client-1', {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });

  check(getClientRes, {
    'get client status is 200': (r) => r.status === 200,
    'client data exists': (r) => r.json().name !== undefined,
  });

  if (getClientRes.status === 200) {
    clientId = getClientRes.json().id;
  }
  sleep(0.5);

  // ─────────────────────────────────────────────────────────
  // 4. RECORD DEPOSIT (Cashier)
  // ─────────────────────────────────────────────────────────
  let depositRes = http.post('http://localhost:3001/api/transactions', JSON.stringify({
    clientId: 'staging-client-1',
    clientName: 'Test Client Apprenant',
    amount: 25000 + Math.random() * 25000,
    type: 'depot',
    collectedBy: 'staging-u-cashier',
    collectedByName: 'Staging Cashier',
    description: 'Load test deposit'
  }), {
    headers: {
      'Authorization': `Bearer ${cashierToken}`,
      'Content-Type': 'application/json',
    },
  });

  check(depositRes, {
    'deposit status is 201': (r) => r.status === 201,
    'deposit pending approval': (r) => r.json().status === 'en_attente',
  });

  let transactionId = '';
  if (depositRes.status === 201) {
    transactionId = depositRes.json().id;
  }
  sleep(0.5);

  // ─────────────────────────────────────────────────────────
  // 5. VALIDATE TRANSACTION (Admin)
  // ─────────────────────────────────────────────────────────
  if (transactionId) {
    let validateRes = http.put(
      `http://localhost:3001/api/transactions/${transactionId}/validate`,
      JSON.stringify({}),
      {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    check(validateRes, {
      'validate status is 200': (r) => r.status === 200,
      'transaction approved': (r) => r.json().status === 'approuve',
    });
  }
  sleep(0.5);

  // ─────────────────────────────────────────────────────────
  // 6. RECORD COTISATION (Cashier)
  // ─────────────────────────────────────────────────────────
  let cotisationRes = http.post('http://localhost:3001/api/cotisations', JSON.stringify({
    clientId: 'staging-client-1',
    amount: 2500,
    type: 'cotisation',
    date: new Date().toISOString().split('T')[0],
    collectedBy: 'staging-u-cashier',
    collectedByName: 'Staging Cashier'
  }), {
    headers: {
      'Authorization': `Bearer ${cashierToken}`,
      'Content-Type': 'application/json',
    },
  });

  check(cotisationRes, {
    'cotisation status is 201': (r) => r.status === 201,
    'cotisation amount recorded': (r) => r.json().amount === '2500',
  });
  sleep(0.5);

  // ─────────────────────────────────────────────────────────
  // 7. GET AUDIT LOGS (Admin)
  // ─────────────────────────────────────────────────────────
  let logsRes = http.get('http://localhost:3001/api/audit-logs', {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });

  check(logsRes, {
    'get logs status is 200': (r) => r.status === 200,
    'logs is array': (r) => Array.isArray(r.json()),
  });
  sleep(0.5);

  // ─────────────────────────────────────────────────────────
  // 8. GET DASHBOARD STATS (Admin)
  // ─────────────────────────────────────────────────────────
  let statsRes = http.get('http://localhost:3001/api/dashboard/stats', {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });

  check(statsRes, {
    'get stats status is 200': (r) => r.status === 200,
    'stats has totalClients': (r) => r.json().totalClients !== undefined,
  });
  sleep(0.5);

  // ─────────────────────────────────────────────────────────
  // 9. LOGOUT (Admin)
  // ─────────────────────────────────────────────────────────
  http.post('http://localhost:3001/api/auth/logout', {}, {
    headers: {
      'Authorization': `Bearer ${adminToken}`,
    },
  });

  // ─────────────────────────────────────────────────────────
  // 10. LOGOUT (Cashier)
  // ─────────────────────────────────────────────────────────
  http.post('http://localhost:3001/api/auth/logout', {}, {
    headers: {
      'Authorization': `Bearer ${cashierToken}`,
    },
  });

  sleep(1);
}
