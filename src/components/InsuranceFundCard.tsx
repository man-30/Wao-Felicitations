import { useMemo, useState } from 'react';
import { Apprenant } from '../types';
import { db } from '../localStorageDB';
import { computeInsuranceStats, formatPeriod } from '../insurance';
import { Shield, TrendingUp, Users, Eye, X } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface Props {
  variant?: 'compact' | 'full';
}

const fmt = (v: number) => new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F';

export default function InsuranceFundCard({ variant = 'full' }: Props) {
  const [showDetail, setShowDetail] = useState(false);
  const stats = useMemo(() => computeInsuranceStats(), []);
  const apprenants: Apprenant[] = useMemo(() => db.getApprenants(), []);

  const apprenantName = (id: string) => apprenants.find((a) => a.id === id)?.studentName || id;

  if (variant === 'compact') {
    return (
      <article className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/40 p-4 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Caisse Commune Assurance</p>
            <h3 className="mt-2 text-2xl font-bold text-emerald-900">{fmt(stats.totalCollected)}</h3>
            <p className="mt-1 text-xs text-emerald-700">{stats.totalContributors} apprenant(s) cotisant</p>
          </div>
          <div className="rounded-xl bg-emerald-600 p-3 text-white shadow-sm shadow-emerald-200">
            <Shield className="h-5 w-5" />
          </div>
        </div>
        <button
          onClick={() => setShowDetail(true)}
          className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900"
        >
          <Eye className="h-3 w-3" /> Voir les détails
        </button>

        {showDetail && (
          <DetailModal stats={stats} apprenantName={apprenantName} onClose={() => setShowDetail(false)} />
        )}
      </article>
    );
  }

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white shadow-sm overflow-hidden">
      <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 p-5 text-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-200">Caisse Commune de Sécurité</p>
            <h2 className="mt-1 text-xl font-bold">Fonds d'Assurance Apprenants</h2>
            <p className="mt-1 text-xs text-emerald-200">Alimenté automatiquement par les frais d'assurance versés à l'inscription.</p>
          </div>
          <div className="rounded-2xl bg-white/10 p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <Shield className="h-8 w-8 text-emerald-200" />
              <div>
                <p className="text-3xl font-extrabold">{fmt(stats.totalCollected)}</p>
                <p className="text-xs text-emerald-200">Solde temps réel</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-5 sm:grid-cols-3">
        <div className="rounded-xl bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <Users className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase">Cotisants</p>
          </div>
          <p className="mt-2 text-xl font-bold text-emerald-900">{stats.totalContributors}</p>
          <p className="text-[10px] text-emerald-600">sur {stats.totalAccounts} comptes apprenants</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <div className="flex items-center gap-2 text-emerald-700">
            <TrendingUp className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase">Contribution moyenne</p>
          </div>
          <p className="mt-2 text-xl font-bold text-emerald-900">{fmt(stats.averageContribution)}</p>
          <p className="text-[10px] text-emerald-600">par apprenant éligible</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-slate-700">
            <Shield className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase">Tranches éligibles</p>
          </div>
          <p className="mt-2 text-xl font-bold text-slate-900">{Object.keys(stats.contributorsByGrille).length}</p>
          <p className="text-[10px] text-slate-500">toutes les tranches grille</p>
        </div>
      </div>

      {stats.monthlySeries.length > 0 && (
        <div className="px-5 pb-5">
          <h3 className="text-sm font-semibold text-slate-800">Évolution cumulative du fonds</h3>
          <div className="mt-3 h-48">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.monthlySeries.map((s) => ({ ...s, periodLabel: formatPeriod(s.period) }))} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="insuranceGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#059669" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="periodLabel" tickLine={false} axisLine={false} fontSize={11} />
                <YAxis tickLine={false} axisLine={false} fontSize={11} />
                <Tooltip />
                <Area type="monotone" dataKey="cumulative" stroke="#047857" strokeWidth={2} fill="url(#insuranceGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-3 bg-slate-50">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-slate-500">Dernier(s) versement(s) automatique(s)</p>
          <button onClick={() => setShowDetail(true)} className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-900">
            <Eye className="h-3 w-3" /> Voir tout
          </button>
        </div>
        <div className="mt-2 space-y-1.5">
          {stats.recentContributions.slice(0, 3).map((entry) => (
            <div key={entry.accountId} className="flex items-center justify-between text-xs">
              <span className="text-slate-700 truncate">
                <span className="font-mono text-emerald-700">{entry.accountNumero}</span> · {apprenantName(entry.apprenantId)}
              </span>
              <span className="font-semibold text-emerald-800">+{fmt(entry.amount)}</span>
            </div>
          ))}
          {stats.recentContributions.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-2">Aucun versement enregistré.</p>
          )}
        </div>
      </div>

      {showDetail && (
        <DetailModal stats={stats} apprenantName={apprenantName} onClose={() => setShowDetail(false)} />
      )}
    </section>
  );
}

interface DetailProps {
  stats: ReturnType<typeof computeInsuranceStats>;
  apprenantName: (id: string) => string;
  onClose: () => void;
}

function DetailModal({ stats, apprenantName, onClose }: DetailProps) {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-700 to-emerald-900 p-5 text-white flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2"><Shield className="h-5 w-5" /> Caisse Commune Assurance</h3>
            <p className="text-xs text-emerald-200 mt-1">Détail complet des contributions et tranches</p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-full"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Solde total</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{fmt(stats.totalCollected)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Nombre de cotisants</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{stats.totalContributors}</p>
            </div>
          </div>

          {Object.keys(stats.contributorsByGrille).length > 0 && (
            <div>
              <h4 className="text-sm font-semibold text-slate-800 mb-2">Répartition par tranche grille</h4>
              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Tranche</th>
                      <th className="px-4 py-2 text-left font-semibold">Cotisants</th>
                      <th className="px-4 py-2 text-left font-semibold">Total versé</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.keys(stats.contributorsByGrille)
                      .sort((a, b) => Number(a) - Number(b))
                      .map((tranche) => (
                        <tr key={tranche} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 font-semibold text-slate-800">N° {tranche}</td>
                          <td className="px-4 py-2 text-slate-600">{stats.contributorsByGrille[Number(tranche)]}</td>
                          <td className="px-4 py-2 font-semibold text-emerald-700">{fmt(stats.totalByGrille[Number(tranche)])}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-2">Tous les versements ({stats.recentContributions.length})</h4>
            <div className="rounded-2xl border border-slate-200 overflow-hidden max-h-72 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Date</th>
                    <th className="px-4 py-2 text-left font-semibold">N° Compte</th>
                    <th className="px-4 py-2 text-left font-semibold">Apprenant</th>
                    <th className="px-4 py-2 text-left font-semibold">Tranche</th>
                    <th className="px-4 py-2 text-left font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stats.recentContributions.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-6 text-center text-slate-400">Aucun versement.</td></tr>
                  ) : stats.recentContributions.map((entry) => (
                    <tr key={entry.accountId} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2 text-slate-500">{entry.date}</td>
                      <td className="px-4 py-2 font-mono text-xs text-emerald-700">{entry.accountNumero}</td>
                      <td className="px-4 py-2 text-slate-800">{apprenantName(entry.apprenantId)}</td>
                      <td className="px-4 py-2"><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold">N°{entry.grilleNumero}</span></td>
                      <td className="px-4 py-2 font-semibold text-emerald-700">+{fmt(entry.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

            <strong>Règle :</strong> les frais d'assurance sont collectés pour TOUTES les tranches de scolarité (grille N°1 à 13). Ce fonds sert de caisse commune de sécurité pour les apprenants.
        </div>
      </div>
    </div>
  );
}
