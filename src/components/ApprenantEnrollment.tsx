import { useEffect, useState } from 'react';
import api from '../config/api';
import {
  Apprenant, ApprenantDocument, Caution, Client,
  DocumentStatus, Guardian, TontineAccount, Transaction, User,
} from '../types';
import { db } from '../localStorageDB';
import { ADHESION_MONTANT, CARNET_MONTANT, GRILLE, calculerGrille } from '../grille';
import {
  AlertTriangle, BadgeCheck, BookOpen, CheckCircle2, ChevronRight,
  FileText, GraduationCap, Printer, Search, UserPlus, X,
} from 'lucide-react';
import confetti from 'canvas-confetti';

interface Props { currentUser: User; }
const fmt = (v: number) => new Intl.NumberFormat('fr-FR').format(v) + ' F';
const today = () => new Date().toISOString().split('T')[0];

const DOC_KEYS: { key: string; label: string }[] = [
  { key: 'cni',              label: 'Carte Nationale d\'Identité' },
  { key: 'passeport',        label: 'Passeport' },
  { key: 'acte_naissance',   label: 'Acte de naissance' },
  { key: 'cert_scolarite',   label: 'Certificat de scolarité' },
  { key: 'photos',           label: '2 photos passeport' },
  { key: 'piece_parent',     label: 'Pièce d\'identité parent/tuteur' },
  { key: 'piece_caution',    label: 'Pièce d\'identité caution' },
];

export default function ApprenantEnrollment({ currentUser }: Props) {
  const [commercials, setCommercials] = useState<User[]>([]);
  const [isLoadingComm, setIsLoadingComm] = useState(false);
  
  useEffect(() => {
    const fetchComm = async () => {
      setIsLoadingComm(true);
      try {
        const users = await api.getUsers();
        setCommercials(users.filter(u => u.role === 'commercial'));
      } catch (err) {
        console.error('Failed to fetch commercials', err);
      } finally {
        setIsLoadingComm(false);
      }
    };
    fetchComm();
  }, []);
  const [apprenants, setApprenants] = useState<Apprenant[]>(db.getApprenants());
  const [tontineAccounts, setTontineAccounts] = useState<TontineAccount[]>(db.getTontineAccounts());
  const [search, setSearch] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [step, setStep] = useState(1);
  const [receiptData, setReceiptData] = useState<{ ap: Apprenant; ta: TontineAccount } | null>(null);

  // ── Wizard state ──────────────────────────────────────────────────────────
  // Step 1 — Apprenant identity
  const [studentName, setStudentName]       = useState('');
  const [studentBirth, setStudentBirth]     = useState('');
  const [schoolName, setSchoolName]         = useState('');
  const [schoolLevel, setSchoolLevel]       = useState('');
  const [schoolYear, setSchoolYear]         = useState('2025-2026');
  const [commercialId, setCommercialId]     = useState('');
  const [parentPhone, setParentPhone]       = useState('');

  // Step 2 — Guardian + Caution
  const [guardianName, setGuardianName]     = useState('');
  const [guardianPhone, setGuardianPhone]   = useState('');
  const [guardianRel, setGuardianRel]       = useState('Père');
  const [guardianId, setGuardianId]         = useState('');
  const [cautionName, setCautionName]       = useState('');
  const [cautionPhone, setCautionPhone]     = useState('');
  const [cautionId, setCautionId]           = useState('');
  const [cautionFunction, setCautionFunction] = useState('');
  const [otherDoc, setOtherDoc]             = useState('');

  // Step 3 — Documents
  const [docStatus, setDocStatus]           = useState<Record<string, DocumentStatus>>(
    Object.fromEntries(DOC_KEYS.map(d => [d.key, 'en_attente']))
  );

  // Step 4 — Frais scolarité + grid
  const [fraisScolarite, setFraisScolarite] = useState(0);

  // Step 5 — Adhesion / Carnet confirmation
  const [adhesionConfirm, setAdhesionConfirm] = useState(false);
  const [carnetConfirm, setCarnetConfirm]     = useState(false);

  const [error, setError] = useState('');

  const calcul = fraisScolarite > 0 ? calculerGrille(fraisScolarite) : null;

  const resetWizard = () => {
    setStep(1); setError('');
    setStudentName(''); setStudentBirth(''); setSchoolName(''); setSchoolLevel('');
    setSchoolYear('2025-2026'); setCommercialId(''); setParentPhone('');
    setGuardianName(''); setGuardianPhone(''); setGuardianRel('Père');
    setGuardianId(''); setCautionName(''); setCautionPhone(''); setCautionId('');
    setDocStatus(Object.fromEntries(DOC_KEYS.map(d => [d.key, 'en_attente'])));
    setFraisScolarite(0); setAdhesionConfirm(false); setCarnetConfirm(false);
    setShowWizard(false);
  };

  const handleNext = () => {
    setError('');
    if (step === 1) {
      if (!studentName || !schoolName || !schoolLevel || !commercialId) {
        setError('Veuillez remplir les champs obligatoires.'); return;
      }
    }
    if (step === 2) {
      // Parent et caution : plus obligatoires pour le moment (Directive utilisateur)
      /*
      if (!guardianName || !guardianPhone || !cautionName || !cautionPhone) {
        setError('Parent/tuteur et caution obligatoires.'); return;
      }
      */
    }
    if (step === 4) {
      if (!calcul) { setError('Montant de frais de scolarité hors grille (max 175 000 F).'); return; }
    }
    if (step === 5) {
      if (!adhesionConfirm || !carnetConfirm) {
        setError('L\'adhésion (2 000 F) et le carnet (500 F) doivent être réglés avant de créer le compte.'); return;
      }
    }
    setStep(s => s + 1);
  };

  const handleCreate = async () => {
    if (!calcul) return;
    setError('');

    try {
      const now    = today();
      const taNum  = db.nextAccountNumber();

      const enrollmentData = {
        client: {
          name: studentName,
          type: 'apprenant',
          phone: parentPhone || guardianPhone,
          assignedCommercialId: commercialId,
        },
        apprenant: {
          studentBirthDate: studentBirth ? new Date(studentBirth) : undefined,
          schoolName,
          schoolLevel,
          schoolYear,
          guardian: {
            fullName: guardianName,
            phone: guardianPhone,
            relationship: guardianRel,
            idNumber: guardianId,
          },
          caution: {
            fullName: cautionName,
            phone: cautionPhone,
            idNumber: cautionId,
            profession: cautionFunction,
          },
          documents: DOC_KEYS.map(d => ({
            key: d.key, label: d.label, status: docStatus[d.key] || 'en_attente',
          })),
        },
        tontine: {
          numero: taNum,
          fraisScolarite,
          grilleNumero: calcul.row.numero,
          fraisDossier: calcul.fraisDossier,
          fraisAssurance: calcul.fraisAssurance,
          fraisPrestation: calcul.fraisPrestation,
          cotisationJournaliere: calcul.cotisationJournaliere,
          totalCapital: calcul.totalARembourser,
          adhesionPaid: ADHESION_MONTANT,
          carnetPaid: CARNET_MONTANT,
        },
        createdBy: currentUser.id,
      };

      const result = await api.createApprenant(enrollmentData);
      
      // Update local state (for immediate UI response, though ideally we'd refetch)
      const newAp = {
        id: result.apprenant.id,
        clientId: result.client.id,
        studentName,
        studentBirthDate: studentBirth,
        schoolName,
        schoolLevel,
        schoolYear,
        guardian: enrollmentData.apprenant.guardian as any,
        caution: enrollmentData.apprenant.caution as any,
        documents: enrollmentData.apprenant.documents as any,
        createdBy: currentUser.id,
        createdAt: now,
      };

      const ta = {
        id: result.tontine.id,
        apprenantId: result.apprenant.id,
        numero: taNum,
        createdAt: now,
        schoolName,
        schoolLevel,
        fraisScolarite,
        grilleNumero: calcul.row.numero,
        fraisDossier: calcul.fraisDossier,
        fraisAssurance: calcul.fraisAssurance,
        fraisPrestation: calcul.fraisPrestation,
        cotisationJournaliere: calcul.cotisationJournaliere,
        totalCapital: calcul.totalARembourser,
        totalCotise: 0,
        totalBeneficeCases: 0,
        totalJours: 0,
        status: 'actif' as const,
        adhesionPaid: ADHESION_MONTANT,
        carnetPaid: CARNET_MONTANT,
      };

      // Also update localStorage for backward compatibility if needed, 
      // but the goal is to move to API
      db.saveClients([...db.getClients(), result.client]);
      db.saveApprenants([...db.getApprenants(), newAp]);
      db.saveTontineAccounts([...db.getTontineAccounts(), ta]);

      // Record transactions locally still for the session
      const txs = db.getTransactions();
      const txAdhesion: any = {
        id: 'tx_adh_' + Date.now(), clientId: result.client.id, clientName: studentName,
        type: 'adhesion', amount: ADHESION_MONTANT, date: now,
        collectedBy: currentUser.id, collectedByName: currentUser.name,
        validatedBy: currentUser.id, validatedByName: currentUser.name,
        status: 'approved',
        receiptNumber: `ADH-${taNum}`,
        notes: 'Frais d\'adhésion non remboursable',
      };
      const txCarnet: any = {
        id: 'tx_car_' + Date.now(), clientId: result.client.id, clientName: studentName,
        type: 'carnet', amount: CARNET_MONTANT, date: now,
        collectedBy: currentUser.id, collectedByName: currentUser.name,
        validatedBy: currentUser.id, validatedByName: currentUser.name,
        status: 'approved',
        receiptNumber: `CAR-${taNum}`,
        notes: 'Carnet de tontine scolaire',
      };
      db.saveTransactions([...txs, txAdhesion, txCarnet]);

      // Directive 17.7 — Crediting cash via Produits
      const produitsArr = db.getProduits();
      db.saveProduits([
        ...produitsArr,
        { id: 'p_adh_' + Date.now(), category: 'Frais de dossiers' as any, amount: ADHESION_MONTANT, description: `Adhésion apprenant ${studentName}`, date: now, recordedBy: currentUser.id, recordedByName: currentUser.name },
        { id: 'p_car_' + Date.now(), category: 'Vente de livret tontine' as any, amount: CARNET_MONTANT, description: `Livret tontine ${studentName}`, date: now, recordedBy: currentUser.id, recordedByName: currentUser.name },
        ...(calcul.fraisDossier > 0 ? [{ id: 'p_dos_' + Date.now(), category: 'Frais de dossiers' as any, amount: calcul.fraisDossier, description: `Frais dossier apprenant ${studentName}`, date: now, recordedBy: currentUser.id, recordedByName: currentUser.name }] : [])
      ]);

      // Logs
      db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Inscription Apprenant',
        `Apprenant ${studentName} inscrit. Compte tontine: ${taNum}. Frais scolarité: ${fmt(fraisScolarite)}. Cotisation/j: ${fmt(calcul.cotisationJournaliere)}`
      );

      setApprenants([...apprenants, newAp]);
      setTontineAccounts([...tontineAccounts, ta]);
      
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setReceiptData({ ap: newAp as any, ta: ta as any });
      resetWizard();
    } catch (err: any) {
      console.error('Failed to create apprenant', err);
      setError('Erreur lors de la création sur le serveur: ' + (err.message || 'Serveur injoignable'));
    }
  };

  const filtered = apprenants.filter(a =>
    a.studentName.toLowerCase().includes(search.toLowerCase()) ||
    a.schoolName.toLowerCase().includes(search.toLowerCase())
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Tontine Scolaire — Inscription Apprenant</h2>
          <p className="text-sm text-slate-500 mt-0.5">Workflow complet en 5 étapes selon la grille officielle des conditions générales.</p>
        </div>
        <button
          onClick={() => { resetWizard(); setShowWizard(true); }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 shadow-sm"
        >
          <UserPlus className="h-4 w-4" /> Inscrire un apprenant
        </button>
      </div>

      {/* Grid summary */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-indigo-700 to-indigo-900 px-6 py-4 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-200">Grille officielle des frais de scolarité</p>
          <h3 className="mt-1 text-lg font-bold">CONDITIONS GÉNÉRALES DES APPRENANTS</h3>
          <p className="mt-1 text-xs text-indigo-200">Adhésion: 2 000 F · Carnet: 500 F · Cycle fixe: 31 cases/mois dont la case 1 est un bénéfice société</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs text-left">
            <thead className="bg-slate-800 text-white">
              <tr>
                <th className="px-3 py-2 font-semibold">N°</th>
                <th className="px-3 py-2 font-semibold">Tranche scolarité</th>
                <th className="px-3 py-2 font-semibold text-center">Dossier</th>
                <th className="px-3 py-2 font-semibold text-center">Assurance</th>
                <th className="px-3 py-2 font-semibold text-red-300">Prestation</th>
                <th className="px-3 py-2 font-semibold text-green-300">Cotis./jour</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {GRILLE.map((row, i) => (
                <tr key={row.numero} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                  <td className="px-3 py-1.5 font-bold text-slate-700">{row.numero}</td>
                  <td className="px-3 py-1.5 text-slate-700">{fmt(row.fraisMin === 0 ? 1 : row.fraisMin)} – {fmt(row.fraisMax)}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{fmt(row.fraisDossier)}</td>
                  <td className="px-3 py-1.5 text-center text-slate-600">{row.fraisAssurance > 0 ? fmt(row.fraisAssurance) : '—'}</td>
                  <td className="px-3 py-1.5 font-semibold text-red-600">{fmt(row.fraisPrestation)}</td>
                  <td className="px-3 py-1.5 font-bold text-emerald-700">{fmt(row.cotisationJournaliere)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Enrolled list */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Search className="h-4 w-4 text-slate-400" />
          <input type="text" className="bg-transparent text-sm w-full focus:outline-none" placeholder="Rechercher un apprenant ou établissement..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Élève</th>
                <th className="px-4 py-3 text-left font-semibold">Établissement</th>
                <th className="px-4 py-3 text-left font-semibold">N° Compte</th>
                <th className="px-4 py-3 text-left font-semibold">Cotis./jour</th>
                <th className="px-4 py-3 text-left font-semibold">Total dû</th>
                <th className="px-4 py-3 text-left font-semibold">Remboursé</th>
                <th className="px-4 py-3 text-left font-semibold">Bénéfice C1</th>
                <th className="px-4 py-3 text-left font-semibold">Restant</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-8 text-center text-slate-400">Aucun apprenant enregistré.</td></tr>
              ) : filtered.map(ap => {
                const ta = tontineAccounts.find(t => t.apprenantId === ap.id);
                if (!ta) return null;
                const restant = ta.totalCapital - ta.totalCotise;
                const pct = Math.min(100, Math.round((ta.totalCotise / ta.totalCapital) * 100));
                return (
                  <tr key={ap.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{ap.studentName}</p>
                      <p className="text-xs text-slate-400">{ap.schoolLevel} · {ap.schoolYear}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{ap.schoolName}</td>
                    <td className="px-4 py-3 font-mono text-xs text-indigo-600">{ta.numero}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">{fmt(ta.cotisationJournaliere)}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{fmt(ta.totalCapital)}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        <span className="font-semibold text-indigo-600">{fmt(ta.totalCotise)}</span>
                        <div className="h-1.5 w-24 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} /></div>
                        <span className="text-[10px] text-slate-400">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-amber-600">{fmt(ta.totalBeneficeCases || 0)}</td>
                    <td className="px-4 py-3 font-semibold text-rose-600">{fmt(Math.max(0, restant))}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${ta.status === 'actif' ? 'bg-emerald-50 text-emerald-700' : ta.status === 'solde' ? 'bg-slate-100 text-slate-500' : 'bg-amber-50 text-amber-700'}`}>
                        {ta.status === 'actif' ? 'Actif' : ta.status === 'solde' ? 'Soldé' : 'Suspendu'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Enrollment Wizard Modal ──────────────────────────────────────────── */}
      {showWizard && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-start justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl my-8">
            {/* Wizard header */}
            <div className="bg-gradient-to-r from-indigo-800 to-indigo-600 rounded-t-3xl p-5 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GraduationCap className="h-6 w-6" />
                  <div>
                    <h3 className="text-lg font-bold">Inscription Tontine Scolaire</h3>
                    <p className="text-xs text-indigo-200">Étape {step} / 5</p>
                  </div>
                </div>
                <button onClick={resetWizard} className="p-1.5 hover:bg-white/10 rounded-full"><X className="h-4 w-4" /></button>
              </div>
              {/* Step bar */}
              <div className="mt-4 flex gap-1">
                {[1,2,3,4,5].map(s => (
                  <div key={s} className={`flex-1 h-1 rounded-full transition-all ${s <= step ? 'bg-white' : 'bg-white/20'}`} />
                ))}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-indigo-200">
                {['Élève', 'Parent & Caution', 'Documents', 'Frais & Grille', 'Finalisation'].map((l, i) => (
                  <span key={i} className={i + 1 === step ? 'text-white font-semibold' : ''}>{l}</span>
                ))}
              </div>
            </div>

            <div className="p-6 space-y-5">
              {error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />{error}
                </div>
              )}

              {/* ── Step 1 : Apprenant identity ── */}
              {step === 1 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2"><GraduationCap className="h-4 w-4 text-indigo-600" />Dossier Élève</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Nom complet de l'élève *</span><input type="text" className="inp" value={studentName} onChange={e => setStudentName(e.target.value)} placeholder="Idriss Traoré" /></label>
                    <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Date de naissance</span><input type="date" className="inp" value={studentBirth} onChange={e => setStudentBirth(e.target.value)} /></label>
                    <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Établissement *</span><input type="text" className="inp" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="Lycée Municipal de Cocody" /></label>
                    <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Niveau / Classe *</span><input type="text" className="inp" value={schoolLevel} onChange={e => setSchoolLevel(e.target.value)} placeholder="3ème, Terminale, CM2…" /></label>
                    <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Année scolaire</span><input type="text" className="inp" value={schoolYear} onChange={e => setSchoolYear(e.target.value)} placeholder="2025-2026" /></label>
                    <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Téléphone parent</span><input type="text" className="inp" value={parentPhone} onChange={e => setParentPhone(e.target.value)} placeholder="07 00 00 00 00" /></label>
                    <label className="md:col-span-2 space-y-1"><span className="text-xs font-semibold text-slate-500">Commercial assigné *</span>
                      <select disabled={isLoadingComm} className="inp" value={commercialId} onChange={e => setCommercialId(e.target.value)}>
                        <option value="">{isLoadingComm ? 'Chargement...' : '— Choisir le commercial —'}</option>
                        {commercials.map(c => <option key={c.id} value={c.id}>{c.name} ({c.zone || 'Sans zone'})</option>)}
                      </select>
                    </label>
                  </div>
                </div>
              )}

              {/* ── Step 2 : Guardian + Caution ── */}
              {step === 2 && (
                <div className="space-y-5">
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800">Parent / Tuteur *</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Nom complet *</span><input type="text" className="inp" value={guardianName} onChange={e => setGuardianName(e.target.value)} /></label>
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Téléphone *</span><input type="text" className="inp" value={guardianPhone} onChange={e => setGuardianPhone(e.target.value)} /></label>
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Lien avec l'élève</span>
                        <select className="inp" value={guardianRel} onChange={e => setGuardianRel(e.target.value)}>
                          {['Père','Mère','Tuteur','Tutrice','Oncle','Tante','Grand-parent'].map(r => <option key={r}>{r}</option>)}
                        </select>
                      </label>
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">N° pièce d'identité</span><input type="text" className="inp" value={guardianId} onChange={e => setGuardianId(e.target.value)} /></label>
                    </div>
                  </div>
                  <hr className="border-slate-100" />
                  <div className="space-y-3">
                    <h4 className="font-semibold text-slate-800">Caution *</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Nom complet *</span><input type="text" className="inp" value={cautionName} onChange={e => setCautionName(e.target.value)} /></label>
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Téléphone *</span><input type="text" className="inp" value={cautionPhone} onChange={e => setCautionPhone(e.target.value)} /></label>
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">N° pièce d'identité</span><input type="text" className="inp" value={cautionId} onChange={e => setCautionId(e.target.value)} /></label>
                      <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Fonction / Profession *</span><input type="text" className="inp" value={cautionFunction} onChange={e => setCautionFunction(e.target.value)} placeholder="Enseignant, commerçant, ..." /></label>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3 : Documents ── */}
              {step === 3 && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2"><FileText className="h-4 w-4 text-indigo-600" />Checklist des documents requis</h4>
                  <p className="text-sm text-slate-500">Cochez les documents remis par le parent. Les documents manquants pourront être fournis ultérieurement.</p>
                  <div className="space-y-3">
                    {DOC_KEYS.map(doc => (
                      <div key={doc.key} className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
                        <span className="text-sm text-slate-800 font-medium">{doc.label}</span>
                        <div className="flex gap-2">
                          {(['fourni', 'en_attente', 'manquant'] as DocumentStatus[]).map(s => (
                            <button
                              key={s}
                              onClick={() => setDocStatus(prev => ({ ...prev, [doc.key]: s }))}
                              className={`rounded-lg px-2 py-1 text-xs font-semibold border transition-all ${
                                docStatus[doc.key] === s
                                  ? s === 'fourni' ? 'bg-emerald-600 text-white border-emerald-600'
                                  : s === 'manquant' ? 'bg-rose-600 text-white border-rose-600'
                                  : 'bg-amber-500 text-white border-amber-500'
                                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              {s === 'fourni' ? '✓ Fourni' : s === 'manquant' ? '✗ Manquant' : '⏳ En attente'}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                    <label className="block space-y-1 rounded-xl border border-slate-200 p-3">
                      <span className="text-xs font-semibold text-slate-500">Autre pièce fournie (préciser)</span>
                      <input type="text" className="inp" value={otherDoc} onChange={e => setOtherDoc(e.target.value)} placeholder="Préciser le document..." />
                    </label>
                  </div>
                </div>
              )}

              {/* ── Step 4 : Frais scolarité + grid ── */}
              {step === 4 && (
                <div className="space-y-5">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2"><BookOpen className="h-4 w-4 text-indigo-600" />Frais de scolarité & Calcul automatique</h4>
                  <label className="block space-y-1">
                    <span className="text-xs font-semibold text-slate-500">Montant des frais de scolarité de l'élève (FCFA) *</span>
                    <input type="number" className="inp text-lg font-semibold" value={fraisScolarite || ''} onChange={e => setFraisScolarite(Number(e.target.value))} placeholder="Ex: 55000" />
                  </label>

                  {calcul ? (
                    <div className="rounded-2xl border-2 border-indigo-200 bg-indigo-50 p-5 space-y-4">
                      <div className="flex items-center gap-2 text-indigo-800"><BadgeCheck className="h-5 w-5" /><span className="font-bold text-base">Tranche N°{calcul.row.numero} — Calcul automatique</span></div>
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-white p-3 border border-indigo-100">
                          <p className="text-xs text-slate-500">Frais de scolarité</p>
                          <p className="text-lg font-bold text-slate-900">{fmt(calcul.fraisScolarite)}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 border border-indigo-100">
                          <p className="text-xs text-slate-500">Frais de dossier</p>
                          <p className="text-lg font-bold text-slate-900">{fmt(calcul.fraisDossier)}</p>
                        </div>
                        <div className="rounded-xl bg-white p-3 border border-indigo-100">
                          <p className="text-xs text-slate-500">Frais d'assurance</p>
                          <p className="text-lg font-bold text-slate-900">{calcul.fraisAssurance > 0 ? fmt(calcul.fraisAssurance) : '—'}</p>
                        </div>
                        <div className="rounded-xl bg-red-50 p-3 border border-red-100">
                          <p className="text-xs text-red-600">Frais de prestation</p>
                          <p className="text-lg font-bold text-red-700">{fmt(calcul.fraisPrestation)}</p>
                        </div>
                        <div className="rounded-xl bg-emerald-50 p-3 border border-emerald-100 col-span-2">
                          <p className="text-xs text-emerald-700 font-medium">Cotisation journalière</p>
                          <p className="text-2xl font-extrabold text-emerald-800">{fmt(calcul.cotisationJournaliere)} / jour</p>
                        </div>
                      </div>
                      <hr className="border-indigo-200" />
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="rounded-xl bg-white p-3 border border-indigo-100">
                          <p className="text-xs text-slate-500">Capital avancé</p>
                          <p className="font-bold text-slate-900">{fmt(calcul.capitalAvance)}</p>
                          <p className="text-[10px] text-slate-400">scolarité + dossier + assurance</p>
                        </div>
                        <div className="rounded-xl bg-slate-900 p-3 border border-slate-700">
                          <p className="text-xs text-slate-400">Total à rembourser</p>
                          <p className="font-bold text-white text-lg">{fmt(calcul.totalARembourser)}</p>
                          <p className="text-[10px] text-slate-400">{calcul.remboursementCases} cases remboursement + {calcul.beneficeCases} cases bénéfice</p>
                        </div>
                      </div>
                      <div className="rounded-xl bg-amber-50 p-3 border border-amber-200 text-xs text-amber-800">
                        <p className="font-bold">Cycle carnet: 31 cases = 1 mois</p>
                        <p>Case 1 de chaque mois: bénéfice société distinct. Cases 2 à 31: remboursement.</p>
                        <p>Durée estimée: <strong>{calcul.totalCasesCarnet} cases carnet</strong>. Bénéfice case 1 estimé: <strong>{fmt(calcul.totalBeneficeCase1)}</strong>.</p>
                      </div>
                      <p className="text-xs text-indigo-700 italic">NB: Pas d'escompte en cas de paiement ou remboursement anticipé.</p>
                    </div>
                  ) : fraisScolarite > 0 ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" /> Montant hors grille. La grille couvre de 1 F à 175 000 F.
                    </div>
                  ) : null}
                </div>
              )}

              {/* ── Step 5 : Adhesion + Carnet ── */}
              {step === 5 && calcul && (
                <div className="space-y-5">
                  <h4 className="font-semibold text-slate-800 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-indigo-600" />Finalisation — Frais d'ouverture de compte</h4>

                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-3 text-sm">
                    <div className="flex justify-between text-slate-700"><span>Adhésion (non remboursable)</span><span className="font-bold">{fmt(ADHESION_MONTANT)}</span></div>
                    <div className="flex justify-between text-slate-700"><span>Carnet de tontine scolaire</span><span className="font-bold">{fmt(CARNET_MONTANT)}</span></div>
                    <hr className="border-slate-200" />
                    <div className="flex justify-between font-bold text-slate-900 text-base"><span>Total à encaisser maintenant</span><span className="text-indigo-700">{fmt(ADHESION_MONTANT + CARNET_MONTANT)}</span></div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={adhesionConfirm} onChange={e => setAdhesionConfirm(e.target.checked)} className="h-4 w-4 rounded text-indigo-600" />
                      <span className="text-sm font-semibold text-slate-800">J'ai encaissé les 2 000 F d'adhésion</span>
                    </label>
                    <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-3 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={carnetConfirm} onChange={e => setCarnetConfirm(e.target.checked)} className="h-4 w-4 rounded text-indigo-600" />
                      <span className="text-sm font-semibold text-slate-800">J'ai remis le carnet de tontine et encaissé 500 F</span>
                    </label>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-sm text-emerald-800 space-y-1">
                    <p className="font-bold">Récapitulatif du compte qui sera créé</p>
                    <p>Élève: <strong>{studentName}</strong> · {schoolName} · {schoolLevel}</p>
                    <p>Cotisation journalière: <strong>{fmt(calcul.cotisationJournaliere)}</strong></p>
                    <p>Capital total à rembourser: <strong>{fmt(calcul.totalARembourser)}</strong></p>
                    <p>Cycle: <strong>{calcul.totalCasesCarnet} cases carnet</strong> ({calcul.remboursementCases} remboursement + {calcul.beneficeCases} bénéfice case 1)</p>
                    <p>Bénéfice case 1 estimé: <strong>{fmt(calcul.totalBeneficeCase1)}</strong></p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex items-center justify-between gap-3">
              <button
                onClick={() => step > 1 ? setStep(s => s - 1) : resetWizard()}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50"
              >
                {step === 1 ? 'Annuler' : '← Retour'}
              </button>
              {step < 5 ? (
                <button onClick={handleNext} className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">
                  Suivant <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button onClick={handleCreate} className="inline-flex items-center gap-2 px-5 py-2 bg-emerald-600 text-white text-sm font-semibold rounded-xl hover:bg-emerald-700">
                  <CheckCircle2 className="h-4 w-4" /> Créer le compte tontine
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Receipt Modal ─────────────────────────────────────────────────────── */}
      {receiptData && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative">
            <button onClick={() => setReceiptData(null)} className="absolute top-3 right-3 p-1 hover:bg-slate-100 rounded-full text-slate-400"><X className="h-4 w-4" /></button>
            <div className="space-y-4 text-center">
              <div className="border-b pb-3">
                <img src="/waooo-logo.png" alt="Logo Waooo Félicitation" className="mx-auto mb-2 h-12 w-12 rounded-full object-contain" />
                <h4 className="font-extrabold text-indigo-950 text-lg">Waooo Félicitation</h4>
                <p className="text-xs text-slate-500">Tontine Scolaire — Reçu d'inscription</p>
                <p className="mt-1 text-[11px] font-mono text-slate-400">{receiptData.ta.numero}</p>
              </div>
              <div className="py-2 bg-emerald-50 rounded-xl">
                <p className="text-xs text-emerald-600 font-medium uppercase tracking-wider">Inscrit avec succès</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{receiptData.ap.studentName}</h3>
                <p className="text-sm text-slate-500">{receiptData.ap.schoolName} · {receiptData.ap.schoolLevel}</p>
              </div>
              <div className="border-t border-b border-dashed py-3 text-left space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-slate-500">Adhésion encaissée</span><span className="font-bold text-slate-900">{fmt(ADHESION_MONTANT)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Carnet tontine</span><span className="font-bold text-slate-900">{fmt(CARNET_MONTANT)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cotisation/jour</span><span className="font-bold text-emerald-700">{fmt(receiptData.ta.cotisationJournaliere)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Capital total dû</span><span className="font-bold text-slate-900">{fmt(receiptData.ta.totalCapital)}</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Cycle carnet</span><span className="font-bold text-slate-900">31 cases / mois</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Case 1 mensuelle</span><span className="font-bold text-amber-700">Bénéfice société</span></div>
                <div className="flex justify-between"><span className="text-slate-500">Date d'inscription</span><span className="font-bold text-slate-900">{receiptData.ta.createdAt}</span></div>
              </div>
              <p className="text-[10px] text-slate-400 italic">Pas d'escompte en cas de paiement anticipé.</p>
            </div>
            <button onClick={() => window.print()} className="mt-5 w-full py-2 bg-indigo-900 text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-800">
              <Printer className="h-4 w-4" /> Imprimer le reçu
            </button>
          </div>
        </div>
      )}

      {/* Tailwind inline style for input */}
      <style>{`.inp { width:100%; padding:0.5rem 0.75rem; border:1px solid #e2e8f0; border-radius:0.75rem; font-size:0.875rem; outline:none; } .inp:focus { border-color:#6366f1; }`}</style>
    </div>
  );
}
