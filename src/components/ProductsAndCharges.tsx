import { useState } from 'react';
import { Expense, Produit, User } from '../types';
import { db } from '../localStorageDB';
import { TrendingUp, TrendingDown, Plus, AlertTriangle } from 'lucide-react';

interface Props { currentUser: User; }
function fmt(v: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F'; }

const PRODUIT_CATEGORIES = [
  'Vente de livret individuel',
  'Déplacement',
  'Vente de livret tontine',
  'Duplicata',
  'Vente de fournitures scolaires',
  'Vente (autres biens)',
  'Frais de dossiers',
  'Frais de prestation',
  'Profits exceptionnels',
  'Autres produits',
];

const CHARGE_CATEGORIES = [
  'Carburant et lubrifiant',
  'Fournitures de bureau',
  'Fournitures informatiques',
  'Fournitures d\'entretien',
  'Eau',
  'Électricité',
  'Loyer',
  'Entretien et réparation',
  'Formation du personnel',
  'Personnel extérieur',
  'Publicité',
  'Communication',
  'Impôts et taxes (OTR - Mairie)',
  'Charges sociales (CNSS - AMU)',
  'Agios',
  'Salaire',
  'Primes',
  'Autres charges',
];

export default function ProductsAndCharges({ currentUser }: Props) {
  const [activeTab, setActiveTab] = useState<'produits' | 'charges'>('produits');
  const [produits, setProduits] = useState<Produit[]>(db.getProduits());
  const [charges, setCharges] = useState<Expense[]>(db.getExpenses().filter(e => e.type !== 'produit'));
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Produit form state
  const [produitCategory, setProduitCategory] = useState(PRODUIT_CATEGORIES[0]);
  const [produitAmount, setProduitAmount] = useState(0);
  const [produitDescription, setProduitDescription] = useState('');

  // Charge form state
  const [chargeCategory, setChargeCategory] = useState(CHARGE_CATEGORIES[0]);
  const [chargeAmount, setChargeAmount] = useState(0);
  const [chargeDescription, setChargeDescription] = useState('');

  const totalProduits = produits.reduce((s, p) => s + p.amount, 0);
  const totalCharges = charges.reduce((s, c) => s + c.amount, 0);
  const netResult = totalProduits - totalCharges;

  const handleAddProduit = (e: React.FormEvent) => {
    e.preventDefault();
    if (produitAmount <= 0 || !produitDescription) {
      setMsg({ text: 'Montant et description obligatoires.', type: 'error' });
      return;
    }

    const newProduit: Produit = {
      id: 'p_' + Date.now(),
      category: produitCategory,
      amount: produitAmount,
      description: produitDescription,
      date: new Date().toISOString().split('T')[0],
      recordedBy: currentUser.id,
      recordedByName: currentUser.name,
    };

    const updated = [...produits, newProduit];
    db.saveProduits(updated);
    setProduits(updated);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Enregistrement Produit', `Produit ${produitCategory}: ${fmt(produitAmount)} — ${produitDescription}`);

    setProduitAmount(0);
    setProduitDescription('');
    setMsg({ text: 'Produit enregistré. Revenu ajouté à la caisse.', type: 'success' });
  };

  const handleAddCharge = (e: React.FormEvent) => {
    e.preventDefault();
    if (chargeAmount <= 0 || !chargeDescription) {
      setMsg({ text: 'Montant et description obligatoires.', type: 'error' });
      return;
    }

    const newCharge: Expense = {
      id: 'e_' + Date.now(),
      category: chargeCategory,
      amount: chargeAmount,
      description: chargeDescription,
      date: new Date().toISOString().split('T')[0],
      recordedBy: currentUser.id,
      recordedByName: currentUser.name,
      type: 'charge',
    };

    const updated = [...charges, newCharge];
    db.saveExpenses(updated);
    setCharges(updated);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Enregistrement Charge', `Charge ${chargeCategory}: ${fmt(chargeAmount)} — ${chargeDescription}`);

    setChargeAmount(0);
    setChargeDescription('');
    setMsg({ text: 'Charge enregistrée. Impact immédiat sur la caisse.', type: 'success' });
  };

  // Group by category
  const produitsByCategory = PRODUIT_CATEGORIES.map(cat => ({
    name: cat,
    total: produits.filter(p => p.category === cat).reduce((s, p) => s + p.amount, 0),
    count: produits.filter(p => p.category === cat).length,
  })).filter(c => c.count > 0);

  const chargesByCategory = CHARGE_CATEGORIES.map(cat => ({
    name: cat,
    total: charges.filter(c => c.category === cat).reduce((s, c) => s + c.amount, 0),
    count: charges.filter(c => c.category === cat).length,
  })).filter(c => c.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Produits & Charges</h2>
        <span className={`px-3 py-1 text-xs font-semibold rounded-full border flex items-center gap-1 ${
          netResult >= 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-rose-50 text-rose-700 border-rose-200'
        }`}>
          <TrendingUp className="w-3 h-3" /> Résultat net: {fmt(netResult)}
        </span>
      </div>

      {msg.text && (
        <div className={`p-3 text-sm rounded-xl border ${
          msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setActiveTab('produits')}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'produits' ? 'bg-emerald-50 text-emerald-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <TrendingUp className="h-4 w-4" /> Produits ({produits.length})
          </button>
          <button
            onClick={() => setActiveTab('charges')}
            className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition ${
              activeTab === 'charges' ? 'bg-rose-50 text-rose-800' : 'text-slate-500 hover:bg-slate-50'
            }`}
          >
            <TrendingDown className="h-4 w-4" /> Charges ({charges.length})
          </button>
        </div>
      </div>

      {activeTab === 'produits' ? (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-6">
          {/* Left: total + categories */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">Total des produits</p>
              <h3 className="text-3xl font-semibold text-emerald-700 mt-2">{fmt(totalProduits)}</h3>
              <p className="mt-3 text-xs text-emerald-600 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Revenus générés
              </p>
            </div>

            {produitsByCategory.length > 0 && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-base font-semibold text-slate-900 mb-3">Par catégorie</h3>
                <div className="space-y-2">
                  {produitsByCategory.map(c => (
                    <div key={c.name} className="flex items-center justify-between rounded-xl bg-emerald-50 p-3 text-sm">
                      <div>
                        <p className="font-semibold text-emerald-900">{c.name}</p>
                        <p className="text-xs text-emerald-600">{c.count} entrée(s)</p>
                      </div>
                      <span className="font-semibold text-emerald-700">{fmt(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              <p className="font-semibold">Catégories de produits</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-emerald-700 text-xs">
                {PRODUIT_CATEGORIES.slice(0, 5).map(cat => <li key={cat}>{cat}</li>)}
                <li>...et {PRODUIT_CATEGORIES.length - 5} autres</li>
              </ul>
            </div>
          </div>

          {/* Right: form + history */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-emerald-600" /> Enregistrer un produit
              </h3>
              <form onSubmit={handleAddProduit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Catégorie *</span>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
                    value={produitCategory}
                    onChange={(e) => setProduitCategory(e.target.value)}
                  >
                    {PRODUIT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Montant (FCFA) *</span>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
                    value={produitAmount || ''}
                    onChange={(e) => setProduitAmount(Number(e.target.value))}
                    placeholder="5000"
                  />
                </label>
                <label className="md:col-span-2 space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Description / justification *</span>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-emerald-500"
                    value={produitDescription}
                    onChange={(e) => setProduitDescription(e.target.value)}
                    placeholder="Vente livret, frais dossier..."
                  />
                </label>
                <div className="md:col-span-2 text-right">
                  <button type="submit" className="px-5 py-2 bg-emerald-600 text-white font-semibold rounded-xl text-sm hover:bg-emerald-700">
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-emerald-50">
                <h3 className="text-base font-semibold text-emerald-900">Historique des produits</h3>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Date</th>
                      <th className="px-4 py-2 text-left font-semibold">Catégorie</th>
                      <th className="px-4 py-2 text-left font-semibold">Description</th>
                      <th className="px-4 py-2 text-left font-semibold">Montant</th>
                      <th className="px-4 py-2 text-left font-semibold">Par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {produits.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucun produit enregistré.</td>
                      </tr>
                    ) : (
                      [...produits].sort((a, b) => b.date.localeCompare(a.date)).map(p => (
                        <tr key={p.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 text-slate-500">{p.date}</td>
                          <td className="px-4 py-2 font-medium text-emerald-700">{p.category}</td>
                          <td className="px-4 py-2 text-slate-600 max-w-xs truncate">{p.description}</td>
                          <td className="px-4 py-2 font-semibold text-emerald-700">+{fmt(p.amount)}</td>
                          <td className="px-4 py-2 text-slate-500">{p.recordedByName || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-6">
          {/* Left: total + categories */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500">Total des charges</p>
              <h3 className="text-3xl font-semibold text-rose-700 mt-2">{fmt(totalCharges)}</h3>
              <p className="mt-3 text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3 w-3" /> Impact direct sur le fonds de caisse
              </p>
            </div>

            {chargesByCategory.length > 0 && (
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-base font-semibold text-slate-900 mb-3">Par catégorie</h3>
                <div className="space-y-2">
                  {chargesByCategory.map(c => (
                    <div key={c.name} className="flex items-center justify-between rounded-xl bg-rose-50 p-3 text-sm">
                      <div>
                        <p className="font-semibold text-rose-900">{c.name}</p>
                        <p className="text-xs text-rose-600">{c.count} entrée(s)</p>
                      </div>
                      <span className="font-semibold text-rose-700">{fmt(c.total)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
              <p className="font-semibold">Contraintes métier</p>
              <ul className="mt-1 list-disc list-inside space-y-0.5 text-rose-700">
                <li>Impact immédiat sur la caisse</li>
                <li>Aucune suppression autorisée</li>
                <li>Justification recommandée</li>
              </ul>
            </div>
          </div>

          {/* Right: form + history */}
          <div className="space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Plus className="w-4 h-4 text-rose-600" /> Enregistrer une charge
              </h3>
              <form onSubmit={handleAddCharge} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Catégorie *</span>
                  <select
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500"
                    value={chargeCategory}
                    onChange={(e) => setChargeCategory(e.target.value)}
                  >
                    {CHARGE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Montant (FCFA) *</span>
                  <input
                    type="number"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500"
                    value={chargeAmount || ''}
                    onChange={(e) => setChargeAmount(Number(e.target.value))}
                    placeholder="2500"
                  />
                </label>
                <label className="md:col-span-2 space-y-1">
                  <span className="text-xs font-semibold text-slate-500">Description / justification *</span>
                  <input
                    type="text"
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500"
                    value={chargeDescription}
                    onChange={(e) => setChargeDescription(e.target.value)}
                    placeholder="Achat papier, transport terrain..."
                  />
                </label>
                <div className="md:col-span-2 text-right">
                  <button type="submit" className="px-5 py-2 bg-rose-600 text-white font-semibold rounded-xl text-sm hover:bg-rose-700">
                    Enregistrer
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="p-4 border-b border-slate-100 bg-rose-50">
                <h3 className="text-base font-semibold text-rose-900">Historique des charges</h3>
              </div>
              <div className="overflow-x-auto max-h-96 overflow-y-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold">Date</th>
                      <th className="px-4 py-2 text-left font-semibold">Catégorie</th>
                      <th className="px-4 py-2 text-left font-semibold">Description</th>
                      <th className="px-4 py-2 text-left font-semibold">Montant</th>
                      <th className="px-4 py-2 text-left font-semibold">Par</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {charges.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune charge enregistrée.</td>
                      </tr>
                    ) : (
                      [...charges].sort((a, b) => b.date.localeCompare(a.date)).map(c => (
                        <tr key={c.id} className="hover:bg-slate-50/60">
                          <td className="px-4 py-2 text-slate-500">{c.date}</td>
                          <td className="px-4 py-2 font-medium text-rose-700">{c.category}</td>
                          <td className="px-4 py-2 text-slate-600 max-w-xs truncate">{c.description}</td>
                          <td className="px-4 py-2 font-semibold text-rose-700">-{fmt(c.amount)}</td>
                          <td className="px-4 py-2 text-slate-500">{c.recordedByName || '—'}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
