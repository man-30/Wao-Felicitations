import { useState } from 'react';
import { User, Transaction, Expense, UserRole } from '../types';
import { db } from '../localStorageDB';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Award, 
  PlusCircle, 
  UserPlus, 
  Shield 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface AdminDashboardProps {
  currentUser: User;
}

export default function AdminDashboard({ currentUser }: AdminDashboardProps) {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [transactions] = useState<Transaction[]>(db.getTransactions());
  const [expenses] = useState<Expense[]>(db.getExpenses());

  // Form states for new user
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('caissier');
  const [zone, setZone] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Calculate stats
  const approvedTx = transactions.filter(t => t.status === 'approved');
  
  const totalDeposits = approvedTx
    .filter(t => t.type === 'depot' || t.type === 'cotisation')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalWithdrawals = approvedTx
    .filter(t => t.type === 'retrait')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalRepayments = approvedTx
    .filter(t => t.type === 'remboursement_dette')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);

  // Net cash held in the platform
  const netCaisse = totalDeposits + totalRepayments - totalWithdrawals - totalExpenses;

  // Commercial performance mapping
  const commercialPerformance = users
    .filter(u => u.role === 'commercial')
    .map(comm => {
      const collections = approvedTx
        .filter(t => t.collectedBy === comm.id)
        .reduce((sum, t) => sum + t.amount, 0);
      return {
        name: comm.name,
        amount: collections
      };
    });

  const chartData = [
    { name: 'Dépôts/Cotisations', montant: totalDeposits },
    { name: 'Remboursements', montant: totalRepayments },
    { name: 'Retraits', montant: totalWithdrawals },
    { name: 'Dépenses', montant: totalExpenses }
  ];

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setMsg({ text: 'Veuillez remplir tous les champs obligatoires', type: 'error' });
      return;
    }

    if (users.find(u => u.email === email)) {
      setMsg({ text: 'Cet email est déjà utilisé', type: 'error' });
      return;
    }

    const newUser: User = {
      id: 'u_' + Date.now(),
      name,
      email,
      password,
      role,
      zone: zone || undefined,
      createdAt: new Date().toISOString().split('T')[0]
    };

    const updatedUsers = [...users, newUser];
    db.saveUsers(updatedUsers);
    setUsers(updatedUsers);
    
    db.addLog(
      currentUser.id, 
      currentUser.name, 
      currentUser.role, 
      'Création Utilisateur', 
      `Création du compte ${role}: ${name} (${email})`
    );

    setName('');
    setEmail('');
    setPassword('');
    setZone('');
    setMsg({ text: `Compte ${role} créé avec succès !`, type: 'success' });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Supervision Administrateur</h2>
        <span className="px-3 py-1 bg-red-50 text-red-700 text-xs font-semibold rounded-full flex items-center gap-1 border border-red-200">
          <Shield className="w-3 h-3" /> Dashboard Admin
        </span>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Solde Caisse Net</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{netCaisse.toLocaleString()} FCFA</h3>
          </div>
          <div className="p-3 bg-green-50 rounded-lg text-green-600">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Collectes Totales</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{(totalDeposits + totalRepayments).toLocaleString()} FCFA</h3>
          </div>
          <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Retraits Agence</p>
            <h3 className="text-2xl font-bold text-red-600 mt-1">{totalWithdrawals.toLocaleString()} FCFA</h3>
          </div>
          <div className="p-3 bg-red-50 rounded-lg text-red-500">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between">
          <div>
            <p className="text-slate-500 text-sm font-medium">Frais & Charges</p>
            <h3 className="text-2xl font-bold text-slate-700 mt-1">{totalExpenses.toLocaleString()} FCFA</h3>
          </div>
          <div className="p-3 bg-slate-100 rounded-lg text-slate-600">
            <Award className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts and Commercial Perf */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 lg:col-span-2">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Flux Financiers</h3>
          <div className="h-64 min-h-64 min-w-0">
            {chartData && chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                  <YAxis stroke="#888888" fontSize={12} />
                  <Tooltip />
                  <Bar dataKey="montant" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">Aucune donnée disponible</div>
            )}
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Performance Commerciaux</h3>
          <div className="space-y-4 max-h-64 overflow-y-auto">
            {commercialPerformance.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Aucun commercial actif</p>
            ) : (
              commercialPerformance.map((comm, idx) => (
                <div key={idx} className="flex items-center justify-between border-b border-slate-50 pb-2">
                  <div className="text-sm">
                    <p className="font-semibold text-slate-800">{comm.name}</p>
                    <p className="text-xs text-slate-400">Total collecté</p>
                  </div>
                  <span className="text-sm font-bold text-indigo-600">
                    {comm.amount.toLocaleString()} F
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* User Creation Form */}
      {currentUser.role === 'admin' && (
      <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <UserPlus className="w-5 h-5 text-indigo-600" />
          <h3 className="text-base font-semibold text-slate-800">Créer un Agent / Caissier</h3>
        </div>

        {msg.text && (
          <div className={`p-3 text-sm rounded-md mb-4 border ${
            msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
          }`}>
            {msg.text}
          </div>
        )}

        <form onSubmit={handleCreateUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Nom Complet *</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alice Kouassi"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Email *</label>
            <input
              type="email"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Ex: alice@waooo.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Mot de passe *</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Min. 4 caractères"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Rôle *</label>
            <select
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
            >
              <option value="caissier">Caissier (Agence)</option>
              <option value="commercial">Commercial (Terrain)</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-600 mb-1">Zone / Agence assignée</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              placeholder="Ex: Agence Sud / Zone Plateau"
            />
          </div>

          <div className="md:col-span-2 text-right">
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors flex items-center gap-1 ml-auto"
            >
              <PlusCircle className="w-4 h-4" /> Créer le collaborateur
            </button>
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
