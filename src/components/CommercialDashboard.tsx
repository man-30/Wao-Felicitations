import React, { useState, useEffect } from 'react';
import { User, Client, Transaction } from '../types';
import { db } from '../localStorageDB';
import api from '../config/api';
import { getCycleInfoByCaseIndex } from '../cotisationCycle';
import { 
  ArrowUpRight, 
  Users, 
  Award, 
  Search, 
  Plus, 
  X,
  Wallet,
  ChevronRight,
  CalendarDays,
  Loader2
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface CommercialDashboardProps {
  currentUser: User;
}

const fmt = (v: number) => new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F';

export default function CommercialDashboard({ currentUser }: CommercialDashboardProps) {
  const [clients, setClients] = useState<Client[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [isLoading, setIsLoading] = useState(false);

  // Fetch and synchronize commercial data - Initial fetch + polling (3s)
  useEffect(() => {
    const fetchCommercialData = async () => {
      try {
        const apiClients = await api.getMyClients();
        db.syncDataFromServer(apiClients);
        setClients(apiClients);
      } catch (err) {
        console.error("Error fetching commercial clients", err);
      }
    };
    
    // Initial fetch
    fetchCommercialData();
    
    // Poll every 3 seconds to sync with new clients created by caissier
    const interval = setInterval(() => {
      fetchCommercialData();
    }, 3000);
    
    return () => clearInterval(interval);
  }, [currentUser.id]);

  // Form states
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [dailyAmount, setDailyAmount] = useState<number>(0); // Pre-filled daily amount (DIRECTIVE 4)
  const [searchTerm, setSearchTerm] = useState('');

  // Mise journalière (daily contribution) configuration
  const [miseClient, setMiseClient] = useState<Client | null>(null);
  const [miseAmount, setMiseAmount] = useState<number>(0);
  const [isMiseLoading, setIsMiseLoading] = useState(false);
  const [miseError, setMiseError] = useState('');

  const [msg, setMsg] = useState({ text: '', type: '' });

  // Stats
  const myApprovedTx = transactions.filter(t => t.collectedBy === currentUser.id && t.status === 'approved');
  const totalCollected = myApprovedTx.reduce((sum, t) => sum + t.amount, 0);

  const pendingTx = transactions.filter(t => t.collectedBy === currentUser.id && t.status === 'pending');
  const pendingAmount = pendingTx.reduce((sum, t) => sum + t.amount, 0);

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  // Handler: configure/modify daily contribution (mise journalière)
  const handleSetMiseJournaliere = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!miseClient || miseAmount <= 0) return;
    setIsMiseLoading(true);
    setMiseError('');
    try {
      await api.setMiseJournaliere(miseClient.id, miseAmount);
      setMsg({ text: `Mise journalière de ${miseAmount.toLocaleString()} F configurée pour ${miseClient.name}.`, type: 'success' });
      setMiseClient(null);
      setMiseAmount(0);
      // Refresh clients to display updated configuration
      const apiClients = await api.getMyClients();
      db.syncDataFromServer(apiClients);
      setClients(apiClients);
    } catch (err: any) {
      setMiseError(err.message || 'Erreur lors de la configuration.');
    } finally {
      setIsMiseLoading(false);
    }
  };

  // Pre-fill daily amount when client is selected (DIRECTIVE 4)
  const openCollectModal = (client: Client) => {
    setSelectedClient(client);
    setNotes('');
    
    // Find client's tontine account to get daily contribution
    const tontineAcc = db.getTontineAccounts().find(a => {
      const ap = db.getApprenants().find(app => app.id === a.apprenantId);
      return ap && ap.clientId === client.id;
    });
    
    if (tontineAcc) {
      setDailyAmount(tontineAcc.cotisationJournaliere);
      setAmount(tontineAcc.cotisationJournaliere); // Pre-fill with daily amount
    } else {
      // For non-apprenant with financement
      const nonAp = db.getNonApprenants().find(na => na.clientId === client.id);
      if (nonAp) {
        const fn = db.getFinancements().find(f => f.nonApprenantId === nonAp.id && f.status === 'actif');
        if (fn) {
          setDailyAmount(fn.cotisationJournaliere);
          setAmount(fn.cotisationJournaliere);
        } else {
          const acc = db.getAccounts().find(a => a.clientId === client.id && (a.type === 'financement' || a.type === 'epargne') && a.status !== 'solde');
          setDailyAmount(acc?.dailyContribution || 0);
          setAmount(acc?.dailyContribution || 0);
        }
      } else {
        const acc = db.getAccounts().find(a => a.clientId === client.id && (a.type === 'financement' || a.type === 'epargne') && a.status !== 'solde');
        setDailyAmount(acc?.dailyContribution || 0);
        setAmount(acc?.dailyContribution || 0);
      }
    }
  };

  // Compute next N unchecked calendar dates for a client (spans months if needed)
  const getNextUncheckedDates = (clientId: string, count: number): string[] => {
    const calendar = getCalendarData(clientId);
    const result: string[] = [];
    const now = new Date();
    let yr = now.getFullYear();
    let mo = now.getMonth(); // 0-indexed

    while (result.length < count) {
      const mk = `${yr}-${String(mo + 1).padStart(2, '0')}`;
      const paid = calendar[mk] ? new Set(calendar[mk]) : new Set<number>();

      for (let d = 1; d <= 31 && result.length < count; d++) {
        if (!paid.has(d)) {
          const realDay = Math.min(d, new Date(yr, mo + 1, 0).getDate());
          result.push(`${yr}-${String(mo + 1).padStart(2, '0')}-${String(realDay).padStart(2, '0')}`);
          paid.add(d);
        }
      }
      mo++;
      if (mo > 11) { mo = 0; yr++; }
    }
    return result;
  };

  const handleCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClient || amount <= 0) return;

    // Determine daily amount
    let dailyAmount = 0;
    let tontineAccountId = '';
    let nonApFinancingId = '';
    let accountFinancingId = '';

    const tontineAcc = db.getTontineAccounts().find(a => {
      const ap = db.getApprenants().find(app => app.id === a.apprenantId);
      return ap && ap.clientId === selectedClient.id;
    });
    if (tontineAcc) {
      dailyAmount = tontineAcc.cotisationJournaliere;
      tontineAccountId = tontineAcc.id;
    } else {
      const nonAp = db.getNonApprenants().find(na => na.clientId === selectedClient.id);
      if (nonAp) {
        const fn = db.getFinancements().find(f => f.nonApprenantId === nonAp.id && f.status === 'actif');
        if (fn) {
          dailyAmount = fn.cotisationJournaliere;
          nonApFinancingId = fn.id;
        } else {
          const acc = db.getAccounts().find(a => a.clientId === selectedClient.id && (a.type === 'financement' || a.type === 'epargne') && a.status !== 'solde');
          if (acc) { dailyAmount = acc.dailyContribution || 0; accountFinancingId = acc.id; }
        }
      } else {
        const acc = db.getAccounts().find(a => a.clientId === selectedClient.id && (a.type === 'financement' || a.type === 'epargne') && a.status !== 'solde');
        if (acc) { dailyAmount = acc.dailyContribution || 0; accountFinancingId = acc.id; }
      }
    }

    // Validate multiple
    if (dailyAmount > 0 && amount % dailyAmount !== 0) {
      setMsg({ text: `Le montant (${fmt(amount)}) doit être un multiple exact de la mise journalière (${fmt(dailyAmount)}).`, type: 'error' });
      return;
    }

    const numDays = dailyAmount > 0 ? Math.floor(amount / dailyAmount) : 1;
    const existingCount = transactions.filter(t => t.clientId === selectedClient.id && t.status === 'approved' && t.type === 'cotisation').length;
    const receiptNum = `REC-26-${Math.floor(1000 + Math.random() * 9000)}`;

    // Get consecutive unchecked dates (auto-rolls to next month if needed)
    const targetDates = getNextUncheckedDates(selectedClient.id, numDays);

    const actualTransactions: Transaction[] = [];
    for (let i = 0; i < numDays; i++) {
      const cycle = getCycleInfoByCaseIndex(existingCount + i);
      actualTransactions.push({
        id: `t_${Date.now()}_${i}`,
        clientId: selectedClient.id,
        clientName: selectedClient.name,
        type: 'cotisation',
        amount: dailyAmount || amount,
        date: targetDates[i],
        collectedBy: currentUser.id,
        collectedByName: currentUser.name,
        status: 'approved',
        notes: numDays > 1 ? `${notes || ''} (Jour ${i + 1}/${numDays})`.trim() : (notes || ''),
        receiptNumber: i === 0 ? receiptNum : undefined,
        cycleMonth: cycle.cycleMonth,
        cycleDay: cycle.cycleDay,
        allocation: cycle.allocation,
      });
    }

    const updatedTxs = [...transactions, ...actualTransactions];
    db.saveTransactions(updatedTxs);
    setTransactions(updatedTxs);

    // Immediate balance impact: cotisation rembourse financement si actif, sinon alimente l'épargne.
    if (tontineAccountId) {
      const updatedTontines = db.getTontineAccounts().map(a => a.id === tontineAccountId ? { ...a, totalCotise: a.totalCotise + amount, totalJours: a.totalJours + numDays } : a);
      db.saveTontineAccounts(updatedTontines);
    }
    if (nonApFinancingId) {
      const updatedFin = db.getFinancements().map(f => f.id === nonApFinancingId ? { ...f, totalCotise: f.totalCotise + amount, status: f.totalCotise + amount >= f.totalARembourser ? 'solde' as const : f.status } : f);
      db.saveFinancements(updatedFin);
    }
    if (accountFinancingId) {
      const updatedAccounts = db.getAccounts().map(a => {
        if (a.id !== accountFinancingId) return a;
        // For financement accounts: track totalPaid and compute remaining balance
        if (a.type === 'financement') {
          const totalPaid = (a.totalPaid || 0) + amount;
          const totalDue = a.totalDue || a.balance || 0;
          return { ...a, totalPaid, balance: Math.max(0, totalDue - totalPaid), status: totalPaid >= totalDue ? 'solde' as const : 'actif' as const };
        }
        // For epargne (savings) accounts: simply increase balance
        if (a.type === 'epargne') {
          return { ...a, balance: a.balance + amount };
        }
        return a;
      });
      db.saveAccounts(updatedAccounts);
    }

    // Update client balance: cotisation réduit la dette (financingBalance négatif → vers 0 → positif = surplus)
    const allClients = db.getClients();
    const updClients = allClients.map(c => {
      if (c.id !== selectedClient.id) return c;
      if (!tontineAccountId && !nonApFinancingId && !accountFinancingId) {
        // Pas de financement actif → l'argent va dans l'épargne
        return { ...c, savingsBalance: c.savingsBalance + amount };
      }
      const debts = c.schoolDebts.map(d => d.active ? { ...d, paidAmount: d.paidAmount + amount } : d);
      // financingBalance est négatif (dette). On ajoute le montant cotisé pour réduire la dette.
      // Si ça dépasse 0, le surplus reste positif = transférable vers épargne.
      return { ...c, schoolDebts: debts, financingBalance: c.financingBalance + amount };
    });
    db.saveClients(updClients);

    db.addLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'Collecte Terrain',
      `Collecte journalière de ${amount} F (${numDays} case(s)) pour ${selectedClient.name} — synchronisation immédiate`
    );

    setSelectedClient(null);
    setAmount(0);
    setNotes('');
    setMsg({ text: `Collecte de ${amount} F (${numDays} jours) enregistrée avec succès.`, type: 'success' });
    confetti({ particleCount: 40, spread: 50 });
  };



  const [showClientList, setShowClientList] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);

  const getCalendarData = (clientId: string) => {
    // Get all approved cotisations for this client
    const clientTxs = transactions.filter(t => 
      t.clientId === clientId && 
      t.status === 'approved' && 
      (t.type === 'cotisation' || t.type === 'remboursement_dette')
    );

    // Group by month and day
    const history: Record<string, Set<number>> = {};
    clientTxs.forEach(t => {
      const date = new Date(t.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (!history[monthKey]) history[monthKey] = new Set();
      const day = date.getDate(); 
      history[monthKey].add(day);
    });
    return history;
  };

  const getArrearsForMonth = (clientId: string, monthKey: string) => {
    const history = getCalendarData(clientId);
    const paidDays = history[monthKey] || new Set();
    const today = new Date();
    const isCurrentMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}` === monthKey;
    
    let arrearsCount = 0;
    const daysInMonth = 31; // As per directive 10
    const limit = isCurrentMonth ? today.getDate() : daysInMonth;

    for (let i = 1; i <= limit; i++) {
      if (!paidDays.has(i)) arrearsCount++;
    }
    return arrearsCount;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Espace Terrain Commercial</h2>
        <span className="px-3 py-1 bg-green-50 text-green-700 text-xs font-semibold rounded-full flex items-center gap-1 border border-green-200">
          <ArrowUpRight className="w-3 h-3" /> Agent Mobile
        </span>
      </div>

      {msg.text && (
        <div className={`p-3 text-sm rounded-md border ${
          msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Total Validé</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalCollected.toLocaleString()} FCFA</h3>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <Award className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">En Attente de Validation</p>
            <h3 className="text-2xl font-bold text-amber-600 mt-1">{pendingAmount.toLocaleString()} FCFA</h3>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
            <Wallet className="w-6 h-6" />
          </div>
        </div>

        <button 
          onClick={() => setShowClientList(!showClientList)}
          className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between hover:bg-slate-50 transition-colors text-left w-full"
        >
          <div>
            <p className="text-slate-500 text-sm font-medium">Mes Clients</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{clients.length}</h3>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <Users className="w-6 h-6" />
          </div>
        </button>
      </div>

      {showClientList && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
             <h3 className="font-bold text-slate-800 flex items-center gap-2"><Users className="w-5 h-5 text-indigo-600" /> Liste de mes clients</h3>
             <button onClick={() => setShowClientList(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-semibold border-b">
                  <th className="px-4 py-2">Nom</th>
                  <th className="px-4 py-2">Tél</th>
                  <th className="px-4 py-2">Solde</th>
                  <th className="px-4 py-2">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {clients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    <td className="px-4 py-3 text-slate-500">{c.phone}</td>
                    <td className="px-4 py-3 font-bold text-emerald-600">{c.savingsBalance.toLocaleString()} F</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button 
                        onClick={() => setViewClient(c)}
                        className="text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                      >
                         Détails <ChevronRight className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => { const acc = db.getAccounts().find(a => a.clientId === c.id && a.type === 'epargne'); setMiseClient(c); setMiseAmount(acc?.dailyContribution ?? 0); setMiseError(''); }}
                        className="p-1.5 rounded-lg border text-xs font-semibold bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-300"
                        title="Configurer ou modifier la mise journalière"
                      >
                        <Wallet className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Calendar / Detail Modal — Commercial (17.2 + 17.3) ─────────────── */}
      {viewClient && (() => {
        // Compute current month arrears + financing situation
        const nowDate = new Date();
        const currentMonthKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
        const calendarData = getCalendarData(viewClient.id);
        const currentDays = calendarData[currentMonthKey] || new Set<number>();
        const today = nowDate.getDate();
        const dayHistory: { day: number; status: 'paid' | 'missed' | 'benefit' | 'future' }[] = [];
        for (let d = 1; d <= 31; d++) {
          if (currentDays.has(d)) dayHistory.push({ day: d, status: 'paid' });
          else if (d < today) dayHistory.push({ day: d, status: 'missed' });
          else if (d === 1) dayHistory.push({ day: d, status: 'benefit' });
          else dayHistory.push({ day: d, status: 'future' });
        }
        const missedThisMonth = dayHistory.filter(d => d.status === 'missed').length;
        const paidThisMonth = dayHistory.filter(d => d.status === 'paid').length;

        // Financing data (TontineAccount = financement actif lié à l'apprenant ou non-apprenant)
        const tontineAcc = db.getTontineAccounts().find(a => {
          const ap = db.getApprenants().find(app => app.id === a.apprenantId);
          if (ap && ap.clientId === viewClient.id) return true;
          return a.apprenantId === viewClient.id;
        });
        const nonAp = db.getNonApprenants().find(na => na.clientId === viewClient.id);
        const activeNonApFinancing = nonAp ? db.getFinancements().find(f => f.nonApprenantId === nonAp.id && f.status === 'actif') : undefined;
        const activeAccountFinancing = db.getAccounts().find(a => a.clientId === viewClient.id && a.type === 'financement' && a.status !== 'solde');
        const dailyAmt = tontineAcc?.cotisationJournaliere || activeNonApFinancing?.cotisationJournaliere || activeAccountFinancing?.dailyContribution || 0;
        const totalFinance = tontineAcc?.totalCapital || activeNonApFinancing?.totalARembourser || activeAccountFinancing?.totalDue || viewClient.financingBalance || 0;
        const totalRembourse = tontineAcc?.totalCotise || activeNonApFinancing?.totalCotise || activeAccountFinancing?.totalPaid || 0;
        const hasCotisationTracking = !!tontineAcc || !!activeNonApFinancing || !!activeAccountFinancing;
        const resteDu = Math.max(0, totalFinance - totalRembourse);
        const aRegulariser = missedThisMonth * dailyAmt;
        const progressPct = totalFinance > 0 ? Math.min(100, Math.round((totalRembourse / totalFinance) * 100)) : 0;

        return (
          <div className="fixed inset-0 modal-overlay flex items-center justify-center p-3 sm:p-6 z-50">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-3xl modal-container">
              <div className="bg-gradient-to-r from-slate-900 to-indigo-900 p-5 text-white flex items-center justify-between modal-footer">
                <div>
                  <h3 className="text-lg font-bold">Suivi cotisations — {viewClient.name}</h3>
                  <p className="text-xs text-indigo-200 capitalize mt-0.5">{viewClient.type} · {viewClient.phone}</p>
                </div>
                <button onClick={() => setViewClient(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20"><X className="h-5 w-5" /></button>
              </div>

              <div className="p-5 space-y-5 modal-content">

                {/* Situation de remboursement */}
                <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-4 space-y-3">
                  <h4 className="text-sm font-bold text-indigo-900 uppercase tracking-wide">Situation de remboursement</h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-white p-3 border border-indigo-100">
                      <p className="text-[10px] text-slate-500 uppercase">Total financement</p>
                      <p className="mt-1 text-base font-bold text-slate-900">{totalFinance.toLocaleString()} F</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-emerald-100">
                      <p className="text-[10px] text-emerald-600 uppercase">Déjà remboursé</p>
                      <p className="mt-1 text-base font-bold text-emerald-700">{totalRembourse.toLocaleString()} F</p>
                    </div>
                    <div className="rounded-xl bg-white p-3 border border-rose-100">
                      <p className="text-[10px] text-rose-600 uppercase">Solde restant dû</p>
                      <p className="mt-1 text-base font-bold text-rose-700">{resteDu.toLocaleString()} F</p>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-indigo-700 mb-1">
                      <span>Progression remboursement</span><span className="font-bold">{progressPct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-indigo-100">
                      <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                </div>

                {/* Mois en cours */}
                {!hasCotisationTracking && viewClient.type === 'non-apprenant' && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                    Ce non-apprenant n'a pas de financement actif. Le calendrier de cotisation ne s'applique pas.
                  </div>
                )}
                {hasCotisationTracking && (
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                      <CalendarDays className="w-4 h-4 text-indigo-600" />
                      {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(nowDate)}
                    </h4>
                    <div className="flex gap-2 text-[10px] font-bold">
                      <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-0.5">{paidThisMonth} payés</span>
                      <span className="rounded-full bg-rose-50 text-rose-700 border border-rose-200 px-2.5 py-0.5">{missedThisMonth} manqués</span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="grid grid-cols-7 gap-1.5 sm:gap-2.5">
                      {dayHistory.map(({ day, status }) => (
                        <div
                          key={day}
                          title={status === 'missed' ? 'Cotisation non donnée' : status === 'paid' ? 'Cotisation reçue' : status === 'benefit' ? 'Bénéfice société' : ''}
                          className={`aspect-square flex items-center justify-center rounded-lg text-xs font-bold transition-all
                            ${status === 'paid'
                              ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-100'
                              : status === 'missed'
                                ? 'bg-rose-500 text-white shadow-sm shadow-rose-100'
                                : status === 'benefit'
                                  ? 'bg-amber-400 text-amber-950 shadow-sm shadow-amber-100'
                                : 'bg-slate-50 text-slate-300 border border-slate-100'
                            }`}
                        >
                          {day}
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px] text-slate-500">
                      <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-emerald-500" /> Payé</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-amber-400" /> Bénéfice société</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-rose-500" /> Cotisation non donnée</span>
                      <span className="inline-flex items-center gap-1"><span className="h-2.5 w-2.5 rounded bg-slate-50 border border-slate-200" /> À venir</span>
                    </div>
                  </div>
                </div>
                )}

                {/* Régularisation */}
                {hasCotisationTracking && missedThisMonth > 0 && (
                  <div className="rounded-2xl border-2 border-rose-200 bg-rose-50 p-4 space-y-2">
                    <h4 className="text-sm font-bold text-rose-900 uppercase tracking-wide">À régulariser en caisse</h4>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-rose-700">Cumul des jours manqués ce mois</p>
                        <p className="text-2xl font-bold text-rose-800 mt-1">{missedThisMonth} jour(s) × {dailyAmt.toLocaleString()} F</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-rose-700">Montant à régulariser</p>
                        <p className="text-2xl font-extrabold text-rose-800 mt-1">{aRegulariser.toLocaleString()} F</p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-white border border-rose-100 p-2 text-[11px] text-rose-800">
                      Le client doit se rendre à la caisse pour effectuer un dépôt direct correspondant à ce montant. La caisse enregistre l'opération en <strong>Remboursement de dette</strong>.
                    </div>
                  </div>
                )}

                {/* Historique des autres mois */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800">Historique des mois précédents</h4>
                  </div>
                  <div className="p-4 space-y-4">
                    {Object.entries(calendarData).filter(([m]) => m !== currentMonthKey).length === 0 ? (
                      <p className="text-center text-xs text-slate-400 py-4">Aucun historique antérieur.</p>
                    ) : (
                      Object.entries(calendarData)
                        .filter(([m]) => m !== currentMonthKey)
                        .sort((a,b) => b[0].localeCompare(a[0]))
                        .map(([month, days]) => {
                          const arrears = getArrearsForMonth(viewClient.id, month);
                          return (
                            <div key={month} className="space-y-2">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-slate-700 capitalize">
                                  {new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' }).format(new Date(month))}
                                </p>
                                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full">{arrears} retards</span>
                              </div>
                              <div className="grid grid-cols-7 gap-1">
                                {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                                  const isChecked = days.has(day);
                                  return (
                                    <div key={day} className={`aspect-square flex items-center justify-center rounded text-[10px] font-bold ${isChecked ? 'bg-emerald-500 text-white' : 'bg-rose-100 text-rose-500'}`}>{day}</div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-slate-100 flex justify-end gap-2 modal-footer">
                <button onClick={() => setViewClient(null)} className="px-5 py-2 bg-slate-900 text-white rounded-xl font-semibold text-sm hover:bg-slate-800">Fermer</button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Collect and Clients */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-slate-800">Mes Clients Terrain</h3>
          <div className="flex items-center gap-2 border border-slate-200 rounded-lg px-2 bg-slate-50">
            <Search className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Filtrer par nom..."
              className="px-1 py-1 text-xs bg-transparent focus:outline-none placeholder-slate-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                <th className="px-4 py-3">Client</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Solde Validé</th>
                <th className="px-4 py-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400">
                    Chargement des clients...
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-6 text-slate-400">
                    Aucun client sous votre gestion.
                  </td>
                </tr>
              ) : (
                filteredClients.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">{c.name}</td>
                    <td className="px-4 py-3 text-slate-500">{c.phone}</td>
                    <td className="px-4 py-3 capitalize text-xs">{c.type}</td>
                    <td className="px-4 py-3 font-bold text-indigo-600">{c.savingsBalance.toLocaleString()} F</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openCollectModal(c)}
                        className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-semibold flex items-center gap-1 mx-auto"
                      >
                        <Plus className="w-3 h-3" /> Collecter
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal : Mise journalière (tontine épargnants simples) ─────────── */}
      {miseClient && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-teal-700 text-white">
              <h3 className="font-semibold flex items-center gap-2">
                <Wallet className="w-4 h-4" />
                {db.getAccounts().find(a => a.clientId === miseClient.id && a.type === 'epargne' && a.status !== 'ferme' && (a.dailyContribution ?? 0) > 0)
                  ? 'Modifier la mise journélière'
                  : 'Configurer la mise journélière'}
              </h3>
              <button onClick={() => { setMiseClient(null); setMiseError(''); }} className="p-1 hover:bg-teal-600 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleSetMiseJournaliere} className="p-5 space-y-4">
              {miseError && <div className="p-3 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">{miseError}</div>}
              <div className="p-3 bg-teal-50 border border-teal-200 rounded-xl text-xs text-teal-800">
                <strong>Tontine Épargnant :</strong> La première cotisation enregistrée pour ce client constituera un bénéfice de l'entreprise (case 1). Toutes les cotisations suivantes s'accumuleront dans son épargne.
              </div>
              <p className="text-sm text-slate-600">Client : <strong>{miseClient.name}</strong></p>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Montant journélier (F CFA) *</span>
                <input
                  type="number"
                  required
                  min={50}
                  step={50}
                  value={miseAmount || ''}
                  onChange={e => setMiseAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-teal-500"
                  placeholder="Ex : 200"
                />
              </label>
              {miseAmount > 0 && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                  <strong>Récapitulatif :</strong> {miseAmount.toLocaleString()} F/jour · ~{(miseAmount * 30).toLocaleString()} F/mois
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setMiseClient(null); setMiseError(''); }} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={isMiseLoading || miseAmount <= 0} className="px-4 py-2 bg-teal-600 text-white text-sm font-semibold rounded-xl hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
                  {isMiseLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Collect Modal */}
      {selectedClient && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-indigo-900 text-white">
              <h3 className="font-semibold text-base flex items-center gap-2">
                <Plus className="w-4 h-4" /> Enregistrer un versement
              </h3>
              <button 
                onClick={() => setSelectedClient(null)}
                className="p-1 hover:bg-indigo-800 rounded-full text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCollect} className="p-4 space-y-4">
              <div>
                <p className="text-sm text-slate-600">
                  Versement pour le client : <strong className="text-slate-800">{selectedClient.name}</strong>
                </p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
                <p className="font-semibold">Cotisation journalière unifiée</p>
                <p className="mt-0.5 text-xs">Le commercial collecte uniquement la cotisation journalière. Les régularisations des jours manqués se font en caisse.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Montant Collecté (FCFA) *</label>
                {dailyAmount > 0 && (
                  <div className="mb-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    Mise journalière : <strong>{dailyAmount.toLocaleString()} F</strong>. Le montant doit être un multiple exact.
                  </div>
                )}
                <input
                  type="number"
                  required
                  step={dailyAmount > 0 ? dailyAmount : 1}
                  className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm ${
                    dailyAmount > 0 && amount > 0 && amount % dailyAmount !== 0 ? 'border-rose-300 bg-rose-50' : 'border-slate-200'
                  }`}
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder={dailyAmount > 0 ? `${dailyAmount}, ${dailyAmount * 5}, ${dailyAmount * 10}...` : 'Ex: 5000'}
                />
                {dailyAmount > 0 && amount > 0 && selectedClient && (() => {
                  if (amount % dailyAmount !== 0) {
                    return <div className="mt-2 rounded-lg p-2 text-xs bg-rose-50 text-rose-700 border border-rose-200">❌ Le montant n'est pas un multiple de {dailyAmount.toLocaleString()} F.</div>;
                  }
                  const n = amount / dailyAmount;
                  const preview = getNextUncheckedDates(selectedClient.id, n);
                  const first = preview[0] || '';
                  const last = preview[preview.length - 1] || '';
                  const spansMonths = first.slice(0, 7) !== last.slice(0, 7);
                  return (
                    <div className="mt-2 rounded-lg p-2 text-xs bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ✅ <strong>{n} case(s)</strong> cochée(s) — du {first.slice(8)}/{first.slice(5, 7)} au {last.slice(8)}/{last.slice(5, 7)}
                      {spansMonths && <span className="ml-1 text-amber-700 font-semibold">(déborde sur le mois suivant)</span>}
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Notes / Références terrain</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Collecte hebdomadaire"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-[11px] text-emerald-800">
                <strong>Synchronisation immédiate :</strong> Ce versement impacte directement le solde d'épargne du client. Le caissier peut consulter et corriger si nécessaire.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedClient(null)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-lg hover:bg-slate-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700"
                >
                  Transmettre
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
