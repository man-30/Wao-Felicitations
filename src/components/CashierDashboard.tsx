import { useEffect, useMemo, useState } from 'react';
import { db } from '../localStorageDB';
import { Client, Expense, Transaction, User } from '../types';
import InsuranceFundCard from './InsuranceFundCard';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  ClipboardList,
  Clock,
  Wallet,
} from 'lucide-react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface CashierDashboardProps {
  currentUser: User;
}

function fmt(v: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F';
}

function parseD(d: string) {
  return new Date(d.includes('T') ? d : `${d}T00:00:00`);
}

export default function CashierDashboard({ currentUser }: CashierDashboardProps) {
  const [clients, setClients] = useState<Client[]>(db.getClients());
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [expenses, setExpenses] = useState<Expense[]>(db.getExpenses());
  const [employeePayments, setEmployeePayments] = useState(db.getEmployeePayments());

  // Synchronisation temps réel — polling 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setTransactions(db.getTransactions());
      setExpenses(db.getExpenses());
      setClients(db.getClients());
      setEmployeePayments(db.getEmployeePayments());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const refDate = useMemo(() => {
    const dates = transactions.map((t) => parseD(t.date));
    if (!dates.length) return new Date();
    return dates.reduce((l, d) => (d > l ? d : l), dates[0]);
  }, [transactions]);

  const today = refDate.toISOString().slice(0, 10);

  const approved = useMemo(() => transactions.filter((t) => t.status === 'approved'), [transactions]);

  const totalDeposits = approved.filter((t) => t.type === 'depot' || t.type === 'cotisation').reduce((s, t) => s + t.amount, 0);
  const totalRepay = approved.filter((t) => t.type === 'remboursement_dette').reduce((s, t) => s + t.amount, 0);
  const totalWithdrawals = approved.filter((t) => t.type === 'retrait').reduce((s, t) => s + t.amount, 0);
  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const totalEmployeePayments = employeePayments.filter((p) => p.status === 'processed').reduce((s, p) => s + p.amount, 0);
  const cashBalance = totalDeposits + totalRepay - totalWithdrawals - totalExpenses - totalEmployeePayments;

  const todayTx = transactions.filter((t) => t.date === today);
  const todayDeposits = todayTx.filter((t) => t.status === 'approved' && (t.type === 'depot' || t.type === 'cotisation'));
  const todayWithdrawals = todayTx.filter((t) => t.status === 'approved' && t.type === 'retrait');
  const todayOps = todayTx.length;

  const pending = transactions.filter((t) => t.status === 'pending');

  // Daily series for chart
  const dailySeries = useMemo(() => {
    const bucket = new Map<string, { dep: number; ret: number; cha: number }>();
    approved.forEach((t) => {
      if (!bucket.has(t.date)) bucket.set(t.date, { dep: 0, ret: 0, cha: 0 });
      const b = bucket.get(t.date)!;
      if (t.type === 'depot' || t.type === 'cotisation') b.dep += t.amount;
      else if (t.type === 'retrait') b.ret += t.amount;
    });
    expenses.forEach((e) => {
      if (!bucket.has(e.date)) bucket.set(e.date, { dep: 0, ret: 0, cha: 0 });
      bucket.get(e.date)!.cha += e.amount;
    });
    return [...bucket.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({
        date: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(parseD(date)),
        Dépôts: v.dep,
        Retraits: v.ret,
        Charges: v.cha,
      }));
  }, [approved, expenses]);

  // Alerts
  const alerts: { level: 'high' | 'med'; text: string }[] = [];
  if (cashBalance < 0) alerts.push({ level: 'high', text: 'Le solde de caisse est négatif. Vérifier les opérations.' });
  if (totalWithdrawals > totalDeposits * 0.8 && totalWithdrawals > 0) alerts.push({ level: 'high', text: 'Volume des retraits anormalement élevé par rapport aux dépôts.' });
  if (pending.length > 3) alerts.push({ level: 'med', text: `${pending.length} opérations en attente. Pensez à valider.` });

  const recentOps = [...transactions]
    .sort((a, b) => parseD(b.date).getTime() - parseD(a.date).getTime())
    .slice(0, 8);

  const recentCharges = [...expenses]
    .sort((a, b) => parseD(b.date).getTime() - parseD(a.date).getTime())
    .slice(0, 4);

  return (
    <div className="space-y-6">
      {/* Hero */}
      <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-200">
              <Banknote className="h-3.5 w-3.5" /> Guichet — {currentUser.zone || 'Agence'}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Tableau de bord caissier</h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Gardien de la cohérence financière. Suivi de la caisse, contrôle des dépôts, exécution des retraits et gestion des charges.
            </p>
          </div>
          <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200">
            <Clock className="h-4 w-4 text-indigo-300" /> Date de réf.: {today}
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Solde caisse', value: cashBalance, icon: Banknote, tone: cashBalance >= 0 ? 'text-indigo-600' : 'text-rose-600', bg: cashBalance >= 0 ? 'bg-indigo-50' : 'bg-rose-50' },
          { label: 'Total dépôts', value: totalDeposits, icon: ArrowUpRight, tone: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Total retraits', value: totalWithdrawals, icon: ArrowDownLeft, tone: 'text-rose-600', bg: 'bg-rose-50' },
          { label: 'Total charges', value: totalExpenses, icon: Wallet, tone: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Ops. du jour', value: todayOps, icon: ClipboardList, tone: 'text-slate-700', bg: 'bg-slate-50', isCnt: true },
        ].map((c) => {
          const I = c.icon;
          return (
            <article key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{c.label}</p>
                  <h3 className={`mt-2 text-2xl font-semibold ${c.tone}`}>{(c as any).isCnt ? c.value : fmt(c.value as number)}</h3>
                </div>
                <div className={`rounded-xl p-3 ${c.bg}`}><I className={`h-5 w-5 ${c.tone}`} /></div>
              </div>
            </article>
          );
        })}
      </section>

      {/* Alerts */}
      {alerts.length > 0 && (
        <section className="space-y-2">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-2xl border p-4 text-sm ${a.level === 'high' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>{a.text}</p>
            </div>
          ))}
        </section>
      )}

      {/* Insurance Fund — temps réel */}
      <InsuranceFundCard variant="full" />

      {/* Chart + Right side */}
      <section className="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-1">Flux de trésorerie</h2>
          <p className="text-sm text-slate-500 mb-4">Évolution des dépôts, retraits et charges.</p>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dailySeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="Dépôts" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Retraits" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="Charges" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          {/* Activity snapshot */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Activité récente</h2>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700 font-medium">Dépôts du jour</p>
                <p className="mt-1 text-xl font-semibold text-emerald-900">{todayDeposits.length}</p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-xs text-rose-700 font-medium">Retraits du jour</p>
                <p className="mt-1 text-xl font-semibold text-rose-900">{todayWithdrawals.length}</p>
              </div>
              <div className="rounded-xl bg-amber-50 p-3">
                <p className="text-xs text-amber-700 font-medium">En attente</p>
                <p className="mt-1 text-xl font-semibold text-amber-900">{pending.length}</p>
              </div>
            </div>
          </div>

          {/* Recent charges */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Dernières charges</h2>
            <div className="space-y-2">
              {recentCharges.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Aucune charge.</p>
              ) : recentCharges.map((e) => (
                <div key={e.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                  <div>
                    <p className="font-semibold text-slate-800">{e.category}</p>
                    <p className="text-xs text-slate-500">{e.description}</p>
                  </div>
                  <span className="font-semibold text-rose-600">{fmt(e.amount)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cashier info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900 mb-3">Poste de caisse</h2>
            <div className="space-y-2 text-sm">
              <div className="rounded-xl bg-slate-50 p-3 flex justify-between"><span className="text-slate-500">Caissier</span><span className="font-semibold text-slate-900">{currentUser.name}</span></div>
              <div className="rounded-xl bg-slate-50 p-3 flex justify-between"><span className="text-slate-500">Agence</span><span className="font-semibold text-slate-900">{currentUser.zone || 'Principale'}</span></div>
              <div className="rounded-xl bg-slate-50 p-3 flex justify-between"><span className="text-slate-500">Clients gérés</span><span className="font-semibold text-slate-900">{clients.length}</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* Latest operations table */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Dernières opérations enregistrées</h2>
        <p className="text-sm text-slate-500 mb-4">Dépôts, retraits et cotisations par les commerciaux et la caisse.</p>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Client</th>
                <th className="px-4 py-3 text-left font-semibold">Montant</th>
                <th className="px-4 py-3 text-left font-semibold">Par</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {recentOps.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${
                      t.type === 'retrait' ? 'bg-rose-50 text-rose-700' : t.type === 'depot' || t.type === 'cotisation' ? 'bg-emerald-50 text-emerald-700' : 'bg-indigo-50 text-indigo-700'
                    }`}>
                      {t.type === 'depot' ? 'Dépôt' : t.type === 'retrait' ? 'Retrait' : t.type === 'cotisation' ? 'Cotisation' : 'Remb. dette'}
                    </span>
                    {t.isModified && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">MODIFIÉ</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-800 font-medium">{t.clientName}</td>
                  <td className="px-4 py-3 font-semibold text-slate-900">{fmt(t.amount)}</td>
                  <td className="px-4 py-3 text-slate-500">{t.collectedByName || t.validatedByName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      t.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : t.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                    }`}>{t.status === 'approved' ? 'Validé' : t.status === 'pending' ? 'En attente' : 'Rejeté'}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{t.date}</td>
                </tr>
              ))}
              {recentOps.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucune opération.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {/* Business rule reminder */}
      <section className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
        <div className="flex items-start gap-3 text-sm text-rose-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <div>
            <p className="font-semibold">Rappel des règles métier</p>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-rose-700">
              <li>Le commercial ne peut <strong>jamais</strong> effectuer de retrait.</li>
              <li>Les retraits sont faits <strong>uniquement en agence</strong> par le caissier.</li>
              <li>L'épargnant doit être <strong>présent physiquement</strong> pour retirer.</li>
              <li>Toute correction de dépôt nécessite un <strong>code admin</strong>.</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
