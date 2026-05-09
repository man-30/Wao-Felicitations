import { useState } from 'react';
import { InsuranceTransaction, User } from '../types';
import { db } from '../localStorageDB';
import { Shield, TrendingDown, AlertTriangle, ArrowDownLeft } from 'lucide-react';

interface Props { currentUser: User; }
const fmt = (v: number) => new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F';

export default function InsuranceFundManagement({ currentUser }: Props) {
  const [txs, setTxs] = useState<InsuranceTransaction[]>(db.getInsuranceTxs());
  const [withdrawAmount, setWithdrawAmount] = useState(0);
  const [withdrawMotif, setWithdrawMotif] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const balance = txs.reduce((sum, tx) => tx.type === 'credit' ? sum + tx.amount : sum - tx.amount, 0);
  const totalCredits = txs.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebits = txs.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (withdrawAmount <= 0) { setMsg({ text: 'Montant invalide.', type: 'error' }); return; }
    if (!withdrawMotif.trim()) { setMsg({ text: 'Motif obligatoire.', type: 'error' }); return; }
    if (withdrawAmount > balance) { setMsg({ text: `Solde insuffisant. Disponible: ${fmt(balance)}.`, type: 'error' }); return; }

    const newTx: InsuranceTransaction = {
      id: 'ins_w_' + Date.now(),
      amount: withdrawAmount,
      type: 'debit',
      description: withdrawMotif,
      date: new Date().toISOString().split('T')[0],
      operatedBy: currentUser.id,
      operatedByName: currentUser.name,
    };

    const updated = [...txs, newTx];
    db.saveInsuranceTxs(updated);
    setTxs(updated);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Retrait Caisse Assurance', `Retrait de ${fmt(withdrawAmount)} — Motif: ${withdrawMotif}`);

    setWithdrawAmount(0);
    setWithdrawMotif('');
    setMsg({ text: `Retrait de ${fmt(withdrawAmount)} effectué sur la caisse d'assurance.`, type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-emerald-800 to-teal-700 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold">
              <Shield className="h-3.5 w-3.5" /> Caisse dédiée — Indépendante de la caisse générale
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight">Caisse d'Assurance</h1>
            <p className="mt-1 text-sm text-emerald-100">Alimentée exclusivement par les frais d'assurance des apprenants. N'affecte pas la caisse générale.</p>
          </div>
          <div className="rounded-2xl bg-white/15 p-5 backdrop-blur text-center">
            <p className="text-xs text-emerald-200 uppercase tracking-wide">Solde disponible</p>
            <p className="mt-1 text-4xl font-extrabold">{fmt(balance)}</p>
          </div>
        </div>
      </div>

      {msg.text && (
        <div className={`p-3 text-sm rounded-xl border ${msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-6">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-center">
              <p className="text-xs text-emerald-700 font-medium uppercase">Total reçu</p>
              <p className="mt-1 text-xl font-bold text-emerald-900">{fmt(totalCredits)}</p>
            </div>
            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 text-center">
              <p className="text-xs text-rose-700 font-medium uppercase">Total retiré</p>
              <p className="mt-1 text-xl font-bold text-rose-900">{fmt(totalDebits)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5 space-y-4">
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ArrowDownLeft className="h-4 w-4 text-rose-600" /> Effectuer un retrait
            </h3>
            <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800">
              <AlertTriangle className="h-3.5 w-3.5 inline mr-1" />
              Les retraits sont enregistrés et tracés. Ce fonds est indépendant de la caisse générale et des produits.
            </div>
            <form onSubmit={handleWithdraw} className="space-y-3">
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Montant du retrait (FCFA) *</span>
                <input type="number" required max={balance} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500" value={withdrawAmount || ''} onChange={e => setWithdrawAmount(Number(e.target.value))} placeholder="Ex: 5000" />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Motif / justification *</span>
                <input type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500" value={withdrawMotif} onChange={e => setWithdrawMotif(e.target.value)} placeholder="Prise en charge sinistre, frais administratifs..." />
              </label>
              <button type="submit" className="w-full py-2.5 bg-rose-600 text-white font-semibold rounded-xl text-sm hover:bg-rose-700 flex items-center justify-center gap-2">
                <TrendingDown className="h-4 w-4" /> Confirmer le retrait
              </button>
            </form>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="bg-slate-50 px-5 py-3 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-800">Historique complet de la caisse</h3>
          </div>
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Date</th>
                  <th className="px-4 py-2 text-left font-semibold">Type</th>
                  <th className="px-4 py-2 text-left font-semibold">Description</th>
                  <th className="px-4 py-2 text-left font-semibold">Client</th>
                  <th className="px-4 py-2 text-left font-semibold">Montant</th>
                  <th className="px-4 py-2 text-left font-semibold">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {txs.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucune opération enregistrée.</td></tr>
                ) : (() => {
                  let runningBalance = 0;
                  return [...txs].sort((a, b) => a.date.localeCompare(b.date)).map(tx => {
                    runningBalance += tx.type === 'credit' ? tx.amount : -tx.amount;
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2 text-slate-500">{tx.date}</td>
                        <td className="px-4 py-2">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'}`}>
                            {tx.type === 'credit' ? '+ Crédit' : '- Débit'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-slate-600 max-w-xs truncate">{tx.description}</td>
                        <td className="px-4 py-2 text-slate-500">{tx.clientName || '—'}</td>
                        <td className={`px-4 py-2 font-semibold ${tx.type === 'credit' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {tx.type === 'credit' ? '+' : '-'}{fmt(tx.amount)}
                        </td>
                        <td className="px-4 py-2 font-bold text-slate-900">{fmt(runningBalance)}</td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
