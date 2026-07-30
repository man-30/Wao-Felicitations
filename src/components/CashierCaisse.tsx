import { useMemo, useState, useEffect } from 'react';
import { db } from '../localStorageDB';
import { api } from '../config/api';
import { Transaction, User, TontineAccount, FinancementNonApprenant } from '../types';
import {
  CalendarDays,
  Landmark,
  TrendingUp,
  Users,
  ShoppingBag,
  RefreshCw,
  CheckCircle2,
  CircleDot,
  ArrowUpRight,
  Wallet,
  Coins
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';

interface Props { currentUser: User; }
function fmt(v: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F'; }
function parseD(d: string) { return new Date(d.includes('T') ? d : `${d}T00:00:00`); }

export default function CashierCaisse(_props: Props) {
  const [transactions, setTransactions] = useState<Transaction[]>(() => db.getTransactions());
  const [tontineAccounts, setTontineAccounts] = useState<TontineAccount[]>(() => db.getTontineAccounts());
  const [financements, setFinancements] = useState<FinancementNonApprenant[]>(() => db.getFinancements());
  const [activeSubTab, setActiveSubTab] = useState<'cotisations' | 'financements'>('cotisations');
  const [isSyncing, setIsSyncing] = useState(false);

  // Synchronisation en temps réel avec le backend (toutes les 5s)
  useEffect(() => {
    const syncData = async () => {
      setIsSyncing(true);
      try {
        const [apiTxs, apiClients] = await Promise.all([
          api.getTransactions(),
          api.getClients()
        ]);

        // Update local storage DB caches
        db.saveTransactions(apiTxs);
        db.syncDataFromServer(apiClients);

        // Update state
        setTransactions(apiTxs);
        setTontineAccounts(db.getTontineAccounts());
        setFinancements(db.getFinancements());
      } catch (error) {
        console.error('Error syncing caisse data from server:', error);
      } finally {
        setIsSyncing(false);
      }
    };

    syncData();
    const interval = setInterval(syncData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Filter cotisations (approved transactions of type 'cotisation')
  const cotisations = useMemo(
    () => transactions.filter((t) => t.status === 'approved' && t.type === 'cotisation'),
    [transactions],
  );

  const totalCotisations = useMemo(
    () => cotisations.reduce((sum, t) => sum + t.amount, 0),
    [cotisations]
  );

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
  const totalToday = useMemo(() => cotisations.filter((t) => t.date === today).reduce((sum, t) => sum + t.amount, 0), [cotisations, today]);
  const totalMonth = useMemo(() => cotisations.filter((t) => t.date.startsWith(currentMonth)).reduce((sum, t) => sum + t.amount, 0), [cotisations, currentMonth]);
  const activeClients = useMemo(() => new Set(cotisations.map((t) => t.clientId)).size, [cotisations]);
  const recentCotisations = useMemo(() => [...cotisations].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 20), [cotisations]);

  // Financements KPIs & data
  const activeFinancements = useMemo(
    () => financements.filter(f => f.status === 'actif'),
    [financements]
  );

  const completedFinancements = useMemo(
    () => financements.filter(f => f.status === 'solde'),
    [financements]
  );

  const totalFinancedAmount = useMemo(
    () => financements.reduce((sum, f) => sum + f.montantFinance, 0),
    [financements]
  );

  const totalRepaidAmount = useMemo(
    () => financements.reduce((sum, f) => sum + f.totalCotise, 0),
    [financements]
  );

  const totalOutstandingFinancements = useMemo(
    () => financements.reduce((sum, f) => sum + Math.max(0, f.totalARembourser - f.totalCotise), 0),
    [financements]
  );

  // Helper to fetch non-apprenant name
  const getNonApprenantName = (nonApprenantId: string) => {
    const na = db.getNonApprenants().find(item => item.id === nonApprenantId);
    return na ? na.fullName : "Adhérent";
  };

  // Helper to fetch student name
  const getStudentName = (apprenantId: string) => {
    const ap = db.getApprenants().find(item => item.id === apprenantId);
    return ap ? ap.studentName : "Apprenant";
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Trésorerie & Caisse Globale</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Suivi en temps réel connecté à la plateforme : cotisations scolaires et financements de biens.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full ${isSyncing ? 'bg-indigo-50 text-indigo-700 animate-pulse' : 'bg-emerald-50 text-emerald-700'}`}>
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Synchronisation...' : 'Synchronisé'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('cotisations')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeSubTab === 'cotisations'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Coins className="w-4 h-4" /> Cotisations en Cours (Tontines)
        </button>
        <button
          onClick={() => setActiveSubTab('financements')}
          className={`flex items-center gap-2 px-6 py-3 border-b-2 font-semibold text-sm transition-all ${
            activeSubTab === 'financements'
              ? 'border-indigo-600 text-indigo-600 bg-indigo-50/20'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" /> Financements de Biens Effectués
        </button>
      </div>

      {/* ────────────────── VIEW 1: COTISATIONS ────────────────── */}
      {activeSubTab === 'cotisations' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main total */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-indigo-200 mb-1">Total cumulé des cotisations journalières</p>
              <h1 className="text-4xl font-bold text-white">{fmt(totalCotisations)}</h1>
              <p className="text-xs text-slate-400 mt-2">Flux tontine validés (type cotisation).</p>
            </div>
            <div className="px-4 py-3 bg-white/10 rounded-2xl border border-white/10 text-right">
              <p className="text-xs text-indigo-200">Comptes tontines actifs</p>
              <p className="text-2xl font-bold text-white">{tontineAccounts.filter(a => a.status === 'actif').length}</p>
            </div>
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
                    <div>
                      <p className="text-sm text-slate-500">{c.label}</p>
                      <h3 className={`mt-2 text-xl font-semibold ${c.tone}`}>
                        {(c as any).isCount ? c.value : fmt(c.value)}
                      </h3>
                    </div>
                    <div className={`rounded-xl p-2.5 ${c.bg}`}><I className={`h-4 w-4 ${c.tone}`} /></div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* List of ongoing Cotisations Accounts */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Portefeuille des Comptes de Cotisation Actifs</h3>
            <p className="text-sm text-slate-500 mb-4">Mises journalières des apprenants tontine et progressions.</p>
            <div className="overflow-x-auto max-h-80 overflow-y-auto rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-600 sticky top-0">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">N° Compte</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Élève / Apprenant</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Mise Journalière</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Total Cotisé</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Frais Scolarité (Cible)</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Progression</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tontineAccounts.length === 0 ? (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucun compte de cotisation trouvé sur la plateforme.</td></tr>
                  ) : tontineAccounts.map((ta) => {
                    const progress = ta.totalCapital > 0 ? Math.round((ta.totalCotise / ta.totalCapital) * 100) : 0;
                    return (
                      <tr key={ta.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-600">{ta.numero}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-slate-900">{getStudentName(ta.apprenantId)}</p>
                          <p className="text-xs text-slate-500">{ta.schoolName} · {ta.schoolLevel}</p>
                        </td>
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{fmt(ta.cotisationJournaliere)}</td>
                        <td className="px-4 py-2.5 font-semibold text-indigo-700">{fmt(ta.totalCotise)}</td>
                        <td className="px-4 py-2.5 text-slate-500">{fmt(ta.totalCapital)}</td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-700">{progress}%</span>
                            <div className="w-20 bg-slate-200 h-2 rounded-full overflow-hidden">
                              <div className="bg-indigo-600 h-full" style={{ width: `${progress}%` }} />
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${ta.status === 'actif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                            <CircleDot className="w-3 h-3" /> {ta.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
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
      )}

      {/* ────────────────── VIEW 2: FINANCEMENTS ────────────────── */}
      {activeSubTab === 'financements' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Main total */}
          <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-sm text-indigo-200 mb-1">Encours total à recouvrer (Financement Biens)</p>
              <h1 className="text-4xl font-bold text-white">{fmt(totalOutstandingFinancements)}</h1>
              <p className="text-xs text-slate-400 mt-2">Somme des restes à rembourser sur les financements actifs.</p>
            </div>
            <div className="flex gap-4">
              <div className="px-4 py-2.5 bg-white/10 rounded-2xl border border-white/10 text-right">
                <p className="text-xs text-indigo-200">Actifs</p>
                <p className="text-xl font-bold text-white">{activeFinancements.length}</p>
              </div>
              <div className="px-4 py-2.5 bg-white/10 rounded-2xl border border-white/10 text-right">
                <p className="text-xs text-indigo-200">Soldés</p>
                <p className="text-xl font-bold text-emerald-400">{completedFinancements.length}</p>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {[
              { label: 'Financements accordés', value: totalFinancedAmount, icon: ShoppingBag, tone: 'text-indigo-600', bg: 'bg-indigo-50' },
              { label: 'Déjà remboursé', value: totalRepaidAmount, icon: ArrowUpRight, tone: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Reste à recouvrer', value: totalOutstandingFinancements, icon: Wallet, tone: 'text-rose-600', bg: 'bg-rose-50' },
              { label: 'Total dossiers financés', value: financements.length, icon: Landmark, tone: 'text-slate-700', bg: 'bg-slate-100', isCount: true },
            ].map(c => {
              const I = c.icon;
              return (
                <article key={c.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-slate-500">{c.label}</p>
                      <h3 className={`mt-2 text-xl font-semibold ${c.tone}`}>
                        {(c as any).isCount ? c.value : fmt(c.value)}
                      </h3>
                    </div>
                    <div className={`rounded-xl p-2.5 ${c.bg}`}><I className={`h-4 w-4 ${c.tone}`} /></div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* List of active goods financements */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Registre des Financements de Biens déjà effectués</h3>
            <p className="text-sm text-slate-500 mb-4">Dossiers de financement actifs et soldés des adhérents non-apprenants.</p>
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-4 py-2.5 text-left font-semibold">Client / Bénéficiaire</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Bien Financé</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Valeur Matériel</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Apport Personnel</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Montant Financé</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Mise Journalière</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Total Cotisé</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Reste à payer</th>
                    <th className="px-4 py-2.5 text-left font-semibold">Statut</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {financements.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Aucun financement matériel enregistré sur la plateforme.</td></tr>
                  ) : financements.map((f) => {
                    const outstanding = Math.max(0, f.totalARembourser - f.totalCotise);
                    return (
                      <tr key={f.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-2.5 font-semibold text-slate-900">{getNonApprenantName(f.nonApprenantId)}</td>
                        <td className="px-4 py-2.5">
                          <p className="font-semibold text-indigo-900">{f.bienFinance}</p>
                          <p className="text-xs text-slate-500">Durée: {f.dureeChoisie.replace('mois_', '')} mois</p>
                        </td>
                        <td className="px-4 py-2.5 text-slate-600">{fmt(f.valeurBien)}</td>
                        <td className="px-4 py-2.5 text-slate-500">{fmt(f.apportPersonnel)}</td>
                        <td className="px-4 py-2.5 font-semibold text-slate-700">{fmt(f.montantFinance)}</td>
                        <td className="px-4 py-2.5 text-indigo-700 font-bold">{fmt(f.cotisationJournaliere)}</td>
                        <td className="px-4 py-2.5 text-emerald-700 font-bold">{fmt(f.totalCotise)}</td>
                        <td className="px-4 py-2.5 font-bold text-rose-600">{fmt(outstanding)}</td>
                        <td className="px-4 py-2.5">
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            f.status === 'actif' ? 'bg-emerald-50 text-emerald-700' : f.status === 'solde' ? 'bg-indigo-50 text-indigo-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            {f.status === 'actif' ? 'Actif' : f.status === 'solde' ? 'Soldé' : 'Attente apport'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
