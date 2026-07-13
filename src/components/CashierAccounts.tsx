import { useState } from 'react';
import { db } from '../localStorageDB';
import { Client, Transaction, User } from '../types';
import { CreditCard, Eye, Search, X } from 'lucide-react';

interface Props { currentUser: User; }
function fmt(v: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F'; }
function accountLabelByClientType(type: Client['type']) {
  return type === 'simple' ? 'Compte Épargne' : 'Compte courant';
}

export default function CashierAccounts(_props: Props) {
  const [clients] = useState<Client[]>(db.getClients());
  const [transactions] = useState<Transaction[]>(db.getTransactions());
  const [searchTerm, setSearchTerm] = useState('');
  const [viewClient, setViewClient] = useState<Client | null>(null);

  const users = db.getUsers();
  const commName = (id: string) => users.find(u => u.id === id)?.name || id;

  const filtered = clients.filter(c =>
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm)
  );

  const clientTx = (clientId: string) =>
    transactions.filter(t => t.clientId === clientId && t.status === 'approved')
      .sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Comptes Clients</h2>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200 flex items-center gap-1"><CreditCard className="w-3 h-3" /> Épargne & Financement</span>
      </div>

      {/* Info */}
      <div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-800">
        <p className="font-semibold">Types de comptes</p>
        <p className="mt-1">Chaque client dispose d'un <strong>compte épargne</strong> (solde automatique des dépôts) et d'un <strong>compte financement</strong> (suivi scolarité/dette). Les soldes sont calculés automatiquement et ne peuvent pas être modifiés manuellement.</p>
      </div>

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" className="bg-transparent text-sm w-full focus:outline-none placeholder-slate-400" placeholder="Rechercher un client..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Actifs</th>
              <th className="px-4 py-3 text-left font-semibold">Compte Financement</th>
              <th className="px-4 py-3 text-left font-semibold">Dette active</th>
              <th className="px-4 py-3 text-left font-semibold">Détails</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun client.</td></tr> :
                filtered.map(c => {
                  const debt = c.schoolDebts.find(d => d.active);
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3"><p className="font-semibold text-slate-900">{c.name}</p><p className="text-xs text-slate-400">{commName(c.assignedCommercialId)}</p></td>
                      <td className="px-4 py-3 capitalize text-xs text-slate-600">{c.type}</td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-[10px] text-slate-500 font-semibold uppercase">{accountLabelByClientType(c.type)}</p>
                          <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700">{fmt(c.savingsBalance)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3"><span className="rounded-xl bg-indigo-50 px-3 py-1.5 text-sm font-semibold text-indigo-700">{fmt(c.financingBalance || 0)}</span></td>
                      <td className="px-4 py-3">{debt ? <><p className="font-medium text-slate-800 text-xs">{debt.schoolName}</p><p className="text-xs text-indigo-600">Reste: {fmt(debt.debtAmount - debt.paidAmount)}</p></> : <span className="text-slate-400 text-xs">—</span>}</td>
                      <td className="px-4 py-3"><button onClick={() => setViewClient(c)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200"><Eye className="w-3.5 h-3.5" /></button></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail modal */}
      {viewClient && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[90vh] overflow-y-auto">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <h3 className="font-semibold">Comptes — {viewClient.name}</h3>
              <button onClick={() => setViewClient(null)} className="p-1 hover:bg-slate-800 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-emerald-50 p-4 border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-medium">{accountLabelByClientType(viewClient.type)}</p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">{fmt(viewClient.savingsBalance)}</p>
                  <p className="text-xs text-emerald-600 mt-2">Solde des actifs clients (dépôts et cotisations applicables)</p>
                </div>
                <div className="rounded-2xl bg-indigo-50 p-4 border border-indigo-200">
                  <p className="text-xs text-indigo-700 font-medium">Compte Financement</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">{fmt(viewClient.financingBalance || 0)}</p>
                  <p className="text-xs text-indigo-600 mt-2">Suivi des engagements et scolarité</p>
                </div>
              </div>

              {viewClient.schoolDebts.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-slate-800 mb-2">Historique financement / dettes</h4>
                  <div className="space-y-2">{viewClient.schoolDebts.map(d => (
                    <div key={d.id} className={`rounded-xl p-3 text-sm border ${d.active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 bg-slate-50'}`}>
                      <div className="flex justify-between"><span className="font-semibold text-slate-900">{d.schoolName}</span><span className={`text-xs font-semibold ${d.active ? 'text-indigo-600' : 'text-slate-400'}`}>{d.active ? 'ACTIF' : 'ANCIEN'}</span></div>
                      <div className="mt-1 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (d.paidAmount / d.debtAmount) * 100)}%` }} /></div>
                      <p className="text-xs text-slate-500 mt-1">Payé: {fmt(d.paidAmount)} / {fmt(d.debtAmount)}</p>
                    </div>
                  ))}</div>
                </div>
              )}

              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-2">Dernières transactions</h4>
                <div className="space-y-2">{clientTx(viewClient.id).slice(0, 8).map(t => (
                  <div key={t.id} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.type === 'retrait' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{t.type}</span>
                      {t.isModified && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">MODIFIÉ</span>}
                    </div>
                    <div className="text-right"><p className="font-semibold text-slate-900">{fmt(t.amount)}</p><p className="text-xs text-slate-400">{t.date}</p></div>
                  </div>
                ))}</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
