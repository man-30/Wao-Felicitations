import { useEffect, useState } from 'react';
import { ActionLog } from '../types';
import { db } from '../localStorageDB';
import api from '../config/api';
import { ShieldCheck, Search, RefreshCw } from 'lucide-react';

export default function ActionLogs() {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [backendError, setBackendError] = useState('');

  const refreshLogs = async () => {
    setLoading(true);
    setBackendError('');

    try {
      const response = await api.getAuditLogs({ limit: 200 });
      setLogs(response.logs);
    } catch (err: any) {
      setBackendError(err.message || 'Impossible de charger les logs depuis le backend. Mode local activé.');
      setLogs(db.getLogs());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshLogs();
  }, []);

  const filteredLogs = logs.filter(
    log =>
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-indigo-600" />
          <h2 className="text-2xl font-bold text-slate-800">Journal d'Audit Sécurité</h2>
        </div>
        <button
          onClick={refreshLogs}
          disabled={loading}
          className="p-2 text-slate-500 hover:text-indigo-600 rounded-lg hover:bg-slate-100 transition-colors flex items-center gap-1 text-sm font-semibold border border-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>
      {backendError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {backendError}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
          <Search className="w-4 h-4 text-slate-400" />
          <input
            type="text"
            className="bg-transparent border-none text-sm w-full focus:outline-none placeholder-slate-400"
            placeholder="Filtrer par action, utilisateur ou détails..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <th className="px-4 py-3">Date & Heure</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Détails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-600">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-8 text-slate-400">
                    Aucune entrée trouvée.
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs">{log.timestamp}</td>
                    <td className="px-4 py-3 font-medium text-slate-800">{log.userName}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded capitalize ${
                        log.userRole === 'admin' ? 'bg-red-50 text-red-700' : log.userRole === 'caissier' ? 'bg-blue-50 text-blue-700' : 'bg-green-50 text-green-700'
                      }`}>
                        {log.userRole}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-indigo-600">{log.action}</td>
                    <td className="px-4 py-3 text-slate-700 max-w-xs md:max-w-md truncate" title={log.details}>
                      {log.details}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
