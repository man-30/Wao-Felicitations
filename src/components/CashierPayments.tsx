import { useEffect, useMemo, useState } from 'react';
import { db } from '../localStorageDB';
import { EmployeePayment, User } from '../types';
import { CheckCircle2, Clock3, HandCoins, History, WalletCards } from 'lucide-react';

interface Props {
  currentUser: User;
}

const fmt = (value: number) => new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' F';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function CashierPayments({ currentUser }: Props) {
  const [payments, setPayments] = useState<EmployeePayment[]>(db.getEmployeePayments());
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');

  // 19.5 — Synchronisation temps réel par polling localStorage (3s)
  useEffect(() => {
    const interval = setInterval(() => {
      const fresh = db.getEmployeePayments();
      setPayments(prev => {
        const prevJSON = JSON.stringify(prev.map(p => p.id + p.status));
        const freshJSON = JSON.stringify(fresh.map(p => p.id + p.status));
        return prevJSON !== freshJSON ? fresh : prev;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const pending = useMemo(
    () => payments
      .filter((payment) => payment.status === 'pending')
      .sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime()),
    [payments],
  );

  const history = useMemo(
    () => payments
      .filter((payment) => payment.status === 'processed')
      .sort((a, b) => new Date(b.processedAt || b.initiatedAt).getTime() - new Date(a.processedAt || a.initiatedAt).getTime()),
    [payments],
  );

  const markAsProcessed = (payment: EmployeePayment) => {
    const now = new Date().toISOString();
    const updated = payments.map((item) =>
      item.id === payment.id
        ? {
            ...item,
            status: 'processed' as const,
            processedAt: now,
            processedBy: currentUser.id,
            processedByName: currentUser.name,
          }
        : item,
    );

    db.saveEmployeePayments(updated);
    db.addLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'Paiement Employé Traité',
      `Paiement de ${fmt(payment.amount)} remis à ${payment.employeeName}.`,
    );
    setPayments(updated);
    setActiveTab('history');
  };

  const totalPending = pending.reduce((sum, payment) => sum + payment.amount, 0);
  const totalProcessed = history.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-[#228B22] via-[#1a6d1a] to-[#D4AF37] p-6 text-white shadow-xl shadow-emerald-900/20">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white">
              <HandCoins className="h-3.5 w-3.5" /> Paiements positionnés par l'admin
            </div>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight">Paiements employés</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/80">
              Traitez les montants positionnés par l'administrateur et conservez un historique non modifiable.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-white/70">En attente</p>
              <p className="mt-1 text-xl font-bold">{fmt(totalPending)}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
              <p className="text-white/70">Traités</p>
              <p className="mt-1 text-xl font-bold">{fmt(totalProcessed)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('pending')}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'pending' ? 'bg-amber-50 text-amber-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <Clock3 className="h-4 w-4" /> Paiements en attente ({pending.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'history' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <History className="h-4 w-4" /> Historique ({history.length})
          </button>
        </div>
      </section>

      {activeTab === 'pending' ? (
        <PaymentTable
          items={pending}
          emptyLabel="Aucun paiement en attente."
          mode="pending"
          onProcess={markAsProcessed}
        />
      ) : (
        <PaymentTable items={history} emptyLabel="Aucun paiement traité." mode="history" />
      )}
    </div>
  );
}

interface PaymentTableProps {
  items: EmployeePayment[];
  emptyLabel: string;
  mode: 'pending' | 'history';
  onProcess?: (payment: EmployeePayment) => void;
}

function PaymentTable({ items, emptyLabel, mode, onProcess }: PaymentTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Bénéficiaire</th>
              <th className="px-4 py-3 text-left font-semibold">Montant</th>
              <th className="px-4 py-3 text-left font-semibold">Motif</th>
              <th className="px-4 py-3 text-left font-semibold">Initiation</th>
              <th className="px-4 py-3 text-left font-semibold">Admin</th>
              {mode === 'history' && <th className="px-4 py-3 text-left font-semibold">Traitement</th>}
              <th className="px-4 py-3 text-left font-semibold">Statut</th>
              {mode === 'pending' && <th className="px-4 py-3 text-left font-semibold">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.length === 0 ? (
              <tr>
                <td colSpan={mode === 'history' ? 7 : 7} className="px-4 py-10 text-center text-slate-400">
                  <WalletCards className="mx-auto mb-2 h-8 w-8 opacity-30" />
                  {emptyLabel}
                </td>
              </tr>
            ) : items.map((payment) => (
              <tr key={payment.id} className="hover:bg-slate-50/60">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">{payment.employeeName}</p>
                  <p className="text-xs capitalize text-slate-500">{payment.employeeRole}</p>
                </td>
                <td className="px-4 py-3 font-bold text-slate-900">{fmt(payment.amount)}</td>
                <td className="px-4 py-3 text-slate-600">{payment.reason || <span className="text-slate-400">Aucun motif</span>}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(payment.initiatedAt)}</td>
                <td className="px-4 py-3 text-slate-700">{payment.initiatedByName}</td>
                {mode === 'history' && (
                  <td className="px-4 py-3 text-slate-500">{payment.processedAt ? formatDate(payment.processedAt) : '-'}</td>
                )}
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    payment.status === 'processed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  }`}>
                    {payment.status === 'processed' ? 'Traité' : 'Non traité'}
                  </span>
                </td>
                {mode === 'pending' && (
                  <td className="px-4 py-3">
                    <button
                      onClick={() => onProcess?.(payment)}
                      className="inline-flex items-center gap-2 rounded-xl bg-[#228B22] px-3 py-2 text-xs font-semibold text-white hover:bg-[#1a6d1a]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" /> Marquer comme traité
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}