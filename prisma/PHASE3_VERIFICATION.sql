-- PHASE 3 - Vérification des Tables et Contraintes
-- Généré automatiquement via Prisma db:push

-- ===================================
-- BLOC A - Tables sans dépendances
-- ===================================

-- ✅ Table: users
SELECT tablename FROM pg_tables WHERE tablename = 'User' AND schemaname = 'public';
SELECT * FROM information_schema.columns WHERE table_name = 'User' LIMIT 10;
SELECT * FROM pg_indexes WHERE tablename = 'User';

-- ✅ Table: guardians  
SELECT tablename FROM pg_tables WHERE tablename = 'Guardian' AND schemaname = 'public';
SELECT * FROM information_schema.columns WHERE table_name = 'Guardian' LIMIT 10;

-- ✅ Table: cautions
SELECT tablename FROM pg_tables WHERE tablename = 'Caution' AND schemaname = 'public';
SELECT * FROM information_schema.columns WHERE table_name = 'Caution' LIMIT 10;

-- ✅ Table: cash_registers
SELECT tablename FROM pg_tables WHERE tablename = 'CashRegister' AND schemaname = 'public';
SELECT * FROM information_schema.columns WHERE table_name = 'CashRegister' LIMIT 10;

-- ===================================
-- BLOC B - Tables FK→users
-- ===================================

-- ✅ Table: clients
SELECT * FROM information_schema.table_constraints WHERE table_name = 'Client' AND constraint_type = 'FOREIGN KEY';

-- ✅ Table: admin_code_requests
SELECT * FROM information_schema.table_constraints WHERE table_name = 'AdminCodeRequest' AND constraint_type = 'FOREIGN KEY';

-- ✅ Table: employee_payments
SELECT * FROM information_schema.table_constraints WHERE table_name = 'EmployeePayment' AND constraint_type = 'FOREIGN KEY';

-- ✅ Table: expenses
SELECT * FROM information_schema.table_constraints WHERE table_name = 'Expense' AND constraint_type = 'FOREIGN KEY';

-- ✅ Table: product_revenues
SELECT * FROM information_schema.table_constraints WHERE table_name = 'ProductRevenue' AND constraint_type = 'FOREIGN KEY';

-- ===================================
-- BLOC C - Tables FK→clients
-- ===================================

-- ✅ Table: accounts
SELECT * FROM information_schema.table_constraints WHERE table_name = 'Account' AND constraint_type = 'FOREIGN KEY';

-- ✅ Table: apprenants
SELECT * FROM information_schema.table_constraints WHERE table_name = 'Apprenant' AND constraint_type = 'FOREIGN KEY';

-- ✅ Table: non_apprenants
SELECT * FROM information_schema.table_constraints WHERE table_name = 'NonApprenant' AND constraint_type = 'FOREIGN KEY';

-- ===================================
-- BLOC D - Tables FK→apprenants/non_apprenants
-- ===================================

-- ✅ Table: cotisation_accounts (TontineAccount)
SELECT * FROM information_schema.table_constraints WHERE table_name = 'TontineAccount' AND constraint_type = 'CHECK';
SELECT * FROM information_schema.table_constraints WHERE table_name = 'TontineAccount' AND constraint_type = 'FOREIGN KEY';

-- ✅ Table: financement_non_apprenants
SELECT * FROM information_schema.table_constraints WHERE table_name = 'FinancementNonApprenant' AND constraint_type = 'FOREIGN KEY';

-- ===================================
-- BLOC E - Tables FK→cotisation_accounts
-- ===================================

-- ✅ Table: cotisations
SELECT * FROM information_schema.table_constraints WHERE table_name = 'Cotisation' AND constraint_type = 'FOREIGN KEY';

-- ===================================
-- BLOC F - Tables transactionnelles
-- ===================================

-- ✅ Table: transactions
SELECT * FROM information_schema.table_constraints WHERE table_name = 'Transaction' AND constraint_type = 'FOREIGN KEY';

-- ✅ Table: insurance_transactions
SELECT * FROM information_schema.table_constraints WHERE table_name = 'InsuranceTransaction' AND constraint_type = 'FOREIGN KEY';

-- ===================================
-- BLOC G - Table d'audit
-- ===================================

-- ✅ Table: action_logs
SELECT * FROM information_schema.table_constraints WHERE table_name = 'ActionLog' AND constraint_type = 'FOREIGN KEY';

-- ===================================
-- Résumé: Vérifier tous les ENUMS
-- ===================================

SELECT n.nspname, t.typname, e.enumlabel
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_namespace n ON t.typnamespace = n.oid
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumlabel;
