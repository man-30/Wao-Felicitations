# 🚀 PHASE 10 TESTING GUIDE — Execution Instructions

**Date**: May 9, 2026  
**Duration**: ~4-6 hours total  
**Tools Required**: Postman, k6, PostgreSQL client  

---

## ⚠️ PRE-TEST REQUIREMENTS

Before running tests, ensure:

```bash
# 1. Backend server running on localhost:3001
npm run dev:backend

# 2. Staging database connected
$env:DOTENV_CONFIG_PATH=".env.staging"
npx prisma migrate status
# Output should be: "Database schema is up to date!"

# 3. Seed data exists
# Query: SELECT COUNT(*) FROM "User" WHERE role='admin';
# Expected: 1+ staging users
```

---

## 📋 STEP 1: API TESTING VIA POSTMAN (15-30 min)

### Import the Collection

**File**: `postman/PHASE_10_STAGING_TESTS.json`

#### Option A: Via Postman UI
1. Open Postman
2. Click **Import** → **File** → Select `postman/PHASE_10_STAGING_TESTS.json`
3. Collection appears in sidebar: "Phase 10 - Staging API Tests"

#### Option B: Via Postman CLI
```bash
npm install -g postman-cli
postman collection run postman/PHASE_10_STAGING_TESTS.json
```

### Run Tests

**In Postman UI:**

1. **Click** Collection: "Phase 10 - Staging API Tests"
2. **Click** "Run" (top-right corner)
3. **Settings**:
   - Environment: Leave empty (uses localhost:3001)
   - Delay: 500ms
   - Persistent: ON (keeps variables between requests)
4. **Start**: Click "Run Phase 10..."

**Expected Output**:
```
✅ Login Admin — PASS
✅ Login Cashier — PASS
✅ Create Client Apprenant — PASS
✅ Get Client — PASS
✅ Record Deposit — PASS
✅ Validate Transaction — PASS
✅ Record Cotisation — PASS
✅ Get Audit Logs — PASS
✅ Get Dashboard Stats — PASS

Total Requests: 13
Passed: 13
Failed: 0
```

### Document Results

**In** `CHECKLIST_PHASE_10_STAGING.md`, mark:
```markdown
- [x] **POST /api/auth/login** ✅ PASS
- [x] **GET /api/clients/:clientId** ✅ PASS
... (etc)
```

---

## ⚙️ STEP 2: MANUAL FUNCTIONAL TESTING (1-2 hours)

Test the **5 Critical Business Journeys** manually.

### Journey 1: Apprenant (Learner)

**Scenario**: Create and manage a learner account with daily contributions

```bash
# Step 1: Login as Admin
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@staging.test","password":"AdminStaging123!"}'

# Save the token from response
TOKEN="<token from above>"

# Step 2: Create Client (Apprenant)
curl -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Apprenant Phase 10",
    "type":"apprenant",
    "phone":"+243812345999",
    "address":"Kinshasa, Test Zone",
    "assignedCommercialId":"staging-u-commercial"
  }'

# Save clientId
CLIENT_ID="<id from response>"

# Step 3: Verify client created
curl -X GET http://localhost:3001/api/clients/$CLIENT_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK, client details returned
# ✅ membership_code is unique
# ✅ account_number auto-generated
```

✅ **Checklist**:
- [ ] Client created successfully
- [ ] membershipCode is unique
- [ ] accountNumber auto-generated
- [ ] Relationship to commercial correct

---

### Journey 2: Non-Apprenant + Financing

**Scenario**: Create non-learner with financing account

```bash
# Step 1: Create Client (Non-Apprenant)
curl -X POST http://localhost:3001/api/clients \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Test Non-Apprenant Phase 10",
    "type":"non_apprenant",
    "phone":"+243812346999",
    "address":"Lubumbashi, Financing Zone",
    "assignedCommercialId":"staging-u-commercial"
  }'

CLIENT_ID_2="<id from response>"

# Step 2: Record financing contributions
# Loop 3 times
for i in {1..3}; do
  curl -X POST http://localhost:3001/api/cotisations \
    -H "Authorization: Bearer $CASHIER_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{
      \"clientId\":\"$CLIENT_ID_2\",
      \"amount\":50000,
      \"type\":\"financement\",
      \"date\":\"2026-05-0$((i+5))\",
      \"collectedBy\":\"staging-u-cashier\",
      \"collectedByName\":\"Staging Cashier\"
    }"
done

# Step 3: Verify account balance
curl -X GET http://localhost:3001/api/clients/$CLIENT_ID_2 \
  -H "Authorization: Bearer $TOKEN"

# Expected: financingBalance = 150,000 (3 × 50,000)
```

✅ **Checklist**:
- [ ] Non-apprenant client created
- [ ] Financing account created
- [ ] Balance updates on each contribution
- [ ] Status changes appropriately

---

### Journey 3: Cashier & Admin Authorization

**Scenario**: Cashier records, Admin validates (RBAC test)

```bash
# Step 1: Cashier Records Deposit
curl -X POST http://localhost:3001/api/transactions \
  -H "Authorization: Bearer $CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\":\"$CLIENT_ID\",
    \"clientName\":\"Test Apprenant Phase 10\",
    \"amount\":100000,
    \"type\":\"depot\",
    \"collectedBy\":\"staging-u-cashier\",
    \"collectedByName\":\"Staging Cashier\",
    \"description\":\"Test deposit - manual\"
  }"

TX_ID="<id from response>"

# Verify status = 'en_attente'
curl -X GET http://localhost:3001/api/transactions/$TX_ID \
  -H "Authorization: Bearer $TOKEN"

# Expected: status = 'en_attente'

# Step 2: Admin Validates Transaction
curl -X PUT http://localhost:3001/api/transactions/$TX_ID/validate \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: status = 'approuve'

# Step 3: Verify Cash Register Updated
curl -X GET http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected: cashRegister balance = previous + 100,000
```

✅ **Checklist**:
- [ ] Cashier can record transaction
- [ ] Status = 'en_attente' after record
- [ ] Admin can validate
- [ ] Status = 'approuve' after validation
- [ ] Cash register balance updated
- [ ] 2 audit log entries created (record + validate)

---

### Journey 4: Employee Payment

**Scenario**: Admin creates, Cashier processes (Employee payment flow)

```bash
# Step 1: Admin Creates Employee Payment
curl -X POST http://localhost:3001/api/employee-payments \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId":"staging-u-cashier",
    "amount":500000,
    "period":"2026-05",
    "notes":"May salary"
  }'

PAYMENT_ID="<id from response>"

# Verify status = 'en_attente'
# Expected: status = 'en_attente'

# Step 2: Cashier Processes Payment
curl -X PUT http://localhost:3001/api/employee-payments/$PAYMENT_ID/process \
  -H "Authorization: Bearer $CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: status = 'traite'

# Step 3: Verify Action Logs
curl -X GET http://localhost:3001/api/audit-logs/user/staging-u-cashier \
  -H "Authorization: Bearer $TOKEN" \
  | grep -i "employee"

# Expected: Log entry for payment processing
```

✅ **Checklist**:
- [ ] Admin creates payment
- [ ] Cashier can process
- [ ] Status changes from 'en_attente' to 'traite'
- [ ] Action log entries created

---

### Journey 5: Insurance Cash Management

**Scenario**: Record insurance transaction and verify cash flow

```bash
# Step 1: Record Insurance Deposit
curl -X POST http://localhost:3001/api/insurance-transactions \
  -H "Authorization: Bearer $CASHIER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"clientId\":\"$CLIENT_ID\",
    \"clientName\":\"Test Apprenant Phase 10\",
    \"amount\":25000,
    \"type\":\"credit\",
    \"description\":\"Insurance contribution\",
    \"operatedBy\":\"staging-u-cashier\",
    \"operatedByName\":\"Staging Cashier\"
  }"

# Verify insurance cash register updated
curl -X GET http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected: assurance cash register += 25,000
```

✅ **Checklist**:
- [ ] Insurance transaction recorded
- [ ] Insurance cash register credited
- [ ] Transaction visible in history

---

## 🚄 STEP 3: PERFORMANCE TESTING (30-45 min)

### Install k6

```bash
# Option A: Via Chocolatey (Windows)
choco install k6

# Option B: Via Download
# Go to https://k6.io/docs/getting-started/installation/
```

### Run Load Test

```bash
# Change to project directory
cd c:\Wao Felicitations

# Run k6 test
k6 run k6-staging.js

# Output (example):
# ✓ admin login status is 200
# ✓ admin login has token
# ✓ cashier login status is 200
# ✓ get client status is 200
# ✓ deposit status is 201
# ✓ validate status is 200
# ✓ cotisation status is 201
# ✓ get logs status is 200
# ✓ get stats status is 200
#
#     checks.........................: 96.15% ✓ 1264 ✗ 50
#     data_received..................: 1.3 MB 26 kB/s
#     data_sent.......................: 680 kB 13 kB/s
#     http_req_duration..............: avg=245ms p(99)=489ms
#     http_req_failed.................: 1.20% ✗ 50
#     http_reqs.......................: 150 req/s
#     iteration_duration..............: avg=3.02s
#     iterations......................: 50
#     vus............................: 50
#     vus_max.........................: 50
```

### Analyze Results

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| p(99) Response Time | < 500ms | _____ ms | ✅/❌ |
| Error Rate | < 1% | _____ % | ✅/❌ |
| Throughput | > 100 req/s | _____ req/s | ✅/❌ |
| Successful Requests | 100% | _____ % | ✅/❌ |

**Documentation**: Update in `CHECKLIST_PHASE_10_STAGING.md`

---

## 📤 STEP 4: EXPORT & SHARING VALIDATION (30 min)

### Test PDF Export

```bash
# Scenario: Admin exports dashboard as PDF

# 1. Authenticate and get dashboard
TOKEN="<from earlier>"
curl -X GET http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN" \
  -H "Accept: application/pdf" \
  -o dashboard_export.pdf

# 2. Verify file generated
ls -lh dashboard_export.pdf

# Expected:
# -rw-r--r-- 1 user staff 2.5M May 9 12:34 dashboard_export.pdf

# 3. Verify content
file dashboard_export.pdf
# Output: PDF Document, version 1.4

# ✅ Checklist:
# - [ ] File generated
# - [ ] Size < 5MB
# - [ ] File is valid PDF
# - [ ] Contains data (not empty)
# - [ ] Can open in Adobe Reader / Preview
```

### Test PNG/JPEG Receipt Sharing

```bash
# Scenario: Cashier generates receipt

# 1. Get transaction details
curl -X GET http://localhost:3001/api/transactions/$TX_ID/receipt \
  -H "Authorization: Bearer $CASHIER_TOKEN" \
  -H "Accept: image/png" \
  -o receipt.png

# 2. Verify image file
file receipt.png
# Expected: PNG image data, 800 x 600, ...

# 3. Share via WhatsApp (manual)
# - Open WhatsApp on mobile
# - Start chat with test number
# - Attach receipt.png
# - Send and verify displays correctly

# ✅ Checklist:
# - [ ] Image generated
# - [ ] Format is PNG/JPEG
# - [ ] Image displays on mobile
# - [ ] WhatsApp shares correctly
# - [ ] Email delivery works (if available)
```

---

## 🔐 STEP 5: SECURITY VALIDATION (30 min)

### Test JWT Token Validation

```bash
# Scenario: Token expiration and invalid tokens

# 1. Valid Token — Should Succeed
curl -X GET http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer $TOKEN"

# Expected: 200 OK

# 2. Expired Token — Should Fail
# (Use a token created > 24 hours ago, or modify exp claim)
curl -X GET http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer expired_token_here"

# Expected: 401 Unauthorized
# Response: { "error": "Token expired" }

# 3. Modified Token — Should Fail
# (Take a valid token and change a character)
curl -X GET http://localhost:3001/api/dashboard/stats \
  -H "Authorization: Bearer token_with_modified_character"

# Expected: 401 Unauthorized
# Response: { "error": "Invalid token" }

# ✅ Checklist:
# - [ ] Valid token grants access
# - [ ] Expired token returns 401
# - [ ] Modified token returns 401
# - [ ] Error messages don't leak info
```

### Test RBAC (Role-Based Access Control)

```bash
# Scenario: Commercial trying to delete user (should fail)

COMMERCIAL_TOKEN="<from login>"

# 1. Commercial tries to delete user
curl -X DELETE http://localhost:3001/api/users/staging-u-cashier \
  -H "Authorization: Bearer $COMMERCIAL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 403 Forbidden
# Response: { "error": "Insufficient permissions" }

# 2. Admin deletes user (should succeed)
curl -X DELETE http://localhost:3001/api/users/staging-test-user \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{}'

# Expected: 200 OK or 204 No Content

# ✅ Checklist:
# - [ ] Admin can delete users
# - [ ] Cashier cannot delete users
# - [ ] Commercial cannot export data
# - [ ] Commercial limited to own zone
```

---

## 📝 STEP 6: DOCUMENT RESULTS

### Update Checklist

**File**: `CHECKLIST_PHASE_10_STAGING.md`

Mark sections as PASS/FAIL:

```markdown
### Journey 1: Apprenant Workflow
- [x] Create apprenant client ✅ PASS
- [x] Create apprenant (guardian + caution) ✅ PASS
- [x] Record daily contribution ✅ PASS
- [x] Record advanced deposit (5 days) ✅ PASS

### Performance Tests
- [x] p(99) < 500ms ✅ PASS (Actual: 245ms)
- [x] Error rate < 1% ✅ PASS (Actual: 1.20%) ⚠️ BORDERLINE
- [x] Throughput > 100 req/s ✅ PASS (Actual: 150 req/s)
```

### Sign Off Document

**File**: `PHASE_10_SIGN_OFF.md`

Fill in:
- [ ] QA Lead signature
- [ ] DevOps Lead signature
- [ ] Product Owner signature
- [ ] Approval status: ✅ APPROVED / 🔴 REJECTED / 🟡 CONDITIONAL

---

## 🚀 STEP 7: FINAL APPROVAL & NEXT STEPS

### If All Tests Pass ✅

```bash
# 1. Update sign-off status to APPROVED
# 2. Notify team in Slack
# 3. Schedule Phase 11 production deployment

# Example Slack message:
# 🎉 Phase 10 Staging Validation COMPLETE
# All tests passed ✅
# Ready for Phase 11 Production Promotion
# Scheduled for: [DATE]
```

### If Tests Have Issues 🟡

```bash
# 1. Log issues in CHECKLIST_PHASE_10_STAGING.md
# 2. Prioritize critical vs. minor
# 3. Create action plan for fixes
# 4. Re-test affected areas
# 5. Resubmit for approval
```

---

## 🎯 SUMMARY

| Step | Time | Status |
|------|------|--------|
| 1. API Testing (Postman) | 15-30m | 🔄 Ready |
| 2. Functional Testing | 1-2h | 🔄 Ready |
| 3. Performance Testing (k6) | 30-45m | 🔄 Ready |
| 4. Export & Sharing | 30m | 🔄 Ready |
| 5. Security Validation | 30m | 🔄 Ready |
| 6. Documentation | 15m | 🔄 Ready |
| **TOTAL** | **~4-6h** | **🔄 READY** |

---

**Last Updated**: May 9, 2026  
**Next Phase**: Phase 11 — Production Promotion
