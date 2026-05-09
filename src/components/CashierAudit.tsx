import { useMemo, useState } from 'react';
import { db } from '../localStorageDB';
import { ActionLog, Transaction, User } from '../types';
import { ClipboardList, Search, Shield } from 'lucide-react';

interface Props { currentUser: User; }

export default function CashierAudit(_props: Props) {
  const [logs] = useState<ActionLog[]>(db.getLogs());
  const [transactions] = useState<Transaction[]>(db.getTransactions());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');

  const modifiedTx = useMemo(() => transactions.filter(t => t.isModified), [transactions]);

  const actionTypes = useMemo(() => {
    const set = new Set(logs.map(l => l.action));
    return [...set].sort();
  }, [logs]);

  const filtered = logs.filter(l => {
    if (searchTerm && !l.userName.toLowerCase().includes(searchTerm.toLowerCase()) && !l.details.toLowerCase().includes(searchTerm.toLowerCase()) && !l.action.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterAction && l.action !== filterAction) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Historique & Audit</h2>
        <span className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-semibold rounded-full border border-slate-200 flex items-center gap-1"><ClipboardList className="w-3 h-3" /> Journal immuable</span>
      </div>

      {/* Modified deposits highlight */}
      {modifiedTx.length > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <h3 className="text-sm font-semibold text-amber-900 flex items-center gap-2"><Shield className="w-4 h-4" /> Dépôts corrigés ({modifiedTx.length})</h3>
          <div className="mt-3 space-y-2">
            {modifiedTx.map(t => (
              <div key={t.id} className="rounded-xl bg-white p-3 border border-amber-200 text-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-900">{t.clientName} — {t.type}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Avant: <span className="line-through text-slate-400">{t.originalAmount?.toLocaleString()} F</span> → Après: <span className="font-semibold text-amber-700">{t.amount.toLocaleString()} F</span>
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    <p className="text-slate-500">{t.modifiedAt}</p>
                    <p className="text-amber-700 font-medium">{t.modifiedByName}</p>
                  </div>
                </div>
                {t.modifiedReason && <p className="mt-1 text-xs text-slate-600 bg-slate-50 rounded-lg px-2 py-1">Motif: {t.modifiedReason}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 bg-slate-50">
            <Search className="w-4 h-4 text-slate-400" />
            <input type="text" className="bg-transparent text-sm w-full focus:outline-none placeholder-slate-400" placeholder="Rechercher action, utilisateur, détails..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-semibold text-slate-500">Type d'action</span>
            <select className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500" value={filterAction} onChange={(e) => setFilterAction(e.target.value)}>
              <option value="">Toutes les actions</option>
              {actionTypes.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Full audit log */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-900">Journal global</h3>
          <span className="text-xs text-slate-400">{filtered.length} entrée(s)</span>
        </div>
        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50 text-slate-600 sticky top-0"><tr>
              <th className="px-4 py-3 text-left font-semibold">Date & Heure</th>
              <th className="px-4 py-3 text-left font-semibold">Utilisateur</th>
              <th className="px-4 py-3 text-left font-semibold">Rôle</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
              <th className="px-4 py-3 text-left font-semibold">Détails</th>
            </tr></thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune entrée.</td></tr> :
                filtered.map(l => (
                  <tr key={l.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-mono text-xs text-slate-400 whitespace-nowrap">{l.timestamp}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{l.userName}</td>
                    <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${l.userRole === 'admin' ? 'bg-red-50 text-red-700' : l.userRole === 'caissier' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'}`}>{l.userRole}</span></td>
                    <td className="px-4 py-3 font-semibold text-indigo-600 whitespace-nowrap">{l.action}</td>
                    <td className="px-4 py-3 text-slate-600 max-w-md truncate" title={l.details}>{l.details}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Constraint */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-800">Politique d'audit</p>
        <ul className="mt-1 list-disc list-inside space-y-0.5 text-slate-600">
          <li>L'historique est <strong>immuable</strong> — aucune suppression ni modification.</li>
          <li>Toute action sensible est journalisée avec utilisateur, date et détails.</li>
          <li>Les corrections de dépôts incluent avant/après et motif.</li>
        </ul>
      </div>
    </div>
  );
}
