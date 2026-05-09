# PHASE 9 — Manual Testing Guide

**Status:** ✅ **BACKEND ONLINE**  
**URL:** http://localhost:3000  
**Last Started:** $(date)  
**Backend Terminal ID:** 4da42764-47f6-413e-adc9-c3ae68afbbeb

---

## 📋 Quick Start

### Prerequisites
- ✅ Backend running on http://localhost:3000
- ✅ .env.backend configured with DATABASE_URL
- ✅ All PHASE 6, 7, 8 modules loaded

### Tools for Testing
- **Postman** (GUI) - Recommended for visual testing
- **curl** (CLI) - For quick command-line tests
- **VS Code REST Client** - Install "REST Client" extension for inline testing

---

## 🧪 Test Suite Overview

| Phase | Category | Tests | Duration | Status |
|-------|----------|-------|----------|--------|
| 9.1 | Security (Auth) | 5 | 5 min | Ready |
| 9.2 | Business Logic | 8 | 10 min | Ready |
| 9.3 | Data Integrity | 4 | 5 min | Ready |
| 9.4 | Logging & Audit | 3 | 5 min | Ready |
| 9.5 | Performance | 1 | 5 min | Ready |
| **TOTAL** | | **21** | **30 min** | **READY** |

---

## 📝 Available Endpoints

### Authentication
- `POST /api/auth/login` - User login (generates JWT)
- `POST /api/auth/logout` - User logout

### Client Management
- `POST /api/clients` - Create new client (admin/commercial only)
- `GET /api/clients/:id` - Get client details (if implemented)

### Transactions
- `POST /api/transactions` - Record transaction (requires permission)
- `POST /api/cotisations` - Record cotisation (membership fee)
- `POST /api/cotisations/advanced-deposit` - Record advanced deposit
- `POST /api/accounts/transfer-financing-to-savings` - Transfer funds

### Validation
- `POST /api/validation/cotisation-account-constraint` - Test XOR constraint

---

## ✅ PHASE 9.1: Security & Authentication (5 tests)

### Test 1: Login with Valid Credentials
**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wao.test",
    "password": "SecurePassword123!"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-id",
    "email": "admin@wao.test",
    "role": "admin"
  }
}
```

**Assertions:**
- ✅ Response status 200
- ✅ Token returned (JWT format)
- ✅ User data included
- ✅ Token can be decoded

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 2: Login with Invalid Credentials
**Endpoint:** `POST /api/auth/login`

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@wao.test",
    "password": "WrongPassword"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid email or password"
}
```

**Assertions:**
- ✅ Response status 401 (Unauthorized)
- ✅ Error message provided
- ✅ No token returned

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 3: Protected Route Without Token
**Endpoint:** `POST /api/clients`

```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Expected Response:**
```json
{
  "error": "Access denied: No token provided"
}
```

**Assertions:**
- ✅ Response status 401
- ✅ Request rejected without Authorization header
- ✅ Error message clear

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 4: Protected Route With Invalid Token
**Endpoint:** `POST /api/clients`

```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid.token.here" \
  -d '{
    "first_name": "John",
    "last_name": "Doe"
  }'
```

**Expected Response:**
```json
{
  "error": "Access denied: Invalid token"
}
```

**Assertions:**
- ✅ Response status 401
- ✅ Invalid token rejected
- ✅ Error message provided

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 5: Token Verification & Decoding
**Tool:** Create a test script to verify JWT

```typescript
import jwt from 'jsonwebtoken'

const token = "your-token-from-login-response"
const decoded = jwt.verify(token, process.env.JWT_SECRET)

console.log('Decoded JWT:', decoded)
// Should have: { id, email, role, zone, iat, exp }
```

**Assertions:**
- ✅ Token can be decoded
- ✅ Contains user ID
- ✅ Contains expiration (exp)
- ✅ Contains role information

**Sign-off:** [ ] Passed [ ] Failed

---

## ✅ PHASE 9.2: Business Logic (8 tests)

### Test 6: Create Client (Admin)
**Endpoint:** `POST /api/clients`

```bash
# First get a token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@wao.test","password":"SecurePassword123!"}' \
  | jq -r '.token')

# Then create client
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "first_name": "Jean",
    "last_name": "Dupont",
    "email": "jean@example.com",
    "phone": "+221771234567",
    "cni": "12345678901234"
  }'
```

**Expected Response:**
```json
{
  "client": {
    "id": "client-uuid",
    "first_name": "Jean",
    "last_name": "Dupont",
    "membership_code": "WF2024-001-ABC123",
    "account_number": "ACC-2024-001",
    "created_at": "2024-01-15T10:30:00Z"
  },
  "message": "Client created successfully"
}
```

**Assertions:**
- ✅ Status 201 (Created)
- ✅ Client ID generated
- ✅ Membership code auto-generated (format: WF2024-XXX-XXXXXX)
- ✅ Account number auto-generated (format: ACC-2024-XXX)
- ✅ Timestamp recorded

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 7: Record Transaction
**Endpoint:** `POST /api/transactions`

```bash
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"cashier@wao.test","password":"CashierPassword123!"}' \
  | jq -r '.token')

curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "client_id": "client-uuid-from-test-6",
    "amount": 50000,
    "transaction_type": "deposit",
    "description": "Member deposit"
  }'
```

**Expected Response:**
```json
{
  "transaction": {
    "id": "txn-uuid",
    "client_id": "client-uuid",
    "amount": "50000.00",
    "status": "validated",
    "created_at": "2024-01-15T10:35:00Z"
  },
  "message": "Transaction recorded and validated"
}
```

**Assertions:**
- ✅ Status 201
- ✅ Transaction amount is Decimal type
- ✅ Status is 'validated'
- ✅ Timestamp recorded
- ✅ Associated with client

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 8: Record Cotisation
**Endpoint:** `POST /api/cotisations`

```bash
curl -X POST http://localhost:3000/api/cotisations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "client_id": "client-uuid-from-test-6",
    "cycle_id": 1,
    "amount": 10000
  }'
```

**Expected Response:**
```json
{
  "cotisation": {
    "id": "cot-uuid",
    "client_id": "client-uuid",
    "cycle_id": 1,
    "amount": "10000.00",
    "status": "validated",
    "recorded_at": "2024-01-15T10:40:00Z"
  },
  "message": "Cotisation recorded"
}
```

**Assertions:**
- ✅ Status 201
- ✅ Amount is Decimal
- ✅ Status is 'validated'
- ✅ Cycle recorded
- ✅ Business logic validates amount > 0

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 9: Advanced Deposit (Cotisation + Savings)
**Endpoint:** `POST /api/cotisations/advanced-deposit`

```bash
curl -X POST http://localhost:3000/api/cotisations/advanced-deposit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "client_id": "client-uuid",
    "cycle_id": 1,
    "cotisation_amount": 10000,
    "savings_amount": 20000
  }'
```

**Expected Response:**
```json
{
  "cotisation": { "id": "cot-uuid", "amount": "10000.00" },
  "savings": { "id": "sav-uuid", "amount": "20000.00" },
  "message": "Advanced deposit recorded"
}
```

**Assertions:**
- ✅ Status 201
- ✅ Both cotisation and savings recorded
- ✅ Two separate transaction entries created
- ✅ Amounts tracked separately

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 10: Transfer Financing to Savings
**Endpoint:** `POST /api/accounts/transfer-financing-to-savings`

```bash
curl -X POST http://localhost:3000/api/accounts/transfer-financing-to-savings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "client_id": "client-uuid",
    "amount": 5000,
    "financing_account_id": "fin-account-uuid"
  }'
```

**Expected Response:**
```json
{
  "transfer": {
    "from": "financing",
    "to": "savings",
    "amount": "5000.00",
    "status": "completed"
  },
  "message": "Transfer completed"
}
```

**Assertions:**
- ✅ Status 200/201
- ✅ Financing account decreased
- ✅ Savings account increased
- ✅ Transfer logged with both accounts

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 11: Invalid Client ID
**Endpoint:** `POST /api/transactions` with non-existent client

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "client_id": "non-existent-uuid",
    "amount": 50000,
    "transaction_type": "deposit"
  }'
```

**Expected Response:**
```json
{
  "error": "Client not found"
}
```

**Assertions:**
- ✅ Status 404
- ✅ Transaction rejected
- ✅ Foreign key constraint enforced

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 12: Negative Amount Validation
**Endpoint:** `POST /api/transactions` with negative amount

```bash
curl -X POST http://localhost:3000/api/transactions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "client_id": "client-uuid",
    "amount": -5000,
    "transaction_type": "deposit"
  }'
```

**Expected Response:**
```json
{
  "error": "Amount must be positive"
}
```

**Assertions:**
- ✅ Status 400 (Bad Request)
- ✅ Validation error returned
- ✅ Negative amounts rejected
- ✅ Business logic validation works

**Sign-off:** [ ] Passed [ ] Failed

---

## ✅ PHASE 9.3: Data Integrity (4 tests)

### Test 13: Unique Membership Code
**Objective:** Verify membership_code UNIQUE constraint

```bash
# Create first client
CLIENT_1=$(curl -s -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"first_name":"Jean","last_name":"Dupont","email":"jean@test.com","phone":"+221771234567","cni":"12345"}' \
  | jq -r '.client.membership_code')

# Try to create second with same CNI (should generate different code)
CLIENT_2=$(curl -s -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"first_name":"Marie","last_name":"Martin","email":"marie@test.com","phone":"+221771234567","cni":"67890"}' \
  | jq -r '.client.membership_code')

# Verify codes are different
echo "Code 1: $CLIENT_1"
echo "Code 2: $CLIENT_2"
```

**Assertions:**
- ✅ Both codes generated successfully
- ✅ Codes are different
- ✅ Both follow format WF2024-XXX-XXXXXX
- ✅ UNIQUE constraint enforced

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 14: Unique Account Number
**Objective:** Verify account_number UNIQUE constraint

**Test:** Execute similar to Test 13 but check `account_number` field

**Assertions:**
- ✅ Different account numbers generated
- ✅ Format: ACC-2024-XXX
- ✅ UNIQUE constraint enforced
- ✅ No duplicates allowed

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 15: Cotisation Amount Check Constraint
**Objective:** Verify CHECK constraint: amount > 0

**Test:** Run Test 12 (negative amount validation)

**Assertions:**
- ✅ CHECK constraint active
- ✅ Negative amounts rejected
- ✅ Zero amounts rejected
- ✅ Only positive amounts accepted

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 16: Email Format Validation
**Objective:** Verify email validation

```bash
curl -X POST http://localhost:3000/api/clients \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "first_name": "Test",
    "last_name": "User",
    "email": "invalid-email",
    "phone": "+221771234567",
    "cni": "12345"
  }'
```

**Expected Response:**
```json
{
  "error": "Invalid email format"
}
```

**Assertions:**
- ✅ Invalid email rejected
- ✅ Validation error message provided
- ✅ Email format checked before insertion

**Sign-off:** [ ] Passed [ ] Failed

---

## ✅ PHASE 9.4: Logging & Audit (3 tests)

### Test 17: Action Log - Login Recorded
**Objective:** Verify LOGIN action is logged

**Implementation:** Check database or logs after login

```sql
SELECT * FROM action_logs 
WHERE action_type = 'Connexion' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result:**
```
id | user_id | action_type | description | ip_address | created_at
---|---------|-------------|-------------|------------|---
1  | user-id | Connexion   | Login successful | 127.0.0.1 | 2024-01-15 10:30:00
```

**Assertions:**
- ✅ Action logged with correct type
- ✅ User ID recorded
- ✅ Timestamp captured
- ✅ IP address logged (if available)
- ✅ Description provided

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 18: Action Log - Client Creation Recorded
**Objective:** Verify CREATE_CLIENT action is logged

```sql
SELECT * FROM action_logs 
WHERE action_type = 'Création client' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result:**
```
id | user_id | action_type | client_id | description | created_at
---|---------|-------------|-----------|-------------|---
5  | user-id | Création client | cli-uuid | Client Jean Dupont created | 2024-01-15 10:35:00
```

**Assertions:**
- ✅ Action logged with correct type
- ✅ Client ID linked
- ✅ User who created logged
- ✅ Description includes client name
- ✅ Timestamp accurate

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 19: Action Log - Transaction Recorded
**Objective:** Verify DEPOSIT action is logged

```sql
SELECT * FROM action_logs 
WHERE action_type = 'Dépôt' 
ORDER BY created_at DESC 
LIMIT 1;
```

**Expected Result:**
```
id | user_id | action_type | description | amount | created_at
---|---------|-------------|-------------|--------|---
10 | user-id | Dépôt | Deposit of 50000 FCFA | 50000 | 2024-01-15 10:40:00
```

**Assertions:**
- ✅ Action logged with correct type
- ✅ Amount recorded
- ✅ User who recorded logged
- ✅ Timestamp accurate
- ✅ Description includes details

**Sign-off:** [ ] Passed [ ] Failed

---

## ✅ PHASE 9.5: Performance (1 test)

### Test 20: Response Time Under Load
**Objective:** Verify response times are acceptable

**Tool:** Use Apache Bench or similar

```bash
# Test 100 requests with 10 concurrent
ab -n 100 -c 10 -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/clients
```

**Expected Performance:**
- Average response time: **< 200ms**
- Max response time: **< 500ms**
- Success rate: **> 99%**

**Assertions:**
- ✅ Mean response time < 200ms
- ✅ All requests successful
- ✅ No timeouts
- ✅ Database queries optimized (with indexes)

**Sign-off:** [ ] Passed [ ] Failed

---

### Test 21: Database Index Verification
**Objective:** Verify all indexes are in place

```sql
SELECT indexname, indexdef FROM pg_indexes 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

**Expected Indexes:**
- ✅ users: email (UNIQUE)
- ✅ users: role
- ✅ clients: membership_code (UNIQUE)
- ✅ clients: account_number (UNIQUE)
- ✅ transactions: client_id
- ✅ transactions: created_at
- ✅ cotisation_accounts: client_id
- ✅ action_logs: user_id
- ✅ action_logs: created_at

**Assertions:**
- ✅ All expected indexes exist
- ✅ UNIQUE constraints indexed
- ✅ Foreign keys indexed
- ✅ Query performance good

**Sign-off:** [ ] Passed [ ] Failed

---

## 📊 Test Summary

### Completion Checklist

**Phase 9.1 - Security:** [ ] [ ] [ ] [ ] [ ]  
**Phase 9.2 - Business Logic:** [ ] [ ] [ ] [ ] [ ] [ ] [ ]  
**Phase 9.3 - Data Integrity:** [ ] [ ] [ ] [ ]  
**Phase 9.4 - Logging:** [ ] [ ] [ ]  
**Phase 9.5 - Performance:** [ ] [ ]  

**Total Tests Passed:** ___/21  
**Total Tests Failed:** ___/21  
**Success Rate:** ____%

---

## 🎯 Sign-Off

**Tested By:** _______________  
**Date:** _______________  
**Time Spent:** _______________  
**Backend Status:** ✅ OPERATIONAL  

### Overall Assessment

- [ ] **PASS** - All 21 tests passed. Ready for PHASE 10.
- [ ] **CONDITIONAL PASS** - Minor issues found and documented. Proceed with caution.
- [ ] **FAIL** - Critical issues found. Do not proceed to production.

### Issues Found
```
[List any failures or issues discovered during testing]




```

### Recommendations
```
[Document any recommendations for improvement or follow-up]




```

### Sign-Off Authority
- **QA Lead:** _______________
- **Technical Lead:** _______________
- **Project Manager:** _______________

---

## 📚 Reference Documentation

- [PHASE 9 Executive Summary](./PHASES_9-11_EXECUTIVE_SUMMARY.md)
- [PHASE 10 Staging Procedures](./PHASE_10_STAGING.md)
- [PHASE 11 Production Runbook](./PHASE_11_PRODUCTION.md)
- [API Documentation](./USAGE_EXAMPLES.ts)
- [Database Schema](./prisma/schema.prisma)

---

**🚀 Next Steps:**
1. Complete all 21 tests ✅
2. Fill sign-off checklist above
3. Upon PASS: Proceed to PHASE 10
4. Upon FAIL: Log issues, fix, retry

**Questions?** Review [QUICK_START.md](./QUICK_START.md) for backend troubleshooting.
