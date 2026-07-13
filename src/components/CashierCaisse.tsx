import { useMemo, useState } from 'react';
import { db } from '../localStorageDB';
import { Transaction, User } from '../types';
import { CalendarDays, Landmark, TrendingUp, Users } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface Props { currentUser: User; }
function fmt(v: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F'; }
function parseD(d: string) { return new Date(d.includes('T') ? d : `${d}T00:00:00`); }

export default function CashierCaisse(_props: Props) {
  const [transactions] = useState<Transaction[]>(db.getTransactions());
  const cotisations = useMemo(
    () => transactions.filter((t) => t.status === 'approved' && t.type === 'cotisation'),
    [transactions],
  );

  const totalCotisations = cotisations.reduce((sum, t) => sum + t.amount, 0);

  // Daily cumulative (cotisations only)
  const cumulativeSeries = useMemo(() => {
    const bucket = new Map<string, number>();
    cotisations.forEach((t) => {
      bucket.set(t.date, (bucket.get(t.date) || 0) + t.amount);
    });

    let cumulative = 0;
    return [...bucket.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        cumulative += v;
        return {
          date: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(parseD(date)),
          total: cumulative,
        };
      });
  }, [cotisations]);

  const today = new Date().toISOString().slice(0, 10);
  const currentMonth = today.slice(0, 7);
  const totalToday = cotisations.filter((t) => t.date === today).reduce((sum, t) => sum + t.amount, 0);
  const totalMonth = cotisations.filter((t) => t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0);
  const activeClients = new Set(cotisations.map((t) => t.clientId)).size;
  const recentCotisations = [...cotisations].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Caisse Tontine (MVP)</h2>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200 flex items-center gap-1"><Landmark className="w-3 h-3" /> Cotisations uniquement</span>
      </div>

      {/* Main total */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <p className="text-sm text-indigo-200 mb-1">Total cumulé des cotisations journalières</p>
        <h1 className="text-4xl font-bold text-white">{fmt(totalCotisations)}</h1>
        <p className="text-xs text-slate-400 mt-2">Périmètre MVP: flux tontine validés (type cotisation).</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total du jour', value: totalToday, icon: CalendarDays, tone: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total du mois', value: totalMonth, icon: TrendingUp, tone: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Clients cotisants', value: activeClients, icon: Users, tone: 'text-slate-700', bg: 'bg-slate-100', isCount: true },
          { label: 'Nombre de cotisations', value: cotisations.length, icon: Landmark, tone: 'text-amber-600', bg: 'bg-amber-50', isCount: true },
        ].map(c => {
          const I = c.icon;
          return (
            <article key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm text-slate-500">{c.label}</p><h3 className={`mt-2 text-xl font-semibold ${c.tone}`}>{(c as { isCount?: boolean }).isCount ? c.value : fmt(c.value)}</h3></div>
                <div className={`rounded-xl p-2.5 ${c.bg}`}><I className={`h-4 w-4 ${c.tone}`} /></div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Progression cumulée des cotisations</h2>
        <p className="text-sm text-slate-500 mb-4">Visualisation simple de la performance quotidienne.</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulativeSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="total" stroke="#4f46e5" fill="#eef2ff" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent records */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm overflow-hidden">
        <h2 className="text-base font-semibold text-slate-900 mb-3">Registre des cotisations récentes</h2>
        <div className="overflow-x-auto max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 sticky top-0">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Date</th>
                <th className="px-4 py-2 text-left font-semibold">Client</th>
                <th className="px-4 py-2 text-left font-semibold">Montant</th>
                <th className="px-4 py-2 text-left font-semibold">Commercial</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCotisations.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Aucune cotisation validée.</td></tr>
              ) : recentCotisations.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2 text-slate-500">{t.date}</td>
                  <td className="px-4 py-2 font-semibold text-slate-900">{t.clientName}</td>
                  <td className="px-4 py-2 font-semibold text-indigo-700">{fmt(t.amount)}</td>
                  <td className="px-4 py-2 text-slate-500">{t.collectedByName || 'Commercial'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
