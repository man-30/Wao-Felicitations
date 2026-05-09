-- PHASE 4 - Création et Vérification des Index
-- Généré automatiquement via Prisma

-- ===================================
-- VÉRIFICATION DES INDEX
-- ===================================

-- Tous les index créés par Prisma
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Compter les index par table
SELECT 
    tablename,
    COUNT(*) as nombre_index
FROM pg_indexes
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ===================================
-- DÉTAILS DES INDEX CRITIQUES
-- ===================================

-- Index sur User
SELECT * FROM pg_indexes WHERE tablename = 'User' AND schemaname = 'public';

-- Index sur Client
SELECT * FROM pg_indexes WHERE tablename = 'Client' AND schemaname = 'public';

-- Index sur Apprenant
SELECT * FROM pg_indexes WHERE tablename = 'Apprenant' AND schemaname = 'public';

-- Index sur NonApprenant
SELECT * FROM pg_indexes WHERE tablename = 'NonApprenant' AND schemaname = 'public';

-- Index sur TontineAccount (cotisation_accounts)
SELECT * FROM pg_indexes WHERE tablename = 'TontineAccount' AND schemaname = 'public';

-- Index sur Cotisation
SELECT * FROM pg_indexes WHERE tablename = 'Cotisation' AND schemaname = 'public';

-- Index sur FinancementNonApprenant
SELECT * FROM pg_indexes WHERE tablename = 'FinancementNonApprenant' AND schemaname = 'public';

-- Index sur Account
SELECT * FROM pg_indexes WHERE tablename = 'Account' AND schemaname = 'public';

-- Index sur Transaction
SELECT * FROM pg_indexes WHERE tablename = 'Transaction' AND schemaname = 'public';

-- Index sur InsuranceTransaction
SELECT * FROM pg_indexes WHERE tablename = 'InsuranceTransaction' AND schemaname = 'public';

-- Index sur CashRegister
SELECT * FROM pg_indexes WHERE tablename = 'CashRegister' AND schemaname = 'public';

-- Index sur Expense
SELECT * FROM pg_indexes WHERE tablename = 'Expense' AND schemaname = 'public';

-- Index sur ProductRevenue
SELECT * FROM pg_indexes WHERE tablename = 'ProductRevenue' AND schemaname = 'public';

-- Index sur EmployeePayment
SELECT * FROM pg_indexes WHERE tablename = 'EmployeePayment' AND schemaname = 'public';

-- Index sur ActionLog
SELECT * FROM pg_indexes WHERE tablename = 'ActionLog' AND schemaname = 'public';

-- ===================================
-- STATISTIQUES DE PERFORMANCE
-- ===================================

-- Taille des tables (avec index)
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as taille_totale
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Taille des index
SELECT
    schemaname,
    tablename,
    indexname,
    pg_size_pretty(pg_relation_size(indexrelid)) as taille_index
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(indexrelid) DESC;
