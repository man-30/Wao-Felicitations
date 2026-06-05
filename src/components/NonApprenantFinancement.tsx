import { useEffect, useState } from 'react';
import api from '../config/api';
import {
  Client, FinancementNonApprenant, NonApprenant,
  Transaction, User, DureeFinancement
} from '../types';
import { db } from '../localStorageDB';
import { ADHESION_NON_APPRENANT, CARNET_MONTANT, GRILLE_NON_APPRENANTS, calculerGrilleNonApprenant } from '../grille';
import {
  AlertTriangle, BadgeCheck, CheckCircle2, ChevronRight,
  Landmark, Printer, Search, ShoppingBag, UserPlus, X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props { currentUser: User; }
const fmt = (v: number) => new Intl.NumberFormat('fr-FR').format(v) + ' F';
const today = () => new Date().toISOString().split('T')[0];

export default function NonApprenantFinancement({ currentUser }: Props) {
  const [commercials, setCommercials] = useState<User[]>([]);
  const [isLoadingComm, setIsLoadingComm] = useState(false);

  useEffect(() => {
    const fetchComm = async () => {
      setIsLoadingComm(true);
      try {
        const u = await api.getUsers();
        setCommercials(u.filter(user => user.role === 'commercial'));
      } catch (err) {
        console.error('Failed to fetch commercials', err);
      } finally {
        setIsLoadingComm(false);
      }
    };
    fetchComm();
  }, []);
  const [nonApprenants, setNonApprenants] = useState<NonApprenant[]>(db.getNonApprenants());
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [receiptData, setReceiptData] = useState<{ na: NonApprenant; fn?: FinancementNonApprenant } | null>(null);

  // ── Wizard state ──────────────────────────────────────────────────────────
  // Step 1 — Identity
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [commercialId, setCommercialId] = useState('');

  // Step 2 — Fees Adhesion & Carnet
  const [adhesionPaid, setAdhesionPaid] = useState(false);
  const [carnetPaid, setCarnetPaid] = useState(false);
  const [pieceProvided, setPieceProvided] = useState(false);
  const [photosProvided, setPhotosProvided] = useState(false);

  // Step 3 — Financement (Optional at enrollment)
  const [wantFinancement, setWantFinancement] = useState(false);
  const [bienFinance, setBienFinance] = useState('');
  const [valeurBien, setValeurBien] = useState(0);
  const [apportPersonnel, setApportPersonnel] = useState(0);
  const [dureeChoisie, setDureeChoisie] = useState<DureeFinancement>('4_mois');

  const [error, setError] = useState('');

  const calcul = wantFinancement && valeurBien > 0 ? calculerGrilleNonApprenant(valeurBien, dureeChoisie, apportPersonnel) : null;

  const resetWizard = () => {
    setStep(1); setError('');
    setFullName(''); setPhone(''); setIdNumber(''); setCommercialId('');
    setAdhesionPaid(false); setCarnetPaid(false);
    setPieceProvided(false); setPhotosProvided(false);
    setWantFinancement(false); setBienFinance(''); setValeurBien(0); setApportPersonnel(0); setDureeChoisie('4_mois');
    setShowWizard(false);
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      // Nom, téléphone et commercial : plus obligatoires pour le moment (Directive utilisateur)
      /*
      if (!fullName || !phone || !commercialId) {
        setError('Nom, téléphone et commercial obligatoires.'); return;
      }
      */
    }
    if (step === 2) {
      if (!adhesionPaid || !carnetPaid || !pieceProvided || !photosProvided) {
        setError('Les frais (6 000 F au total) et les pièces sont obligatoires.'); return;
      }
    }
    if (step === 3 && wantFinancement) {
      if (!bienFinance || !valeurBien) {
        setError('Veuillez renseigner le bien et sa valeur.'); return;
      }
      if (apportPersonnel < 0 || apportPersonnel > valeurBien) {
        setError('L\'apport personnel doit être compris entre 0 et la valeur du bien.'); return;
      }
      if (!calcul) {
        setError('Configuration non disponible dans la grille (Vérifiez la valeur et la durée).'); return;
      }
    }
    setStep(s => s + 1);
  };

  const handleCreate = async () => {
    setError('');
    try {
      const now = today();
      const enrollmentData = {
        client: {
          name: fullName || "Adhérent Sans Nom",
          type: 'non_apprenant' as const,
          phone: phone || "0000",
          assignedCommercialId: commercialId || currentUser.id,
        },
        nonApprenant: {
          idNumber: idNumber || 'N/A',
          documents: { pieceIdentite: pieceProvided, photos: photosProvided },
        },
        financement: (wantFinancement && calcul) ? {
          bienFinance,
          valeurBien,
          apportPersonnel: calcul.apportLibre,
          apportPourcentage: calcul.apportPourcentage,
          montantFinance: calcul.montantFinance,
          dureeChoisie,
          grilleNumero: calcul.row.numero,
          fraisDossier: calcul.fraisDossier,
          fraisPrestation: calcul.fraisPrestation,
          cotisationJournaliere: calcul.cotisationJournaliere,
          totalARembourser: calcul.totalARembourser,
          totalCases: 0,
        } : undefined,
        createdBy: currentUser.id,
      };

      const result = await api.createNonApprenant(enrollmentData);

      // Update local state
      const newNa = {
        id: result.nonApprenant.id,
        clientId: result.client.id,
        fullName: fullName || "Adhérent Sans Nom",
        phone: phone || "0000",
        idNumber: idNumber || 'N/A',
        documents: { pieceIdentite: pieceProvided, photos: photosProvided },
        adhesionPaid: true,
        carnetPaid: true,
        createdBy: currentUser.id,
        createdAt: now,
      };

      let newFn: any = undefined;
      if (result.nonApprenant.financements && result.nonApprenant.financements.length > 0) {
        newFn = result.nonApprenant.financements[0];
      }

      // Persist locally for session
      db.saveClients([...db.getClients(), result.client]);
      db.saveNonApprenants([...db.getNonApprenants(), newNa]);
      if (newFn) db.saveFinancements([...db.getFinancements(), newFn]);

      setNonApprenants([...nonApprenants, newNa]);
      setFinancements([...financements, ...(newFn ? [newFn] : [])]);
      
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setShowWizard(false);
      // Transactions for fees
      const txs = db.getTransactions();
      const txAdh: any = {
        id: 'tx_adh_na_' + Date.now(), clientId: result.client.id, clientName: fullName || "Adhérent Sans Nom",
        type: 'adhesion', amount: ADHESION_NON_APPRENANT, date: now,
        collectedBy: currentUser.id, collectedByName: currentUser.name,
        validatedBy: currentUser.id, validatedByName: currentUser.name,
        status: 'approved', notes: 'Adhésion Non-Apprenant non remboursable'
      };
      const txCar: any = {
        id: 'tx_car_na_' + Date.now(), clientId: result.client.id, clientName: fullName || "Adhérent Sans Nom",
        type: 'carnet', amount: CARNET_MONTANT, date: now,
        collectedBy: currentUser.id, collectedByName: currentUser.name,
        validatedBy: currentUser.id, validatedByName: currentUser.name,
        status: 'approved', notes: 'Carnet de cotisation'
      };
      db.saveTransactions([...txs, txAdh, txCar]);

      // Directive 17.7 — Crediting cash via Produits (adhésion uniquement à la création)
      const produits = db.getProduits();
      db.saveProduits([
        ...produits,
        { id: 'p_adh_' + Date.now(), category: 'Frais de dossiers' as any, amount: ADHESION_NON_APPRENANT, description: `Adhésion non-apprenant ${fullName || "Adhérent Sans Nom"}`, date: now, recordedBy: currentUser.id, recordedByName: currentUser.name },
        { id: 'p_car_' + Date.now(), category: 'Vente de livret individuel' as any, amount: CARNET_MONTANT, description: `Livret cotisation ${fullName || "Adhérent Sans Nom"}`, date: now, recordedBy: currentUser.id, recordedByName: currentUser.name },
      ]);

      db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Inscription Non-Apprenant',
        `Non-Apprenant ${fullName || "Adhérent Sans Nom"} inscrit. Frais: 6000 F. ${wantFinancement ? 'Financement ' + bienFinance + ' ajouté.' : ''}`
      );

      setReceiptData({ na: newNa as any, fn: newFn as any });
      resetWizard();
    } catch (err: any) {
      console.error('Failed to create non-apprenant', err);
      setError('Erreur serveur: ' + (err.message || 'Serveur injoignable'));
    }
  };

  const filtered = nonApprenants.filter(na => na.fullName.toLowerCase().includes(search.toLowerCase()) || na.phone.includes(search));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Financement Non-Apprenants</h2>
          <p className="text-sm text-slate-500 mt-0.5">Gestion des adhésions (5 500 F) et des financements de biens selon la grille officielle.</p>
        </div>
        <button
          onClick={() => { resetWizard(); setShowWizard(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm"
        >
          <UserPlus className="h-4 w-4" /> Inscrire un membre
        </button>
      </div>

      {/* Grid summary for non-apprenants */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Grille officielle des financements</p>
            <h3 className="mt-1 text-lg font-bold">CONDITIONS GÉNÉRALES DES NON-APPRENANTS</h3>
            <p className="mt-1 text-xs text-slate-400">Adhésion: 5 500 F · Carnet: 500 F · Apport personnel libre · Cycle: 31 cases/mois, case 1 bénéfice société</p>
          </div>
          <Landmark className="h-10 w-10 text-slate-700 opacity-50" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-[11px] text-left">
            <thead className="bg-slate-100 text-slate-700">
              <tr>
                <th className="px-3 py-2 font-semibold">Tranche Valeur</th>
                <th className="px-3 py-2 font-semibold">Dossier</th>
                <th className="px-3 py-2 font-semibold">Cotis. ≤ 4 mois</th>
                <th className="px-3 py-2 font-semibold">Cotis. ≤ 6 mois</th>
                <th className="px-3 py-2 font-semibold">Cotis. ≤ 8 mois</th>
                <th className="px-3 py-2 font-semibold">Cotis. ≤ 10 mois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {GRILLE_NON_APPRENANTS.slice(0, 10).map((row, i) => (
                <tr key={row.numero} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}>
                  <td className="px-3 py-1.5 font-medium text-slate-800">{fmt(row.valeurMin)} – {fmt(row.valeurMax)}</td>
                  <td className="px-3 py-1.5 text-slate-600">{fmt(row.fraisDossier)}</td>
                  <td className="px-3 py-1.5 text-emerald-700 font-bold">{row.cotisations['4_mois'] ? fmt(row.cotisations['4_mois']) : '—'}</td>
                  <td className="px-3 py-1.5 text-emerald-700 font-bold">{row.cotisations['6_mois'] ? fmt(row.cotisations['6_mois']) : '—'}</td>
                  <td className="px-3 py-1.5 text-emerald-700 font-bold">{row.cotisations['8_mois'] ? fmt(row.cotisations['8_mois']) : '—'}</td>
                  <td className="px-3 py-1.5 text-emerald-700 font-bold">{row.cotisations['10_mois'] ? fmt(row.cotisations['10_mois']) : '—'}</td>
                </tr>
              ))}
              <tr><td colSpan={6} className="px-3 py-2 text-center text-slate-400 italic">... voir grille complète pour montants supérieurs à 250 000 F ...</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Member list */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input type="text" className="bg-transparent text-sm w-full focus:outline-none" placeholder="Rechercher par nom ou téléphone..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Membre</th>
                <th className="px-4 py-3 text-left font-semibold">Tél.</th>
                <th className="px-4 py-3 text-left font-semibold">Pièces</th>
                <th className="px-4 py-3 text-left font-semibold">Frais Inscr.</th>
                <th className="px-4 py-3 text-left font-semibold">Inscrit le</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-slate-400">Aucun membre enregistré.</td></tr>
              ) : filtered.map(na => (
                <tr key={na.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-3 font-semibold text-slate-900">{na.fullName}</td>
                  <td className="px-4 py-3 text-slate-600">{na.phone}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${na.documents.pieceIdentite ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>CNI</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${na.documents.photos ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>PHOTO</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600">
                      <CheckCircle2 className="h-3 w-3" /> 6 000 F payés
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{na.createdAt}</td>
                  <td className="px-4 py-3">
                    <button className="p-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200">
                      <ShoppingBag className="h-3.5 w-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Wizard Modal ─────────────────────────────────────────────────── */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl my-8 overflow-hidden">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserPlus className="h-6 w-6 text-indigo-400" />
                <div><h3 className="font-bold">Nouvel Adhérent Non-Apprenant</h3><p className="text-xs text-slate-400">Étape {step} / 4</p></div>
              </div>
              <button onClick={resetWizard} className="p-1.5 hover:bg-white/10 rounded-full"><X className="h-4 w-4" /></button>
            </div>

            <div className="p-6 space-y-5">
              {error && <div className="p-3 text-sm rounded-xl bg-red-50 text-red-700 border border-red-200 flex items-start gap-2"><AlertTriangle className="h-4 w-4 mt-0.5" />{error}</div>}

              {/* Step 1: Identity */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800">Identité du membre</h4>
                  <div className="grid gap-3">
                    <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Nom complet</span><input type="text" className="inp" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ex: Koffi Kouame" /></label>
                    <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Téléphone</span><input type="text" className="inp" value={phone} onChange={e => setPhone(e.target.value)} /></label>
                    <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">N° Pièce d'identité</span><input type="text" className="inp" value={idNumber} onChange={e => setIdNumber(e.target.value)} /></label>
                    <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Commercial assigné</span>
                      <select disabled={isLoadingComm} className="inp" value={commercialId} onChange={e => setCommercialId(e.target.value)}>
                        <option value="">{isLoadingComm ? 'Chargement...' : '— Choisir —'}</option>
                        {commercials.map(c => <option key={c.id} value={c.id}>{c.name} ({c.zone || '—'})</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* Step 2: Fees and Docs */}
              {step === 2 && (
                <div className="space-y-5">
                  <h4 className="font-semibold text-slate-800">Frais obligatoires et Documents</h4>
                  <div className="rounded-2xl bg-indigo-50 p-4 border border-indigo-100 space-y-3">
                    <div className="flex justify-between text-sm"><span>Adhésion non remboursable</span><span className="font-bold">5 500 F</span></div>
                    <div className="flex justify-between text-sm"><span>Carnet de cotisation</span><span className="font-bold">500 F</span></div>
                    <hr className="border-indigo-200" />
                    <div className="flex justify-between font-bold text-slate-900"><span>TOTAL À PERCEVOIR</span><span className="text-indigo-700">6 000 F</span></div>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox" checked={adhesionPaid} onChange={e => setAdhesionPaid(e.target.checked)} className="h-4 w-4 rounded text-indigo-600" /><span className="text-sm font-semibold">Adhésion (5 500 F) encaissée</span></label>
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox" checked={carnetPaid} onChange={e => setCarnetPaid(e.target.checked)} className="h-4 w-4 rounded text-indigo-600" /><span className="text-sm font-semibold">Carnet (500 F) remis et encaissé</span></label>
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox" checked={pieceProvided} onChange={e => setPieceProvided(e.target.checked)} className="h-4 w-4 rounded text-indigo-600" /><span className="text-sm font-semibold">Photocopie CNI fournie</span></label>
                    <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50"><input type="checkbox" checked={photosProvided} onChange={e => setPhotosProvided(e.target.checked)} className="h-4 w-4 rounded text-indigo-600" /><span className="text-sm font-semibold">Deux (02) photos passeport fournies</span></label>
                  </div>
                </div>
              )}

              {/* Step 3: Financement Optional */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-slate-800">Souhait de financement immédiat ?</h4>
                    <button onClick={() => setWantFinancement(!wantFinancement)} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${wantFinancement ? 'bg-indigo-600' : 'bg-slate-200'}`}><span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${wantFinancement ? 'translate-x-6' : 'translate-x-1'}`} /></button>
                  </div>
                  
                  {wantFinancement ? (
                    <div className="space-y-4 border-l-4 border-indigo-500 pl-4 py-2">
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Bien ou service à financer *</span><input type="text" className="inp" value={bienFinance} onChange={e => setBienFinance(e.target.value)} placeholder="Ex: Machine à coudre, Réfrigérateur..." /></label>
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Valeur totale du bien (FCFA) *</span><input type="number" className="inp" value={valeurBien || ''} onChange={e => setValeurBien(Number(e.target.value))} /></label>
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Apport personnel libre du client (FCFA) *</span><input type="number" className="inp" value={apportPersonnel || ''} onChange={e => setApportPersonnel(Number(e.target.value))} placeholder="Le client apporte ce qu'il a" /></label>
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Durée du remboursement</span>
                        <select className="inp" value={dureeChoisie} onChange={e => setDureeChoisie(e.target.value as DureeFinancement)}>
                          <option value="4_mois">≤ 4 mois</option>
                          <option value="6_mois">≤ 6 mois</option>
                          <option value="8_mois">≤ 8 mois</option>
                          <option value="10_mois">≤ 10 mois</option>
                        </select>
                      </label>

                      {calcul && (
                        <div className="rounded-2xl bg-indigo-900 p-5 text-white shadow-lg space-y-4">
                          <div className="flex items-center gap-2"><BadgeCheck className="h-5 w-5 text-indigo-400" /><span className="font-bold">Plan de financement auto-calculé</span></div>
                          <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="bg-white/10 p-3 rounded-xl border border-white/10"><p className="opacity-70">Apport libre ({calcul.apportPourcentage}%)</p><p className="text-lg font-bold">{fmt(calcul.apportLibre)}</p></div>
                            <div className="bg-white/10 p-3 rounded-xl border border-white/10"><p className="opacity-70">Montant financé</p><p className="text-lg font-bold">{fmt(calcul.montantFinance)}</p></div>
                            <div className="bg-white/10 p-3 rounded-xl border border-white/10"><p className="opacity-70 text-indigo-300 font-bold">Cotisation journalière</p><p className="text-2xl font-extrabold text-emerald-400">{fmt(calcul.cotisationJournaliere)} / j</p></div>
                            <div className="bg-white/10 p-3 rounded-xl border border-white/10"><p className="opacity-70">Frais prestation</p><p className="text-lg font-bold">{fmt(calcul.fraisPrestation)}</p></div>
                          </div>
                          <div className="pt-3 border-t border-white/10 flex justify-between items-center"><span className="text-sm opacity-80">Total à rembourser par tontine :</span><span className="text-xl font-bold">{fmt(calcul.totalARembourser)}</span></div>
                          <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 p-3 text-[11px] text-amber-100">
                            <p className="font-bold text-amber-200">Cycle carnet 31 cases</p>
                            <p>Case 1 de chaque mois = bénéfice société distinct. Cases 2 à 31 = remboursement.</p>
                            <p>Plan estimé: {calcul.totalCasesCarnet} cases carnet dont {calcul.beneficeCases} case(s) bénéfice C1 ({fmt(calcul.totalBeneficeCase1)}).</p>
                          </div>
                          <p className="text-[10px] text-indigo-300 italic">L'entreprise accompagne physiquement le membre pour l'achat chez le fournisseur.</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">Le membre s'inscrit pour épargner sans financement pour l'instant.</div>
                  )}
                </div>
              )}

              {/* Step 4: Final Summary */}
              {step === 4 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Confirmation de l'inscription</h4>
                  <div className="rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                    <div className="p-3 flex justify-between bg-slate-50"><span className="text-xs text-slate-500">Membre</span><span className="text-sm font-bold">{fullName}</span></div>
                    <div className="p-3 flex justify-between"><span className="text-xs text-slate-500">Téléphone</span><span className="text-sm font-medium">{phone}</span></div>
                    <div className="p-3 flex justify-between"><span className="text-xs text-slate-500">Commercial</span><span className="text-sm font-medium">{commercials.find(c => c.id === commercialId)?.name}</span></div>
                    {wantFinancement && calcul && (
                    <div className="p-3 bg-indigo-50"><span className="text-xs text-indigo-600 block mb-1 font-bold uppercase">Financement matériel prévu</span><p className="text-sm"><strong>{bienFinance}</strong> ({fmt(valeurBien)}) · apport {fmt(calcul.apportLibre)} ({calcul.apportPourcentage}%) · entreprise finance {fmt(calcul.montantFinance)} · <strong>{fmt(calcul.cotisationJournaliere)}/jour</strong></p></div>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 italic">En validant, le système génère les reçus d'adhésion et de carnet (6 000 F).</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-slate-100 flex items-center justify-between">
              <button onClick={() => step > 1 ? setStep(s => s - 1) : resetWizard()} className="text-sm font-semibold text-slate-500 hover:text-slate-800">Retour</button>
              {step < 4 ? (
                <button onClick={handleNext} className="inline-flex items-center gap-2 px-5 py-2 bg-slate-900 text-white text-sm font-bold rounded-xl hover:bg-slate-800 transition-all">Suivant <ChevronRight className="h-4 w-4" /></button>
              ) : (
                <button onClick={handleCreate} className="inline-flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200">Finaliser l'inscription</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
             <button onClick={() => setReceiptData(null)} className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="h-4 w-4" /></button>
             <div className="space-y-4 text-center">
              <div className="border-b pb-3">
                <img src="/waooo-logo.png" alt="Logo Waooo Félicitation" className="mx-auto mb-2 h-12 w-12 rounded-full object-contain" />
                <h4 className="font-extrabold text-slate-900 text-lg">Waooo Félicitation</h4>
                <p className="text-xs text-slate-500">Reçu d'inscription Adhérent</p>
              </div>
              <div className="py-2">
                <p className="text-xs text-slate-500 uppercase">Membre</p>
                <h3 className="text-xl font-bold text-slate-900">{receiptData.na.fullName}</h3>
              </div>
              <div className="border-t border-b border-dashed py-3 text-left space-y-2 text-xs">
                <div className="flex justify-between"><span>Adhésion</span><span className="font-bold">5 500 F</span></div>
                <div className="flex justify-between"><span>Carnet cotisation</span><span className="font-bold">500 F</span></div>
                <hr className="border-slate-100" />
                <div className="flex justify-between font-bold text-slate-900"><span>TOTAL PAYÉ</span><span>6 000 F</span></div>
              </div>
              {receiptData.fn && (
                <div className="bg-indigo-50 p-3 rounded-xl text-left border border-indigo-100">
                  <p className="text-[10px] text-indigo-500 font-bold uppercase">Option Financement</p>
                  <p className="text-sm font-bold text-indigo-900 mt-1">{receiptData.fn.bienFinance}</p>
                  <p className="text-xs text-indigo-700">Cotisation : {fmt(receiptData.fn.cotisationJournaliere)}/jour</p>
                  <p className="text-xs text-amber-700 mt-1">Case 1 mensuelle: bénéfice société distinct</p>
                </div>
              )}
             </div>
             <button onClick={() => window.print()} className="mt-5 w-full py-2.5 bg-slate-900 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800"><Printer className="h-4 w-4" /> Imprimer le reçu</button>
          </div>
        </div>
      )}

      <style>{`.inp { width:100%; padding:0.5rem 0.75rem; border:1px solid #e2e8f0; border-radius:0.75rem; font-size:0.875rem; outline:none; transition: all 0.2s; } .inp:focus { border-color:#6366f1; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }`}</style>
    </div>
  );
}
