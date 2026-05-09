import { Cotisation, CotisationAllocation } from './types';

export const CYCLE_DAYS = 31;
export const REMBOURSEMENT_DAYS_PER_CYCLE = 30;

export interface CycleInfo {
  cycleMonth: number;
  cycleDay: number;
  allocation: CotisationAllocation;
}

export interface CyclePlan {
  remboursementCases: number;
  beneficeCases: number;
  totalCasesCarnet: number;
  totalBeneficeCase1: number;
  totalClientAPayer: number;
}

export function getCycleInfoByCaseIndex(caseIndex: number): CycleInfo {
  const cycleMonth = Math.floor(caseIndex / CYCLE_DAYS) + 1;
  const cycleDay = (caseIndex % CYCLE_DAYS) + 1;
  return {
    cycleMonth,
    cycleDay,
    allocation: cycleDay === 1 ? 'benefice_societe' : 'remboursement',
  };
}

export function getNextCycleInfo(existingCotisationsCount: number): CycleInfo {
  return getCycleInfoByCaseIndex(existingCotisationsCount);
}

export function getCyclePlan(totalRemboursement: number, cotisationJournaliere: number): CyclePlan {
  const remboursementCases = cotisationJournaliere > 0
    ? Math.ceil(totalRemboursement / cotisationJournaliere)
    : 0;
  const beneficeCases = remboursementCases > 0
    ? Math.ceil(remboursementCases / REMBOURSEMENT_DAYS_PER_CYCLE)
    : 0;
  const totalCasesCarnet = remboursementCases + beneficeCases;
  const totalBeneficeCase1 = beneficeCases * cotisationJournaliere;

  return {
    remboursementCases,
    beneficeCases,
    totalCasesCarnet,
    totalBeneficeCase1,
    totalClientAPayer: totalRemboursement + totalBeneficeCase1,
  };
}

export function sortCotisationsAsc(cotisations: Cotisation[]) {
  return [...cotisations].sort((a, b) => {
    const byDate = a.date.localeCompare(b.date);
    if (byDate !== 0) return byDate;
    return a.id.localeCompare(b.id);
  });
}

export function withDerivedCycleInfo(cotisations: Cotisation[]) {
  return sortCotisationsAsc(cotisations).map((cotisation, index) => {
    const derived = getCycleInfoByCaseIndex(index);
    return {
      ...cotisation,
      cycleMonth: cotisation.cycleMonth ?? derived.cycleMonth,
      cycleDay: cotisation.cycleDay ?? derived.cycleDay,
      allocation: cotisation.allocation ?? derived.allocation,
    };
  });
}

export function getCotisationAllocation(cotisation: Cotisation, index: number): CotisationAllocation {
  return cotisation.allocation ?? getCycleInfoByCaseIndex(index).allocation;
}

export function sumRemboursement(cotisations: Cotisation[]) {
  return withDerivedCycleInfo(cotisations)
    .filter((cotisation) => cotisation.allocation === 'remboursement')
    .reduce((sum, cotisation) => sum + cotisation.amount, 0);
}

export function sumBeneficeCase1(cotisations: Cotisation[]) {
  return withDerivedCycleInfo(cotisations)
    .filter((cotisation) => cotisation.allocation === 'benefice_societe')
    .reduce((sum, cotisation) => sum + cotisation.amount, 0);
}