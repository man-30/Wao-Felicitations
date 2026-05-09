import { useState } from 'react';
import { Client, Transaction, User } from '../types';
import { db } from '../localStorageDB';
import { Search, Wallet, Pencil, X, Lock, AlertTriangle, Printer, Eye, PlusCircle } from 'lucide-react';

interface Props { currentUser: User; }

function fmt(v: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F'; }

function genCode(userId: string) {
  return `EDIT-${userId}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
}

export default function SavingsManagement({ currentUser }: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [clients] = useState<Client[]>(db.getClients());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterCommercial, setFilterCommercial] = useState('');

  // Direct deposit form (DIRECTIVE 5 & 11)
  const [directClientId, setDirectClientId] = useState('');
  const [directAmount, setDirectAmount] = useState(0);
  const [directType, setDirectType] = useState<'depot' | 'remboursement_dette'>('depot');
  const [directDestination] = useState<'epargne' | 'tontine'>('epargne');
  const [directReason, setDirectReason] = useState('');
  const [debtAmountLocked, setDebtAmountLocked] = useState(false); // 19.3: montant non modifiable pour dette

  // Correction modal
  const [corrTx, setCorrTx] = useState<Transaction | null>(null);
  const [corrAmount, setCorrAmount] = useState(0);
  const [corrReason, setCorrReason] = useState('');
  const [corrCode, setCorrCode] = useState('');
  const [corrError, setCorrError] = useState('');

  // Receipt modal
  const [receiptTx, setReceiptTx] = useState<Transaction | null>(null);

  const [msg, setMsg] = useState({ text: '', type: '' });

  const users = db.getUsers();
  const commercials = users.filter(u => u.role === 'commercial');

  // Only non-withdrawal transactions (deposits, cotisations, repayments)
  const deposits = transactions
    .filter(t => t.type !== 'retrait')
    .sort((a, b) => b.date.localeCompare(a.date));

  const filtered = deposits.filter(t => {
    if (searchTerm && !t.clientName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterDate && t.date !== filterDate) return false;
    if (filterCommercial && t.collectedBy !== filterCommercial) return false;
    return true;
  });

  const openCorrection = (tx: Transaction) => {
    setCorrTx(tx);
    setCorrAmount(tx.amount);
    setCorrReason('');
    setCorrCode('');
    setCorrError('');
  };

  const handleCorrection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!corrTx) return;

    if (corrAmount <= 0) { setCorrError('Montant invalide.'); return; }
    if (!corrReason.trim()) { setCorrError('Motif obligatoire.'); return; }

    // Validate admin code
    const admins = users.filter(u => u.role === 'admin');
    const valid = admins.some(a => corrCode === genCode(a.id));
    if (!valid) { setCorrError('Code admin invalide ou expiré.'); return; }

    const diff = corrAmount - corrTx.amount;

    const updTx: Transaction[] = transactions.map(t => {
      if (t.id !== corrTx.id) return t;
      return {
        ...t,
        originalAmount: t.originalAmount ?? t.amount,
        amount: corrAmount,
        isModified: true,
        modifiedBy: currentUser.id,
        modifiedByName: currentUser.name,
        modifiedAt: new Date().toISOString().replace('T', ' ').substring(0, 19),
        modifiedReason: corrReason,
        adminCodeUsed: corrCode,
      };
    });

    db.saveTransactions(updTx);
    setTransactions(updTx);

    // Recalculate client balance
    if (diff !== 0 && corrTx.status === 'approved') {
      const clients = db.getClients();
      const updClients = clients.map(c => {
        if (c.id !== corrTx.clientId) return c;
        if (corrTx.type === 'depot' || corrTx.type === 'cotisation') {
          return { ...c, savingsBalance: c.savingsBalance + diff };
        }
        if (corrTx.type === 'remboursement_dette') {
          const debts = c.schoolDebts.map(d => d.active ? { ...d, paidAmount: d.paidAmount + diff } : d);
          return { ...c, schoolDebts: debts };
        }
        return c;
      });
      db.saveClients(updClients);
    }

    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Correction Dépôt',
      `Dépôt ${corrTx.id} corrigé de ${corrTx.amount} F → ${corrAmount} F. Motif: ${corrReason}. Code: ${corrCode}. Client: ${corrTx.clientName}`);

    setCorrTx(null);
    setMsg({ text: 'Dépôt corrigé avec succès. Solde recalculé automatiquement.', type: 'success' });
  };

  const handleDirectDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!directClientId || directAmount <= 0) {
      setMsg({ text: 'Sélectionnez un client et un montant valide.', type: 'error' });
      return;
    }

    const client = clients.find(c => c.id === directClientId);
    if (!client) return;

    const receiptNum = `DEP-26-${Math.floor(1000 + Math.random() * 9000)}`;
    const newTx: Transaction = {
      id: 't_direct_' + Date.now(),
      clientId: client.id,
      clientName: client.name,
      type: directType,
      amount: directAmount,
      date: new Date().toISOString().split('T')[0],
      collectedBy: currentUser.id,
      collectedByName: currentUser.name,
      validatedBy: currentUser.id,
      validatedByName: currentUser.name,
      status: 'approved',
      notes: directReason || 'Dépôt direct en agence',
      receiptNumber: receiptNum,
    };

    const updatedTxs = [...transactions, newTx];
    db.saveTransactions(updatedTxs);
    setTransactions(updatedTxs);

    // Update client balance
    if (directDestination === 'epargne') {
      if (directType === 'depot') {
        const accounts = db.getAccounts();
        const updatedAccounts = accounts.map(account =>
          account.clientId === client.id && account.type === 'epargne' && account.status !== 'ferme'
            ? { ...account, balance: account.balance + directAmount }
            : account
        );
        db.saveAccounts(updatedAccounts);
      }

      if (directType === 'remboursement_dette') {
        const accounts = db.getAccounts();
        let remaining = directAmount;
        const updatedAccounts = accounts.map(account => {
          if (account.clientId !== client.id || account.type !== 'financement' || account.status === 'solde') return account;
          const totalDue = account.totalDue || account.balance || 0;
          const totalPaid = account.totalPaid || 0;
          const dueLeft = Math.max(0, totalDue - totalPaid);
          const paidToDebt = Math.min(remaining, dueLeft);
          remaining -= paidToDebt;
          const newTotalPaid = totalPaid + paidToDebt;
          return {
            ...account,
            totalPaid: newTotalPaid,
            balance: Math.max(0, totalDue - newTotalPaid),
            residualBalance: (account.residualBalance || 0) + (remaining > 0 ? remaining : 0),
            status: newTotalPaid >= totalDue ? 'solde' as const : 'actif' as const,
          };
        });
        db.saveAccounts(updatedAccounts);
      }
    } else {
      // Tontine destination (Directive 10 & 11)
      const tAccounts = db.getTontineAccounts();
      const updatedT = tAccounts.map(a => {
        if (a.apprenantId === client.id) {
           return { ...a, totalCotise: a.totalCotise + directAmount };
        }
        return a;
      });
      db.saveTontineAccounts(updatedT);
    }

    const updClients = clients.map(c => {
      if (c.id !== client.id) return c;
      if (directDestination === 'epargne') {
        if (directType === 'depot') {
          return { ...c, savingsBalance: c.savingsBalance + directAmount };
        }
        if (directType === 'remboursement_dette') {
          const debts = c.schoolDebts.map(d => d.active ? { ...d, paidAmount: d.paidAmount + directAmount } : d);
          // financingBalance est négatif (dette). On ajoute pour réduire la dette → 0 → positif (surplus).
          return { ...c, schoolDebts: debts, financingBalance: c.financingBalance + directAmount };
        }
      } else {
        // Tontine (even for apprenants it goes to their generic balance tracker if applicable)
        return { ...c, savingsBalance: c.savingsBalance + directAmount };
      }
      return c;
    });
    db.saveClients(updClients);

    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Dépôt Direct Agence',
      `Dépôt direct de ${fmt(directAmount)} pour ${client.name} (${directType}). Motif: ${directReason || 'N/A'}`
    );

    setDirectClientId('');
    setDirectAmount(0);
    setDirectReason('');
    setMsg({ text: 'Dépôt direct enregistré avec succès. Solde mis à jour.', type: 'success' });
  };

  const typeLabel = (t: string) => {
    if (t === 'depot') return 'Dépôt';
    if (t === 'cotisation') return 'Cotisation';
    if (t === 'remboursement_dette') return 'Remb. dette';
    return t;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Dépôts — Consultation & Correction</h2>
        <span className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full border border-indigo-200 flex items-center gap-1">
          <Wallet className="w-3 h-3" /> Lecture + correction encadrée
        </span>
      </div>

      {msg.text && <div className={`p-3 text-sm rounded-xl border ${msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{msg.text}</div>}

      {/* Direct Deposit Form (DIRECTIVE 5) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-emerald-200">
        <div className="flex items-center gap-2 mb-4">
          <PlusCircle className="w-5 h-5 text-emerald-600" />
          <h3 className="text-base font-semibold text-slate-800">Dépôt direct en agence</h3>
        </div>
        <p className="text-sm text-slate-500 mb-4">Permet au caissier d'enregistrer un dépôt directement sur le compte d'un client sans passer par un commercial.</p>
        <form onSubmit={handleDirectDeposit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <label className="md:col-span-2 space-y-1">
            <span className="text-xs font-semibold text-slate-500">Client *</span>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
              value={directClientId}
              onChange={(e) => {
                const clientId = e.target.value;
                setDirectClientId(clientId);
                // 19.3: Auto-calculate missed days debt if client has arrears
                if (directType === 'remboursement_dette' && clientId) {
                  const c = clients.find(cl => cl.id === clientId);
                  if (c) {
                    const tontineAcc = db.getTontineAccounts().find(ta => {
                      const ap = db.getApprenants().find(ap2 => ap2.id === ta.apprenantId);
                      return ap && ap.clientId === clientId;
                    });
                    if (tontineAcc && tontineAcc.cotisationJournaliere > 0) {
                      const allTx = db.getTransactions().filter(t => t.clientId === clientId && t.status === 'approved' && t.type === 'cotisation');
                      const today = new Date().getDate();
                      const paidDates = new Set(allTx.map(t => new Date(t.date).getDate()));
                      let missed = 0;
                      for (let d = 1; d < today; d++) { if (!paidDates.has(d)) missed++; }
                      if (missed > 0) { setDirectAmount(missed * tontineAcc.cotisationJournaliere); setDebtAmountLocked(true); }
                      else { setDebtAmountLocked(false); }
                    }
                  }
                }
              }}
            >
              <option value="">— Sélectionner un client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} (Solde: {fmt(c.savingsBalance)})</option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Type opération *</span>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
              value={directType}
              onChange={(e) => {
                const val = e.target.value as 'depot' | 'remboursement_dette';
                setDirectType(val);
                setDebtAmountLocked(false);
                setDirectAmount(0);
              }}
            >
              <option value="depot">Dépôt sur compte épargne</option>
              {/* 19.3: N'afficher l'option dette que si jours manqués > 0 */}
              {directClientId && (() => {
                const tontineAcc = db.getTontineAccounts().find(ta => {
                  const ap = db.getApprenants().find(ap2 => ap2.id === ta.apprenantId);
                  return ap && ap.clientId === directClientId;
                });
                if (!tontineAcc) return null;
                const today = new Date().getDate();
                const allTx = db.getTransactions().filter(t => t.clientId === directClientId && t.status === 'approved' && t.type === 'cotisation');
                const paidDates = new Set(allTx.map(t => new Date(t.date).getDate()));
                let missed = 0;
                for (let d = 1; d < today; d++) { if (!paidDates.has(d)) missed++; }
                if (missed <= 0) return null;
                return <option key="debt" value="remboursement_dette">Régulariser dette ({missed} jours manqués — {fmt(missed * tontineAcc.cotisationJournaliere)})</option>;
              })()}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-semibold text-slate-500">Montant (FCFA) *</span>
            <input
              type="number"
              required
              readOnly={debtAmountLocked}
              className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none ${debtAmountLocked ? 'bg-slate-50 cursor-not-allowed text-slate-600' : 'focus:border-emerald-500'}`}
              value={directAmount || ''}
              onChange={(e) => !debtAmountLocked && setDirectAmount(Number(e.target.value))}
              placeholder="5000"
            />
            {debtAmountLocked && <p className="text-[10px] text-amber-600 mt-0.5">Montant calculé automatiquement — non modifiable.</p>}
          </label>
          <label className="md:col-span-3 space-y-1">
            <span className="text-xs font-semibold text-slate-500">Motif</span>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
              value={directReason}
              onChange={(e) => setDirectReason(e.target.value)}
              placeholder="Épargne volontaire, remboursement anticipé..."
            />
          </label>
          <div className="md:col-span-1 text-right">
            <button type="submit" className="w-full px-4 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-sm hover:bg-emerald-700">
              Valider
            </button>
          </div>
        </form>
      </div>

      {/* Business rule */}
      <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-200 text-sm text-indigo-800">
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-semibold">Règle métier : synchronisation immédiate</p>
            <p className="mt-1">Les dépôts sont enregistrés par le commercial et impactent instantanément les soldes. <strong>Aucune validation du caissier n'est requise.</strong> Le caissier peut uniquement <strong>consulter</strong> et <strong>corriger</strong> un dépôt erroné avec un code admin.</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Rechercher par client..." className="bg-transparent text-sm w-full focus:outline-none" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold text-slate-500">Date</span>
            <input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold text-slate-500">Commercial</span>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={filterCommercial} onChange={(e) => setFilterCommercial(e.target.value)}>
              <option value="">Tous</option>
              {commercials.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Deposits table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Client</th>
                <th className="px-4 py-3 text-left font-semibold">Commercial</th>
                <th className="px-4 py-3 text-left font-semibold">Montant</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Date</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucun dépôt trouvé.</td></tr>
              ) : filtered.map(tx => (
                <tr key={tx.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-medium text-slate-900">{tx.clientName}</td>
                  <td className="px-4 py-3 text-slate-500">{tx.collectedByName || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="font-semibold text-slate-900">{fmt(tx.amount)}</span>
                    {tx.isModified && tx.originalAmount !== undefined && (
                      <span className="ml-2 text-xs text-slate-400 line-through">{fmt(tx.originalAmount)}</span>
                    )}
                  </td>
                  <td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{typeLabel(tx.type)}</span></td>
                  <td className="px-4 py-3 text-slate-500">{tx.date}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${tx.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : tx.status === 'pending' ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'}`}>
                        {tx.status === 'approved' ? 'Validé' : tx.status === 'pending' ? 'En attente' : 'Rejeté'}
                      </span>
                      {tx.isModified && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">MODIFIÉ</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <button onClick={() => openCorrection(tx)} title="Corriger ce dépôt" className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200"><Pencil className="w-3.5 h-3.5" /></button>
                      {tx.receiptNumber && <button onClick={() => setReceiptTx(tx)} title="Voir reçu" className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200"><Eye className="w-3.5 h-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correction Modal */}
      {corrTx && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-amber-900 text-white">
              <h3 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Correction de dépôt — Code Admin requis</h3>
              <button onClick={() => setCorrTx(null)} className="p-1 hover:bg-amber-800 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleCorrection} className="p-5 space-y-4">
              {corrError && <div className="p-3 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">{corrError}</div>}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <strong>Processus sécurisé :</strong> Code admin obligatoire, unique et temporaire. La modification est tracée en audit avec avant/après et motif. Suppression de dépôt impossible.
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Client</p><p className="font-semibold text-slate-900">{corrTx.clientName}</p></div>
                <div className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Montant actuel</p><p className="font-semibold text-slate-900">{fmt(corrTx.amount)}</p></div>
              </div>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Nouveau montant *</span><input type="number" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={corrAmount || ''} onChange={(e) => setCorrAmount(Number(e.target.value))} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Motif de correction *</span><input type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={corrReason} onChange={(e) => setCorrReason(e.target.value)} placeholder="Erreur de saisie commercial / montant inexact" /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Code Admin *</span><input type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 font-mono" value={corrCode} onChange={(e) => setCorrCode(e.target.value)} placeholder="EDIT-u1-20260115" /></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCorrTx(null)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700">Appliquer la correction</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptTx && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setReceiptTx(null)} className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="w-4 h-4" /></button>
            <div className="space-y-4 text-center">
              <div className="border-b pb-3"><h4 className="font-extrabold text-indigo-950 text-lg">Waooo Félicitation</h4><p className="text-xs text-slate-500">Reçu N°: {receiptTx.receiptNumber}</p></div>
              <div className="py-2"><p className="text-xs text-slate-500 uppercase tracking-wider">Montant perçu</p><h3 className="text-3xl font-bold text-slate-900">{fmt(receiptTx.amount)}</h3></div>
              <div className="border-t border-b border-dashed py-3 text-left space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Client</span><span className="text-slate-800 font-bold">{receiptTx.clientName}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="text-slate-800 font-semibold">{typeLabel(receiptTx.type)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="text-slate-800">{receiptTx.date}</span></div>
              </div>
            </div>
            <button onClick={() => window.print()} className="mt-4 w-full py-2 bg-indigo-900 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-800"><Printer className="w-4 h-4" /> Imprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}
