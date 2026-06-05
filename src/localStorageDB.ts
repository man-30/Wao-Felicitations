import { User, Client, Transaction, Expense, ActionLog, Apprenant, TontineAccount, Cotisation, NonApprenant, FinancementNonApprenant, AdminCodeRequest, EmployeePayment, Produit, Account, InsuranceTransaction } from './types';

// ─── Seed data ────────────────────────────────────────────────────────────────

const INITIAL_USERS: User[] = [];

const INITIAL_CLIENTS: Client[] = [];

const INITIAL_TRANSACTIONS: Transaction[] = [];

const INITIAL_EXPENSES: Expense[] = [];

const INITIAL_LOGS: ActionLog[] = [];

const INITIAL_APPRENANTS: Apprenant[] = [];

const INITIAL_TONTINE_ACCOUNTS: TontineAccount[] = [];

const INITIAL_COTISATIONS: Cotisation[] = [];

const INITIAL_NON_APPRENANTS: NonApprenant[] = [];

const INITIAL_FINANCEMENTS: FinancementNonApprenant[] = [];
const INITIAL_ADMIN_CODE_REQUESTS: AdminCodeRequest[] = [];
const INITIAL_EMPLOYEE_PAYMENTS: EmployeePayment[] = [];
const INITIAL_ACCOUNTS: Account[] = [];
const INITIAL_PRODUITS: Produit[] = [];

const INITIAL_INSURANCE_TRANSACTIONS: InsuranceTransaction[] = [];

const STORAGE_VERSION = '2';
const VERSION_KEY = 'waooo_storage_version';

function migrateStorageVersion() {
  const currentVersion = localStorage.getItem(VERSION_KEY);
  if (currentVersion !== STORAGE_VERSION) {
    Object.values(KEYS).forEach((key) => localStorage.removeItem(key));
    localStorage.setItem(VERSION_KEY, STORAGE_VERSION);
  }
}


// ─── Storage keys ─────────────────────────────────────────────────────────────

const KEYS = {
  USERS:            'waooo_users',
  CLIENTS:          'waooo_clients',
  TRANSACTIONS:     'waooo_transactions',
  EXPENSES:         'waooo_expenses',
  LOGS:             'waooo_logs',
  APPRENANTS:       'waooo_apprenants',
  TONTINE_ACCOUNTS: 'waooo_tontine_accounts',
  COTISATIONS:      'waooo_cotisations',
  ACCOUNT_COUNTER:  'waooo_account_counter',
  NON_APPRENANTS:   'waooo_non_apprenants',
  FINANCEMENTS:     'waooo_financements',
  ADMIN_CODE_REQUESTS: 'waooo_admin_code_requests',
  EMPLOYEE_PAYMENTS: 'waooo_employee_payments',
  ACCOUNTS:          'waooo_accounts',
  PRODUITS:         'waooo_produits',
  INSURANCE_TXS:   'waooo_insurance_txs',
};

migrateStorageVersion();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function load<T>(key: string, seed: T): T {
  const raw = localStorage.getItem(key);
  if (!raw) { localStorage.setItem(key, JSON.stringify(seed)); return seed; }
  return JSON.parse(raw) as T;
}

function save<T>(key: string, data: T): void {
  localStorage.setItem(key, JSON.stringify(data));
}

function generateMembershipCode(): string {
  const random4 = Math.floor(1000 + Math.random() * 9000).toString();
  const year = new Date().getFullYear().toString().slice(-3);
  return `${random4}WF${year}`;
}

function generateClientAccountNumber(): string {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(10 + Math.random() * 89);
  return `ACC-${timestamp}${random}`;
}

function nextAccountNumber(): string {
  const current = parseInt(localStorage.getItem(KEYS.ACCOUNT_COUNTER) || '0', 10);
  const next = current + 1;
  localStorage.setItem(KEYS.ACCOUNT_COUNTER, String(next));
  return `TS-2026-${String(next).padStart(4, '0')}`;
}

// ─── DB object ────────────────────────────────────────────────────────────────

export const db = {
  generateMembershipCode,
  generateClientAccountNumber,
  getUsers:     () => load<User[]>(KEYS.USERS, INITIAL_USERS),
  saveUsers:    (v: User[]) => save(KEYS.USERS, v),
  getClients:   () => load<Client[]>(KEYS.CLIENTS, INITIAL_CLIENTS),
  saveClients:  (v: Client[]) => save(KEYS.CLIENTS, v),
  getTransactions:  () => load<Transaction[]>(KEYS.TRANSACTIONS, INITIAL_TRANSACTIONS),
  saveTransactions: (v: Transaction[]) => save(KEYS.TRANSACTIONS, v),
  getExpenses:  () => load<Expense[]>(KEYS.EXPENSES, INITIAL_EXPENSES),
  saveExpenses: (v: Expense[]) => save(KEYS.EXPENSES, v),
  getLogs:      () => load<ActionLog[]>(KEYS.LOGS, INITIAL_LOGS),
  saveLogs:     (v: ActionLog[]) => save(KEYS.LOGS, v),
  getApprenants:   () => load<Apprenant[]>(KEYS.APPRENANTS, INITIAL_APPRENANTS),
  saveApprenants:  (v: Apprenant[]) => save(KEYS.APPRENANTS, v),
  getTontineAccounts:  () => load<TontineAccount[]>(KEYS.TONTINE_ACCOUNTS, INITIAL_TONTINE_ACCOUNTS),
  saveTontineAccounts: (v: TontineAccount[]) => save(KEYS.TONTINE_ACCOUNTS, v),
  getCotisations:  () => load<Cotisation[]>(KEYS.COTISATIONS, INITIAL_COTISATIONS),
  saveCotisations: (v: Cotisation[]) => save(KEYS.COTISATIONS, v),
  getNonApprenants: () => load<NonApprenant[]>(KEYS.NON_APPRENANTS, INITIAL_NON_APPRENANTS),
  saveNonApprenants: (v: NonApprenant[]) => save(KEYS.NON_APPRENANTS, v),
  getFinancements: () => load<FinancementNonApprenant[]>(KEYS.FINANCEMENTS, INITIAL_FINANCEMENTS),
  saveFinancements: (v: FinancementNonApprenant[]) => save(KEYS.FINANCEMENTS, v),
  getAdminCodeRequests: () => load<AdminCodeRequest[]>(KEYS.ADMIN_CODE_REQUESTS, INITIAL_ADMIN_CODE_REQUESTS),
  saveAdminCodeRequests: (v: AdminCodeRequest[]) => save(KEYS.ADMIN_CODE_REQUESTS, v),
  getEmployeePayments: () => load<EmployeePayment[]>(KEYS.EMPLOYEE_PAYMENTS, INITIAL_EMPLOYEE_PAYMENTS),
  saveEmployeePayments: (v: EmployeePayment[]) => save(KEYS.EMPLOYEE_PAYMENTS, v),
  getAccounts: () => load<Account[]>(KEYS.ACCOUNTS, INITIAL_ACCOUNTS),
  saveAccounts: (v: Account[]) => save(KEYS.ACCOUNTS, v),
  getProduits: () => load<Produit[]>(KEYS.PRODUITS, INITIAL_PRODUITS),
  saveProduits: (v: Produit[]) => save(KEYS.PRODUITS, v),
  getInsuranceTxs: () => load<InsuranceTransaction[]>(KEYS.INSURANCE_TXS, INITIAL_INSURANCE_TRANSACTIONS),
  saveInsuranceTxs: (v: InsuranceTransaction[]) => save(KEYS.INSURANCE_TXS, v),
  getInsuranceBalance: () => {
    const txs = load<InsuranceTransaction[]>(KEYS.INSURANCE_TXS, INITIAL_INSURANCE_TRANSACTIONS);
    return txs.reduce((sum, tx) => tx.type === 'credit' ? sum + tx.amount : sum - tx.amount, 0);
  },
  nextAccountNumber,
  addLog(userId: string, userName: string, userRole: string, action: string, details: string, before?: string, after?: string) {
    const logs = db.getLogs();
    logs.unshift({
      id: 'l_' + Date.now() + Math.random().toString(36).slice(2, 6),
      userId, userName, userRole, action, details,
      beforeValue: before,
      afterValue:  after,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
    });
    db.saveLogs(logs);
  },
  syncDataFromServer(apiClients: any[]) {
    // 1. Clients
    const clients: Client[] = apiClients.map((c: any) => ({
      id: c.id,
      name: c.name,
      membershipCode: c.membershipCode,
      accountNumber: c.accountNumber,
      type: c.type,
      phone: c.phone,
      address: c.address || '',
      assignedCommercialId: c.assignedCommercialId,
      savingsBalance: Number(c.savingsBalance || 0),
      financingBalance: Number(c.financingBalance || 0),
      schoolDebts: (c.schoolDebts || []).map((d: any) => ({
        id: d.id,
        schoolName: d.schoolName,
        debtAmount: Number(d.debtAmount || 0),
        paidAmount: Number(d.paidAmount || 0),
        active: d.active,
        createdAt: d.createdAt,
      })),
      createdAt: c.createdAt ? new Date(c.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    }));
    db.saveClients(clients);

    // 2. Apprenants & TontineAccounts
    const apprenants: Apprenant[] = [];
    const tontineAccounts: TontineAccount[] = [];

    // 3. NonApprenants & Financements
    const nonApprenants: NonApprenant[] = [];
    const financements: FinancementNonApprenant[] = [];

    // 4. Accounts
    const accounts: Account[] = [];

    apiClients.forEach((c: any) => {
      // Extract accounts
      if (c.accounts && Array.isArray(c.accounts)) {
        c.accounts.forEach((acc: any) => {
          accounts.push({
            id: acc.id,
            clientId: acc.clientId,
            type: acc.type,
            balance: Number(acc.balance || 0),
            linkedAccountId: acc.linkedAccountId,
            accountNumber: acc.accountNumber,
            label: acc.label,
            status: acc.status,
            principalAmount: acc.principalAmount ? Number(acc.principalAmount) : undefined,
            dossierFee: acc.dossierFee ? Number(acc.dossierFee) : undefined,
            insuranceFee: acc.insuranceFee ? Number(acc.insuranceFee) : undefined,
            prestationFee: acc.prestationFee ? Number(acc.prestationFee) : undefined,
            dailyContribution: acc.dailyContribution ? Number(acc.dailyContribution) : undefined,
            totalDue: acc.totalDue ? Number(acc.totalDue) : undefined,
            totalPaid: acc.totalPaid ? Number(acc.totalPaid) : undefined,
            residualBalance: acc.residualBalance ? Number(acc.residualBalance) : undefined,
            createdBy: acc.createdBy,
            createdByName: acc.createdByName,
            notes: acc.notes,
            createdAt: acc.createdAt,
          });
        });
      }

      // Extract Apprenant
      if (c.apprenant) {
        const ap = c.apprenant;
        apprenants.push({
          id: ap.id,
          clientId: ap.clientId,
          studentName: ap.studentName,
          studentBirthDate: ap.studentBirthDate ? new Date(ap.studentBirthDate).toISOString().split('T')[0] : undefined,
          schoolName: ap.schoolName,
          schoolLevel: ap.schoolLevel,
          schoolYear: ap.schoolYear,
          guardian: ap.guardian ? {
            id: ap.guardian.id,
            fullName: ap.guardian.fullName,
            phone: ap.guardian.phone,
            relationship: ap.guardian.relationship,
            idNumber: ap.guardian.idNumber || undefined,
          } : { id: 'g_' + Date.now(), fullName: 'N/A', phone: 'N/A', relationship: 'N/A' },
          caution: ap.caution ? {
            id: ap.caution.id,
            fullName: ap.caution.fullName,
            phone: ap.caution.phone,
            idNumber: ap.caution.idNumber || undefined,
            profession: ap.caution.profession || undefined,
          } : { id: 'ca_' + Date.now(), fullName: 'N/A', phone: 'N/A' },
          documents: ap.documents || [],
          createdBy: ap.createdBy,
          createdAt: ap.createdAt ? new Date(ap.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        });

        if (ap.tontineAccounts && Array.isArray(ap.tontineAccounts)) {
          ap.tontineAccounts.forEach((ta: any) => {
            tontineAccounts.push({
              id: ta.id,
              apprenantId: ta.apprenantId,
              numero: ta.numero,
              schoolName: ta.schoolName,
              schoolLevel: ta.schoolLevel,
              fraisScolarite: Number(ta.fraisScolarite || 0),
              grilleNumero: Number(ta.grilleNumero || 0),
              fraisDossier: Number(ta.fraisDossier || 0),
              fraisAssurance: Number(ta.fraisAssurance || 0),
              fraisPrestation: Number(ta.fraisPrestation || 0),
              cotisationJournaliere: Number(ta.cotisationJournaliere || 0),
              totalCapital: Number(ta.totalCapital || 0),
              totalCotise: Number(ta.totalCotise || 0),
              totalBeneficeCases: ta.totalBeneficeCases ? Number(ta.totalBeneficeCases) : 0,
              totalJours: Number(ta.totalJours || 0),
              status: ta.status,
              adhesionPaid: Number(ta.adhesionPaid || 0),
              carnetPaid: Number(ta.carnetPaid || 0),
              createdAt: ta.createdAt ? new Date(ta.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            });
          });
        }
      }

      // Extract NonApprenant
      if (c.nonApprenant) {
        const na = c.nonApprenant;
        nonApprenants.push({
          id: na.id,
          clientId: na.clientId,
          fullName: na.fullName,
          phone: na.phone,
          idNumber: na.idNumber,
          documents: na.documents || { pieceIdentite: false, photos: false },
          adhesionPaid: na.adhesionPaid || false,
          carnetPaid: na.carnetPaid || false,
          createdBy: na.createdBy,
          createdAt: na.createdAt ? new Date(na.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
        });

        if (na.financements && Array.isArray(na.financements)) {
          na.financements.forEach((f: any) => {
            financements.push({
              id: f.id,
              nonApprenantId: f.nonApprenantId,
              bienFinance: f.bienFinance,
              valeurBien: Number(f.valeurBien || 0),
              apportPersonnel: Number(f.apportPersonnel || 0),
              apportPourcentage: f.apportPourcentage ? Number(f.apportPourcentage) : undefined,
              montantFinance: Number(f.montantFinance || 0),
              dureeChoisie: f.dureeChoisie,
              fraisDossier: Number(f.fraisDossier || 0),
              fraisPrestation: Number(f.fraisPrestation || 0),
              cotisationJournaliere: Number(f.cotisationJournaliere || 0),
              totalARembourser: Number(f.totalARembourser || 0),
              totalCotise: Number(f.totalCotise || 0),
              totalBeneficeCases: f.totalBeneficeCases ? Number(f.totalBeneficeCases) : 0,
              totalCases: f.totalCases ? Number(f.totalCases) : 0,
              status: f.status,
              createdAt: f.createdAt ? new Date(f.createdAt).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
            });
          });
        }
      }
    });

    db.saveApprenants(apprenants);
    db.saveTontineAccounts(tontineAccounts);
    db.saveNonApprenants(nonApprenants);
    db.saveFinancements(financements);
    db.saveAccounts(accounts);
  },
};

