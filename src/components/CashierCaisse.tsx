import { useMemo, useState } from 'react';
import { db } from '../localStorageDB';
import { Expense, Transaction, User } from '../types';
import { Landmark, ArrowUpRight, ArrowDownRight, TrendingUp } from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface Props { currentUser: User; }
function fmt(v: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F'; }
function parseD(d: string) { return new Date(d.includes('T') ? d : `${d}T00:00:00`); }

export default function CashierCaisse(_props: Props) {
  const [transactions] = useState<Transaction[]>(db.getTransactions());
  const [expenses] = useState<Expense[]>(db.getExpenses());
  const [employeePayments] = useState(db.getEmployeePayments());

  const approved = useMemo(() => transactions.filter(t => t.status === 'approved'), [transactions]);

  const totalIn = approved.filter(t => t.type === 'depot' || t.type === 'cotisation' || t.type === 'remboursement_dette').reduce((s, t) => s + t.amount, 0);
  const employeePaymentsOnly = employeePayments.filter(p => p.status === 'processed').reduce((s, p) => s + p.amount, 0);
  const totalOut = approved.filter(t => t.type === 'retrait').reduce((s, t) => s + t.amount, 0) + expenses.reduce((s, e) => s + e.amount, 0) + employeePaymentsOnly;
  const balance = totalIn - totalOut;

  const depositsOnly = approved.filter(t => t.type === 'depot' || t.type === 'cotisation').reduce((s, t) => s + t.amount, 0);
  const withdrawalsOnly = approved.filter(t => t.type === 'retrait').reduce((s, t) => s + t.amount, 0);
  const expensesOnly = expenses.reduce((s, e) => s + e.amount, 0);
  const repayOnly = approved.filter(t => t.type === 'remboursement_dette').reduce((s, t) => s + t.amount, 0);

  // Daily cumulative
  const cumulativeSeries = useMemo(() => {
    const bucket = new Map<string, number>();
    approved.forEach(t => {
      const val = (t.type === 'retrait') ? -t.amount : t.amount;
      bucket.set(t.date, (bucket.get(t.date) || 0) + val);
    });
    expenses.forEach(e => {
      bucket.set(e.date, (bucket.get(e.date) || 0) - e.amount);
    });

    let cumulative = 0;
    return [...bucket.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => {
        cumulative += v;
        return {
          date: new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(parseD(date)),
          solde: cumulative,
        };
      });
  }, [approved, expenses]);

  // Today's variation
  const refDate = useMemo(() => {
    const dates = transactions.map(t => parseD(t.date));
    if (!dates.length) return new Date();
    return dates.reduce((l, d) => d > l ? d : l, dates[0]);
  }, [transactions]);
  const today = refDate.toISOString().slice(0, 10);
  const todayIn = approved.filter(t => t.date === today && t.type !== 'retrait').reduce((s, t) => s + t.amount, 0);
  const todayOut = approved.filter(t => t.date === today && t.type === 'retrait').reduce((s, t) => s + t.amount, 0) + expenses.filter(e => e.date === today).reduce((s, e) => s + e.amount, 0);
  const todayVar = todayIn - todayOut;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Suivi de Caisse</h2>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200 flex items-center gap-1"><Landmark className="w-3 h-3" /> Trésorerie temps réel</span>
      </div>

      {/* Main balance */}
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <p className="text-sm text-indigo-200 mb-1">Solde actuel de caisse</p>
        <h1 className={`text-4xl font-bold ${balance >= 0 ? 'text-white' : 'text-rose-400'}`}>{fmt(balance)}</h1>
        <p className="text-xs text-slate-400 mt-2">Calcul automatique = Entrées − Sorties − Charges</p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Entrées (dépôts)', value: depositsOnly, icon: ArrowUpRight, tone: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Remboursements', value: repayOnly, icon: TrendingUp, tone: 'text-indigo-600', bg: 'bg-indigo-50' },
          { label: 'Sorties (retraits)', value: withdrawalsOnly, icon: ArrowDownRight, tone: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Charges', value: expensesOnly, icon: Landmark, tone: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Paiements employés', value: employeePaymentsOnly, icon: Landmark, tone: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Variation du jour', value: todayVar, icon: TrendingUp, tone: todayVar >= 0 ? 'text-emerald-600' : 'text-rose-600', bg: todayVar >= 0 ? 'bg-emerald-50' : 'bg-rose-50' },
        ].map(c => {
          const I = c.icon;
          return (
            <article key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div><p className="text-sm text-slate-500">{c.label}</p><h3 className={`mt-2 text-xl font-semibold ${c.tone}`}>{fmt(c.value)}</h3></div>
                <div className={`rounded-xl p-2.5 ${c.bg}`}><I className={`h-4 w-4 ${c.tone}`} /></div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Chart */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-1">Évolution du solde de caisse</h2>
        <p className="text-sm text-slate-500 mb-4">Courbe cumulative des flux financiers.</p>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={cumulativeSeries} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
              <YAxis tickLine={false} axisLine={false} fontSize={12} />
              <Tooltip />
              <Area type="monotone" dataKey="solde" stroke="#4f46e5" fill="#eef2ff" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Constraint reminder */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-800 mb-1">Règles de trésorerie</p>
        <ul className="list-disc list-inside space-y-0.5 text-slate-600">
          <li>Le solde est calculé <strong>automatiquement</strong> — aucune modification manuelle.</li>
          <li>Toute opération (dépôt, retrait, charge) a un impact immédiat.</li>
          <li>Les écarts doivent être signalés à l'administrateur.</li>
        </ul>
      </div>
    </div>
  );
}
