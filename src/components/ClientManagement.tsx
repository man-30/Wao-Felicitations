import { useEffect, useState } from 'react';
import { Account, Client, ClientType, User, SchoolDebt, DureeFinancement, FinancementNonApprenant } from '../types';
import { db } from '../localStorageDB';
import api from '../config/api';
import { calculerGrille, calculerGrilleNonApprenant } from '../grille';
import {
  UserPlus, Search, GraduationCap, UserCheck, Briefcase,
  History, ArrowRightLeft, X, Pencil, Eye, Lock, PiggyBank, HandCoins, ArrowRight, Printer, FileSpreadsheet,
  Loader2, CheckCircle2, AlertTriangle, Upload, Trash2
} from 'lucide-react';
import { requestAdminCode, validateAndConsumeAdminCode } from '../adminCodes';
import JSONImportDialog from './JSONImportDialog';

interface Props { currentUser: User; }

export default function ClientManagement({ currentUser }: Props) {
  const [clients, setClients] = useState<Client[]>(db.getClients());
  const [accounts, setAccounts] = useState<Account[]>(db.getAccounts());
  const [backendError, setBackendError] = useState('');
  const [isLoadingClients, setIsLoadingClients] = useState(false);
  const [commercials, setCommercials] = useState<User[]>([]);

  const fetchClients = async () => {
    setIsLoadingClients(true);
    try {
      const [apiClients, apiUsers] = await Promise.all([
        api.getClients(),
        api.getUsers()
      ]);
      setClients(apiClients);
      db.syncDataFromServer(apiClients);
      setCommercials(apiUsers.filter(u => u.role === 'commercial'));
    } catch (err: any) {
      setBackendError(err.message || 'Impossible de charger les données.');
    } finally {
      setIsLoadingClients(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  // Polling toutes les 30 secondes pour synchroniser les soldes automatiquement
  useEffect(() => {
    const interval = setInterval(() => {
      fetchClients();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Create
  const [name, setName] = useState('');
  const [type, setType] = useState<ClientType>('simple');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [assignedCommercialId, setAssignedCommercialId] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [initialDebt, setInitialDebt] = useState(0);
  const [parentName, setParentName] = useState('');
  const [parentContact, setParentContact] = useState('');
  const [parentRelation, setParentRelation] = useState('Père');
  const [cautionName, setCautionName] = useState('');
  const [cautionContact, setCautionContact] = useState('');
  const [cautionProfession, setCautionProfession] = useState('');
  const [docCni, setDocCni] = useState(false);
  const [docPassport, setDocPassport] = useState(false);
  const [docBirth, setDocBirth] = useState(false);
  const [docSchool, setDocSchool] = useState(false);
  const [docOther, setDocOther] = useState(false);
  const [docOtherText, setDocOtherText] = useState('');

  // Search
  const [searchTerm, setSearchTerm] = useState('');

  // Edit
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editError, setEditError] = useState('');
  const [editRequestId, setEditRequestId] = useState('');

  // Delete
  const [deleteClient, setDeleteClient] = useState<Client | null>(null);
  const [deleteCode, setDeleteCode] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteRequestId, setDeleteRequestId] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Migration
  const [migrateClient, setMigrateClient] = useState<Client | null>(null);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newDebtAmount, setNewDebtAmount] = useState(0);

  // View detail
  const [viewClient, setViewClient] = useState<Client | null>(null);

  // Account and financing actions
  const [savingClient, setSavingClient] = useState<Client | null>(null);
  const [financeClient, setFinanceClient] = useState<Client | null>(null);
  const [financeAmount, setFinanceAmount] = useState(0);
  const [financeApport, setFinanceApport] = useState(0);
  const [financeDuration, setFinanceDuration] = useState<DureeFinancement>('6_mois');
  const [financeLabel, setFinanceLabel] = useState('');
  const [transferAccount, setTransferAccount] = useState<Account | null>(null);
  const [transferAmount, setTransferAmount] = useState(0);
  const [transferReason, setTransferReason] = useState('Transfert surplus remboursement → Épargne');

  const [msg, setMsg] = useState({ text: '', type: '' });
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showEpargnantForm, setShowEpargnantForm] = useState(false);
  const [isEpargnantLoading, setIsEpargnantLoading] = useState(false);

  // ── Mise journalière (épargnants simples) ────────────────────────────────
  const [miseClient, setMiseClient] = useState<Client | null>(null);
  const [miseAmount, setMiseAmount] = useState(0);
  const [isMiseLoading, setIsMiseLoading] = useState(false);
  const [miseError, setMiseError] = useState('');

  // ── Suppression par zone ──────────────────────────────────────────────────
  const [showZoneDelete, setShowZoneDelete] = useState(false);
  const [zoneToDelete, setZoneToDelete] = useState('caissier 1');
  const [isZoneDeleting, setIsZoneDeleting] = useState(false);
  const isAdmin = currentUser.role === 'admin';
  const isCashier = currentUser.role === 'caissier';

  const filteredClients = clients.filter(c => {
    if (!c) return false;
    if (currentUser.role === 'commercial' && c.assignedCommercialId !== currentUser.id) return false;
    const name = c.name || '';
    const phone = c.phone || '';
    return name.toLowerCase().includes(searchTerm.toLowerCase()) || phone.includes(searchTerm);
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignedCommercialId) {
      setMsg({ text: 'Veuillez sélectionner un commercial à assigner au client.', type: 'error' });
      return;
    }

    if (type === 'apprenant') {
      // Les infos parents sont optionnelles pour le moment (Directive utilisateur)
      /*
      if (!parentName || !parentContact || !parentRelation || !cautionName || !cautionContact || !cautionProfession) {
        setMsg({ text: 'Pour un apprenant, les informations parent/tuteur et caution sont obligatoires.', type: 'error' });
        return;
      }
      */
      if (!docCni && !docPassport && !docBirth && !docSchool && !docOther) {
        setMsg({ text: 'Veuillez cocher au moins une pièce fournie pour l’apprenant.', type: 'error' });
        return;
      }
      if (docOther && !docOtherText.trim()) {
        setMsg({ text: 'Veuillez préciser le document Autre.', type: 'error' });
        return;
      }
    }

    const debts: SchoolDebt[] = [];
    if (type === 'apprenant' && schoolName && initialDebt > 0) {
      debts.push({ id: 'd_' + Date.now(), schoolName, debtAmount: initialDebt, paidAmount: 0, active: true, createdAt: new Date().toISOString().split('T')[0] });
    }

    const nc: Client = {
      id: 'c_' + Date.now(), name, type, phone, address, assignedCommercialId,
      membershipCode: db.generateMembershipCode(),
      accountNumber: db.generateClientAccountNumber(),
      savingsBalance: 0, financingBalance: 0, schoolDebts: debts,
      createdAt: new Date().toISOString().split('T')[0],
    };

    try {
      // Normaliser le type: 'non-apprenant' (frontend) → 'non_apprenant' (backend)
      const backendType = type === 'non-apprenant' ? 'non_apprenant' : type;
      const createdClient = await api.createClient({ name, type: backendType, phone, address, assignedCommercialId });
      setClients((prev) => [createdClient, ...prev]);
      db.saveClients([createdClient, ...db.getClients()]);
      if (type === 'apprenant') {
        const apprenants = db.getApprenants();
        db.saveApprenants([
          ...apprenants,
          {
            id: 'ap_' + Date.now(),
            clientId: createdClient.id,
            studentName: createdClient.name,
            schoolName: schoolName || 'Non renseigné',
            schoolLevel: 'Non renseigné',
            schoolYear: new Date().getFullYear().toString(),
            guardian: { id: 'g_' + Date.now(), fullName: parentName, phone: parentContact, relationship: parentRelation },
            caution: { id: 'ca_' + Date.now(), fullName: cautionName, phone: cautionContact, profession: cautionProfession },
            documents: [
              { key: 'cni', label: 'Carte Nationale d’Identité', status: docCni ? 'fourni' : 'manquant' },
              { key: 'passeport', label: 'Passeport', status: docPassport ? 'fourni' : 'manquant' },
              { key: 'acte_naissance', label: 'Acte de naissance', status: docBirth ? 'fourni' : 'manquant' },
              { key: 'certificat_scolarite', label: 'Certificat de scolarité', status: docSchool ? 'fourni' : 'manquant' },
              ...(docOther ? [{ key: 'autre', label: docOtherText, status: 'fourni' as const }] : []),
            ],
            createdBy: currentUser.id,
            createdAt: createdClient.createdAt || nc.createdAt,
          },
        ]);
      }
      db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Création Client', `Client ${createdClient.name} (${type}) créé, assigné à ${assignedCommercialId}`);
      setName(''); setType('simple'); setPhone(''); setAddress(''); setAssignedCommercialId(''); setSchoolName(''); setInitialDebt(0);
      setParentName(''); setParentContact(''); setParentRelation('Père'); setCautionName(''); setCautionContact(''); setCautionProfession('');
      setDocCni(false); setDocPassport(false); setDocBirth(false); setDocSchool(false); setDocOther(false); setDocOtherText('');
      setMsg({ text: `Client ${createdClient.name} créé avec succès sur le backend.`, type: 'success' });
      return;
    } catch (err: any) {
      setBackendError(err.message || 'Impossible de créer le client sur le backend. Mode local activé.');
      const upd = [...clients, nc];
      db.saveClients(upd);
      setClients(upd);
      if (type === 'apprenant') {
        const apprenants = db.getApprenants();
        db.saveApprenants([
          ...apprenants,
          {
            id: 'ap_' + Date.now(),
            clientId: nc.id,
            studentName: nc.name,
            schoolName: schoolName || 'Non renseigné',
            schoolLevel: 'Non renseigné',
            schoolYear: new Date().getFullYear().toString(),
            guardian: { id: 'g_' + Date.now(), fullName: parentName, phone: parentContact, relationship: parentRelation },
            caution: { id: 'ca_' + Date.now(), fullName: cautionName, phone: cautionContact, profession: cautionProfession },
            documents: [
              { key: 'cni', label: 'Carte Nationale d’Identité', status: docCni ? 'fourni' : 'manquant' },
              { key: 'passeport', label: 'Passeport', status: docPassport ? 'fourni' : 'manquant' },
              { key: 'acte_naissance', label: 'Acte de naissance', status: docBirth ? 'fourni' : 'manquant' },
              { key: 'certificat_scolarite', label: 'Certificat de scolarité', status: docSchool ? 'fourni' : 'manquant' },
              ...(docOther ? [{ key: 'autre', label: docOtherText, status: 'fourni' as const }] : []),
            ],
            createdBy: currentUser.id,
            createdAt: nc.createdAt,
          },
        ]);
      }
      db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Création Client', `Client ${name} (${type}) créé, assigné à ${assignedCommercialId}`);
      setName(''); setType('simple'); setPhone(''); setAddress(''); setAssignedCommercialId(''); setSchoolName(''); setInitialDebt(0);
      setParentName(''); setParentContact(''); setParentRelation('Père'); setCautionName(''); setCautionContact(''); setCautionProfession('');
      setDocCni(false); setDocPassport(false); setDocBirth(false); setDocSchool(false); setDocOther(false); setDocOtherText('');
      setMsg({ text: `Client ${nc.name} créé en local (backend indisponible).`, type: 'success' });
    }
  };

  const openEdit = (c: Client) => {
    const request = requestAdminCode({
      requestedBy: currentUser,
      actionType: 'client_edit',
      targetId: c.id,
      targetLabel: `Client ${c.name}`,
      reason: 'Modification fiche client',
    });
    setEditClient(c);
    setEditName(c.name);
    setEditPhone(c.phone);
    setEditAddress(c.address);
    setEditCode('');
    setEditRequestId(request.id);
    setEditError('');
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editClient) return;

    const validation = validateAndConsumeAdminCode({
      code: editCode,
      actionType: 'client_edit',
      targetId: editClient.id,
      usedBy: currentUser,
    });
    if (!validation.ok) { setEditError(validation.message || 'Code invalide.'); return; }

    const before = `${editClient.name} | ${editClient.phone} | ${editClient.address}`;
    const after = `${editName} | ${editPhone} | ${editAddress}`;

    const upd = clients.map(c => c.id === editClient.id ? { ...c, name: editName, phone: editPhone, address: editAddress } : c);
    db.saveClients(upd);
    setClients(upd);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Modification Client', `Client ${editClient.id} modifié. Avant: ${before}. Après: ${after}. Code: ${editCode}`);
    setEditClient(null);
    setMsg({ text: 'Client modifié avec succès (traçabilité complète).', type: 'success' });
  };

  const openDelete = (c: Client) => {
    const request = requestAdminCode({
      requestedBy: currentUser,
      actionType: 'client_delete',
      targetId: c.id,
      targetLabel: `Client ${c.name}`,
      reason: 'Suppression fiche client',
    });
    setDeleteClient(c);
    setDeleteCode('');
    setDeleteRequestId(request.id);
    setDeleteError('');
  };

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deleteClient) return;

    const validation = validateAndConsumeAdminCode({
      code: deleteCode,
      actionType: 'client_delete',
      targetId: deleteClient.id,
      usedBy: currentUser,
    });
    if (!validation.ok) { setDeleteError(validation.message || 'Code invalide.'); return; }

    setIsDeleting(true);
    try {
      await api.deleteClient(deleteClient.id);
      const upd = clients.filter(c => c.id !== deleteClient.id);
      db.saveClients(upd);
      setClients(upd);
      db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Suppression Client', `Client ${deleteClient.name} (${deleteClient.id}) supprimé. Code: ${deleteCode}`);
      setDeleteClient(null);
      setMsg({ text: `Client ${deleteClient.name} supprimé avec succès (et toutes ses données).`, type: 'success' });
    } catch (err: any) {
      setDeleteError(err.message || 'Erreur lors de la suppression.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMigration = (e: React.FormEvent) => {
    e.preventDefault();
    if (!migrateClient || !newSchoolName || newDebtAmount <= 0) return;

    const upd = clients.map(c => {
      if (c.id !== migrateClient.id) return c;
      const debts = c.schoolDebts.map(d => d.active ? { ...d, active: false } : d);
      debts.push({ id: 'd_' + Date.now(), schoolName: newSchoolName, debtAmount: newDebtAmount, paidAmount: 0, active: true, createdAt: new Date().toISOString().split('T')[0] });
      return { ...c, schoolDebts: debts };
    });

    db.saveClients(upd);
    setClients(upd);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Changement Établissement', `Client ${migrateClient.name} transféré vers ${newSchoolName}. Ancienne dette maintenue.`);
    setMigrateClient(null); setNewSchoolName(''); setNewDebtAmount(0);
    setMsg({ text: 'Transfert d\'établissement enregistré.', type: 'success' });
  };

  // ── Handler: configurer / modifier la mise journalière ───────────────────
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
      fetchClients(); // rafraîchir pour afficher la nouvelle configuration
    } catch (err: any) {
      setMiseError(err.message || 'Erreur lors de la configuration.');
    } finally {
      setIsMiseLoading(false);
    }
  };

  // ── Handler: supprimer les clients d'une zone ─────────────────────────────
  const handleZoneDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zoneToDelete.trim()) return;
    setIsZoneDeleting(true);
    try {
      const result = await api.deleteClientsByZone(zoneToDelete.trim());
      setMsg({ text: result.message || `Clients de la zone "${zoneToDelete}" supprimés.`, type: 'success' });
      setShowZoneDelete(false);
      fetchClients();
    } catch (err: any) {
      setMsg({ text: err.message || 'Erreur lors de la suppression par zone.', type: 'error' });
      setShowZoneDelete(false);
    } finally {
      setIsZoneDeleting(false);
    }
  };

  const typeBadge = (t: ClientType) => {
    if (t === 'apprenant') return <span className="px-2 py-1 text-xs font-semibold rounded bg-purple-100 text-purple-700 flex items-center gap-1"><GraduationCap className="w-3 h-3" /> Apprenant</span>;
    if (t === 'non-apprenant' || (t as string) === 'non_apprenant') return <span className="px-2 py-1 text-xs font-semibold rounded bg-amber-100 text-amber-700 flex items-center gap-1"><Briefcase className="w-3 h-3" /> Non-apprenant</span>;
    return <span className="px-2 py-1 text-xs font-semibold rounded bg-teal-100 text-teal-700 flex items-center gap-1"><UserCheck className="w-3 h-3" /> Épargnant</span>;
  };

  const commName = (id: string) => commercials.find(u => u.id === id)?.name || id;

  const transactions = db.getTransactions();

  const getSavingsAccount = (clientId: string) => accounts.find(a => a.clientId === clientId && a.type === 'epargne' && a.status !== 'ferme');
  const getFinancingAccounts = (clientId: string) => accounts.filter(a => a.clientId === clientId && a.type === 'financement');

  const handleCreateSavingsAccount = () => {
    if (!savingClient) return;
    const existing = getSavingsAccount(savingClient.id);
    if (existing) {
      setMsg({ text: 'Ce client possède déjà un compte épargne.', type: 'error' });
      return;
    }

    const account: Account = {
      id: 'acc_' + Date.now(),
      clientId: savingClient.id,
      type: 'epargne',
      accountNumber: `EP-${new Date().getFullYear()}-${String(accounts.length + 1).padStart(4, '0')}`,
      label: `Compte épargne - ${savingClient.name}`,
      balance: savingClient.savingsBalance || 0,
      status: 'actif',
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [...accounts, account];
    db.saveAccounts(updated);
    setAccounts(updated);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Ouverture Compte Épargne', `Compte ${account.accountNumber} ouvert pour ${savingClient.name}.`);
    setSavingClient(null);
    setMsg({ text: 'Compte épargne ouvert avec succès.', type: 'success' });
  };

  const getFinanceCalculation = () => {
    if (!financeClient || financeAmount <= 0) return null;
    if (financeClient.type === 'apprenant') {
      const calc = calculerGrille(financeAmount);
      if (!calc) return null;
      return {
        dossierFee: calc.fraisDossier,
        insuranceFee: calc.fraisAssurance,
        prestationFee: calc.fraisPrestation,
        dailyContribution: calc.cotisationJournaliere,
        totalDue: calc.totalARembourser,
      };
    }

    const calc = calculerGrilleNonApprenant(financeAmount, financeDuration, financeApport);
    if (!calc) return null;
    return {
      dossierFee: calc.fraisDossier,
      insuranceFee: 0,
      prestationFee: calc.fraisPrestation,
      dailyContribution: calc.cotisationJournaliere,
      totalDue: calc.totalARembourser,
      apportPersonnel: calc.apportLibre,
      apportPourcentage: calc.apportPourcentage,
      montantFinance: calc.montantFinance,
    };
  };

  const handleCreateFinancing = () => {
    if (!financeClient) return;
    const calc = getFinanceCalculation();
    if (!calc) {
      setMsg({ text: 'Montant ou durée non couvert par la grille.', type: 'error' });
      return;
    }
    if (financeClient.type !== 'apprenant' && (financeApport < 0 || financeApport > financeAmount)) {
      setMsg({ text: 'L’apport personnel doit être compris entre 0 et la valeur du matériel.', type: 'error' });
      return;
    }

    const account: Account = {
      id: 'fin_' + Date.now(),
      clientId: financeClient.id,
      type: 'financement',
      accountNumber: `FI-${new Date().getFullYear()}-${String(accounts.length + 1).padStart(4, '0')}`,
      label: financeLabel || `Financement ${financeClient.name}`,
      balance: calc.totalDue,
      status: 'actif',
      principalAmount: financeAmount,
      notes: financeClient.type === 'apprenant' ? 'Paiement frais de scolarité: frais dossier et assurance obligatoires intégrés.' : `Aide achat matériel: apport client ${(calc as any).apportPersonnel || 0} F, financement entreprise ${(calc as any).montantFinance || 0} F. Assurance non applicable.`,
      dossierFee: calc.dossierFee,
      insuranceFee: calc.insuranceFee,
      prestationFee: calc.prestationFee,
      dailyContribution: calc.dailyContribution,
      totalDue: calc.totalDue,
      totalPaid: 0,
      residualBalance: 0,
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updatedAccounts = [...accounts, account];
    db.saveAccounts(updatedAccounts);
    setAccounts(updatedAccounts);
    if (financeClient.type === 'non-apprenant') {
      const nonAp = db.getNonApprenants().find(na => na.clientId === financeClient.id);
      if (nonAp) {
        const financement: FinancementNonApprenant = {
          id: 'fn_' + Date.now(),
          nonApprenantId: nonAp.id,
          bienFinance: financeLabel || 'Aide achat matériel',
          valeurBien: financeAmount,
          apportPersonnel: (calc as any).apportPersonnel || 0,
          apportPourcentage: (calc as any).apportPourcentage || 0,
          montantFinance: (calc as any).montantFinance || financeAmount,
          dureeChoisie: financeDuration,
          fraisDossier: calc.dossierFee,
          fraisPrestation: calc.fraisPrestation,
          cotisationJournaliere: calc.dailyContribution,
          totalARembourser: calc.totalDue,
          totalCotise: 0,
          totalBeneficeCases: 0,
          totalCases: 0,
          status: 'actif',
          createdAt: new Date().toISOString().split('T')[0],
        };
        db.saveFinancements([...db.getFinancements(), financement]);
      }
    }

    // Financement = dette négative. Le client doit rembourser ce montant.
    const updatedClients = clients.map(c => c.id === financeClient.id ? { ...c, financingBalance: c.financingBalance - calc.totalDue } : c);
    db.saveClients(updatedClients);
    setClients(updatedClients);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Création Financement', `Financement ${account.accountNumber} créé pour ${financeClient.name}: total dû ${calc.totalDue} F, cotisation/jour ${calc.dailyContribution} F.`);
    setFinanceClient(null);
    setFinanceAmount(0);
    setFinanceApport(0);
    setFinanceLabel('');
    setMsg({ text: 'Nouveau dossier de financement créé et tracé.', type: 'success' });
  };

  const [transferError, setTransferError] = useState('');

  const handleTransferSurplus = () => {
    if (!viewClient || !transferAccount) return;
    const savingsAccount = getSavingsAccount(viewClient.id);
    if (!savingsAccount) {
      setTransferError('Aucun compte épargne actif trouvé pour ce client.');
      return;
    }
    const available = transferAccount.residualBalance || 0;
    if (transferAmount <= 0) {
      setTransferError('Le montant à transférer doit être supérieur à 0.');
      return;
    }
    if (transferAmount > available) {
      setTransferError(`Le montant saisi (${transferAmount.toLocaleString()} F) dépasse le surplus disponible (${available.toLocaleString()} F).`);
      return;
    }

    const now = new Date().toISOString();
    const nowDisplay = now.replace('T', ' ').slice(0, 19);

    const updatedAccounts = accounts.map(a => {
      if (a.id === savingsAccount.id) {
        return {
          ...a,
          balance: a.balance + transferAmount,
        };
      }
      if (a.id === transferAccount.id) {
        return {
          ...a,
          residualBalance: Math.max(0, (a.residualBalance || 0) - transferAmount),
        };
      }
      return a;
    });
    db.saveAccounts(updatedAccounts);
    setAccounts(updatedAccounts);

    const updatedClients = clients.map(c =>
      c.id === viewClient.id
        ? { ...c, savingsBalance: c.savingsBalance + transferAmount }
        : c
    );
    db.saveClients(updatedClients);
    setClients(updatedClients);

    db.addLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'Transfert Surplus → Épargne',
      `${transferAmount.toLocaleString()} F transférés du compte financement ${transferAccount.accountNumber} vers le compte épargne ${savingsAccount.accountNumber} de ${viewClient.name}. Horodatage: ${nowDisplay}. Opérateur: ${currentUser.name}. Motif: ${transferReason}`,
      `Surplus remboursement: ${(transferAccount.residualBalance || 0).toLocaleString()} F`,
      `Après transfert: ${Math.max(0, (transferAccount.residualBalance || 0) - transferAmount).toLocaleString()} F`
    );

    setTransferAccount(null);
    setTransferAmount(0);
    setTransferError('');
    setTransferReason('Transfert surplus remboursement → Épargne');
    setMsg({ text: `✅ ${transferAmount.toLocaleString()} F transférés avec succès vers le compte épargne ${savingsAccount.accountNumber}.`, type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <h2 className="text-2xl font-bold text-slate-800">Gestion des Clients</h2>
        <div className="flex flex-wrap gap-2">
          {isAdmin && (
            <button 
              onClick={() => setShowImportDialog(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 shadow-lg shadow-indigo-100 transition-all hover:scale-105 active:scale-95"
            >
              <Upload className="h-4 w-4" /> Importation JSON
            </button>
          )}
          {isAdmin && (
            <button
              onClick={() => setShowZoneDelete(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 shadow-lg shadow-rose-100 transition-all hover:scale-105 active:scale-95"
            >
              <Trash2 className="h-4 w-4" /> Supprimer par zone
            </button>
          )}
          {isCashier && (
            <button 
              onClick={() => setShowEpargnantForm(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
            >
              <UserPlus className="h-4 w-4" /> Nouveau client épargnant
            </button>
          )}
          <span className="text-xs font-semibold text-slate-400 self-center ml-2">
            {currentUser.role === 'commercial' ? 'Visibilité restreinte' : isAdmin ? 'Pilotage Administrateur' : 'Accès complet — caissier'}
          </span>
        </div>
      </div>

      {showImportDialog && (
        <JSONImportDialog 
          onClose={() => setShowImportDialog(false)} 
          onImportSuccess={() => {
            fetchClients();
            setShowImportDialog(false);
          }} 
        />
      )}

      {showEpargnantForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2.5rem] bg-white p-8 shadow-2xl border border-slate-100 relative overflow-hidden">
            {/* Background Accent */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-indigo-50 opacity-50" />
            
            <div className="flex items-center justify-between mb-8 relative">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-indigo-600 p-3 text-white shadow-lg shadow-indigo-200">
                  <PiggyBank className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 tracking-tight">Inscription Épargnant</h3>
                  <p className="text-sm text-slate-500 font-medium">Ouverture de compte tontine & épargne</p>
                </div>
              </div>
              <button 
                onClick={() => setShowEpargnantForm(false)} 
                className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            <form className="space-y-5 relative" onSubmit={async (e) => {
              e.preventDefault();
              if (isEpargnantLoading) return;
              if (!assignedCommercialId) {
                alert('Veuillez sélectionner un commercial à assigner.');
                return;
              }
              setIsEpargnantLoading(true);
              try {
                const client = await api.createClient({
                  name: name || "Épargnant sans nom",
                  type: 'simple',
                  phone: phone || "0000",
                  address: address || "",
                  assignedCommercialId
                });
                setClients(prev => [client, ...prev]);
                setShowEpargnantForm(false);
                setMsg({ text: `Client épargnant ${client.name} créé avec succès.`, type: 'success' });
                // Reset fields
                setName(''); setPhone(''); setAddress(''); setAssignedCommercialId('');
              } catch (err: any) {
                alert(err.message || "Erreur lors de la création");
              } finally {
                setIsEpargnantLoading(false);
              }
            }}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="block space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Nom et Prénoms Complet *</span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <UserCheck className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      type="text" 
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium" 
                      placeholder="Ex: Idrissa Ouédraogo" 
                    />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Téléphone *</span>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <History className="h-4 w-4 text-slate-400" />
                    </div>
                    <input 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      type="tel" 
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 pl-11 pr-4 py-3.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium" 
                      placeholder="00229..." 
                    />
                  </div>
                </label>

                <label className="block space-y-1.5">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Commercial Affecté</span>
                  <select 
                    value={assignedCommercialId} 
                    onChange={e => setAssignedCommercialId(e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium appearance-none"
                  >
                    <option value="">— Mon propre compte —</option>
                    {commercials.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.zone || 'Global'})</option>
                    ))}
                  </select>
                </label>

                <label className="block space-y-1.5 md:col-span-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-widest ml-1">Adresse de résidence</span>
                  <input 
                    value={address} 
                    onChange={e => setAddress(e.target.value)} 
                    type="text" 
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3.5 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all text-sm font-medium" 
                    placeholder="Quartier, Ville, Points de repère..." 
                  />
                </label>
              </div>

              <div className="pt-6 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setShowEpargnantForm(false)} 
                  className="flex-1 rounded-2xl border border-slate-200 py-4 text-sm font-bold text-slate-600 hover:bg-slate-50 active:scale-95 transition-all"
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  disabled={isEpargnantLoading} 
                  className="flex-[1.5] rounded-2xl bg-indigo-600 py-4 text-sm font-bold text-white hover:bg-indigo-700 shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isEpargnantLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  {isEpargnantLoading ? 'Validation en cours...' : 'Générer la Fiche Client'}
                </button>
              </div>
              
              <div className="rounded-2xl bg-teal-50/50 border border-teal-100 p-4 flex items-start gap-3">
                <HandCoins className="h-5 w-5 text-teal-600 shrink-0" />
                <p className="text-[11px] leading-relaxed text-teal-800 font-medium">
                  <strong>Avantages Épargnant :</strong> Aucun frais d’adhésion, de dossier ou d'assurance. 
                  L'apport initial de tontine sera comptabilisé dès la première transaction.
                </p>
              </div>
            </form>
          </div>
        </div>
      )}

      {isLoadingClients && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 text-sm animate-pulse font-medium">
          <Loader2 className="h-4 w-4 animate-spin" />
          Synchronisation avec le serveur Neon en cours...
        </div>
      )}
      {backendError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 shadow-sm space-y-3">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-amber-100 p-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-amber-900">Information de connexion</p>
              <p className="text-xs text-amber-800 opacity-80">{backendError}</p>
            </div>
          </div>
          <div className="flex gap-2 pl-12">
            <button 
              onClick={() => fetchClients()}
              className="text-xs px-3 py-1.5 bg-amber-200 text-amber-900 rounded-lg hover:bg-amber-300 transition-colors font-bold"
            >
              Réessayer la connexion
            </button>
            <button 
              onClick={() => alert(`Client List Endpoint: ${api.baseURL}/api/clients\nErreur: ${backendError}`)}
              className="text-xs px-3 py-1.5 border border-amber-300 text-amber-900 rounded-lg hover:bg-amber-100 transition-colors font-medium"
            >
              Afficher les détails techniques
            </button>
          </div>
        </div>
      )}
      {msg.text && (
        <div className={`p-4 text-sm rounded-2xl border shadow-sm animate-in fade-in slide-in-from-top-2 ${msg.type === 'error' ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
          <div className="flex items-center gap-2">
            {msg.type === 'error' ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
            <span className="font-bold">{msg.type === 'error' ? 'Erreur : ' : 'Succès : '}</span> {msg.text}
          </div>
        </div>
      )}

      {/* Client table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
          <Search className="w-4 h-4 text-slate-400" />
          <input type="text" className="bg-transparent text-sm w-full focus:outline-none placeholder-slate-400" placeholder="Rechercher par nom ou téléphone..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Client</th>
                <th className="px-4 py-3 text-left font-semibold">Type</th>
                <th className="px-4 py-3 text-left font-semibold">Tél.</th>
                <th className="px-4 py-3 text-left font-semibold">Épargne</th>
                <th className="px-4 py-3 text-left font-semibold">Financement</th>
                <th className="px-4 py-3 text-left font-semibold">Scolarité</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredClients.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-slate-400">Aucun client trouvé.</td></tr>
              ) : filteredClients.map(c => {
                const schoolDebts = c.schoolDebts || [];
                const debt = schoolDebts.find(d => d.active);
                const savingsBalance = Number(c.savingsBalance || 0);
                const financingBalance = Number(c.financingBalance || 0);
                
                return (
                  <tr key={c.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-900">{c.name || 'Sans nom'}</p><p className="text-xs text-slate-400">Zone: {commName(c.assignedCommercialId)}</p></td>
                    <td className="px-4 py-3">{typeBadge(c.type)}</td>
                    <td className="px-4 py-3 text-slate-500">{c.phone || '—'}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-600">{savingsBalance.toLocaleString()} F</td>
                    <td className={`px-4 py-3 font-semibold ${financingBalance >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{financingBalance.toLocaleString()} F</td>
                    <td className="px-4 py-3">{debt ? <><p className="font-medium text-slate-800">{debt.schoolName}</p><p className="text-xs text-indigo-600">Reste: {(Number(debt.debtAmount || 0) - Number(debt.paidAmount || 0)).toLocaleString()} F</p></> : <span className="text-slate-400 text-xs">—</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1.5 flex-wrap">
                        <button onClick={() => setViewClient(c)} title="Consulter" className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200"><Eye className="w-3.5 h-3.5" /></button>
                        {isCashier && <button onClick={() => openEdit(c)} title="Modifier (code admin)" className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200"><Pencil className="w-3.5 h-3.5" /></button>}
                        {isAdmin && <button onClick={() => openDelete(c)} title="Supprimer (code admin)" className="p-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200"><Trash2 className="w-3.5 h-3.5" /></button>}
                        {isCashier && c.type === 'apprenant' && <button onClick={() => setMigrateClient(c)} title="Changer établissement" className="p-1.5 rounded-lg bg-slate-100 hover:bg-purple-50 text-slate-600 hover:text-purple-600 border border-slate-200"><ArrowRightLeft className="w-3.5 h-3.5" /></button>}
                        {(isCashier || isAdmin) && (c.type === 'simple' || (c.type as string) === 'simple') && (() => {
                          const epargneAcc = accounts.find(a => a.clientId === c.id && a.type === 'epargne' && a.status !== 'ferme');
                          const hasMise = epargneAcc && (epargneAcc.dailyContribution ?? 0) > 0;
                          return (
                            <button
                              onClick={() => { setMiseClient(c); setMiseAmount(epargneAcc?.dailyContribution ?? 0); setMiseError(''); }}
                              title={hasMise ? `Modifier la mise journalière (${epargneAcc?.dailyContribution?.toLocaleString()} F/j)` : 'Configurer la mise journalière (tontine)'}
                              className={`p-1.5 rounded-lg border text-xs font-semibold ${hasMise ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-emerald-300' : 'bg-teal-100 text-teal-700 hover:bg-teal-200 border-teal-300'}`}
                            >
                              <PiggyBank className="w-3.5 h-3.5" />
                            </button>
                          );
                        })()}
                        {schoolDebts.length > 0 && <button onClick={() => { const h = schoolDebts.map(d => `${d.schoolName}: ${d.paidAmount}/${d.debtAmount} F (${d.active ? 'Actif' : 'Ancien'})`).join('\n'); alert(`Historique Scolarité — ${c.name}\n\n${h}`); }} title="Historique dettes" className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200"><History className="w-3.5 h-3.5" /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal */}
      {editClient && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-amber-900 text-white">
              <h3 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Modification protégée — Code Admin requis</h3>
              <button onClick={() => setEditClient(null)} className="p-1 hover:bg-amber-800 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleEdit} className="p-5 space-y-4">
              {editError && <div className="p-3 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">{editError}</div>}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
                <strong>Sécurité :</strong> Demande envoyée à l’admin. Référence: <span className="font-mono">{editRequestId}</span>. Le code généré est valable 10 minutes et utilisable une seule fois.
              </div>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Nom</span><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={editName} onChange={(e) => setEditName(e.target.value)} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Téléphone</span><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Adresse</span><input type="text" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={editAddress} onChange={(e) => setEditAddress(e.target.value)} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Code Admin *</span><input type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 font-mono" value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase())} placeholder="ADM-ABC123" /></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setEditClient(null)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700">Valider la modification</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteClient && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-rose-900 text-white">
              <h3 className="font-semibold flex items-center gap-2"><Lock className="w-4 h-4" /> Suppression sécurisée — Code Admin requis</h3>
              <button onClick={() => setDeleteClient(null)} className="p-1 hover:bg-rose-800 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleDelete} className="p-5 space-y-4">
              {deleteError && <div className="p-3 text-sm rounded-xl bg-red-50 text-red-600 border border-red-200">{deleteError}</div>}
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <strong>⚠️ ATTENTION :</strong> Vous êtes sur le point de supprimer définitivement le client <strong>{deleteClient.name}</strong> et toutes ses données associées (comptes, transactions, dettes, etc.). Cette action est irréversible.
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700">
                <strong>Sécurité :</strong> Demande envoyée à l'admin. Référence: <span className="font-mono">{deleteRequestId}</span>. Le code généré est valable 10 minutes et utilisable une seule fois.
              </div>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Code Admin *</span><input type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 font-mono" value={deleteCode} onChange={(e) => setDeleteCode(e.target.value.toUpperCase())} placeholder="ADM-ABC123" /></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setDeleteClient(null)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={isDeleting} className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                  {isDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmer la suppression
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Migration Modal */}
      {migrateClient && (
        <div className="fixed inset-0 bg-slate-950/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-indigo-900 text-white">
              <h3 className="font-semibold flex items-center gap-2"><ArrowRightLeft className="w-4 h-4" /> Changement d'établissement</h3>
              <button onClick={() => setMigrateClient(null)} className="p-1 hover:bg-indigo-800 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleMigration} className="p-5 space-y-4">
              <p className="text-sm text-slate-600">Élève : <strong>{migrateClient.name}</strong></p>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800"><strong>Attention :</strong> L'ancienne dette sera conservée dans l'historique et restera due.</div>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Nouvel établissement *</span><input type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={newSchoolName} onChange={(e) => setNewSchoolName(e.target.value)} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Nouvelle scolarité *</span><input type="number" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={newDebtAmount || ''} onChange={(e) => setNewDebtAmount(Number(e.target.value))} /></label>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setMigrateClient(null)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">Annuler</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700">Confirmer le transfert</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── View Detail Modal ─────────────────────────────────────────────── */}
      {viewClient && (() => {
        const savingsAcc = getSavingsAccount(viewClient.id);
        const financeAccs = getFinancingAccounts(viewClient.id);
        const surplusAccounts = financeAccs.filter(a => (a.residualBalance || 0) > 0);
        const clientHasSurplus = viewClient.financingBalance > 0;
        const hasSurplus = savingsAcc && (surplusAccounts.length > 0 || clientHasSurplus);
        const totalSurplus = clientHasSurplus
          ? viewClient.financingBalance + surplusAccounts.reduce((s, a) => s + (a.residualBalance || 0), 0)
          : surplusAccounts.reduce((s, a) => s + (a.residualBalance || 0), 0);
        const clientTxs = transactions.filter(t => t.clientId === viewClient.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);

        return (
          <div className="fixed inset-0 bg-slate-950/60 flex items-start justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-3xl shadow-2xl max-w-3xl w-full my-8 overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-5 text-white flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Fiche client</p>
                  <h3 className="mt-1 text-2xl font-bold">{viewClient.name}</h3>
                  <p className="mt-0.5 text-sm text-slate-300 capitalize">{viewClient.type} · {commName(viewClient.assignedCommercialId)}</p>
                </div>
                <button onClick={() => setViewClient(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20 flex-shrink-0"><X className="w-5 h-5" /></button>
              </div>

              <div className="p-5 space-y-5">

                {/* KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-3">
                    <p className="text-xs text-emerald-700 font-medium">Solde Épargne</p>
                    <p className="mt-1 text-xl font-bold text-emerald-900">{Number(viewClient.savingsBalance || 0).toLocaleString()} F</p>
                    {savingsAcc && <p className="text-[10px] text-emerald-600 mt-0.5">{savingsAcc.accountNumber}</p>}
                  </div>
                  <div className={`rounded-2xl border p-3 ${Number(viewClient.financingBalance || 0) >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-rose-50 border-rose-200'}`}>
                    <p className={`text-xs font-medium ${Number(viewClient.financingBalance || 0) >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {Number(viewClient.financingBalance || 0) < 0 ? 'Dette financement' : 'Surplus financement'}
                    </p>
                    <p className={`mt-1 text-xl font-bold ${Number(viewClient.financingBalance || 0) >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
                      {Number(viewClient.financingBalance || 0).toLocaleString()} F
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">{financeAccs.length} dossier(s) · {Number(viewClient.financingBalance || 0) < 0 ? 'Remboursement en cours' : Number(viewClient.financingBalance || 0) > 0 ? 'Transférable vers épargne' : 'Soldé'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500 font-medium">Téléphone</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{viewClient.phone}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500 font-medium">Inscrit le</p>
                    <p className="mt-1 text-lg font-bold text-slate-900">{viewClient.createdAt}</p>
                  </div>
                </div>

                {/* Actions section */}
                <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                    <h4 className="text-sm font-bold text-slate-800">{currentUser.role === 'commercial' ? 'Aperçu rapide' : 'Actions sur le compte'}</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {currentUser.role === 'commercial' ? (
                      <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                        Les actions sur les comptes (création, financement, transfert, fiche WF) sont gérées exclusivement par le caissier ou l'administrateur. Vous pouvez uniquement consulter la situation et collecter les cotisations sur le terrain.
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {!savingsAcc ? (
                          <button onClick={() => setSavingClient(viewClient)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200">
                            <PiggyBank className="h-4 w-4" /> Ouvrir un compte épargne
                          </button>
                        ) : (
                          <button
                            disabled
                            title="Ce client possède déjà un compte épargne actif"
                            className="inline-flex items-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400 cursor-not-allowed opacity-60"
                          >
                            <PiggyBank className="h-4 w-4" /> Épargne active — {savingsAcc.accountNumber}
                          </button>
                        )}
                        <button onClick={() => { setFinanceClient(viewClient); setFinanceAmount(0); setFinanceApport(0); setFinanceLabel(''); }} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 shadow-sm shadow-indigo-200">
                          <HandCoins className="h-4 w-4" /> {viewClient.type === 'apprenant' ? 'Financer la scolarité' : viewClient.type === 'non-apprenant' ? 'Aide achat matériel' : 'Lancer un financement'}
                        </button>
                        {hasSurplus && (
                          <button
                            onClick={() => {
                              setTransferAccount(surplusAccounts[0]);
                              setTransferAmount(0);
                              setTransferError('');
                              setTransferReason('Transfert surplus remboursement → Épargne');
                            }}
                            className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-amber-600 shadow-sm shadow-amber-200"
                          >
                            <ArrowRight className="h-4 w-4" /> Transférer vers épargne
                            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{totalSurplus.toLocaleString()} F dispo.</span>
                          </button>
                        )}
                        <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-900 shadow-sm">
                          <Printer className="h-4 w-4" /> Télécharger fiche WF
                        </button>
                      </div>
                    )}

                    {/* Financing accounts detail */}
                    {financeAccs.length > 0 && (
                      <div className="grid gap-2 mt-2">
                        {financeAccs.map(acc => {
                          const pct = acc.totalDue ? Math.min(100, Math.round(((acc.totalPaid || 0) / acc.totalDue) * 100)) : 0;
                          const surplus = acc.residualBalance || 0;
                          return (
                            <div key={acc.id} className={`rounded-xl p-3 border ${surplus > 0 ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-slate-50'}`}>
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold text-slate-900 text-sm truncate">{acc.label || acc.accountNumber}</p>
                                  <p className="text-xs text-slate-500 mt-0.5">Cotis./jour: <strong>{(acc.dailyContribution || 0).toLocaleString()} F</strong> · Dû: {(acc.totalDue || 0).toLocaleString()} F · Payé: {(acc.totalPaid || 0).toLocaleString()} F</p>
                                </div>
                                <span className={`flex-shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${acc.status === 'solde' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                                  {acc.status === 'solde' ? '✓ Soldé' : 'Actif'}
                                </span>
                              </div>
                              <div className="mt-2">
                                <div className="flex justify-between text-xs text-slate-500 mb-1">
                                  <span>Progression</span><span>{pct}%</span>
                                </div>
                                <div className="h-1.5 rounded-full bg-slate-200">
                                  <div className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-emerald-500' : 'bg-indigo-500'}`} style={{ width: `${pct}%` }} />
                                </div>
                              </div>
                              {surplus > 0 && (
                                <div className="mt-2 flex items-center justify-between rounded-lg bg-amber-100 border border-amber-300 px-3 py-2">
                                  <div>
                                    <p className="text-xs font-bold text-amber-800">💰 Surplus transférable</p>
                                    <p className="text-xs text-amber-700">Ce montant peut être transféré vers le compte épargne du client</p>
                                  </div>
                                  <span className="font-bold text-amber-900 text-sm ml-3">{surplus.toLocaleString()} F</span>
                                </div>
                              )}
                              {acc.notes && <p className="mt-1 text-[10px] text-slate-400">{acc.notes}</p>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* School debts */}
                {viewClient.schoolDebts.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 overflow-hidden">
                    <div className="bg-slate-50 px-4 py-3 border-b border-slate-200">
                      <h4 className="text-sm font-bold text-slate-800">Scolarité & dettes</h4>
                    </div>
                    <div className="p-3 space-y-2">
                      {viewClient.schoolDebts.map(d => (
                        <div key={d.id} className={`rounded-xl p-3 text-sm border ${d.active ? 'border-indigo-200 bg-indigo-50' : 'border-slate-100 bg-slate-50'}`}>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-slate-900">{d.schoolName}</span>
                            <span className={`text-xs font-semibold ${d.active ? 'text-indigo-600' : 'text-slate-400'}`}>{d.active ? 'ACTIF' : 'ANCIEN'}</span>
                          </div>
                          <div className="mt-1.5">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                              <span>Payé: {d.paidAmount.toLocaleString()} / {d.debtAmount.toLocaleString()} F</span>
                              <span>{Math.min(100, Math.round((d.paidAmount / d.debtAmount) * 100))}%</span>
                            </div>
                            <div className="h-1.5 rounded-full bg-slate-200">
                              <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${Math.min(100, (d.paidAmount / d.debtAmount) * 100)}%` }} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Transaction history */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden no-print">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">Historique des transactions</h4>
                    <span className="text-xs text-slate-400">{clientTxs.length} entrée(s)</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-60 overflow-y-auto">
                    {clientTxs.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">Aucune transaction.</p>
                    ) : clientTxs.map(t => (
                      <div key={t.id} className="flex items-center justify-between px-4 py-3 text-sm hover:bg-slate-50/60">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.type === 'retrait' ? 'bg-rose-100 text-rose-700' : t.type === 'depot' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>{t.type}</span>
                          {t.isModified && <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">MODIFIÉ</span>}
                          {t.notes && <span className="text-xs text-slate-400 truncate max-w-28">{t.notes}</span>}
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold ${t.type === 'retrait' ? 'text-rose-700' : 'text-emerald-700'}`}>{t.type === 'retrait' ? '-' : '+'}{t.amount.toLocaleString()} F</p>
                          <p className="text-xs text-slate-400">{t.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Directive 15 — Print Only Sheets */}
                <div className="hidden print-only p-8">
                  <div className="text-center border-b-2 border-slate-900 pb-4 mb-6">
                     <h1 className="text-2xl font-black uppercase">WAOOO FELICITATIONS</h1>
                     <p className="text-sm font-bold">Projet d'accompagnement des parents et apprenants</p>
                     <p className="text-xs mt-1">Tél : (00228) 71 67 83 22 — Email : contact@waooo.com</p>
                     <p className="text-[10px]">N° RCCM : TG-LOM 2024 B 1234 — NIF : 1001234567</p>
                  </div>

                  {viewClient.type === 'apprenant' ? (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold border-b pb-1">FICHE DÉTAIL WF (Apprenant)</h2>
                        <span className="font-mono text-sm">{viewClient.membershipCode}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <p><strong>Nom et Prénoms :</strong> {viewClient.name}</p>
                        <p><strong>Code Adhésion :</strong> {viewClient.membershipCode}</p>
                        <p><strong>Contact :</strong> {viewClient.phone}</p>
                        <p><strong>Sexe :</strong> —</p>
                        <p><strong>Fonction :</strong> Apprenant</p>
                        <p><strong>Date d'Adhésion :</strong> {viewClient.createdAt}</p>
                      </div>
                      <table className="w-full border-collapse border border-slate-900 text-[10px]">
                        <thead>
                          <tr className="bg-slate-100">
                             <th className="border border-slate-900 p-1">N°</th>
                             <th className="border border-slate-900 p-1">Date</th>
                             <th className="border border-slate-900 p-1">Capital (Valeur)</th>
                             <th className="border border-slate-900 p-1">Capital (Paiement)</th>
                             <th className="border border-slate-900 p-1">Capital (Solde)</th>
                             <th className="border border-slate-900 p-1">Prestation (Total)</th>
                             <th className="border border-slate-900 p-1">Prestation (Payé)</th>
                             <th className="border border-slate-900 p-1">Prestation (Solde)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 15 }).map((_, i) => (
                             <tr key={i} className="h-6">
                               <td className="border border-slate-900 p-1 text-center">{i+1}</td>
                               <td className="border border-slate-900 p-1"></td>
                               <td className="border border-slate-900 p-1"></td>
                               <td className="border border-slate-900 p-1"></td>
                               <td className="border border-slate-900 p-1"></td>
                               <td className="border border-slate-900 p-1"></td>
                               <td className="border border-slate-900 p-1"></td>
                               <td className="border border-slate-900 p-1"></td>
                             </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div className="flex justify-between items-center">
                        <h2 className="text-xl font-bold border-b pb-1">FICHE D'OPÉRATION DES PARENTS</h2>
                        <span className="font-mono text-sm">{viewClient.membershipCode}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
                        <p><strong>Nom et Prénoms :</strong> {viewClient.name}</p>
                        <p><strong>Code Adhésion :</strong> {viewClient.membershipCode}</p>
                        <p><strong>Contact :</strong> {viewClient.phone}</p>
                        <p><strong>Sexe :</strong> —</p>
                        <p><strong>Fonction :</strong> Parent / Adhérent</p>
                        <p><strong>Date d'Adhésion :</strong> {viewClient.createdAt}</p>
                      </div>
                      <table className="w-full border-collapse border border-slate-900 text-xs">
                        <thead>
                          <tr className="bg-slate-100">
                             <th className="border border-slate-900 p-2">Date</th>
                             <th className="border border-slate-900 p-2">Libellé</th>
                             <th className="border border-slate-900 p-2">Entrée</th>
                             <th className="border border-slate-900 p-2">Sortie</th>
                             <th className="border border-slate-900 p-2">Solde</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 15 }).map((_, i) => (
                             <tr key={i} className="h-8">
                               <td className="border border-slate-900 p-2"></td>
                               <td className="border border-slate-900 p-2"></td>
                               <td className="border border-slate-900 p-2"></td>
                               <td className="border border-slate-900 p-2"></td>
                               <td className="border border-slate-900 p-2"></td>
                             </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <div className="mt-12 flex justify-between text-xs font-bold px-4">
                     <p className="border-t border-slate-900 pt-1 px-8">Signature Client</p>
                     <p className="border-t border-slate-900 pt-1 px-8">Le Caissier</p>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Savings Account Modal ──────────────────────────────────────────── */}
      {savingClient && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-700 to-emerald-600 p-4 text-white flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><PiggyBank className="w-4 h-4" /> Ouvrir un compte épargne</h3>
              <button onClick={() => setSavingClient(null)} className="p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-sm text-slate-600">Ouvrir un compte épargne officiel pour <strong>{savingClient.name}</strong>.</p>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-slate-600">Client</span><strong>{savingClient.name}</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Solde initial</span><strong className="text-emerald-700">{savingClient.savingsBalance.toLocaleString()} F</strong></div>
                <div className="flex justify-between"><span className="text-slate-600">Type</span><strong>Épargne (actif)</strong></div>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setSavingClient(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
                <button onClick={handleCreateSavingsAccount} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">Créer le compte</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Financing Modal ────────────────────────────────────────────────── */}
      {financeClient && (() => {
        const calc = getFinanceCalculation();
        return (
          <div className="fixed inset-0 bg-slate-950/60 flex items-start justify-center p-4 z-[60] overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full my-8 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-900 to-indigo-800 p-4 text-white flex items-center justify-between">
                <h3 className="font-bold flex items-center gap-2"><HandCoins className="w-4 h-4" /> Nouveau dossier de financement</h3>
                <button onClick={() => setFinanceClient(null)} className="p-1 hover:bg-white/10 rounded-full"><X className="w-4 h-4" /></button>
              </div>
              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm">
                  <div>
                    <p className="font-bold text-slate-900">{financeClient.name}</p>
                    <p className="text-xs text-slate-500 capitalize mt-0.5">Profil : {financeClient.type}</p>
                  </div>
                </div>
                <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">{financeClient.type === 'apprenant' ? 'Établissement / objet scolarité' : 'Matériel à acheter'}</span><input value={financeLabel} onChange={e => setFinanceLabel(e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" placeholder={financeClient.type === 'apprenant' ? 'Frais scolarité - Lycée / classe' : 'Machine à coudre, congélateur, équipement...'} /></label>
                <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">{financeClient.type === 'apprenant' ? 'Montant des frais de scolarité *' : 'Valeur totale du matériel *'}</span><input type="number" value={financeAmount || ''} onChange={e => setFinanceAmount(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" placeholder="Ex: 100000" /></label>
                {financeClient.type !== 'apprenant' && (
                  <>
                    <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Apport personnel libre du client</span><input type="number" value={financeApport || ''} onChange={e => setFinanceApport(Number(e.target.value))} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" placeholder="Le client apporte ce qu'il a" /></label>
                    <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Durée de remboursement</span>
                      <select value={financeDuration} onChange={e => setFinanceDuration(e.target.value as DureeFinancement)} className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500">
                        <option value="4_mois">≤ 4 mois</option><option value="6_mois">≤ 6 mois</option><option value="8_mois">≤ 8 mois</option><option value="10_mois">≤ 10 mois</option>
                      </select>
                    </label>
                  </>
                )}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-600 uppercase tracking-wide">Calcul automatique selon grille</p>
                  </div>
                  <div className="p-3 space-y-2 text-sm">
                    <div className="flex justify-between text-slate-700"><span>Frais dossier</span><strong>{(calc?.dossierFee || 0).toLocaleString()} F {financeClient.type === 'apprenant' && financeClient.type ? '✅' : '✅'}</strong></div>
                    <div className="flex justify-between text-slate-700"><span>Frais assurance</span><strong>{financeClient.type === 'apprenant' ? `${(calc?.insuranceFee || 0).toLocaleString()} F ✅` : '— Non applicable'}</strong></div>
                    {financeClient.type !== 'apprenant' && <div className="flex justify-between text-slate-700"><span>Apport client</span><strong>{((calc as any)?.apportPersonnel || 0).toLocaleString()} F ({(calc as any)?.apportPourcentage || 0}%)</strong></div>}
                    {financeClient.type !== 'apprenant' && <div className="flex justify-between text-slate-700"><span>Financement entreprise</span><strong>{((calc as any)?.montantFinance || 0).toLocaleString()} F</strong></div>}
                    <div className="flex justify-between text-slate-700"><span>Frais prestation (bénéfice)</span><strong className="text-rose-700">{(calc?.prestationFee || 0).toLocaleString()} F</strong></div>
                    <div className="flex justify-between text-slate-700 text-base"><span className="font-medium">Cotisation journalière</span><strong className="text-emerald-700 text-lg">{(calc?.dailyContribution || 0).toLocaleString()} F / jour</strong></div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 font-bold text-slate-900"><span>Total à rembourser</span><span>{(calc?.totalDue || 0).toLocaleString()} F</span></div>
                  </div>
                </div>
                <div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">
                  {financeClient.type === 'apprenant' ? '⚠️ Financement apprenant = paiement des frais de scolarité dans son établissement/classe. Frais dossier + assurance obligatoires intégrés automatiquement.' : '⚠️ Financement non-apprenant = aide à l’achat de matériel. L’apport est libre; l’entreprise finance le reste. Assurance non applicable.'}
                </div>
                <div className="flex justify-end gap-2">
                  <button onClick={() => setFinanceClient(null)} className="px-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50">Annuler</button>
                  <button onClick={handleCreateFinancing} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700">Créer le dossier</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Transfer Surplus Modal — DIRECTIVE 9 ──────────────────────────── */}
      {transferAccount && viewClient && (() => {
        const savingsAcc = getSavingsAccount(viewClient.id);
        const available = transferAccount.residualBalance || 0;
        const afterTransfer = Math.max(0, available - transferAmount);
        const afterSavings = viewClient.savingsBalance + transferAmount;
        return (
          <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden">

              {/* Header */}
              <div className="bg-gradient-to-r from-amber-600 to-amber-500 p-5 text-white">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                      <ArrowRight className="h-3.5 w-3.5" /> Directive 9 — Transfert surplus
                    </div>
                    <h3 className="mt-2 text-xl font-bold">Transférer vers compte épargne</h3>
                    <p className="mt-1 text-sm text-amber-100">Le surplus du remboursement est crédité uniquement sur l'épargne. Aucun autre compte n'est autorisé.</p>
                  </div>
                  <button onClick={() => { setTransferAccount(null); setTransferError(''); }} className="rounded-full bg-white/10 p-2 hover:bg-white/20 flex-shrink-0"><X className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="p-5 space-y-4">

                {transferError && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-700">
                    ⚠️ {transferError}
                  </div>
                )}

                {/* Accounts summary */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4">
                    <p className="text-xs text-amber-700 font-medium">Compte source (remboursement)</p>
                    <p className="mt-1 text-lg font-bold text-amber-900">{available.toLocaleString()} F</p>
                    <p className="text-[10px] text-amber-600 mt-0.5">{transferAccount.accountNumber}</p>
                    <p className="text-[10px] text-amber-600">{transferAccount.label}</p>
                  </div>
                  <div className={`rounded-2xl border p-4 ${savingsAcc ? 'bg-emerald-50 border-emerald-200' : 'bg-slate-50 border-slate-200'}`}>
                    <p className={`text-xs font-medium ${savingsAcc ? 'text-emerald-700' : 'text-slate-500'}`}>Compte destination (épargne)</p>
                    <p className={`mt-1 text-lg font-bold ${savingsAcc ? 'text-emerald-900' : 'text-slate-400'}`}>
                      {savingsAcc ? `${viewClient.savingsBalance.toLocaleString()} F` : 'Aucun compte'}
                    </p>
                    {savingsAcc && <p className="text-[10px] text-emerald-600 mt-0.5">{savingsAcc.accountNumber}</p>}
                  </div>
                </div>

                {/* Montant input */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Montant à transférer (FCFA) *</label>
                  <input
                    type="number"
                    min={1}
                    max={available}
                    value={transferAmount || ''}
                    onChange={e => { setTransferAmount(Number(e.target.value)); setTransferError(''); }}
                    className="w-full px-4 py-3 border border-amber-300 rounded-xl text-lg font-semibold outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200"
                    placeholder={`Max: ${available.toLocaleString()} F`}
                  />
                  <div className="flex justify-between mt-1 text-xs text-slate-500">
                    <span>Disponible: <strong>{available.toLocaleString()} F</strong></span>
                    {transferAmount > 0 && <span>Après transfert: <strong>{afterTransfer.toLocaleString()} F</strong> sur remboursement</span>}
                  </div>
                </div>

                {/* Motif */}
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Motif</label>
                  <input
                    value={transferReason}
                    onChange={e => setTransferReason(e.target.value)}
                    className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500"
                  />
                </div>

                {/* Preview après transfert */}
                {transferAmount > 0 && transferAmount <= available && (
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 text-sm">
                    <p className="font-bold text-emerald-900 mb-2">✅ Aperçu après confirmation</p>
                    <div className="space-y-1 text-emerald-800">
                      <div className="flex justify-between"><span>Compte épargne ({savingsAcc?.accountNumber})</span><strong>{afterSavings.toLocaleString()} F (+{transferAmount.toLocaleString()} F)</strong></div>
                      <div className="flex justify-between"><span>Surplus remboursement</span><strong>{afterTransfer.toLocaleString()} F (-{transferAmount.toLocaleString()} F)</strong></div>
                    </div>
                  </div>
                )}

                {/* Règle rappel */}
                <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-xs text-slate-600">
                  ⚠️ Ce transfert est tracé dans l'historique avec horodatage et identité de l'opérateur. Le client peut ensuite retirer ce montant via son compte épargne selon la procédure habituelle de retrait en agence.
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  <button onClick={() => { setTransferAccount(null); setTransferError(''); }} className="px-5 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-50">Annuler</button>
                  <button
                    onClick={handleTransferSurplus}
                    disabled={!savingsAcc || transferAmount <= 0 || transferAmount > available}
                    className="px-5 py-2.5 bg-amber-600 text-white rounded-xl text-sm font-bold hover:bg-amber-700 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirmer le transfert
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Modal : Mise journalière (tontine épargnants simples) ─────────── */}
      {miseClient && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-teal-700 text-white">
              <h3 className="font-semibold flex items-center gap-2">
                <PiggyBank className="w-4 h-4" />
                {accounts.find(a => a.clientId === miseClient.id && a.type === 'epargne' && a.status !== 'ferme' && (a.dailyContribution ?? 0) > 0)
                  ? 'Modifier la mise journalière'
                  : 'Configurer la mise journalière'}
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
                <span className="text-xs font-semibold text-slate-500">Montant journalier (F CFA) *</span>
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

      {/* ── Modal : Supprimer clients par zone ───────────────────────────── */}
      {showZoneDelete && (
        <div className="fixed inset-0 bg-slate-950/60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-rose-800 text-white">
              <h3 className="font-semibold flex items-center gap-2"><Trash2 className="w-4 h-4" /> Suppression par zone</h3>
              <button onClick={() => setShowZoneDelete(false)} className="p-1 hover:bg-rose-700 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <form onSubmit={handleZoneDelete} className="p-5 space-y-4">
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800">
                <strong>⚠️ ATTENTION :</strong> Cette action supprimera définitivement tous les clients et leurs données (comptes, transactions, dettes) dont le commercial assigné appartient à la zone indiquée. Action irréversible.
              </div>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-slate-500">Nom de la zone *</span>
                <input
                  type="text"
                  required
                  value={zoneToDelete}
                  onChange={e => setZoneToDelete(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500"
                  placeholder="Ex : caissier 1"
                />
              </label>
              <p className="text-xs text-slate-500">Seront supprimés : tous les clients assignés à des commerciaux dont la zone correspond exactement à ce nom (insensible à la casse).</p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowZoneDelete(false)} className="px-4 py-2 border border-slate-200 text-slate-600 text-sm rounded-xl hover:bg-slate-50">Annuler</button>
                <button type="submit" disabled={isZoneDeleting} className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2">
                  {isZoneDeleting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Supprimer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
