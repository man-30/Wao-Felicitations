import { useState } from 'react';
import { Expense, User } from '../types';
import { db } from '../localStorageDB';
import { Receipt, Plus, AlertTriangle } from 'lucide-react';

interface Props { currentUser: User; }
function fmt(v: number) { return new Intl.NumberFormat('fr-FR').format(Math.round(v)) + ' F'; }

export default function ExpensesManagement({ currentUser }: Props) {
  const [expenses, setExpenses] = useState<Expense[]>(db.getExpenses());
  const [category, setCategory] = useState('Fournitures');
  const [amount, setAmount] = useState(0);
  const [description, setDescription] = useState('');
  const [msg, setMsg] = useState({ text: '', type: '' });

  const totalExpenses = expenses.reduce((s, e) => s + e.amount, 0);
  const categories = ['Fournitures', 'Transport', 'Logistique', 'Salaires', 'Loyer', 'Communication', 'Autres'];

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0 || !description) { setMsg({ text: 'Montant et description obligatoires.', type: 'error' }); return; }

    const ne: Expense = {
      id: 'e_' + Date.now(), category, amount, description,
      date: new Date().toISOString().split('T')[0],
      recordedBy: currentUser.id, recordedByName: currentUser.name,
    };
    const upd = [...expenses, ne];
    db.saveExpenses(upd);
    setExpenses(upd);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Enregistrement Charge', `Charge ${category}: ${fmt(amount)} — ${description}`);
    setAmount(0); setDescription('');
    setMsg({ text: 'Charge enregistrée. Impact immédiat sur la caisse.', type: 'success' });
  };

  // Group by category
  const byCategory = categories.map(cat => ({
    name: cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
    count: expenses.filter(e => e.category === cat).length,
  })).filter(c => c.count > 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Gestion des Charges</h2>
        <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200 flex items-center gap-1"><Receipt className="w-3 h-3" /> Trésorerie</span>
      </div>

      {msg.text && <div className={`p-3 text-sm rounded-xl border ${msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-600 border-green-200'}`}>{msg.text}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-6">
        {/* Left: total + categories */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <p className="text-sm text-slate-500">Total des charges</p>
            <h3 className="text-3xl font-semibold text-slate-900 mt-2">{fmt(totalExpenses)}</h3>
            <p className="mt-3 text-xs text-rose-600 font-medium flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Impact direct sur le fonds de caisse</p>
          </div>

          {byCategory.length > 0 && (
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-base font-semibold text-slate-900 mb-3">Par catégorie</h3>
              <div className="space-y-2">
                {byCategory.map(c => (
                  <div key={c.name} className="flex items-center justify-between rounded-xl bg-slate-50 p-3 text-sm">
                    <div><p className="font-semibold text-slate-800">{c.name}</p><p className="text-xs text-slate-400">{c.count} entrée(s)</p></div>
                    <span className="font-semibold text-rose-600">{fmt(c.total)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="font-semibold">Contraintes métier</p>
            <ul className="mt-1 list-disc list-inside space-y-0.5 text-amber-700">
              <li>Impact immédiat sur la caisse</li>
              <li>Aucune suppression autorisée</li>
              <li>Justification recommandée</li>
            </ul>
          </div>
        </div>

        {/* Right: form + history */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2"><Plus className="w-4 h-4 text-indigo-600" /> Enregistrer une dépense</h3>
            <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Catégorie *</span>
                <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="space-y-1"><span className="text-xs font-semibold text-slate-500">Montant (FCFA) *</span><input type="number" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={amount || ''} onChange={(e) => setAmount(Number(e.target.value))} placeholder="2500" /></label>
              <label className="md:col-span-2 space-y-1"><span className="text-xs font-semibold text-slate-500">Description / justification *</span><input type="text" required className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Achat papier, transport terrain..." /></label>
              <div className="md:col-span-2 text-right"><button type="submit" className="px-5 py-2 bg-indigo-600 text-white font-semibold rounded-xl text-sm hover:bg-indigo-700">Enregistrer</button></div>
            </form>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-100 bg-slate-50"><h3 className="text-base font-semibold text-slate-900">Historique des charges</h3></div>
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50 text-slate-600"><tr>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                  <th className="px-4 py-3 text-left font-semibold">Catégorie</th>
                  <th className="px-4 py-3 text-left font-semibold">Description</th>
                  <th className="px-4 py-3 text-left font-semibold">Montant</th>
                  <th className="px-4 py-3 text-left font-semibold">Par</th>
                </tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {expenses.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune charge.</td></tr> :
                    [...expenses].sort((a, b) => b.date.localeCompare(a.date)).map(e => (
                      <tr key={e.id} className="hover:bg-slate-50/60">
                        <td className="px-4 py-3 text-slate-500">{e.date}</td>
                        <td className="px-4 py-3 font-medium text-slate-800">{e.category}</td>
                        <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={e.description}>{e.description}</td>
                        <td className="px-4 py-3 font-semibold text-rose-600">{fmt(e.amount)}</td>
                        <td className="px-4 py-3 text-slate-500">{e.recordedByName || '—'}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
