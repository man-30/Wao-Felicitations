import { User, Client, Transaction, Expense, ActionLog, Apprenant, TontineAccount, Cotisation, NonApprenant, FinancementNonApprenant, AdminCodeRequest, EmployeePayment, Produit, Account, InsuranceTransaction } from './types';

// ─── Seed data ────────────────────────────────────────────────────────────────

const INITIAL_USERS: User[] = [
  { id: 'u1', name: 'Super Admin',              role: 'admin',      email: 'admin@waooo.com', password: 'admin',    isActive: true, createdAt: '2026-01-01' },
  { id: 'u2', name: 'Caisse Centrale (Alice)',  role: 'caissier',   email: 'alice@waooo.com', password: 'password', isActive: true, zone: 'Agence Centre', createdAt: '2026-01-05' },
  { id: 'u3', name: 'Caisse Nord (Bob)',        role: 'caissier',   email: 'bob@waooo.com',   password: 'password', isActive: true, zone: 'Agence Nord',   createdAt: '2026-01-06' },
  { id: 'u4', name: 'Commercial Terrain (Jean)',role: 'commercial', email: 'jean@waooo.com',  password: 'password', isActive: true, zone: 'Zone A',        createdAt: '2026-01-07' },
  { id: 'u5', name: 'Commercial Terrain (Marc)',role: 'commercial', email: 'marc@waooo.com',  password: 'password', isActive: true, zone: 'Zone B',        createdAt: '2026-01-08' },
];

const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c1', name: 'Idriss Traoré', membershipCode: '4728WF026', accountNumber: 'ACC-82736112', type: 'apprenant', phone: '0707070707',
    address: 'Abidjan Cocody', assignedCommercialId: 'u4',
    savingsBalance: 0, financingBalance: -58100,
    schoolDebts: [{ id: 'd1', schoolName: 'Lycée Classique', debtAmount: 58700, paidAmount: 600, active: true, createdAt: '2026-01-10' }],
    createdAt: '2026-01-10',
  },
  {
    id: 'c2', name: 'Fatou Diop', membershipCode: '1928WF026', accountNumber: 'ACC-91283744', type: 'non-apprenant', phone: '0808080808',
    address: 'Abidjan Treichville', assignedCommercialId: 'u4',
    savingsBalance: 50000, financingBalance: 0, schoolDebts: [], createdAt: '2026-01-12',
  },
  {
    id: 'c3', name: 'Koffi Yao', membershipCode: '8827WF026', accountNumber: 'ACC-00192837', type: 'simple', phone: '0909090909',
    address: 'Abidjan Yopougon', assignedCommercialId: 'u5',
    savingsBalance: 5000, financingBalance: 0, schoolDebts: [], createdAt: '2026-01-15',
  },
  {
    id: 'c4', name: 'Aïsha Bakayoko', membershipCode: '5562WF026', accountNumber: 'ACC-11223344', type: 'apprenant', phone: '0123456789',
    address: 'Abidjan Marcory', assignedCommercialId: 'u4',
    savingsBalance: 0, financingBalance: -110500,
    schoolDebts: [{ id: 'd2', schoolName: 'Collège Moderne', debtAmount: 110500, paidAmount: 0, active: true, createdAt: '2026-01-14' }],
    createdAt: '2026-01-14',
  },
  {
    id: 'c5', name: 'Yannick Ouédraogo', membershipCode: '7731WF026', accountNumber: 'ACC-55667788', type: 'apprenant', phone: '0566778899',
    address: 'Abidjan Riviera', assignedCommercialId: 'u5',
    savingsBalance: 0, financingBalance: -166575,
    schoolDebts: [{ id: 'd3', schoolName: 'Lycée International', debtAmount: 166575, paidAmount: 0, active: true, createdAt: '2026-01-18' }],
    createdAt: '2026-01-18',
  },
];

const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't1', clientId: 'c2', clientName: 'Fatou Diop', type: 'depot', amount: 50000,
    date: '2026-01-13', collectedBy: 'u4', collectedByName: 'Commercial Terrain (Jean)',
    validatedBy: 'u2', validatedByName: 'Caisse Centrale (Alice)', status: 'approved',
    receiptNumber: 'REC-2026-001',
  },
  {
    id: 't2', clientId: 'c3', clientName: 'Koffi Yao', type: 'depot', amount: 5000,
    date: '2026-01-15', collectedBy: 'u5', collectedByName: 'Commercial Terrain (Marc)',
    validatedBy: 'u2', validatedByName: 'Caisse Centrale (Alice)', status: 'approved',
    receiptNumber: 'REC-2026-002',
  },
];

const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', category: 'Fournitures', amount: 5000, description: 'Papier et stylos pour agence',  date: '2026-01-11', recordedBy: 'u2', recordedByName: 'Caisse Centrale (Alice)' },
  { id: 'e2', category: 'Transport',   amount: 3000, description: 'Déplacement commercial Jean',   date: '2026-01-15', recordedBy: 'u2', recordedByName: 'Caisse Centrale (Alice)' },
];

const INITIAL_LOGS: ActionLog[] = [
  { id: 'l1', userId: 'u1', userName: 'Super Admin',             userRole: 'admin',    action: 'Connexion',      details: 'Administrateur connecté',               timestamp: '2026-01-15 08:00:00' },
  { id: 'l2', userId: 'u2', userName: 'Caisse Centrale (Alice)', userRole: 'caissier', action: 'Création Client',details: 'Création du client Idriss Traoré',       timestamp: '2026-01-10 10:15:22' },
];

const INITIAL_APPRENANTS: Apprenant[] = [
  {
    id: 'ap1', clientId: 'c1', studentName: 'Idriss Traoré', studentBirthDate: '2012-05-14',
    schoolName: 'Lycée Classique', schoolLevel: '3ème', schoolYear: '2025-2026',
    guardian: { id: 'g1', fullName: 'Moussa Traoré', phone: '0707070707', relationship: 'Père', idNumber: 'CI-1234567' },
    caution:  { id: 'ca1', fullName: 'Aminata Koné',  phone: '0101010101', idNumber: 'CI-9876543' },
    documents: [
      { key: 'acte_naissance',  label: 'Acte de naissance (copie)',        status: 'fourni' },
      { key: 'photos',          label: '2 photos passeport de l\'élève',   status: 'fourni' },
      { key: 'piece_parent',    label: 'Pièce d\'identité parent/tuteur',  status: 'fourni' },
      { key: 'piece_caution',   label: 'Pièce d\'identité caution',        status: 'fourni' },
    ],
    createdBy: 'u2', createdAt: '2026-01-10',
  },
  {
    id: 'ap2', clientId: 'c4', studentName: 'Aïsha Bakayoko', schoolName: 'Collège Moderne',
    schoolLevel: 'Terminale', schoolYear: '2025-2026',
    guardian: { id: 'g2', fullName: 'Karim Bakayoko', phone: '0123456789', relationship: 'Père' },
    caution:  { id: 'ca2', fullName: 'Salimata Diaby', phone: '0911223344' },
    documents: [
      { key: 'acte_naissance', label: 'Acte de naissance', status: 'fourni' },
      { key: 'photos',         label: '2 photos passeport', status: 'fourni' },
      { key: 'piece_parent',   label: 'Pièce parent', status: 'fourni' },
      { key: 'piece_caution',  label: 'Pièce caution', status: 'fourni' },
    ],
    createdBy: 'u2', createdAt: '2026-01-14',
  },
  {
    id: 'ap3', clientId: 'c5', studentName: 'Yannick Ouédraogo', schoolName: 'Lycée International',
    schoolLevel: '1ère', schoolYear: '2025-2026',
    guardian: { id: 'g3', fullName: 'Maxime Ouédraogo', phone: '0566778899', relationship: 'Père' },
    caution:  { id: 'ca3', fullName: 'Estelle Coulibaly', phone: '0977665544' },
    documents: [
      { key: 'acte_naissance', label: 'Acte de naissance', status: 'fourni' },
      { key: 'photos',         label: '2 photos passeport', status: 'en_attente' },
      { key: 'piece_parent',   label: 'Pièce parent', status: 'fourni' },
      { key: 'piece_caution',  label: 'Pièce caution', status: 'fourni' },
    ],
    createdBy: 'u3', createdAt: '2026-01-18',
  },
];

const INITIAL_TONTINE_ACCOUNTS: TontineAccount[] = [
  {
    id: 'ta1', apprenantId: 'ap1', numero: 'TS-2026-0001', createdAt: '2026-01-10',
    schoolName: 'Lycée Classique', schoolLevel: '3ème', fraisScolarite: 50000,
    grilleNumero: 4, fraisDossier: 600, fraisAssurance: 0, fraisPrestation: 8100,
    cotisationJournaliere: 300, totalCapital: 58700, totalCotise: 600, totalBeneficeCases: 300, totalJours: 3,
    status: 'actif', adhesionPaid: 2000, carnetPaid: 500,
  },
  {
    id: 'ta2', apprenantId: 'ap2', numero: 'TS-2026-0002', createdAt: '2026-01-14',
    schoolName: 'Collège Moderne', schoolLevel: 'Terminale', fraisScolarite: 95000,
    grilleNumero: 8, fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 13500,
    cotisationJournaliere: 500, totalCapital: 110500, totalCotise: 0, totalBeneficeCases: 0, totalJours: 0,
    status: 'actif', adhesionPaid: 2000, carnetPaid: 500,
  },
  {
    id: 'ta3', apprenantId: 'ap3', numero: 'TS-2026-0003', createdAt: '2026-01-18',
    schoolName: 'Lycée International', schoolLevel: '1ère', fraisScolarite: 145000,
    grilleNumero: 11, fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 19575,
    cotisationJournaliere: 700, totalCapital: 166575, totalCotise: 0, totalBeneficeCases: 0, totalJours: 0,
    status: 'actif', adhesionPaid: 2000, carnetPaid: 500,
  },
];

const INITIAL_COTISATIONS: Cotisation[] = [
  { id: 'cot1', tontineAccountId: 'ta1', apprenantId: 'ap1', studentName: 'Idriss Traoré', amount: 300, date: '2026-01-11', collectedBy: 'u4', collectedByName: 'Commercial Terrain (Jean)', carnetEmargement: true, cycleMonth: 1, cycleDay: 1, allocation: 'benefice_societe' },
  { id: 'cot2', tontineAccountId: 'ta1', apprenantId: 'ap1', studentName: 'Idriss Traoré', amount: 300, date: '2026-01-12', collectedBy: 'u4', collectedByName: 'Commercial Terrain (Jean)', carnetEmargement: true, cycleMonth: 1, cycleDay: 2, allocation: 'remboursement' },
  { id: 'cot3', tontineAccountId: 'ta1', apprenantId: 'ap1', studentName: 'Idriss Traoré', amount: 300, date: '2026-01-13', collectedBy: 'u4', collectedByName: 'Commercial Terrain (Jean)', carnetEmargement: true, cycleMonth: 1, cycleDay: 3, allocation: 'remboursement' },
];

const INITIAL_NON_APPRENANTS: NonApprenant[] = [
  {
    id: 'na1', clientId: 'c2', fullName: 'Fatou Diop', phone: '0808080808', idNumber: 'CI-888888',
    documents: { pieceIdentite: true, photos: true },
    adhesionPaid: true, carnetPaid: true, createdBy: 'u2', createdAt: '2026-01-12'
  }
];

const INITIAL_FINANCEMENTS: FinancementNonApprenant[] = [];
const INITIAL_ADMIN_CODE_REQUESTS: AdminCodeRequest[] = [];
const INITIAL_EMPLOYEE_PAYMENTS: EmployeePayment[] = [];
const INITIAL_ACCOUNTS: Account[] = [];
const INITIAL_PRODUITS: Produit[] = [
  { id: 'p1', category: 'Frais de dossiers', amount: 600, description: 'Frais dossier - Idriss Traoré', date: '2026-01-10', recordedBy: 'u2', recordedByName: 'Caisse Centrale (Alice)' },
  { id: 'p2', category: 'Vente de livret tontine', amount: 500, description: 'Livret tontine - Fatou Diop', date: '2026-01-12', recordedBy: 'u2', recordedByName: 'Caisse Centrale (Alice)' },
];

const INITIAL_INSURANCE_TRANSACTIONS: InsuranceTransaction[] = [];

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
};
