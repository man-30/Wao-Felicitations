import { useEffect, useState, FormEvent, useMemo } from 'react';
import api from '../config/api';
import { db } from '../localStorageDB';
import { EmployeePayment, Transaction, User, UserRole } from '../types';
import {
  Award, Briefcase, CheckCircle2, ClipboardCopy, Eye,
  Pencil, Plus, ShieldCheck, ToggleLeft, ToggleRight, UserCheck, X,
} from 'lucide-react';

interface Props { currentUser: User; }
const fmt = (v: number) => new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F';

export default function AdminUsers({ currentUser }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const u = await api.getUsers();
        setUsers(u);
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);
  const [payments, setPayments] = useState<EmployeePayment[]>(db.getEmployeePayments());
  const [transactions] = useState<Transaction[]>(db.getTransactions());
  const [clients] = useState(db.getClients());

  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState<User | null>(null);
  const [showCode, setShowCode] = useState<{ user: User; code: string } | null>(null);
  const [showDetail, setShowDetail] = useState<User | null>(null);

  // Create form
  const [createName, setCreateName] = useState('');
  const [createRole, setCreateRole] = useState<Exclude<UserRole, 'admin'>>('caissier');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createZone, setCreateZone] = useState('');

  // Edit form
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editZone, setEditZone] = useState('');

  const [feedback, setFeedback] = useState('');

  const filtered = users.filter(u =>
    u.name.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.role.toLowerCase().includes(search.toLowerCase())
  );

  const performance = useMemo(() => {
    const result: Record<string, { clients: number; collected: number; missed: number }> = {};
    users.filter(u => u.role === 'commercial').forEach(c => {
      const myClients = clients.filter(cl => cl.assignedCommercialId === c.id);
      const myTx = transactions.filter(t => t.collectedBy === c.id && t.status === 'approved');
      const collected = myTx.reduce((s, t) => s + t.amount, 0);
      result[c.id] = { clients: myClients.length, collected, missed: 0 };
    });
    return result;
  }, [users, clients, transactions]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!createName || !createEmail || !createPassword) {
      setFeedback('Nom, email et mot de passe obligatoires.'); return;
    }
    if (users.some(u => u.email === createEmail)) {
      setFeedback('Cet email existe déjà.'); return;
    }
    
    try {
      const newUser = await api.createUser({
        name: createName,
        email: createEmail,
        password: createPassword,
        role: createRole,
        zone: createZone || undefined
      });
      
      const updated = [...users, newUser];
      setUsers(updated);
      db.saveUsers(updated);
      
      db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Création Employé', `${createRole} ${createName} créé`);
      setShowCreate(false); setCreateName(''); setCreateEmail(''); setCreatePassword(''); setCreateZone('');
      setFeedback(`✓ Employé ${createName} créé.`);
    } catch (err: any) {
      setFeedback('Erreur : ' + (err.message || 'Impossible de créer l\'utilisateur'));
    }
  };

  const handleEdit = (e: FormEvent) => {
    e.preventDefault();
    if (!showEdit) return;
    const updated = users.map(u => u.id === showEdit.id ? { ...u, name: editName, email: editEmail, zone: editZone } : u);
    db.saveUsers(updated); setUsers(updated);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Modification Employé', `Employé ${showEdit.id} modifié`);
    setShowEdit(null);
    setFeedback('✓ Employé modifié.');
  };

  const toggleActive = (user: User) => {
    const updated = users.map(u => u.id === user.id ? { ...u, isActive: u.isActive === false ? true : false } : u);
    db.saveUsers(updated); setUsers(updated);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Activation Compte', `${user.name} ${user.isActive === false ? 'réactivé' : 'désactivé'}`);
    setFeedback(`✓ ${user.name} ${user.isActive === false ? 'réactivé' : 'désactivé'}.`);
  };

  const generateCode = (user: User) => {
    const code = `EDIT-${user.id.toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;
    setShowCode({ user, code });
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Code Édition', `Code généré pour ${user.name}: ${code}`);
  };

  const employeePayments = (id: string) => payments.filter(p => p.employeeId === id);

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-100">
              <Briefcase className="h-3.5 w-3.5" /> Gestion RH
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Personnel & Performances</h1>
            <p className="mt-1 text-sm text-slate-300">Gérez les employés, suivez leurs performances et générez les codes d'édition.</p>
          </div>
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-2xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-600 shadow-lg">
            <Plus className="h-4 w-4" /> Nouvel employé
          </button>
        </div>
      </div>

      {feedback && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800 flex items-center justify-between">
          <span>{feedback}</span>
          <button onClick={() => setFeedback('')}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <input type="text" placeholder="Rechercher employé, email, rôle..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-emerald-500" />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Employé</th>
                <th className="px-4 py-3 text-left font-semibold">Rôle</th>
                <th className="px-4 py-3 text-left font-semibold">Zone</th>
                <th className="px-4 py-3 text-left font-semibold">Performances</th>
                <th className="px-4 py-3 text-left font-semibold">Paiements</th>
                <th className="px-4 py-3 text-left font-semibold">Statut</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map(user => {
                const perf = performance[user.id];
                const empPays = employeePayments(user.id);
                return (
                  <tr key={user.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3">
                      <p className="font-bold text-slate-900">{user.name}</p>
                      <p className="text-xs text-slate-500">{user.email}</p>
                    </td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${user.role === 'admin' ? 'bg-rose-50 text-rose-700' : user.role === 'caissier' ? 'bg-blue-50 text-blue-700' : 'bg-emerald-50 text-emerald-700'}`}>{user.role}</span></td>
                    <td className="px-4 py-3 text-slate-600">{user.zone || '—'}</td>
                    <td className="px-4 py-3 text-xs">
                      {user.role === 'commercial' && perf ? (
                        <div className="space-y-0.5">
                          <p className="text-slate-700">{perf.clients} client(s)</p>
                          <p className="font-bold text-emerald-700">{fmt(perf.collected)} collectés</p>
                        </div>
                      ) : <span className="text-slate-400">N/A</span>}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {empPays.length > 0 ? (
                        <span className="font-semibold text-amber-700">{empPays.length} positionné(s)</span>
                      ) : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => toggleActive(user)} className="flex items-center gap-1.5 text-xs font-semibold">
                        {user.isActive === false
                          ? <><ToggleLeft className="h-5 w-5 text-rose-500" /> <span className="text-rose-700">Inactif</span></>
                          : <><ToggleRight className="h-5 w-5 text-emerald-500" /> <span className="text-emerald-700">Actif</span></>
                        }
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1.5">
                        <button
                          onClick={() => setShowDetail(user)}
                          title="Voir détails"
                          className="p-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => { setShowEdit(user); setEditName(user.name); setEditEmail(user.email); setEditZone(user.zone || ''); }} title="Modifier"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-amber-50 text-slate-600 hover:text-amber-600 border border-slate-200">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => generateCode(user)} title="Générer code édition"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 border border-slate-200">
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance commerciaux */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="bg-slate-50 px-5 py-3 border-b border-slate-200 flex items-center gap-2">
          <Award className="h-4 w-4 text-emerald-600" />
          <h3 className="text-sm font-bold text-slate-800">Performances commerciales</h3>
        </div>
        <div className="p-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {users.filter(u => u.role === 'commercial').map(c => {
            const perf = performance[c.id];
            return (
              <div key={c.id} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                <p className="font-bold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.zone}</p>
                <div className="mt-3 space-y-1 text-sm">
                  <div className="flex justify-between"><span className="text-slate-600">Clients suivis</span><strong>{perf?.clients || 0}</strong></div>
                  <div className="flex justify-between"><span className="text-slate-600">Collectes</span><strong className="text-emerald-700">{fmt(perf?.collected || 0)}</strong></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal Création */}
      {showCreate && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg modal-container">
            <div className="bg-emerald-700 p-4 text-white flex items-center justify-between modal-footer">
              <h3 className="font-bold flex items-center gap-2"><UserCheck className="h-4 w-4" /> Nouvel employé</h3>
              <button onClick={() => setShowCreate(false)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleCreate} className="p-5 space-y-3 modal-content">
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Nom complet *</span><input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500" value={createName} onChange={e => setCreateName(e.target.value)} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Email *</span><input type="email" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500" value={createEmail} onChange={e => setCreateEmail(e.target.value)} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Mot de passe *</span><input type="password" className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500" value={createPassword} onChange={e => setCreatePassword(e.target.value)} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Rôle *</span>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500" value={createRole} onChange={e => setCreateRole(e.target.value as 'caissier' | 'commercial')}>
                  <option value="caissier">Caissier</option>
                  <option value="commercial">Commercial</option>
                </select>
              </label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Zone / Agence</span><input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500" value={createZone} onChange={e => setCreateZone(e.target.value)} placeholder="Zone Centre, Agence Nord..." /></label>
              <button type="submit" className="w-full py-2.5 bg-emerald-600 text-white rounded-xl font-semibold text-sm">Créer l'employé</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Edit */}
      {showEdit && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg modal-container">
            <div className="bg-amber-700 p-4 text-white flex items-center justify-between modal-footer">
              <h3 className="font-bold flex items-center gap-2"><Pencil className="h-4 w-4" /> Modifier {showEdit.name}</h3>
              <button onClick={() => setShowEdit(null)}><X className="h-4 w-4" /></button>
            </div>
            <form onSubmit={handleEdit} className="p-5 space-y-3 modal-content">
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Nom</span><input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" value={editName} onChange={e => setEditName(e.target.value)} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Email</span><input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" value={editEmail} onChange={e => setEditEmail(e.target.value)} /></label>
              <label className="block space-y-1"><span className="text-xs font-semibold text-slate-500">Zone</span><input className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-amber-500" value={editZone} onChange={e => setEditZone(e.target.value)} /></label>
              <button type="submit" className="w-full py-2.5 bg-amber-600 text-white rounded-xl font-semibold text-sm">Enregistrer</button>
            </form>
          </div>
        </div>
      )}

      {/* Modal Code */}}
      {showCode && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-container">
            <div className="bg-indigo-700 p-4 text-white flex items-center justify-between modal-footer">
              <h3 className="font-bold flex items-center gap-2"><ShieldCheck className="h-4 w-4" /> Code généré</h3>
              <button onClick={() => setShowCode(null)}><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5 space-y-4 modal-content">
              <p className="text-sm text-slate-600">Code d'édition pour <strong>{showCode.user.name}</strong> :</p>
              <div className="bg-slate-900 text-white rounded-xl p-4 font-mono text-center text-lg flex items-center justify-between gap-2">
                <span>{showCode.code}</span>
                <button onClick={() => navigator.clipboard.writeText(showCode.code)} className="p-2 bg-white/10 rounded-lg hover:bg-white/20"><ClipboardCopy className="h-4 w-4" /></button>
              </div>
              <p className="text-xs text-slate-500 flex items-center gap-1.5"><CheckCircle2 className="h-3 w-3 text-emerald-600" /> Validité 10 minutes — usage unique.</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Détails Employé (scrollable) ─────────────────────────────── */}
      {showDetail && (() => {
        const perf = performance[showDetail.id];
        const empPays = employeePayments(showDetail.id);
        const processedPays = empPays.filter(p => p.status === 'processed');
        const totalReceived = processedPays.reduce((s, p) => s + p.amount, 0);

        return (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 overflow-y-auto" style={{ background: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)' }}>
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl my-6 flex flex-col" style={{ maxHeight: '90vh' }}>

              {/* Header — fixe */}
              <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 to-indigo-900 rounded-t-3xl p-5 text-white flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-widest">Fiche employé</p>
                  <h3 className="mt-1 text-2xl font-bold">{showDetail.name}</h3>
                  <p className="mt-0.5 text-sm text-slate-300 capitalize">{showDetail.role} · {showDetail.zone || 'Sans zone'} · {showDetail.email}</p>
                </div>
                <button onClick={() => setShowDetail(null)} className="rounded-full bg-white/10 p-2 hover:bg-white/20 flex-shrink-0">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Contenu — scrollable */}
              <div className="flex-1 overflow-y-auto p-5 space-y-5">

                {/* Infos de base */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Rôle</p>
                    <p className="mt-1 font-bold text-slate-900 capitalize">{showDetail.role}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Zone</p>
                    <p className="mt-1 font-bold text-slate-900">{showDetail.zone || '—'}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Statut</p>
                    <p className={`mt-1 font-bold ${showDetail.isActive === false ? 'text-rose-700' : 'text-emerald-700'}`}>
                      {showDetail.isActive === false ? 'Inactif' : 'Actif'}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">Inscrit le</p>
                    <p className="mt-1 font-bold text-slate-900">{showDetail.createdAt}</p>
                  </div>
                </div>

                {/* Performances (si commercial) */}
                {showDetail.role === 'commercial' && perf && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                    <h4 className="text-sm font-bold text-emerald-900 uppercase tracking-wide mb-3">Performances commerciales</h4>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-xl bg-white border border-emerald-100 p-3">
                        <p className="text-xs text-emerald-600">Clients suivis</p>
                        <p className="mt-1 text-xl font-bold text-emerald-900">{perf.clients}</p>
                      </div>
                      <div className="rounded-xl bg-white border border-emerald-100 p-3">
                        <p className="text-xs text-emerald-600">Cotisations collectées</p>
                        <p className="mt-1 text-xl font-bold text-emerald-900">{fmt(perf.collected)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Historique paiements reçus */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden">
                  <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <h4 className="text-sm font-bold text-slate-800">Paiements reçus</h4>
                    <span className="text-xs text-slate-400">Total perçu : {fmt(totalReceived)}</span>
                  </div>
                  <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                    {empPays.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-400">Aucun paiement enregistré.</p>
                    ) : empPays.sort((a, b) => new Date(b.initiatedAt).getTime() - new Date(a.initiatedAt).getTime()).map(p => (
                      <div key={p.id} className="px-4 py-3 flex items-center justify-between text-sm hover:bg-slate-50/60">
                        <div>
                          <p className="font-semibold text-slate-900">{fmt(p.amount)}</p>
                          <p className="text-xs text-slate-500">{p.reason || 'Sans motif'} · par {p.initiatedByName}</p>
                        </div>
                        <div className="text-right">
                          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${p.status === 'processed' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                            {p.status === 'processed' ? 'Traité' : 'En attente'}
                          </span>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(p.initiatedAt))}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Actions rapides */}
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setShowEdit(showDetail); setEditName(showDetail.name); setEditEmail(showDetail.email); setEditZone(showDetail.zone || ''); setShowDetail(null); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-sm font-semibold text-amber-800 hover:bg-amber-100"
                  >
                    <Pencil className="h-3.5 w-3.5" /> Modifier les infos
                  </button>
                  <button
                    onClick={() => { toggleActive(showDetail); setShowDetail(null); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    {showDetail.isActive === false ? <><ToggleLeft className="h-4 w-4 text-rose-500" /> Réactiver</> : <><ToggleRight className="h-4 w-4 text-emerald-500" /> Désactiver</>}
                  </button>
                  <button
                    onClick={() => { generateCode(showDetail); setShowDetail(null); }}
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-50 border border-indigo-200 px-4 py-2 text-sm font-semibold text-indigo-800 hover:bg-indigo-100"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Générer code édition
                  </button>
                </div>
              </div>

              {/* Footer — fixe */}
              <div className="flex-shrink-0 border-t border-slate-100 px-5 py-4 flex justify-end">
                <button onClick={() => setShowDetail(null)} className="px-5 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800">
                  Fermer
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
