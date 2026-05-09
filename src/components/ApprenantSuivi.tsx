import { useState, useMemo } from 'react';
import { Apprenant, Cotisation, TontineAccount, User } from '../types';
import { db } from '../localStorageDB';
import { calculerProgres } from '../grille';
import { getCyclePlan, getNextCycleInfo, withDerivedCycleInfo } from '../cotisationCycle';
import {
  AlertTriangle, BookOpen, CheckCircle2,
  Lock, Pencil, Plus, RefreshCw, Search, Trash2, X,
} from 'lucide-react';
import { requestAdminCode, validateAndConsumeAdminCode } from '../adminCodes';

interface Props { currentUser: User; }
const fmt = (v: number) => new Intl.NumberFormat('fr-FR').format(v) + ' F';
const today = () => new Date().toISOString().split('T')[0];

export default function ApprenantSuivi({ currentUser }: Props) {
  const [apprenants] = useState<Apprenant[]>(db.getApprenants());
  const [accounts, setAccounts] = useState<TontineAccount[]>(db.getTontineAccounts());
  const [cotisations, setCotisations] = useState<Cotisation[]>(db.getCotisations());

  const [search, setSearch] = useState('');
  const [selectedApId, setSelectedApId] = useState<string | null>(null);
  const [showCollectModal, setShowCollectModal] = useState(false);
  const [showCorrModal, setShowCorrModal] = useState<Cotisation | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState<Cotisation | null>(null);
  const [showMonthlyModal, setShowMonthlyModal] = useState(false);

  // Collect form
  const [collectAmount, setCollectAmount] = useState(0);
  const [collectDate, setCollectDate] = useState(today());
  const [collectNotes, setCollectNotes] = useState('');
  const [collectEmargement, setCollectEmargement] = useState(false);
  const [collectMsg, setCollectMsg] = useState('');

  // Correction form
  const [corrAmount, setCorrAmount] = useState(0);
  const [corrReason, setCorrReason] = useState('');
  const [corrCode, setCorrCode] = useState('');
  const [corrError, setCorrError] = useState('');
  const [sensitiveRequestId, setSensitiveRequestId] = useState('');
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');

  // Monthly comparison — carnet values
  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const filteredAps = apprenants.filter(a =>
    a.studentName.toLowerCase().includes(search.toLowerCase()) ||
    a.schoolName.toLowerCase().includes(search.toLowerCase())
  );

  const selectedAp = apprenants.find(a => a.id === selectedApId);
  const selectedAccount = accounts.find(a => a.apprenantId === selectedApId);

  const selectedCotisationsAsc = useMemo(
    () => withDerivedCycleInfo(cotisations.filter(c => c.apprenantId === selectedApId)),
    [cotisations, selectedApId]
  );

  const myCotisations = useMemo(
    () => [...selectedCotisationsAsc].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id)),
    [selectedCotisationsAsc]
  );

  const monthlyCots = useMemo(() =>
    myCotisations.filter(c => c.date.startsWith(monthFilter)),
    [myCotisations, monthFilter]
  );

  const nextCycleInfo = selectedAccount ? getNextCycleInfo(selectedCotisationsAsc.length) : null;
  const beneficeCase1Total = selectedCotisationsAsc
    .filter((c) => c.allocation === 'benefice_societe')
    .reduce((sum, c) => sum + c.amount, 0);

  const users = db.getUsers();
  const commName = (id: string) => users.find(u => u.id === id)?.name || id;

  const handleCollect = () => {
    if (!selectedAccount || !selectedAp) return;
    if (collectAmount <= 0) { setCollectMsg('Montant invalide.'); return; }
    const cycleInfo = getNextCycleInfo(selectedCotisationsAsc.length);
    const isBeneficeCase = cycleInfo.allocation === 'benefice_societe';

    const newCot: Cotisation = {
      id: 'cot_' + Date.now(),
      tontineAccountId: selectedAccount.id,
      apprenantId: selectedAp.id,
      studentName: selectedAp.studentName,
      amount: collectAmount,
      date: collectDate,
      collectedBy: currentUser.id,
      collectedByName: currentUser.name,
      notes: collectNotes,
      carnetEmargement: collectEmargement,
      cycleMonth: cycleInfo.cycleMonth,
      cycleDay: cycleInfo.cycleDay,
      allocation: cycleInfo.allocation,
    };

    const updCots = [...cotisations, newCot];
    const newTotal = selectedAccount.totalCotise + (isBeneficeCase ? 0 : collectAmount);
    const newBeneficeTotal = (selectedAccount.totalBeneficeCases || 0) + (isBeneficeCase ? collectAmount : 0);
    const updAccounts = accounts.map(a =>
      a.id === selectedAccount.id
        ? { ...a, totalCotise: newTotal, totalBeneficeCases: newBeneficeTotal, totalJours: a.totalJours + 1, status: newTotal >= a.totalCapital ? 'solde' as const : a.status }
        : a
    );

    db.saveCotisations(updCots);
    db.saveTontineAccounts(updAccounts);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Cotisation Journalière',
      `Cotisation de ${fmt(collectAmount)} pour ${selectedAp.studentName} (${selectedAccount.numero}). Cycle ${cycleInfo.cycleMonth}, case ${cycleInfo.cycleDay}: ${isBeneficeCase ? 'bénéfice société' : 'remboursement'}. Émargement carnet: ${collectEmargement ? 'Oui' : 'Non'}`
    );

    setCotisations(updCots);
    setAccounts(updAccounts);
    setCollectAmount(0); setCollectNotes(''); setCollectEmargement(false); setCollectDate(today());
    setShowCollectModal(false);
    setCollectMsg('');
  };

  const handleCorrection = () => {
    if (!showCorrModal) return;
    if (corrAmount <= 0) { setCorrError('Montant invalide.'); return; }
    if (!corrReason.trim()) { setCorrError('Motif obligatoire.'); return; }

    const validation = validateAndConsumeAdminCode({
      code: corrCode,
      actionType: 'cotisation_edit',
      targetId: showCorrModal.id,
      usedBy: currentUser,
    });
    if (!validation.ok) { setCorrError(validation.message || 'Code invalide.'); return; }

    const diff = corrAmount - showCorrModal.amount;
    const allocation = showCorrModal.allocation ?? 'remboursement';

    const updCots = cotisations.map(c => c.id !== showCorrModal.id ? c : {
      ...c,
      originalAmount: c.originalAmount ?? c.amount,
      amount: corrAmount,
      isModified: true,
      modifiedBy: currentUser.id,
      modifiedByName: currentUser.name,
      modifiedAt: new Date().toISOString().replace('T', ' ').slice(0, 19),
      modifiedReason: corrReason,
      adminCodeUsed: corrCode,
    });

    // Recalculate account total
    const updAccounts = accounts.map(a => {
      if (a.apprenantId !== showCorrModal.apprenantId) return a;
      const newTotal = allocation === 'remboursement' ? a.totalCotise + diff : a.totalCotise;
      const newBenefice = allocation === 'benefice_societe' ? (a.totalBeneficeCases || 0) + diff : (a.totalBeneficeCases || 0);
      return { ...a, totalCotise: newTotal, totalBeneficeCases: newBenefice, status: newTotal >= a.totalCapital ? 'solde' as const : 'actif' as const };
    });

    db.saveCotisations(updCots);
    db.saveTontineAccounts(updAccounts);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Correction Cotisation',
      `Cotisation ${showCorrModal.id} corrigée de ${showCorrModal.amount} F → ${corrAmount} F. Affectation: ${allocation === 'benefice_societe' ? 'bénéfice société' : 'remboursement'}. Motif: ${corrReason}`,
      String(showCorrModal.amount), String(corrAmount)
    );

    setCotisations(updCots);
    setAccounts(updAccounts);
    setShowCorrModal(null);
    setCorrAmount(0); setCorrReason(''); setCorrCode(''); setCorrError('');
  };

  const openCorrection = (cotisation: Cotisation) => {
    const request = requestAdminCode({
      requestedBy: currentUser,
      actionType: 'cotisation_edit',
      targetId: cotisation.id,
      targetLabel: `Cotisation ${cotisation.studentName} du ${cotisation.date}`,
      reason: 'Modification cotisation',
    });
    setSensitiveRequestId(request.id);
    setShowCorrModal(cotisation);
    setCorrAmount(cotisation.amount);
    setCorrReason('');
    setCorrCode('');
    setCorrError('');
  };

  const openDelete = (cotisation: Cotisation) => {
    const request = requestAdminCode({
      requestedBy: currentUser,
      actionType: 'cotisation_delete',
      targetId: cotisation.id,
      targetLabel: `Cotisation ${cotisation.studentName} du ${cotisation.date}`,
      reason: 'Suppression cotisation',
    });
    setSensitiveRequestId(request.id);
    setShowDeleteModal(cotisation);
    setDeleteCode('');
    setDeleteError('');
  };

  const handleDelete = () => {
    if (!showDeleteModal) return;
    const validation = validateAndConsumeAdminCode({
      code: deleteCode,
      actionType: 'cotisation_delete',
      targetId: showDeleteModal.id,
      usedBy: currentUser,
    });
    if (!validation.ok) { setDeleteError(validation.message || 'Code invalide.'); return; }

    const allocation = showDeleteModal.allocation ?? 'remboursement';
    const updCots = cotisations.filter((cotisation) => cotisation.id !== showDeleteModal.id);
    const updAccounts = accounts.map((account) => {
      if (account.apprenantId !== showDeleteModal.apprenantId) return account;
      const newTotal = allocation === 'remboursement' ? Math.max(0, account.totalCotise - showDeleteModal.amount) : account.totalCotise;
      const newBenefice = allocation === 'benefice_societe' ? Math.max(0, (account.totalBeneficeCases || 0) - showDeleteModal.amount) : (account.totalBeneficeCases || 0);
      return {
        ...account,
        totalCotise: newTotal,
        totalBeneficeCases: newBenefice,
        totalJours: Math.max(0, account.totalJours - 1),
        status: newTotal >= account.totalCapital ? 'solde' as const : 'actif' as const,
      };
    });

    db.saveCotisations(updCots);
    db.saveTontineAccounts(updAccounts);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Suppression Cotisation', `Cotisation ${showDeleteModal.id} supprimée. Montant: ${fmt(showDeleteModal.amount)}. Affectation: ${allocation}. Code validé.`);
    setCotisations(updCots);
    setAccounts(updAccounts);
    setShowDeleteModal(null);
    setDeleteCode('');
    setDeleteError('');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Suivi Cotisations — Tontine Scolaire</h2>
          <p className="text-sm text-slate-500 mt-0.5">Cycle fixe de 31 cases: case 1 = bénéfice société, cases 2 à 31 = remboursement.</p>
        </div>
      </div>

      {/* Split layout */}
      <div className="grid gap-6 xl:grid-cols-[320px_1fr]">
        {/* Left: Apprenant list */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input type="text" className="bg-transparent text-sm w-full focus:outline-none" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
            {filteredAps.length === 0 ? (
              <p className="p-6 text-center text-slate-400 text-sm">Aucun apprenant.</p>
            ) : filteredAps.map(ap => {
              const ta = accounts.find(a => a.apprenantId === ap.id);
              const isSelected = selectedApId === ap.id;
              const progres = ta ? calculerProgres(ta.totalCapital, ta.totalCotise, ta.cotisationJournaliere) : null;
              return (
                <button
                  key={ap.id}
                  onClick={() => setSelectedApId(ap.id)}
                  className={`w-full text-left p-3 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''}`}
                >
                  <p className="font-semibold text-slate-900 text-sm">{ap.studentName}</p>
                  <p className="text-xs text-slate-500">{ap.schoolName} · {ap.schoolLevel}</p>
                  {ta && progres && (
                    <div className="mt-1.5 space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-500">
                        <span>{fmt(ta.totalCotise)} / {fmt(ta.totalCapital)}</span>
                        <span className={progres.estSolde ? 'text-emerald-600 font-bold' : 'text-indigo-600'}>{progres.pourcentage}%</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-slate-200">
                        <div className={`h-1.5 rounded-full ${progres.estSolde ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progres.pourcentage}%` }} />
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Detail */}
        {!selectedAp ? (
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm flex items-center justify-center min-h-[400px]">
            <div className="text-center text-slate-400 space-y-2">
              <BookOpen className="h-10 w-10 mx-auto opacity-30" />
              <p className="text-sm">Sélectionnez un apprenant pour voir ses cotisations.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {selectedAccount && (() => {
              const progres = calculerProgres(selectedAccount.totalCapital, selectedAccount.totalCotise, selectedAccount.cotisationJournaliere);
              const cyclePlan = getCyclePlan(selectedAccount.totalCapital, selectedAccount.cotisationJournaliere);
              const joursRestants = Math.max(0, cyclePlan.remboursementCases - progres.joursPaies);
              return (
                <>
                  {/* Account summary */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-slate-900">{selectedAp.studentName}</h3>
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${selectedAccount.status === 'actif' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                            {selectedAccount.status}
                          </span>
                        </div>
                        <p className="text-sm text-slate-500">{selectedAp.schoolName} · {selectedAp.schoolLevel} · N° {selectedAccount.numero}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => { setShowMonthlyModal(true); }} className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100">
                          <RefreshCw className="h-3.5 w-3.5" /> Comparaison mensuelle
                        </button>
                        <button onClick={() => setShowCollectModal(true)} className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                          <Plus className="h-3.5 w-3.5" /> Enregistrer cotisation
                        </button>
                      </div>
                    </div>

                    {/* KPIs */}
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 text-sm">
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-xs text-slate-500">Cotis./jour</p>
                        <p className="font-bold text-emerald-700 text-lg">{fmt(selectedAccount.cotisationJournaliere)}</p>
                      </div>
                      <div className="rounded-xl bg-indigo-50 p-3 text-center">
                        <p className="text-xs text-indigo-600">Remboursé</p>
                        <p className="font-bold text-indigo-900 text-lg">{fmt(selectedAccount.totalCotise)}</p>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-3 text-center">
                        <p className="text-xs text-amber-600">Bénéfice case 1</p>
                        <p className="font-bold text-amber-800 text-lg">{fmt(selectedAccount.totalBeneficeCases ?? beneficeCase1Total)}</p>
                      </div>
                      <div className="rounded-xl bg-rose-50 p-3 text-center">
                        <p className="text-xs text-rose-600">Restant</p>
                        <p className="font-bold text-rose-800 text-lg">{fmt(Math.max(0, selectedAccount.totalCapital - selectedAccount.totalCotise))}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-xs text-slate-500">Cases carnet</p>
                        <p className="font-bold text-slate-900 text-lg">{selectedAccount.totalJours}</p>
                      </div>
                      <div className="rounded-xl bg-slate-50 p-3 text-center">
                        <p className="text-xs text-slate-500">Cycle cible</p>
                        <p className="font-bold text-slate-900 text-lg">{cyclePlan.totalCasesCarnet}</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-slate-500">
                        <span>Progression du remboursement</span>
                        <span className={progres.estSolde ? 'text-emerald-600 font-bold' : ''}>{progres.pourcentage}%</span>
                      </div>
                      <div className="h-3 rounded-full bg-slate-100">
                        <div className={`h-3 rounded-full transition-all ${progres.estSolde ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${progres.pourcentage}%` }} />
                      </div>
                      {!progres.estSolde && <p className="text-xs text-slate-400">≈ {joursRestants} cases de remboursement restantes. Les cases 1 mensuelles restent des bénéfices société distincts.</p>}
                      {progres.estSolde && <p className="text-xs text-emerald-600 font-semibold">✓ Compte entièrement soldé</p>}
                    </div>
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                      <strong>Règle appliquée:</strong> chaque cycle contient 31 cases. La case 1 va au bénéfice société; seules les 30 autres cases remboursent le capital/prestation.
                    </div>
                  </div>

                  {/* Cotisation history */}
                  <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-slate-900">Historique des cotisations</h4>
                      <span className="text-xs text-slate-400">{myCotisations.length} entrée(s)</span>
                    </div>
                    <div className="overflow-x-auto max-h-80 overflow-y-auto">
                      <table className="min-w-full divide-y divide-slate-200 text-sm">
                        <thead className="bg-slate-50 text-slate-600 sticky top-0">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold">Date</th>
                            <th className="px-4 py-2 text-left font-semibold">Cycle</th>
                            <th className="px-4 py-2 text-left font-semibold">Montant</th>
                            <th className="px-4 py-2 text-left font-semibold">Affectation</th>
                            <th className="px-4 py-2 text-left font-semibold">Commercial</th>
                            <th className="px-4 py-2 text-left font-semibold">Carnet</th>
                            <th className="px-4 py-2 text-left font-semibold">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {myCotisations.length === 0 ? (
                            <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Aucune cotisation.</td></tr>
                          ) : myCotisations.map(c => (
                            <tr key={c.id} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2 text-slate-500">{c.date}</td>
                              <td className="px-4 py-2 text-xs text-slate-500">M{c.cycleMonth} · C{c.cycleDay}</td>
                              <td className="px-4 py-2">
                                <span className="font-semibold text-slate-900">{fmt(c.amount)}</span>
                                {c.isModified && c.originalAmount !== undefined && (
                                  <span className="ml-2 text-xs text-slate-400 line-through">{fmt(c.originalAmount)}</span>
                                )}
                                {c.isModified && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">MODIFIÉ</span>}
                              </td>
                              <td className="px-4 py-2">
                                <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.allocation === 'benefice_societe' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                  {c.allocation === 'benefice_societe' ? 'Bénéfice société' : 'Remboursement'}
                                </span>
                              </td>
                              <td className="px-4 py-2 text-slate-500">{c.collectedByName || commName(c.collectedBy)}</td>
                              <td className="px-4 py-2 text-center">
                                {c.carnetEmargement ? <span className="text-emerald-600 font-bold text-base">✓</span> : <span className="text-rose-500">✗</span>}
                              </td>
                              <td className="px-4 py-2">
                                <button onClick={() => openCorrection(c)}
                                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200">
                                  <Pencil className="h-3.5 w-3.5" />
                                </button>
                                <button onClick={() => openDelete(c)}
                                  className="ml-1 p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        )}
      </div>

      {/* ── Collect Modal ─────────────────────────────────────────────────── */}
      {showCollectModal && selectedAp && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900 flex items-center gap-2"><Plus className="h-4 w-4 text-indigo-600" />Enregistrer une cotisation</h3>
              <button onClick={() => setShowCollectModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-sm">
              <p className="font-semibold text-indigo-900">{selectedAp.studentName}</p>
              <p className="text-indigo-700 text-xs">Cotisation journalière : <strong>{fmt(selectedAccount.cotisationJournaliere)}</strong> · Restant : {fmt(Math.max(0, selectedAccount.totalCapital - selectedAccount.totalCotise))}</p>
            </div>
            {nextCycleInfo && (
              <div className={`rounded-xl border p-3 text-sm ${nextCycleInfo.allocation === 'benefice_societe' ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-indigo-200 bg-indigo-50 text-indigo-800'}`}>
                <p className="font-semibold">Prochaine case: mois {nextCycleInfo.cycleMonth}, case {nextCycleInfo.cycleDay}</p>
                <p className="text-xs mt-1">
                  {nextCycleInfo.allocation === 'benefice_societe'
                    ? 'Cette cotisation ira au bénéfice société. Elle ne réduit pas le reste à rembourser.'
                    : 'Cette cotisation ira dans le remboursement du compte.'}
                </p>
              </div>
            )}
            {collectMsg && <div className="text-sm text-red-600 bg-red-50 p-2 rounded-xl">{collectMsg}</div>}
            <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Date de collecte</span><input type="date" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={collectDate} onChange={e => setCollectDate(e.target.value)} /></label>
            <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Montant collecté (FCFA) *</span><input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-lg font-semibold outline-none focus:border-indigo-500" value={collectAmount || ''} onChange={e => setCollectAmount(Number(e.target.value))} placeholder={String(selectedAccount.cotisationJournaliere)} /></label>
            <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Notes</span><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={collectNotes} onChange={e => setCollectNotes(e.target.value)} /></label>
            <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
              <input type="checkbox" checked={collectEmargement} onChange={e => setCollectEmargement(e.target.checked)} className="h-4 w-4 rounded text-indigo-600" />
              <span className="text-sm font-semibold text-slate-800">Le carnet physique a été émargé par le commercial</span>
            </label>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowCollectModal(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">Annuler</button>
              <button onClick={handleCollect} className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" />Enregistrer</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Correction Modal ──────────────────────────────────────────────── */}
      {showCorrModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-amber-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" />Correction protégée — Code Admin requis</h3>
              <button onClick={() => setShowCorrModal(null)} className="p-1 hover:bg-amber-800 rounded-full"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {corrError && <div className="p-3 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">{corrError}</div>}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                Cotisation du <strong>{showCorrModal.date}</strong> · Montant actuel: <strong>{fmt(showCorrModal.amount)}</strong>. Demande envoyée à l’admin: <span className="font-mono">{sensitiveRequestId}</span>. Code valable 10 minutes.
              </div>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Nouveau montant *</span><input type="number" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={corrAmount || ''} onChange={e => setCorrAmount(Number(e.target.value))} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Motif de correction *</span><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={corrReason} onChange={e => setCorrReason(e.target.value)} placeholder="Erreur de saisie..." /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Code Admin *</span><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-indigo-500" value={corrCode} onChange={e => setCorrCode(e.target.value.toUpperCase())} placeholder="ADM-ABC123" /></label>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowCorrModal(null)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">Annuler</button>
                <button onClick={handleCorrection} className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700">Appliquer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-rose-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><Lock className="h-4 w-4" />Suppression protégée — Code Admin requis</h3>
              <button onClick={() => setShowDeleteModal(null)} className="p-1 hover:bg-rose-800 rounded-full"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              {deleteError && <div className="p-3 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">{deleteError}</div>}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                Vous allez supprimer la cotisation du <strong>{showDeleteModal.date}</strong> pour <strong>{showDeleteModal.studentName}</strong>, montant <strong>{fmt(showDeleteModal.amount)}</strong>. Demande admin: <span className="font-mono">{sensitiveRequestId}</span>. Cette action est tracée et recalcule le compte.
              </div>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Code Admin *</span><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-mono outline-none focus:border-indigo-500" value={deleteCode} onChange={e => setDeleteCode(e.target.value.toUpperCase())} placeholder="ADM-ABC123" /></label>
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowDeleteModal(null)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">Annuler</button>
                <button onClick={handleDelete} className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700">Supprimer</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Monthly Comparison Modal ──────────────────────────────────────── */}
      {showMonthlyModal && selectedAp && selectedAccount && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8 overflow-hidden">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-semibold flex items-center gap-2"><RefreshCw className="h-4 w-4" />Comparaison mensuelle carnet ↔ système</h3>
              <button onClick={() => setShowMonthlyModal(false)} className="p-1 hover:bg-slate-800 rounded-full"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-5">
              <div className="flex items-center gap-3">
                <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Mois</span><input type="month" className="px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} /></label>
                <div className="rounded-xl bg-indigo-50 border border-indigo-200 p-3 text-sm text-indigo-800">
                  <span className="font-semibold">{monthlyCots.length} cotisation(s)</span> · Remboursement: <strong>{fmt(monthlyCots.filter(c => c.allocation === 'remboursement').reduce((s, c) => s + c.amount, 0))}</strong> · Bénéfice C1: <strong>{fmt(monthlyCots.filter(c => c.allocation === 'benefice_societe').reduce((s, c) => s + c.amount, 0))}</strong>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 overflow-hidden">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Date</th>
                      <th className="px-4 py-2 text-left font-semibold">Cycle</th>
                      <th className="px-4 py-2 text-left font-semibold">Système (FCFA)</th>
                      <th className="px-4 py-2 text-left font-semibold">Affectation</th>
                      <th className="px-4 py-2 text-left font-semibold">Commercial</th>
                      <th className="px-4 py-2 text-left font-semibold">Carnet émargé</th>
                      <th className="px-4 py-2 text-left font-semibold">Écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {monthlyCots.length === 0 ? (
                      <tr><td colSpan={7} className="px-4 py-6 text-center text-slate-400">Aucune cotisation sur ce mois.</td></tr>
                    ) : monthlyCots.map(c => {
                      const expected = selectedAccount.cotisationJournaliere;
                      const ecart = c.amount - expected;
                      return (
                        <tr key={c.id} className={`hover:bg-slate-50/60 ${!c.carnetEmargement ? 'bg-rose-50/30' : ''}`}>
                          <td className="px-4 py-2 text-slate-500">{c.date}</td>
                          <td className="px-4 py-2 text-xs text-slate-500">M{c.cycleMonth} · C{c.cycleDay}</td>
                          <td className="px-4 py-2 font-semibold text-slate-900">
                            {fmt(c.amount)}
                            {c.isModified && <span className="ml-1 rounded bg-amber-100 px-1 text-[10px] font-bold text-amber-700">MODIFIÉ</span>}
                          </td>
                          <td className="px-4 py-2">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${c.allocation === 'benefice_societe' ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700'}`}>
                              {c.allocation === 'benefice_societe' ? 'Bénéfice' : 'Remb.'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-slate-500">{c.collectedByName || commName(c.collectedBy)}</td>
                          <td className="px-4 py-2 text-center">
                            {c.carnetEmargement ? <span className="text-emerald-600 font-bold">✓</span> : <span className="text-rose-500 font-bold">✗</span>}
                          </td>
                          <td className="px-4 py-2">
                            {ecart === 0
                              ? <span className="text-slate-400 text-xs">—</span>
                              : <span className={`text-xs font-semibold ${ecart > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{ecart > 0 ? '+' : ''}{fmt(ecart)}</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {monthlyCots.some(c => !c.carnetEmargement) && (
                <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  Des cotisations sans émargement carnet ont été détectées. Vérifier avec le commercial.
                </div>
              )}

              <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                Procédure mensuelle : le parent ramène le carnet physique · le caissier vérifie les 31 cases du mois · la case 1 est un bénéfice société distinct · toute correction nécessite un code admin temporaire.
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
