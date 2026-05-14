import { GrilleRow, GrilleNonApprenantRow, DureeFinancement } from './types';
import { getCyclePlan } from './cotisationCycle';

// ─── APPRENANTS GRILLE ────────────────────────────────────────────────────────

export const GRILLE: GrilleRow[] = [
  { numero: 1,  fraisMin: 0,       fraisMax: 30000,  fraisDossier: 600,  fraisAssurance: 1000, fraisPrestation: 4050,  cotisationJournaliere: 150 },
  { numero: 2,  fraisMin: 30001,   fraisMax: 40000,  fraisDossier: 600,  fraisAssurance: 1000, fraisPrestation: 5400,  cotisationJournaliere: 200 },
  { numero: 3,  fraisMin: 40001,   fraisMax: 50000,  fraisDossier: 600,  fraisAssurance: 1000, fraisPrestation: 6750,  cotisationJournaliere: 250 },
  { numero: 4,  fraisMin: 50001,   fraisMax: 60000,  fraisDossier: 600,  fraisAssurance: 1000, fraisPrestation: 8100,  cotisationJournaliere: 300 },
  { numero: 5,  fraisMin: 60001,   fraisMax: 70000,  fraisDossier: 600,  fraisAssurance: 1000, fraisPrestation: 9450,  cotisationJournaliere: 350 },
  { numero: 6,  fraisMin: 70001,   fraisMax: 80000,  fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 10800, cotisationJournaliere: 400 },
  { numero: 7,  fraisMin: 80001,   fraisMax: 90000,  fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 12150, cotisationJournaliere: 450 },
  { numero: 8,  fraisMin: 90001,   fraisMax: 100000, fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 13500, cotisationJournaliere: 500 },
  { numero: 9,  fraisMin: 100001,  fraisMax: 115000, fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 15525, cotisationJournaliere: 550 },
  { numero: 10, fraisMin: 115001,  fraisMax: 130000, fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 17550, cotisationJournaliere: 650 },
  { numero: 11, fraisMin: 130001,  fraisMax: 145000, fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 19575, cotisationJournaliere: 700 },
  { numero: 12, fraisMin: 145001,  fraisMax: 160000, fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 21600, cotisationJournaliere: 800 },
  { numero: 13, fraisMin: 160001,  fraisMax: 175000, fraisDossier: 1000, fraisAssurance: 1000, fraisPrestation: 23625, cotisationJournaliere: 850 },
];

export const ADHESION_MONTANT = 2000;
export const CARNET_MONTANT   = 500;

export function findGrilleRow(fraisScolarite: number): GrilleRow | null {
  return GRILLE.find(r => fraisScolarite >= r.fraisMin && fraisScolarite <= r.fraisMax) ?? null;
}

export interface GrilleCalcul {
  row: GrilleRow;
  fraisScolarite: number;
  fraisDossier: number;
  fraisAssurance: number;
  fraisPrestation: number;
  cotisationJournaliere: number;
  capitalAvance: number;
  totalARembourser: number;
  nombreDeJoursTheorique: number;
  remboursementCases: number;
  beneficeCases: number;
  totalCasesCarnet: number;
  totalBeneficeCase1: number;
  totalClientAPayer: number;
}

export function calculerGrille(fraisScolarite: number): GrilleCalcul | null {
  const row = findGrilleRow(fraisScolarite);
  if (!row) return null;

  const capitalAvance    = fraisScolarite + row.fraisDossier + row.fraisAssurance;
  const totalARembourser = capitalAvance + row.fraisPrestation;
  const cyclePlan = getCyclePlan(totalARembourser, row.cotisationJournaliere);
  const nombreDeJoursTheorique = cyclePlan.totalCasesCarnet;

  return {
    row,
    fraisScolarite,
    fraisDossier:          row.fraisDossier,
    fraisAssurance:        row.fraisAssurance,
    fraisPrestation:       row.fraisPrestation,
    cotisationJournaliere: row.cotisationJournaliere,
    capitalAvance,
    totalARembourser,
    nombreDeJoursTheorique,
    remboursementCases: cyclePlan.remboursementCases,
    beneficeCases: cyclePlan.beneficeCases,
    totalCasesCarnet: cyclePlan.totalCasesCarnet,
    totalBeneficeCase1: cyclePlan.totalBeneficeCase1,
    totalClientAPayer: cyclePlan.totalClientAPayer,
  };
}

export function calculerProgres(totalCapital: number, totalCotise: number, cotisationJournaliere: number) {
  const resteAPayer     = Math.max(0, totalCapital - totalCotise);
  const pourcentage     = Math.min(100, Math.round((totalCotise / totalCapital) * 100));
  const joursPaies      = Math.floor(totalCotise / cotisationJournaliere);
  const estSolde        = totalCotise >= totalCapital;
  return { resteAPayer, pourcentage, joursPaies, estSolde };
}

// ─── NON-APPRENANTS GRILLE ────────────────────────────────────────────────────

export const ADHESION_NON_APPRENANT = 5500;

export const GRILLE_NON_APPRENANTS: GrilleNonApprenantRow[] = [
  {
    numero: 1, valeurMin: 0, valeurMax: 20000, fraisDossier: 600,
    prestations: { '4_mois': 1600, '6_mois': null, '8_mois': null, '10_mois': null },
    cotisations: { '4_mois': 200, '6_mois': null, '8_mois': null, '10_mois': null }
  },
  {
    numero: 2, valeurMin: 20001, valeurMax: 50000, fraisDossier: 1500,
    prestations: { '4_mois': 4000, '6_mois': null, '8_mois': null, '10_mois': null },
    cotisations: { '4_mois': 500, '6_mois': null, '8_mois': null, '10_mois': null }
  },
  {
    numero: 3, valeurMin: 50001, valeurMax: 80000, fraisDossier: 2400,
    prestations: { '4_mois': 6400, '6_mois': null, '8_mois': null, '10_mois': null },
    cotisations: { '4_mois': 750, '6_mois': null, '8_mois': null, '10_mois': null }
  },
  {
    numero: 4, valeurMin: 80001, valeurMax: 100000, fraisDossier: 3000,
    prestations: { '4_mois': 8000, '6_mois': null, '8_mois': null, '10_mois': null },
    cotisations: { '4_mois': 1000, '6_mois': null, '8_mois': null, '10_mois': null }
  },
  {
    numero: 5, valeurMin: 100001, valeurMax: 120000, fraisDossier: 3600,
    prestations: { '4_mois': null, '6_mois': 9000, '8_mois': null, '10_mois': null },
    cotisations: { '4_mois': null, '6_mois': 750, '8_mois': null, '10_mois': null }
  },
  {
    numero: 6, valeurMin: 120001, valeurMax: 150000, fraisDossier: 4500,
    prestations: { '4_mois': null, '6_mois': 11250, '8_mois': null, '10_mois': null },
    cotisations: { '4_mois': null, '6_mois': 1000, '8_mois': null, '10_mois': null }
  },
  {
    numero: 7, valeurMin: 150001, valeurMax: 180000, fraisDossier: 5400,
    prestations: { '4_mois': null, '6_mois': 13500, '8_mois': 18000, '10_mois': null },
    cotisations: { '4_mois': null, '6_mois': 1100, '8_mois': 900, '10_mois': null }
  },
  {
    numero: 8, valeurMin: 180001, valeurMax: 200000, fraisDossier: 6000,
    prestations: { '4_mois': null, '6_mois': 15000, '8_mois': 20000, '10_mois': null },
    cotisations: { '4_mois': null, '6_mois': 1300, '8_mois': 1000, '10_mois': null }
  },
  {
    numero: 9, valeurMin: 200001, valeurMax: 220000, fraisDossier: 6600,
    prestations: { '4_mois': null, '6_mois': 16500, '8_mois': 22000, '10_mois': null },
    cotisations: { '4_mois': null, '6_mois': 1400, '8_mois': 1100, '10_mois': null }
  },
  {
    numero: 10, valeurMin: 220001, valeurMax: 250000, fraisDossier: 7500,
    prestations: { '4_mois': null, '6_mois': 18750, '8_mois': 25000, '10_mois': 30000 },
    cotisations: { '4_mois': null, '6_mois': 1500, '8_mois': 1200, '10_mois': 1000 }
  },
  {
    numero: 11, valeurMin: 250001, valeurMax: 280000, fraisDossier: 8400,
    prestations: { '4_mois': null, '6_mois': 21000, '8_mois': 28000, '10_mois': 33600 },
    cotisations: { '4_mois': null, '6_mois': 1700, '8_mois': 1300, '10_mois': 1100 }
  },
  {
    numero: 12, valeurMin: 280001, valeurMax: 300000, fraisDossier: 9000,
    prestations: { '4_mois': null, '6_mois': 22500, '8_mois': 30000, '10_mois': 36000 },
    cotisations: { '4_mois': null, '6_mois': 1900, '8_mois': 1400, '10_mois': 1200 }
  },
  {
    numero: 13, valeurMin: 300001, valeurMax: 350000, fraisDossier: 10500,
    prestations: { '4_mois': null, '6_mois': 26250, '8_mois': 35000, '10_mois': 42000 },
    cotisations: { '4_mois': null, '6_mois': 2200, '8_mois': 1700, '10_mois': 1400 }
  },
  {
    numero: 14, valeurMin: 350001, valeurMax: 400000, fraisDossier: 12000,
    prestations: { '4_mois': null, '6_mois': 30000, '8_mois': 40000, '10_mois': 48000 },
    cotisations: { '4_mois': null, '6_mois': 2500, '8_mois': 2000, '10_mois': 1600 }
  },
  {
    numero: 15, valeurMin: 400001, valeurMax: 450000, fraisDossier: 13500,
    prestations: { '4_mois': null, '6_mois': 33750, '8_mois': 45000, '10_mois': 54000 },
    cotisations: { '4_mois': null, '6_mois': 2800, '8_mois': 2100, '10_mois': 1800 }
  },
  {
    numero: 16, valeurMin: 450001, valeurMax: 500000, fraisDossier: 15000,
    prestations: { '4_mois': null, '6_mois': 37500, '8_mois': 50000, '10_mois': 60000 },
    cotisations: { '4_mois': null, '6_mois': 3000, '8_mois': 2400, '10_mois': 2000 }
  },
  {
    numero: 17, valeurMin: 500001, valeurMax: 600000, fraisDossier: 18000,
    prestations: { '4_mois': null, '6_mois': 45000, '8_mois': 60000, '10_mois': 72000 },
    cotisations: { '4_mois': null, '6_mois': 3700, '8_mois': 3000, '10_mois': 2400 }
  },
];

export function findGrilleNonApprenantRow(valeurBien: number): GrilleNonApprenantRow | null {
  // If value is greater than the max in the grid, we still return the last row to maintain logic
  const sorted = [...GRILLE_NON_APPRENANTS].sort((a, b) => b.valeurMax - a.valeurMax);
  const maxRow = sorted[0];
  if (valeurBien > maxRow.valeurMax) return maxRow;

  return GRILLE_NON_APPRENANTS.find(r => valeurBien >= r.valeurMin && valeurBien <= r.valeurMax) ?? null;
}

export function calculerGrilleNonApprenant(valeurBien: number, duree: DureeFinancement, apportPersonnel = 0) {
  let row = findGrilleNonApprenantRow(valeurBien);
  if (!row) return null;

  let prestation = row.prestations[duree];
  let cotisation = row.cotisations[duree];
  let dossier = row.fraisDossier;

  // If value exceeds grid, calculate proportional prestation and cotisation based on the last row
  if (valeurBien > 600000) {
    const ratio = valeurBien / 600000;
    // We pick the 10_mois values for the base if the chosen duration isn't available for the 600k row
    // but the 600k row actually has all durations.
    const basePrestation = row.prestations[duree] || (row.prestations['10_mois'] as number);
    const baseCotisation = row.cotisations[duree] || (row.cotisations['10_mois'] as number);
    
    prestation = Math.round(basePrestation * ratio);
    cotisation = Math.round(baseCotisation * ratio);
    dossier = Math.round(row.fraisDossier * ratio);
  }

  if (prestation === null || cotisation === null) return null;

  const apportLibre = Math.min(Math.max(apportPersonnel, 0), valeurBien);
  const apportPourcentage = valeurBien > 0 ? Math.round((apportLibre / valeurBien) * 100) : 0;
  const montantFinance = valeurBien - apportLibre;
  const totalARembourser = montantFinance + prestation;
  const cyclePlan = getCyclePlan(totalARembourser, cotisation);

  return {
    row,
    fraisDossier: dossier,
    fraisPrestation: prestation,
    cotisationJournaliere: cotisation,
    apportMinimal: apportLibre,
    apportLibre,
    apportPourcentage,
    montantFinance,
    totalARembourser,
    ...cyclePlan,
  };
}
