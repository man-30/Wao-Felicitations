import { db } from './localStorageDB';
import { TontineAccount } from './types';

export interface InsuranceStats {
  totalCollected: number;       // somme des frais assurance versés (capital)
  totalContributors: number;    // nb apprenants ayant versé une assurance > 0
  totalAccounts: number;        // nb total de comptes apprenants
  averageContribution: number;  // contribution moyenne
  contributorsByGrille: Record<number, number>; // tranche → nb apprenants
  totalByGrille: Record<number, number>;        // tranche → montant total
  monthlySeries: { period: string; amount: number; cumulative: number; count: number }[];
  recentContributions: {
    accountId: string;
    apprenantId: string;
    accountNumero: string;
    amount: number;
    date: string;
    grilleNumero: number;
  }[];
}

function parseDate(value: string) {
  return new Date(value.includes('T') ? value : `${value}T00:00:00`);
}

export function computeInsuranceStats(accounts?: TontineAccount[]): InsuranceStats {
  const list = accounts ?? db.getTontineAccounts();
  const eligible = list.filter((account) => (account.fraisAssurance || 0) > 0);

  const totalCollected = eligible.reduce((sum, account) => sum + (account.fraisAssurance || 0), 0);
  const totalContributors = eligible.length;
  const averageContribution = totalContributors > 0 ? Math.round(totalCollected / totalContributors) : 0;

  const contributorsByGrille: Record<number, number> = {};
  const totalByGrille: Record<number, number> = {};
  eligible.forEach((account) => {
    contributorsByGrille[account.grilleNumero] = (contributorsByGrille[account.grilleNumero] || 0) + 1;
    totalByGrille[account.grilleNumero] = (totalByGrille[account.grilleNumero] || 0) + (account.fraisAssurance || 0);
  });

  const buckets = new Map<string, { amount: number; count: number }>();
  eligible.forEach((account) => {
    const period = account.createdAt.slice(0, 7); // YYYY-MM
    const current = buckets.get(period) || { amount: 0, count: 0 };
    current.amount += account.fraisAssurance || 0;
    current.count += 1;
    buckets.set(period, current);
  });

  const sortedPeriods = [...buckets.entries()].sort(([a], [b]) => a.localeCompare(b));
  let cumulative = 0;
  const monthlySeries = sortedPeriods.map(([period, data]) => {
    cumulative += data.amount;
    return { period, amount: data.amount, cumulative, count: data.count };
  });

  const recentContributions = [...eligible]
    .sort((a, b) => parseDate(b.createdAt).getTime() - parseDate(a.createdAt).getTime())
    .slice(0, 8)
    .map((account) => ({
      accountId: account.id,
      apprenantId: account.apprenantId,
      accountNumero: account.numero,
      amount: account.fraisAssurance || 0,
      date: account.createdAt,
      grilleNumero: account.grilleNumero,
    }));

  return {
    totalCollected,
    totalContributors,
    totalAccounts: list.length,
    averageContribution,
    contributorsByGrille,
    totalByGrille,
    monthlySeries,
    recentContributions,
  };
}

export function formatPeriod(period: string) {
  if (!period) return '';
  const [year, month] = period.split('-');
  return new Intl.DateTimeFormat('fr-FR', { month: 'short', year: 'numeric' }).format(new Date(Number(year), Number(month) - 1, 1));
}
