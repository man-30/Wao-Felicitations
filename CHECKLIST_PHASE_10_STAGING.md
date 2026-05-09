# ✅ PHASE 10 — STAGING VALIDATION CHECKLIST

**Date**: May 9, 2026  
**Status**: 🔄 IN PROGRESS  
**Responsible**: QA Lead & DevOps Lead  

---

## 📋 1. PRÉREQUIS

- [x] Phase 9 tests passed (all API routes validated)
- [x] No critical errors in logs
- [x] Database `staging` is consistent
- [x] Backend fully tested on `dev`
- [x] QA team ready for UAT

---

## 🚀 2. MIGRATION & DEPLOYMENT

### Infrastructure
- [x] `.env.staging` created with Neon staging branch URLs
- [x] `MIGRATION_LOG_PHASE_6_8.md` documented
- [x] `npx prisma migrate deploy` on staging — ✅ SUCCESS
- [x] `npm run db:seed:staging` executed — ✅ SUCCESS
- [x] `npx prisma migrate status` — ✅ Database schema up to date

### Data Validation
- [x] 3 staging users created (admin, cashier, commercial)
- [x] 3 cash registers initialized (générale, produits_charges, assurance)
- [x] 2 clients created (apprenant + non-apprenant)
- [x] Accounts created and linked correctly
- [x] Sample transactions recorded

---

## 🧪 3. FUNCTIONAL TESTING (5 Critical Journeys)

### Journey 1: Apprenant Workflow
- [ ] Create apprenant client (phone, address, membership_code)
  - [ ] membership_code is unique
  - [ ] account_number auto-generated
- [ ] Create apprenant (guardian + caution)
  - [ ] All FK relationships valid
- [ ] Record daily contribution
  - [ ] Account balance updated
  - [ ] Status remains 'actif'
- [ ] Record advanced deposit (5 days)
  - [ ] 5 cotisation entries created
  - [ ] Dates correct
  - [ ] Total amount matches

### Journey 2: Non-Apprenant + Financing
- [ ] Create non-apprenant client
  - [ ] client_type = 'non_apprenant'
- [ ] Create financing account
  - [ ] status = 'actif'
  - [ ] Principal amount set
- [ ] Record contributions
  - [ ] Balance updates progressively
  - [ ] Status changes to 'solde' when completed
- [ ] Transfer to savings account
  - [ ] Transaction created
  - [ ] Financing balance decremented
  - [ ] Savings balance incremented

### Journey 3: Cashier & Admin Authorization
- [ ] Cashier records deposit
  - [ ] status = 'en_attente'
  - [ ] created_by_id = cashier id
- [ ] Admin validates deposit
  - [ ] status = 'approuve'
  - [ ] General cash register balance updated
- [ ] Verify action logs
  - [ ] 2 log entries (record + validate)
  - [ ] Timestamps correct
  - [ ] User roles recorded

### Journey 4: Employee Payment
- [ ] Admin creates employee payment
  - [ ] status = 'en_attente'
- [ ] Cashier processes payment
  - [ ] status = 'traite'
  - [ ] processed_by_id = cashier
- [ ] Verify payment history
  - [ ] All action logs present
  - [ ] Amounts correct

### Journey 5: Insurance Cash Management
- [ ] Apprenant creates insurance account
  - [ ] Insurance cash register credited
- [ ] Record insurance withdrawal
  - [ ] Motif recorded
  - [ ] Insurance balance decreased
- [ ] Verify transaction history
  - [ ] Withdrawal visible in transactions
  - [ ] Motif displayed

---

## 🔌 4. API TESTING (Postman)

**File**: `postman/PHASE_10_STAGING_TESTS.json`

- [ ] **POST /api/auth/login**
  - [ ] Admin login successful
  - [ ] Token returned
  - [ ] Token valid for 24h

- [ ] **POST /api/auth/logout**
  - [ ] Logout clears token
  - [ ] Subsequent requests return 401

- [ ] **POST /api/clients**
  - [ ] Create client with all fields
  - [ ] Membership code unique
  - [ ] Account number auto-generated

- [ ] **GET /api/clients/:clientId**
  - [ ] Retrieve client details
  - [ ] All fields present
  - [ ] Relationships loaded

- [ ] **POST /api/transactions**
  - [ ] Record deposit (cashier)
  - [ ] Record withdrawal (cashier)
  - [ ] Status = 'en_attente'

- [ ] **PUT /api/transactions/:id/validate**
  - [ ] Validate transaction (admin)
  - [ ] Status = 'approuve'
  - [ ] Cash register updated

- [ ] **POST /api/cotisations**
  - [ ] Record single cotisation
  - [ ] Account balance updated

- [ ] **POST /api/cotisations/advanced-deposit**
  - [ ] Record 5-day advanced deposit
  - [ ] 5 entries created
  - [ ] Total amount correct

- [ ] **POST /api/accounts/transfer-financing-to-savings**
  - [ ] Transfer from financing to savings
  - [ ] Both balances updated

- [ ] **GET /api/audit-logs**
  - [ ] Admin retrieves all logs
  - [ ] Logs are paginated
  - [ ] Timestamps sorted DESC

- [ ] **GET /api/audit-logs/user/:userId**
  - [ ] Retrieve user-specific logs
  - [ ] All user actions listed

- [ ] **GET /api/dashboard/stats**
  - [ ] Total clients counted
  - [ ] Total transactions counted
  - [ ] Cash register balances summed

- [ ] **POST /api/validation/cotisation-account-constraint**
  - [ ] Validate cotisation business rules
  - [ ] Error handling correct

---

## ⏱️ 5. REAL-TIME VERIFICATION

### WebSocket / Live Updates (If Implemented)
- [ ] Cashier records deposit
- [ ] Admin dashboard updates < 2 seconds
- [ ] No manual page refresh needed
- [ ] Data consistency across screens

### Polling (If WebSocket Not Used)
- [ ] Cashier records deposit
- [ ] Admin sees update within 5 seconds
- [ ] Data eventually consistent
- [ ] No duplicate records

---

## 📄 6. EXPORTS & SHARING

### PDF Generation
- [ ] Dashboard export as PDF
  - [ ] File generated successfully
  - [ ] Data accurate
  - [ ] File size < 5MB
  - [ ] Download works in browser

- [ ] Transaction report as PDF
  - [ ] Pagination correct
  - [ ] Totals accurate
  - [ ] Signatures present

- [ ] Cash register statement as PDF
  - [ ] Balance correct
  - [ ] Transaction count shown
  - [ ] Export timestamp present

### PNG/JPEG Receipt Sharing
- [ ] Generate transaction receipt
  - [ ] Image format: PNG or JPEG
  - [ ] Mobile-friendly dimensions
  - [ ] QR code present (if enabled)

- [ ] Share receipt via WhatsApp
  - [ ] Image link generated
  - [ ] WhatsApp opens with pre-filled message
  - [ ] Image displayable

- [ ] Share receipt via Email
  - [ ] Email template renders correctly
  - [ ] Image embedded or attached
  - [ ] Client receives email

- [ ] Download proof of payment
  - [ ] Cashier signature present
  - [ ] Timestamp accurate
  - [ ] Image optimized (< 1MB)

---

## 🚄 7. PERFORMANCE & LOAD TESTING

**Tool**: k6 (or Apache Bench)  
**Script**: `k6-staging.js`

### Setup
```bash
npm install -g k6
k6 run k6-staging.js
```

### Test Results
- [ ] 50 concurrent virtual users
- [ ] Duration: 3 minutes
- [ ] All requests complete without errors

### Metrics
- [ ] **Response Time**: 99% < 500ms
  - [ ] Target: ✅ PASS / ❌ FAIL
  - [ ] Actual: _____ ms

- [ ] **Error Rate**: < 1%
  - [ ] Target: ✅ PASS / ❌ FAIL
  - [ ] Actual: _____ %

- [ ] **Throughput**: > 100 req/s
  - [ ] Target: ✅ PASS / ❌ FAIL
  - [ ] Actual: _____ req/s

- [ ] **Database Connections**: < 100
  - [ ] Target: ✅ PASS / ❌ FAIL
  - [ ] Actual: _____ connections

### Resource Monitoring
```bash
# CPU Usage
watch -n 1 'top -bn1 | head -20'
```
- [ ] CPU < 70% under load
  - [ ] Target: ✅ PASS / ❌ FAIL
  - [ ] Actual: _____ %

```bash
# RAM Usage
free -h
```
- [ ] RAM < 80% used
  - [ ] Target: ✅ PASS / ❌ FAIL
  - [ ] Actual: _____ %

```bash
# Disk Space
df -h
```
- [ ] Disk > 20% free
  - [ ] Target: ✅ PASS / ❌ FAIL
  - [ ] Actual: _____ %

```bash
# DB Connections
psql -h staging-xxxxx.neon.tech -U neondb_owner -d neondb -c "SELECT count(*) FROM pg_stat_activity;"
```
- [ ] DB connections < 100
  - [ ] Target: ✅ PASS / ❌ FAIL
  - [ ] Actual: _____ connections

---

## 🔐 8. SECURITY VALIDATION

### JWT Token Security
- [ ] Valid token allows access
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Expired token returns 401
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Modified token returns 401
  - [ ] ✅ PASS / ❌ FAIL
- [ ] JWT_SECRET ≥ 32 characters
  - [ ] ✅ PASS / ❌ FAIL

### RBAC (Role-Based Access Control)
- [ ] Admin can perform all actions
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Cashier cannot delete users
  - [ ] Returns 403 Forbidden
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Commercial cannot export data
  - [ ] Returns 403 Forbidden
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Commercial can only access own zone
  - [ ] ✅ PASS / ❌ FAIL

### Data Encryption
- [ ] Sensitive fields encrypted (id_number, etc.)
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Cannot read encrypted fields directly from DB
  - [ ] ✅ PASS / ❌ FAIL
- [ ] ENCRYPTION_KEY ≥ 32 characters
  - [ ] ✅ PASS / ❌ FAIL

### No Secrets in Logs
- [ ] No passwords in application logs
  - [ ] ✅ PASS / ❌ FAIL
- [ ] No JWT tokens in logs
  - [ ] ✅ PASS / ❌ FAIL
- [ ] No API keys in logs
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Error messages don't leak info
  - [ ] ✅ PASS / ❌ FAIL

### SQL Injection Prevention
- [ ] All inputs parameterized
  - [ ] Prisma ORM used consistently
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Test with malicious inputs
  - [ ] All requests sanitized
  - [ ] ✅ PASS / ❌ FAIL

---

## 🔍 9. DATA INTEGRITY CHECKS

- [ ] No orphaned records (FK constraints enforced)
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Account balances correct (sum of transactions)
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Transaction totals match cash register balances
  - [ ] ✅ PASS / ❌ FAIL
- [ ] All audit logs present
  - [ ] ✅ PASS / ❌ FAIL
- [ ] Timestamps consistent (UTC)
  - [ ] ✅ PASS / ❌ FAIL

---

## 📝 10. KNOWN ISSUES & RESOLUTIONS

| Issue | Severity | Status | Resolution |
|-------|----------|--------|-----------|
| Example: Login timeout | Minor | [ ] Open | Increase timeout to 30s |
| | | | |
| | | | |

---

## ✅ 11. FINAL SIGN-OFF

### QA Lead Review
- [ ] All functional tests passed
- [ ] Performance meets targets
- [ ] Security validated
- [ ] Data integrity confirmed
- **Signature**: _________________________ **Date**: ____________
- **Status**: 🟢 APPROVED / 🔴 REJECTED / 🟡 CONDITIONAL

### DevOps Lead Review
- [ ] Infrastructure stable
- [ ] Monitoring configured
- [ ] Rollback plan tested
- [ ] Performance acceptable
- **Signature**: _________________________ **Date**: ____________
- **Status**: 🟢 APPROVED / 🔴 REJECTED / 🟡 CONDITIONAL

### Product Owner Review
- [ ] Business requirements met
- [ ] No blocking issues
- [ ] Ready for production
- **Signature**: _________________________ **Date**: ____________
- **Status**: 🟢 APPROVED / 🔴 REJECTED / 🟡 CONDITIONAL

---

## 🎯 FINAL VERDICT

**🟢 STAGING READY FOR PRODUCTION** (Phase 11)  
**OR**  
**🔴 STAGING REQUIRES FIXES** (List blockers above)

---

## 📞 COMMUNICATIONS

- [ ] Slack: Post summary in #deployments
- [ ] Email: Notify stakeholders
- [ ] Jira: Update issue status
- [ ] Wiki: Update deployment status

---

**Next**: Phase 11 — Production Promotion (staging → main)
