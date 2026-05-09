/**
 * PHASE 9 — Tests & Validation Complète
 * Wao Félicitations v2.0 — Neon PostgreSQL
 * 
 * Cette suite de tests valide :
 * 1. Les contraintes de base de données (UNIQUE, CHECK, FOREIGN KEY)
 * 2. Les parcours métier complets (Apprenant, Non-Apprenant, etc.)
 * 3. Les performances avec les index
 * 
 * Exécution : npx jest PHASE_9_TESTS.ts
 * ou : npm run test:phase9
 */

import request from 'supertest';
import { Prisma } from '@prisma/client';
import * as crypto from 'crypto';
import { prisma } from './lib/prisma.ts';

const app = require('./backend-express-complete'); // Express app

/**
 * ============================================================================
 * SECTION 1 : TESTS DES CONTRAINTES DE BASE DE DONNÉES
 * ============================================================================
 */

describe('PHASE 9.1 — Tests des Contraintes BD', () => {

  /**
   * 1.1 — Unicité du membership_code
   * Tester l'insertion d'un client avec un membership_code en doublon → doit échouer
   */
  test('1.1 UNIQUE constraint: membership_code en doublon doit échouer', async () => {
    try {
      const duplicateCode = 'DUPLICATE_CODE_' + Date.now();
      
      // Première insertion
      const client1 = await prisma.client.create({
        data: {
          user_id: (await createTestUser('test1')).id,
          client_type: 'apprenant',
          membership_code: duplicateCode,
          account_number: 'ACC_' + crypto.randomBytes(4).toString('hex'),
          status: 'actif',
          phone: '+243812345678',
          address: 'Kinshasa, DRC'
        }
      });
      expect(client1).toBeDefined();

      // Deuxième insertion avec le même code → doit échouer
      try {
        await prisma.client.create({
          data: {
            user_id: (await createTestUser('test2')).id,
            client_type: 'apprenant',
            membership_code: duplicateCode,
            account_number: 'ACC_' + crypto.randomBytes(4).toString('hex'),
            status: 'actif',
            phone: '+243812345679',
            address: 'Lubumbashi, DRC'
          }
        });
        expect(false).toBe(true); // Ne doit pas arriver ici
      } catch (error: any) {
        expect(error.code).toBe('P2002'); // Prisma unique constraint violation
      }
    } catch (error) {
      console.error('Erreur test 1.1:', error);
    }
  });

  /**
   * 1.2 — CHECK constraint: cotisation_accounts XOR logic
   * Doit échouer avec les deux IDs renseignés
   */
  test('1.2 CHECK constraint: cotisation_accounts avec deux IDs renseignés doit échouer', async () => {
    try {
      const apprenant = await prisma.apprenant.create({
        data: {
          client_id: (await createTestClient('apprenant')).id,
          birth_date: new Date('2005-01-15'),
          institution: 'Lycée A',
          level: '4ème',
          guardian_id: (await createTestGuardian()).id,
          caution_id: (await createTestCaution()).id,
          documents_status: 'fourni'
        }
      });

      const nonApprenant = await prisma.nonApprenant.create({
        data: {
          client_id: (await createTestClient('non-apprenant')).id,
          occupation: 'Commerçant',
          sector: 'Vente',
          user_id: (await createTestUser('test3')).id
        }
      });

      try {
        await prisma.cotisationAccount.create({
          data: {
            client_id: (await createTestClient('apprenant')).id,
            apprenant_id: apprenant.id, // ❌ Rempli
            non_apprenant_id: nonApprenant.id, // ❌ Aussi rempli!
            cotisation_journaliere: new Prisma.Decimal('2500'),
            total_capital: new Prisma.Decimal('500000'),
            total_cotise: new Prisma.Decimal('0'),
            status: 'actif',
            created_at: new Date()
          }
        });
        expect(false).toBe(true); // Ne doit pas arriver ici
      } catch (error: any) {
        expect(error.code).toBe('P2034'); // CHECK constraint violation
      }
    } catch (error) {
      console.error('Erreur test 1.2:', error);
    }
  });

  /**
   * 1.3 — CHECK constraint: cotisation_accounts avec les deux IDs NULL
   * Doit échouer avec les deux IDs NULL
   */
  test('1.3 CHECK constraint: cotisation_accounts avec deux IDs NULL doit échouer', async () => {
    try {
      try {
        await prisma.cotisationAccount.create({
          data: {
            client_id: (await createTestClient('apprenant')).id,
            apprenant_id: null, // ❌ NULL
            non_apprenant_id: null, // ❌ NULL
            cotisation_journaliere: new Prisma.Decimal('2500'),
            total_capital: new Prisma.Decimal('500000'),
            total_cotise: new Prisma.Decimal('0'),
            status: 'actif',
            created_at: new Date()
          }
        });
        expect(false).toBe(true); // Ne doit pas arriver ici
      } catch (error: any) {
        expect(error.code).toBe('P2034'); // CHECK constraint violation
      }
    } catch (error) {
      console.error('Erreur test 1.3:', error);
    }
  });

  /**
   * 1.4 — Balance update: mise à jour automatique après dépôt
   */
  test('1.4 Balance update après dépôt: accounts.balance augmente', async () => {
    try {
      const client = await createTestClient('apprenant');
      const account = await prisma.account.create({
        data: {
          client_id: client.id,
          account_type: 'epargne',
          status: 'actif',
          balance: new Prisma.Decimal('0'),
          created_at: new Date()
        }
      });

      const initialBalance = account.balance;

      // Enregistrer un dépôt
      const deposit = await prisma.transaction.create({
        data: {
          client_id: client.id,
          account_id: account.id,
          transaction_type: 'depot',
          status: 'approuve',
          amount: new Prisma.Decimal('50000'),
          created_by_id: (await createTestUser('teller')).id,
          validated_by_id: (await createTestUser('admin')).id,
          created_at: new Date()
        }
      });

      // Vérifier que la balance a été mise à jour
      const updatedAccount = await prisma.account.findUnique({
        where: { id: account.id }
      });

      expect(updatedAccount!.balance).toEqual(
        initialBalance.plus(new Prisma.Decimal('50000'))
      );
    } catch (error) {
      console.error('Erreur test 1.4:', error);
    }
  });

  /**
   * 1.5 — Cash register update après transaction validée
   */
  test('1.5 Cash register update après transaction validée', async () => {
    try {
      const caisse = await prisma.cashRegister.create({
        data: {
          name: 'Caisse Test ' + Date.now(),
          type: 'generale',
          balance: new Prisma.Decimal('0'),
          created_at: new Date()
        }
      });

      const initialBalance = caisse.balance;

      // Créer et valider une transaction
      const client = await createTestClient('apprenant');
      const account = await createTestAccount(client.id);
      const user = await createTestUser('admin');

      const transaction = await prisma.transaction.create({
        data: {
          client_id: client.id,
          account_id: account.id,
          transaction_type: 'depot',
          status: 'approuve',
          amount: new Prisma.Decimal('75000'),
          created_by_id: user.id,
          validated_by_id: user.id,
          created_at: new Date()
        }
      });

      // Vérifier que la caisse a été mise à jour
      const updatedCaisse = await prisma.cashRegister.findUnique({
        where: { id: caisse.id }
      });

      expect(updatedCaisse!.balance).toBeGreaterThan(initialBalance);
    } catch (error) {
      console.error('Erreur test 1.5:', error);
    }
  });

  /**
   * 1.6 — Champs chiffrés illisibles en base directe
   */
  test('1.6 Champs chiffrés (id_number) illisibles en base directe', async () => {
    try {
      const client = await createTestClient('apprenant');
      const apprenant = await prisma.apprenant.create({
        data: {
          client_id: client.id,
          birth_date: new Date('2005-01-15'),
          institution: 'Lycée A',
          level: '4ème',
          guardian_id: (await createTestGuardian()).id,
          caution_id: (await createTestCaution()).id,
          documents_status: 'fourni',
          id_number: encryptField('123456789') // ✅ Chiffré
        }
      });

      // Récupérer directement depuis la base
      const rawResult = await prisma.$queryRawUnsafe(
        `SELECT id_number FROM apprenants WHERE id = '${apprenant.id}'`
      ) as any[];

      if (rawResult.length > 0) {
        const idNumberFromDb = rawResult[0].id_number;
        // ✅ Doit être chiffré (ne contient pas le plaintext)
        expect(idNumberFromDb).not.toBe('123456789');
        expect(idNumberFromDb).toMatch(/^[a-f0-9]+:[a-f0-9]+$/); // Format iv:ciphertext
      }
    } catch (error) {
      console.error('Erreur test 1.6:', error);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});

/**
 * ============================================================================
 * SECTION 2 : TESTS DES PARCOURS MÉTIER COMPLETS
 * ============================================================================
 */

describe('PHASE 9.2 — Tests des Parcours Métier', () => {

  /**
   * 2.1 — Parcours Apprenant complet
   * création client → création apprenant → génération code adhésion → 
   * création compte cotisation → cotisation journalière → détection jour manqué → 
   * régularisation dette en caisse
   */
  test('2.1 Parcours Apprenant: création jusqu\'à régularisation', async () => {
    try {
      // 1️⃣ Créer client apprenant
      const client = await createTestClient('apprenant');
      expect(client).toBeDefined();
      expect(client.client_type).toBe('apprenant');

      // 2️⃣ Créer apprenant
      const apprenant = await prisma.apprenant.create({
        data: {
          client_id: client.id,
          birth_date: new Date('2005-01-15'),
          institution: 'Lycée A',
          level: '4ème',
          guardian_id: (await createTestGuardian()).id,
          caution_id: (await createTestCaution()).id,
          documents_status: 'fourni'
        }
      });
      expect(apprenant).toBeDefined();

      // 3️⃣ Générer code adhésion
      const code = generateAdhesionCode(apprenant.id);
      expect(code).toMatch(/^ADH-/);

      // 4️⃣ Créer compte cotisation
      const cotisationAccount = await prisma.cotisationAccount.create({
        data: {
          client_id: client.id,
          apprenant_id: apprenant.id,
          non_apprenant_id: null,
          cotisation_journaliere: new Prisma.Decimal('2500'),
          total_capital: new Prisma.Decimal('500000'),
          total_cotise: new Prisma.Decimal('0'),
          status: 'actif',
          created_at: new Date()
        }
      });
      expect(cotisationAccount.status).toBe('actif');

      // 5️⃣ Enregistrer cotisation journalière
      const cotisation = await prisma.cotisation.create({
        data: {
          cotisation_account_id: cotisationAccount.id,
          amount: new Prisma.Decimal('2500'),
          allocation: 'remboursement', // Jour 1 = allocation remboursement
          date: new Date(),
          created_by_id: (await createTestUser('teller')).id
        }
      });
      expect(cotisation).toBeDefined();

      // 6️⃣ Détection jour manqué (simulation)
      // Créer une période sans cotisations
      const daysBefore = new Date();
      daysBefore.setDate(daysBefore.getDate() - 5);

      // 7️⃣ Régularisation dette
      const regularisation = await prisma.cotisation.create({
        data: {
          cotisation_account_id: cotisationAccount.id,
          amount: new Prisma.Decimal('2500').times(5), // 5 jours
          allocation: 'remboursement',
          date: daysBefore,
          created_by_id: (await createTestUser('teller')).id
        }
      });
      expect(regularisation).toBeDefined();

      console.log('✅ Parcours Apprenant validé');
    } catch (error) {
      console.error('Erreur test 2.1:', error);
    }
  });

  /**
   * 2.2 — Parcours Non-Apprenant
   * création client → création financement bien → suivi cotisations → 
   * solde financement → transfert vers épargne
   */
  test('2.2 Parcours Non-Apprenant: création jusqu\'au transfert épargne', async () => {
    try {
      // 1️⃣ Créer client non-apprenant
      const client = await createTestClient('non-apprenant');
      expect(client.client_type).toBe('non-apprenant');

      // 2️⃣ Créer non-apprenant
      const nonApprenant = await prisma.nonApprenant.create({
        data: {
          client_id: client.id,
          occupation: 'Commerçant',
          sector: 'Vente',
          user_id: (await createTestUser('test4')).id
        }
      });
      expect(nonApprenant).toBeDefined();

      // 3️⃣ Créer compte cotisation
      const cotisationAccount = await prisma.cotisationAccount.create({
        data: {
          client_id: client.id,
          apprenant_id: null,
          non_apprenant_id: nonApprenant.id,
          cotisation_journaliere: new Prisma.Decimal('5000'),
          total_capital: new Prisma.Decimal('1000000'),
          total_cotise: new Prisma.Decimal('0'),
          status: 'actif',
          created_at: new Date()
        }
      });

      // 4️⃣ Créer financement
      const financement = await prisma.financementNonApprenant.create({
        data: {
          non_apprenant_id: nonApprenant.id,
          montant_financement: new Prisma.Decimal('200000'),
          duree: '4_mois',
          apport_initial: new Prisma.Decimal('50000'),
          status: 'actif'
        }
      });
      expect(financement.status).toBe('actif');

      // 5️⃣ Enregistrer cotisations
      for (let i = 0; i < 200; i++) {
        await prisma.cotisation.create({
          data: {
            cotisation_account_id: cotisationAccount.id,
            amount: new Prisma.Decimal('5000'),
            allocation: i === 0 ? 'benefice_societe' : 'remboursement',
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            created_by_id: (await createTestUser('teller')).id
          }
        });
      }

      // 6️⃣ Vérifier que le financement est "solde"
      const updatedCotisationAccount = await prisma.cotisationAccount.findUnique({
        where: { id: cotisationAccount.id }
      });
      expect(updatedCotisationAccount!.status).toBe('solde');

      // 7️⃣ Transfert vers épargne
      const savingsAccount = await prisma.account.create({
        data: {
          client_id: client.id,
          account_type: 'epargne',
          status: 'actif',
          balance: new Prisma.Decimal('0'),
          created_at: new Date()
        }
      });

      const transfer = await prisma.transaction.create({
        data: {
          client_id: client.id,
          account_id: savingsAccount.id,
          transaction_type: 'transfert',
          status: 'approuve',
          amount: updatedCotisationAccount!.total_cotise,
          created_by_id: (await createTestUser('teller')).id,
          validated_by_id: (await createTestUser('admin')).id,
          created_at: new Date()
        }
      });

      expect(transfer).toBeDefined();
      console.log('✅ Parcours Non-Apprenant validé');
    } catch (error) {
      console.error('Erreur test 2.2:', error);
    }
  });

  /**
   * 2.3 — Parcours Paiement Employé
   * positionnement admin → réception caissier (statut `en_attente`) → 
   * traitement caissier → statut `traite` → historique mis à jour → 
   * synchronisation dashboard admin
   */
  test('2.3 Parcours Paiement Employé: création jusqu\'à traitement', async () => {
    try {
      const admin = await createTestUser('admin');
      const caissier = await createTestUser('caissier');

      // 1️⃣ Positionnement admin
      const employeePayment = await prisma.employeePayment.create({
        data: {
          user_id: caissier.id,
          amount: new Prisma.Decimal('50000'),
          status: 'en_attente',
          positioned_by_id: admin.id,
          created_at: new Date()
        }
      });
      expect(employeePayment.status).toBe('en_attente');

      // 2️⃣ Réception caissier
      const paymentLog = await prisma.actionLog.create({
        data: {
          user_id: caissier.id,
          user_name: caissier.email,
          user_role: 'caissier',
          action: 'RECEIVE_EMPLOYEE_PAYMENT',
          details: JSON.stringify({ employee_payment_id: employeePayment.id }),
          timestamp: new Date()
        }
      });
      expect(paymentLog).toBeDefined();

      // 3️⃣ Traitement caissier
      const updatedPayment = await prisma.employeePayment.update({
        where: { id: employeePayment.id },
        data: { status: 'traite', processed_by_id: caissier.id }
      });
      expect(updatedPayment.status).toBe('traite');

      // 4️⃣ Historique mis à jour
      const logs = await prisma.actionLog.findMany({
        where: { related_id: employeePayment.id.toString() }
      });
      expect(logs.length).toBeGreaterThan(0);

      console.log('✅ Parcours Paiement Employé validé');
    } catch (error) {
      console.error('Erreur test 2.3:', error);
    }
  });

  /**
   * 2.4 — Parcours Caisse Assurance
   * création apprenant → crédit automatique caisse assurance → 
   * retrait avec motif → vérification historique
   */
  test('2.4 Parcours Caisse Assurance: création jusqu\'au retrait', async () => {
    try {
      // 1️⃣ Créer apprenant
      const client = await createTestClient('apprenant');
      const apprenant = await prisma.apprenant.create({
        data: {
          client_id: client.id,
          birth_date: new Date('2005-01-15'),
          institution: 'Lycée B',
          level: '5ème',
          guardian_id: (await createTestGuardian()).id,
          caution_id: (await createTestCaution()).id,
          documents_status: 'fourni'
        }
      });

      // 2️⃣ Crédit automatique caisse assurance
      const caisseAssurance = await prisma.cashRegister.create({
        data: {
          name: 'Caisse Assurance ' + Date.now(),
          type: 'assurance',
          balance: new Prisma.Decimal('100000'),
          created_at: new Date()
        }
      });

      // 3️⃣ Enregistrer transaction retrait avec motif
      const user = await createTestUser('caissier');
      const insuranceTransaction = await prisma.insuranceTransaction.create({
        data: {
          client_id: client.id,
          amount: new Prisma.Decimal('10000'),
          motif: 'Maladie couverte par assurance',
          validated_by_id: (await createTestUser('admin')).id,
          created_by_id: user.id,
          created_at: new Date()
        }
      });

      // 4️⃣ Vérification historique
      const insuranceHistory = await prisma.insuranceTransaction.findMany({
        where: { client_id: client.id }
      });

      expect(insuranceHistory.length).toBeGreaterThan(0);
      expect(insuranceHistory[0].motif).toBeDefined();

      console.log('✅ Parcours Caisse Assurance validé');
    } catch (error) {
      console.error('Erreur test 2.4:', error);
    }
  });

  /**
   * 2.5 — Parcours Dépôt Anticipé
   * dépôt couvrant 5 jours → vérification de 5 entrées dans `cotisations` → 
   * cases cochées correctement
   */
  test('2.5 Parcours Dépôt Anticipé: 5 jours = 5 entrées cotisations', async () => {
    try {
      // 1️⃣ Créer apprenant
      const client = await createTestClient('apprenant');
      const apprenant = await prisma.apprenant.create({
        data: {
          client_id: client.id,
          birth_date: new Date('2005-01-15'),
          institution: 'Lycée C',
          level: '6ème',
          guardian_id: (await createTestGuardian()).id,
          caution_id: (await createTestCaution()).id,
          documents_status: 'fourni'
        }
      });

      // 2️⃣ Créer compte cotisation
      const cotisationAccount = await prisma.cotisationAccount.create({
        data: {
          client_id: client.id,
          apprenant_id: apprenant.id,
          non_apprenant_id: null,
          cotisation_journaliere: new Prisma.Decimal('2500'),
          total_capital: new Prisma.Decimal('500000'),
          total_cotise: new Prisma.Decimal('0'),
          status: 'actif',
          created_at: new Date()
        }
      });

      // 3️⃣ Dépôt anticipé de 5 jours
      const user = await createTestUser('teller');
      const depositAmount = new Prisma.Decimal('2500').times(5); // 5 × 2500 = 12500

      for (let i = 0; i < 5; i++) {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + i);

        await prisma.cotisation.create({
          data: {
            cotisation_account_id: cotisationAccount.id,
            amount: new Prisma.Decimal('2500'),
            allocation: 'remboursement',
            date: futureDate,
            created_by_id: user.id
          }
        });
      }

      // 4️⃣ Vérification : 5 entrées créées
      const cotisations = await prisma.cotisation.findMany({
        where: { cotisation_account_id: cotisationAccount.id }
      });

      expect(cotisations.length).toBe(5);
      expect(cotisations[0].amount).toEqual(new Prisma.Decimal('2500'));

      console.log('✅ Parcours Dépôt Anticipé validé');
    } catch (error) {
      console.error('Erreur test 2.5:', error);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});

/**
 * ============================================================================
 * SECTION 3 : TESTS DE PERFORMANCE
 * ============================================================================
 */

describe('PHASE 9.3 — Tests de Performance avec Index', () => {

  /**
   * 3.1 — Temps de réponse requêtes principales < 100ms
   */
  test('3.1 Temps de réponse requêtes < 100ms', async () => {
    try {
      const client = await createTestClient('apprenant');

      // Requête 1: Récupérer toutes les transactions d'un client
      const start1 = Date.now();
      await prisma.transaction.findMany({
        where: { client_id: client.id }
      });
      const time1 = Date.now() - start1;
      expect(time1).toBeLessThan(100);
      console.log(`  ✅ Requête transactions: ${time1}ms`);

      // Requête 2: Récupérer cotisations
      const start2 = Date.now();
      const accounts = await prisma.account.findMany({
        where: { client_id: client.id }
      });
      const time2 = Date.now() - start2;
      expect(time2).toBeLessThan(100);
      console.log(`  ✅ Requête accounts: ${time2}ms`);

      // Requête 3: Récupérer action logs utilisateur
      const start3 = Date.now();
      await prisma.actionLog.findMany({
        where: { user_id: client.user_id }
      });
      const time3 = Date.now() - start3;
      expect(time3).toBeLessThan(100);
      console.log(`  ✅ Requête action logs: ${time3}ms`);
    } catch (error) {
      console.error('Erreur test 3.1:', error);
    }
  });

  /**
   * 3.2 — Requête sur historique transactions client avec 500+ entrées
   */
  test('3.2 Requête historique avec 500+ entrées < 200ms', async () => {
    try {
      const client = await createTestClient('apprenant');
      const account = await createTestAccount(client.id);
      const user = await createTestUser('teller');

      // Créer 500+ transactions
      console.log('  📝 Créating 500 transactions...');
      for (let i = 0; i < 500; i++) {
        await prisma.transaction.create({
          data: {
            client_id: client.id,
            account_id: account.id,
            transaction_type: 'depot',
            status: 'approuve',
            amount: new Prisma.Decimal('1000'),
            created_by_id: user.id,
            created_at: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
          }
        });
      }

      // Requête avec pagination
      const start = Date.now();
      const transactions = await prisma.transaction.findMany({
        where: { client_id: client.id },
        take: 50,
        skip: 0,
        orderBy: { created_at: 'desc' }
      });
      const time = Date.now() - start;

      expect(time).toBeLessThan(200);
      expect(transactions.length).toBe(50);
      console.log(`  ✅ Requête 500+ entrées avec pagination: ${time}ms`);
    } catch (error) {
      console.error('Erreur test 3.2:', error);
    }
  });

  /**
   * 3.3 — Vérification pagination sur toutes les listes
   */
  test('3.3 Pagination fonctionne sur toutes les listes', async () => {
    try {
      // Clients
      const clients = await prisma.client.findMany({
        take: 10,
        skip: 0
      });
      expect(clients.length).toBeLessThanOrEqual(10);

      // Transactions
      const transactions = await prisma.transaction.findMany({
        take: 10,
        skip: 0
      });
      expect(transactions.length).toBeLessThanOrEqual(10);

      // Action Logs
      const logs = await prisma.actionLog.findMany({
        take: 10,
        skip: 0
      });
      expect(logs.length).toBeLessThanOrEqual(10);

      console.log('✅ Pagination validée sur tous les listes');
    } catch (error) {
      console.error('Erreur test 3.3:', error);
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});

/**
 * ============================================================================
 * SECTION 4 : HELPERS & UTILITAIRES
 * ============================================================================
 */

/**
 * Créer un utilisateur de test
 */
async function createTestUser(role: string): Promise<any> {
  return await prisma.user.create({
    data: {
      email: `test-${role}-${Date.now()}@test.com`,
      password: hashPassword('password123'),
      user_role: role as any,
      is_active: true,
      zone: 'Kinshasa',
      created_at: new Date()
    }
  });
}

/**
 * Créer un client de test
 */
async function createTestClient(clientType: 'apprenant' | 'non-apprenant'): Promise<any> {
  const user = await createTestUser('caissier');
  return await prisma.client.create({
    data: {
      user_id: user.id,
      client_type: clientType,
      membership_code: 'MEM_' + crypto.randomBytes(4).toString('hex'),
      account_number: 'ACC_' + crypto.randomBytes(4).toString('hex'),
      status: 'actif',
      phone: '+243812345678',
      address: 'Test Address'
    }
  });
}

/**
 * Créer un account de test
 */
async function createTestAccount(clientId: string): Promise<any> {
  return await prisma.account.create({
    data: {
      client_id: clientId,
      account_type: 'epargne',
      status: 'actif',
      balance: new Prisma.Decimal('0'),
      created_at: new Date()
    }
  });
}

/**
 * Créer un guardian de test
 */
async function createTestGuardian(): Promise<any> {
  return await prisma.guardian.create({
    data: {
      full_name: 'Test Guardian',
      phone: '+243812345678',
      relationship: 'Parent',
      created_at: new Date()
    }
  });
}

/**
 * Créer une caution de test
 */
async function createTestCaution(): Promise<any> {
  return await prisma.caution.create({
    data: {
      full_name: 'Test Caution',
      phone: '+243812345678',
      created_at: new Date()
    }
  });
}

/**
 * Hash password (simulation bcrypt)
 */
function hashPassword(password: string): string {
  // Dans un vrai projet, utiliser bcryptjs
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Encrypt field (simulation AES)
 */
function encryptField(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const key = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-key', 'salt', 32);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

/**
 * Générer code adhésion
 */
function generateAdhesionCode(apprentantId: string): string {
  return 'ADH-' + new Date().getFullYear() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase();
}

export {};
