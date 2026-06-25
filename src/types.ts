// ─── Users ────────────────────────────────────────────────────────────────────
export type UserRole = 'admin' | 'caissier' | 'commercial';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  password?: string;
  zone?: string;
  isActive?: boolean;
  createdAt: string;
}

// ─── Clients (generic) ────────────────────────────────────────────────────────
export type ClientType = 'apprenant' | 'non-apprenant' | 'simple';

export interface InsuranceTransaction {
  id: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  clientId?: string;
  clientName?: string;
  date: string;
  operatedBy: string;
  operatedByName: string;
}

export interface SchoolDebt {
  id: string;
  schoolName: string;
  debtAmount: number;
  paidAmount: number;
  active: boolean;
  createdAt: string;
}

export type AccountType = 'epargne' | 'financement';

export interface Account {
  id: string;
  clientId: string;
  type: AccountType;
  balance: number;
  linkedAccountId?: string;
  accountNumber?: string;
  label?: string;
  status?: 'actif' | 'solde' | 'ferme';
  principalAmount?: number;
  dossierFee?: number;
  insuranceFee?: number;
  prestationFee?: number;
  dailyContribution?: number;
  totalDue?: number;
  totalPaid?: number;
  residualBalance?: number;
  createdBy?: string;
  createdByName?: string;
  notes?: string;
  createdAt: string;
}

export interface Client {
  id: string;
  name: string;
  membershipCode: string; // XXXX WF YYY
  accountNumber: string;
  type: ClientType;
  phone: string;
  address: string;
  assignedCommercialId: string;
  savingsBalance: number;
  financingBalance: number;
  schoolDebts: SchoolDebt[];
  createdAt: string;
}

// ─── Tontine Scolaire — Apprenant workflow ────────────────────────────────────

export interface GrilleRow {
  numero: number;
  fraisMin: number;
  fraisMax: number;
  fraisDossier: number;
  fraisAssurance: number;
  fraisPrestation: number;
  cotisationJournaliere: number;
}

// ─── Financement Biens — Non-Apprenant workflow ───────────────────────────────

export type DureeFinancement = 'mois_4' | 'mois_6' | 'mois_8' | 'mois_10';

export interface GrilleNonApprenantRow {
  numero: number;
  valeurMin: number;
  valeurMax: number;
  fraisDossier: number;
  prestations: Record<DureeFinancement, number | null>;
  cotisations: Record<DureeFinancement, number | null>;
}

export interface FinancementNonApprenant {
  id: string;
  nonApprenantId: string;
  bienFinance: string;
  valeurBien: number;
  apportPersonnel: number; // apport libre du client
  apportPourcentage?: number;
  montantFinance: number;  // valeurBien - apportPersonnel
  dureeChoisie: DureeFinancement;
  
  // From grid
  fraisDossier: number;
  fraisPrestation: number;
  cotisationJournaliere: number;
  
  totalARembourser: number; // montantFinance + fraisPrestation
  totalCotise: number;
  totalBeneficeCases?: number;
  totalCases?: number;
  status: 'en_attente_apport' | 'actif' | 'solde';
  createdAt: string;
}

export interface NonApprenant {
  id: string;
  clientId: string;
  fullName: string;
  phone: string;
  idNumber: string;
  documents: {
    pieceIdentite: boolean;
    photos: boolean;
  };
  adhesionPaid: boolean; // 5500 F
  carnetPaid: boolean;   // 500 F
  createdBy: string;
  createdAt: string;
}

export type DocumentStatus = 'fourni' | 'manquant' | 'en_attente';

export interface ApprenantDocument {
  key: string;
  label: string;
  status: DocumentStatus;
}

export interface Guardian {
  id: string;
  fullName: string;
  phone: string;
  relationship: string;
  idNumber?: string;
}

export interface Caution {
  id: string;
  fullName: string;
  phone: string;
  idNumber?: string;
  profession?: string;
}

export interface TontineAccount {
  id: string;
  apprenantId: string;
  numero: string;
  createdAt: string;
  schoolName: string;
  schoolLevel: string;
  fraisScolarite: number;
  grilleNumero: number;
  fraisDossier: number;
  fraisAssurance: number;
  fraisPrestation: number;
  cotisationJournaliere: number;
  totalCapital: number;
  totalCotise: number;
  totalBeneficeCases?: number;
  totalJours: number;
  status: 'actif' | 'solde' | 'suspendu';
  adhesionPaid: number;
  carnetPaid: number;
}

export interface Apprenant {
  id: string;
  clientId: string;
  studentName: string;
  studentBirthDate?: string;
  schoolName: string;
  schoolLevel: string;
  schoolYear: string;
  guardian: Guardian;
  caution: Caution;
  documents: ApprenantDocument[];
  createdBy: string;
  createdAt: string;
}

export type CotisationAllocation = 'benefice_societe' | 'remboursement';

export interface Cotisation {
  id: string;
  tontineAccountId: string;
  apprenantId: string;
  studentName: string;
  amount: number;
  date: string;
  collectedBy: string;
  collectedByName?: string;
  notes?: string;
  carnetEmargement?: boolean;
  cycleMonth?: number;
  cycleDay?: number;
  allocation?: CotisationAllocation;
  isModified?: boolean;
  originalAmount?: number;
  modifiedBy?: string;
  modifiedByName?: string;
  modifiedAt?: string;
  modifiedReason?: string;
  adminCodeUsed?: string;
}

export type TransactionType = 'depot' | 'retrait' | 'cotisation' | 'remboursement_dette' | 'adhesion' | 'carnet';
export type TransactionStatus = 'pending' | 'approved' | 'rejected';

export interface Transaction {
  id: string;
  clientId: string;
  clientName: string;
  type: TransactionType;
  amount: number;
  date: string;
  collectedBy: string;
  collectedByName?: string;
  validatedBy?: string;
  validatedByName?: string;
  status: TransactionStatus;
  notes?: string;
  receiptNumber?: string;
  cycleMonth?: number;
  cycleDay?: number;
  allocation?: CotisationAllocation;
  isModified?: boolean;
  originalAmount?: number;
  modifiedBy?: string;
  modifiedByName?: string;
  modifiedAt?: string;
  modifiedReason?: string;
  adminCodeUsed?: string;
}

export interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  recordedBy: string;
  recordedByName?: string;
  type?: 'charge' | 'produit';
}

export interface Produit {
  id: string;
  category: string;
  amount: number;
  description: string;
  date: string;
  recordedBy: string;
  recordedByName?: string;
}

export interface ActionLog {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
  beforeValue?: string;
  afterValue?: string;
}

export type AdminCodeActionType = 'client_edit' | 'cotisation_edit' | 'cotisation_delete' | 'deposit_edit';
export type AdminCodeRequestStatus = 'pending' | 'generated' | 'used' | 'expired';

export interface AdminCodeRequest {
  id: string;
  requestedBy: string;
  requestedByName: string;
  actionType: AdminCodeActionType;
  targetId: string;
  targetLabel: string;
  reason?: string;
  status: AdminCodeRequestStatus;
  code?: string;
  requestedAt: string;
  generatedAt?: string;
  expiresAt?: string;
  usedAt?: string;
  usedBy?: string;
}

export type EmployeePaymentStatus = 'pending' | 'processed';

export interface EmployeePayment {
  id: string;
  employeeId: string;
  employeeName: string;
  employeeRole: UserRole;
  amount: number;
  reason?: string;
  status: EmployeePaymentStatus;
  initiatedAt: string;
  initiatedBy: string;
  initiatedByName: string;
  processedAt?: string;
  processedBy?: string;
  processedByName?: string;
}
