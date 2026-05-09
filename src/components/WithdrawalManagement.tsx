import { useState } from 'react';
import { Transaction, Client, User } from '../types';
import { db } from '../localStorageDB';
import { ArrowDownLeft, Printer, X, ShieldAlert } from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props { currentUser: User; }
function fmt(v: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F'; }

export default function WithdrawalManagement({ currentUser }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [clients, setClients] = useState<Client[]>(db.getClients());

  const [selectedClientId, setSelectedClientId] = useState('');
  const [amount, setAmount] = useState(0);
  const [presenceVerified, setPresenceVerified] = useState(false);
  const [idVerified, setIdVerified] = useState(false);
  const [notes, setNotes] = useState('');
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);
  const [msg, setMsg] = useState({ text: '', type: '' });

  const pastWithdrawals = transactions
    .filter(t => t.type === 'retrait' && t.status === 'approved')
    .sort((a, b) => b.date.localeCompare(a.date));

  const selectedClient = clients.find(c => c.id === selectedClientId);

  const handleWithdrawal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || amount <= 0) { setMsg({ text: 'Sélectionnez un client et un montant valide.', type: 'error' }); return; }
    if (!presenceVerified || !idVerified) { setMsg({ text: 'Vous devez confirmer la présence physique ET la vérification d\'identité.', type: 'error' }); return; }

    const client = clients.find(c => c.id === selectedClientId);
    if (!client) return;
    if (client.savingsBalance < amount) { setMsg({ text: `Solde insuffisant (${fmt(client.savingsBalance)} disponible).`, type: 'error' }); return; }

    const receiptNum = `RET-26-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTx: Transaction = {
      id: 't_' + Date.now(), clientId: client.id, clientName: client.name, type: 'retrait',
      amount, date: new Date().toISOString().split('T')[0],
      collectedBy: currentUser.id, collectedByName: currentUser.name,
      validatedBy: currentUser.id, validatedByName: currentUser.name,
      status: 'approved', notes: notes || 'Retrait au guichet', receiptNumber: receiptNum,
    };

    const updTx = [...transactions, newTx];
    db.saveTransactions(updTx);
    setTransactions(updTx);

    const updClients = clients.map(c => c.id === client.id ? { ...c, savingsBalance: c.savingsBalance - amount } : c);
    db.saveClients(updClients);
    setClients(updClients);

    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Retrait Agence', `Retrait de ${fmt(amount)} pour ${client.name}. Reçu: ${receiptNum}`);

    setReceiptTx(newTx);
    setAmount(0); setSelectedClientId(''); setPresenceVerified(false); setIdVerified(false); setNotes('');
    setMsg({ text: 'Retrait exécuté avec succès. Opération irréversible.', type: 'success' });
    confetti({ particleCount: 40, spread: 50 });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Retraits d'Épargne</h2>
        <span className="px-3 py-1 bg-rose-50 text-rose-700 text-xs font-semibold rounded-full border border-rose-200 flex items-center gap-1"><ArrowDownLeft className="w-3 h-3" /> Opération guichet uniquement</span>
      </div>

      {msg.text && <div className={`p-3 text-sm rounded-xl border ${msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{msg.text}</div>}

      {/* Form */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-2 mb-4"><ArrowDownLeft className="w-5 h-5 text-rose-600" /><h3 className="text-base font-semibold text-slate-800">Initier un retrait d'argent</h3></div>
        <form onSubmit={handleWithdrawal} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">Épargnant *</span>
              <select required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)}>
                <option value="">— Choisir le bénéficiaire —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name} (Solde: {fmt(c.savingsBalance)})</option>)}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-xs font-semibold text-slate-500">Montant (FCFA) *</span>
              <input type="number" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder="10000" />
            </label>
          </div>

          {selectedClient && (
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-emerald-50 p-3"><p className="text-xs text-emerald-700">Solde disponible</p><p className="text-xl font-semibold text-emerald-900">{fmt(selectedClient.savingsBalance)}</p></div>
              <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Après retrait</p><p className={`text-xl font-semibold ${selectedClient.savingsBalance - amount >= 0 ? 'text-slate-900' : 'text-rose-600'}`}>{fmt(selectedClient.savingsBalance - amount)}</p></div>
            </div>
          )}

          <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Notes</span><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Motif du retrait..." /></label>

          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3">
            <div className="flex items-start gap-3 text-sm text-rose-800"><ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" /><div><p className="font-semibold">Contrôles obligatoires avant exécution</p><p className="mt-1 text-rose-700">Opération immédiate et irréversible. Aucun retrait par commercial. Aucun retrait à distance.</p></div></div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer"><input type="checkbox" checked={presenceVerified} onChange={(e) => setPresenceVerified(e.target.checked)} className="rounded border-slate-300 text-indigo-600" />Je confirme la présence physique du client en agence</label>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-800 cursor-pointer"><input type="checkbox" checked={idVerified} onChange={(e) => setIdVerified(e.target.checked)} className="rounded border-slate-300 text-indigo-600" />J'ai vérifié la pièce d'identité du client</label>
          </div>

          <div className="text-right"><button type="submit" className="px-5 py-2 bg-rose-600 text-white font-semibold rounded-xl text-sm hover:bg-rose-700">Exécuter le retrait</button></div>
        </form>
      </div>

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="text-base font-semibold text-slate-900">Historique des retraits</h3></div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600"><tr>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Reçu</th>
              <th className="px-4 py-3 text-left font-semibold">Client</th>
              <th className="px-4 py-3 text-left font-semibold">Montant</th>
              <th className="px-4 py-3 text-left font-semibold">Reçu</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {pastWithdrawals.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucun retrait.</td></tr> : pastWithdrawals.map(t => (
                <tr key={t.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 text-slate-500">{t.date}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-400">{t.receiptNumber}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{t.clientName}</td>
                  <td className="px-4 py-3 font-semibold text-rose-600">{fmt(t.amount)}</td>
                  <td className="px-4 py-3"><button onClick={() => setReceiptTx(t)} className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"><Printer className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt */}
      {receiptTx && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setReceiptTx(null)} className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>
            <div className="space-y-4 text-center">
              <div className="border-b pb-3"><h4 className="font-extrabold text-indigo-950 text-lg">Waooo Félicitation</h4><p className="text-xs text-slate-500">Reçu de retrait — {receiptTx.receiptNumber}</p></div>
              <div className="py-2"><p className="text-xs text-slate-500 uppercase tracking-wider">Montant retiré</p><h3 className="text-3xl font-bold text-rose-600">{fmt(receiptTx.amount)}</h3></div>
              <div className="border-t border-b border-dashed py-3 text-left space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Bénéficiaire</span><span className="text-slate-800 font-bold">{receiptTx.clientName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="text-slate-800">{receiptTx.date}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Caissier</span><span className="text-slate-800">{receiptTx.validatedByName}</span></div>
              </div>
              <div className="text-[10px] text-slate-400 italic">Signature client<div className="border border-dashed border-slate-200 h-12 w-28 mx-auto mt-2 rounded" /></div>
            </div>
            <button onClick={() => window.print()} className="mt-4 w-full py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-rose-700"><Printer className="w-4 h-4" /> Imprimer le reçu</button>
          </div>
        </div>
      )}
    </div>
  );
}
