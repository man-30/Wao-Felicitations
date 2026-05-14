import React, { useState, useRef } from 'react';
import { api } from '../config/api';
import { Upload, X, CheckCircle2, AlertTriangle, FileJson, Loader2 } from 'lucide-react';

interface JSONImportDialogProps {
  onClose: () => void;
  onImportSuccess: () => void;
}

interface ImportRow {
  name: string;
  type: string;
  phone: string;
  address: string;
  accountNumber: string;
  commercialName: string;
  initialBalance: number;
}

interface ValidationResult {
  row: ImportRow;
  status: 'valid' | 'invalid' | 'warning';
  message?: string;
}

export default function JSONImportDialog({ onClose, onImportSuccess }: JSONImportDialogProps) {
  const [data, setData] = useState<ValidationResult[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [showRawData, setShowRawData] = useState(false);
  const [detectedKeys, setDetectedKeys] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const findKey = (row: any, ...aliases: string[]) => {
    const keys = Object.keys(row);
    // 1. Try exact match (normalized)
    for (const alias of aliases) {
      const found = keys.find(k => k.trim().toLowerCase() === alias.toLowerCase());
      if (found) return row[found];
    }
    // 2. Try fuzzy match (includes)
    for (const alias of aliases) {
      const found = keys.find(k => k.toLowerCase().includes(alias.toLowerCase()));
      if (found) return row[found];
    }
    return undefined;
  };

  const processRawData = (jsonData: any[]) => {
    let allDetectedKeys = new Set<string>();
    if (jsonData.length > 0) {
      Object.keys(jsonData[0]).forEach(k => allDetectedKeys.add(k));
      setDetectedKeys(Array.from(allDetectedKeys));
    }

    const mapped = jsonData.map((row: any) => {
      const importRow: ImportRow = {
        name: String(findKey(row, 'Nom Complet', 'Nom', 'Full Name', 'Nom et Prénoms', 'Prenoms', 'Prénoms', 'name', 'full_name', 'client', 'client_name') || '').trim(),
        type: findKey(row, 'Type', 'Client Type', 'type') || 'simple',
        phone: String(findKey(row, 'Téléphone', 'Tél', 'Phone', 'Tel', 'Contact', 'Numéro', 'Mobile', 'CONTACT', 'tel', 'phone_number', 'contact_no', 'mobile_no') || '').trim(),
        address: String(findKey(row, 'Adresse', 'Address', 'Résidence', 'Ville', 'Quartier', 'ADRESSE', 'adresse', 'address', 'city') || '').trim(),
        accountNumber: String(findKey(row, 'N° De Compte', 'Compte', 'N° Compte', 'Account Number', 'Account', 'Code', 'ID', 'account', 'acc_no', 'acc', 'compte_no', 'numero_compte') || '').trim(),
        commercialName: String(findKey(row, 'Commercial', 'Agent', 'Promoteur', 'Vendeur', 'Gestionnaire', 'commercial', 'agent', 'agent_name', 'staff', 'user') || '').trim(),
        initialBalance: Number(findKey(row, 'Solde Initial', 'Solde', 'Initial Balance', 'Balance', 'Montant', 'Crédit', 'solde_initial', 'montant_initial', 'amount', 'balance_initial') || 0),
      };

      let status: 'valid' | 'invalid' | 'warning' = 'valid';
      let message = 'Prêt';

      if (!importRow.name || !importRow.accountNumber) {
        status = 'invalid';
        message = `Manquant: ${!importRow.name ? 'Nom ' : ''}${!importRow.accountNumber ? 'Compte' : ''}`;
      } else if (!importRow.phone || importRow.phone === 'undefined' || importRow.phone === '') {
        status = 'warning';
        message = 'Téléphone manquant (sera importé vide)';
      }

      return { row: importRow, status, message };
    });

    return mapped.filter(d => d.row.name || d.row.accountNumber || d.row.phone);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    setDetectedKeys([]);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const content = evt.target?.result as string;
        let jsonData = JSON.parse(content);
        
        // Unwrap if it's an object with a single array property (e.g. { "clients": [...] })
        if (jsonData && !Array.isArray(jsonData) && typeof jsonData === 'object') {
          const keys = Object.keys(jsonData);
          const arrayKey = keys.find(k => Array.isArray(jsonData[k]));
          if (arrayKey) {
            jsonData = jsonData[arrayKey];
          } else {
            // If it's a single object, wrap it
            jsonData = [jsonData];
          }
        }

        const rows = Array.isArray(jsonData) ? jsonData : [];
        if (rows.length === 0) {
          alert('Le fichier JSON ne contient aucun tableau de données détectable.');
          return;
        }

        const results = processRawData(rows);
        if (results.length === 0) {
          alert('Fichier lu avec succès, mais aucune donnée de client n\'a été identifiée. Vérifiez les noms des champs (Nom, Compte, etc.).');
        }
        setData(results);
      } catch (err: any) {
        console.error('Error parsing JSON:', err);
        alert(`Erreur parsing JSON: ${err.message}. Veuillez vérifier que le fichier est un fichier JSON valide.`);
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsText(file);
  };

  const startImport = async () => {
    const validRows = data.filter(d => d.status !== 'invalid').map(d => d.row);
    if (validRows.length === 0) return;

    setIsImporting(true);
    setImportProgress(0);
    
    let totalSuccess = 0;
    let totalIgnored = 0;
    let totalError = 0;
    let allErrors: any[] = [];
    
    const CHUNK_SIZE = 50;
    const totalChunks = Math.ceil(validRows.length / CHUNK_SIZE);

    try {
      for (let i = 0; i < validRows.length; i += CHUNK_SIZE) {
        const chunk = validRows.slice(i, i + CHUNK_SIZE);
        const chunkIndex = Math.floor(i / CHUNK_SIZE) + 1;
        
        const response = await api.request<any>('/api/clients/import-excel', {
          method: 'POST',
          body: JSON.stringify({ clients: chunk }),
        });

        totalSuccess += response.successCount || 0;
        totalIgnored += response.ignoredCount || 0;
        totalError += response.errorCount || 0;
        if (response.errors) allErrors = [...allErrors, ...response.errors];
        
        setImportProgress(Math.round((chunkIndex / totalChunks) * 100));
      }

      setReport({
        successCount: totalSuccess,
        ignoredCount: totalIgnored,
        errorCount: totalError,
        errors: allErrors
      });

      if (totalSuccess > 0) {
        onImportSuccess();
      }
    } catch (err: any) {
      alert('Erreur lors de l\'import : ' + err.message);
    } finally {
      setIsImporting(false);
      setImportProgress(0);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
              <FileJson className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Importation massive JSON</h2>
              <p className="text-sm text-slate-500">Uploadez votre fichier extrait par Claude AI</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full bg-white p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 border border-slate-200">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {!data.length && !report ? (
            <div className="flex flex-col items-center justify-center py-12">
              <p className="text-sm text-slate-500 mb-6 font-medium text-center max-w-sm">
                Importation directe via JSON. Ce format est plus fiable que l'Excel pour les transferts de données complexes.
              </p>
            
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer flex flex-col items-center justify-center w-full max-w-md p-12 border-2 border-dashed border-slate-300 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50 transition-all bg-slate-50/50"
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json"
                  className="hidden" 
                />
                <div className="rounded-full bg-white p-6 shadow-sm group-hover:shadow-md group-hover:scale-110 mb-6 transition-all border border-slate-200">
                  <Upload className="h-12 w-12 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <p className="text-xl font-bold text-slate-900">Choisir le fichier JSON</p>
                <p className="text-sm text-slate-400 mt-2 text-center italic">Le système balaiera le fichier pour mapper automatiquement les clients.</p>
              </div>
            </div>
          ) : report ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-8 text-center shadow-inner">
                <CheckCircle2 className="h-16 w-16 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-2xl font-bold text-emerald-900">Migration terminée</h3>
                <div className="mt-8 grid grid-cols-3 gap-6">
                  <div className="p-4 bg-white rounded-2xl border border-emerald-200 shadow-sm">
                    <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">Réussis</p>
                    <p className="text-3xl font-black text-emerald-900 mt-1">{report.successCount}</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-amber-200 shadow-sm">
                    <p className="text-xs text-amber-600 font-bold uppercase tracking-widest">Doublons</p>
                    <p className="text-3xl font-black text-amber-900 mt-1">{report.ignoredCount}</p>
                  </div>
                  <div className="p-4 bg-white rounded-2xl border border-rose-200 shadow-sm">
                    <p className="text-xs text-rose-600 font-bold uppercase tracking-widest">Échecs</p>
                    <p className="text-3xl font-black text-rose-900 mt-1">{report.errorCount}</p>
                  </div>
                </div>
              </div>

              {report.errors?.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-rose-700">
                    <AlertTriangle className="h-5 w-5" />
                    <h4 className="font-bold">Journal des incidents d'importation</h4>
                  </div>
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-2">
                    {report.errors.map((err: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-rose-50/50 border border-rose-100 text-sm flex gap-3">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-600">{idx + 1}</span>
                        <div>
                          <p className="text-rose-900 font-bold">{err.rowName || 'Ligne ' + (idx + 1)}</p>
                          <p className="text-rose-700/80">{err.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={onClose}
                className="w-full py-5 bg-slate-900 text-white text-lg font-bold rounded-2xl hover:bg-slate-800 transition-all active:scale-[0.98] shadow-xl shadow-slate-200"
              >
                Tout est en ordre
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-indigo-600" /> Analyse du fichier effectuée
                  <span className="text-xs font-normal bg-slate-100 px-2 py-0.5 rounded text-slate-500">{data.length} enregistrements trouvés</span>
                </h4>
                <button 
                  onClick={() => setShowRawData(!showRawData)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
                >
                  {showRawData ? "[ Masquer le code ]" : "[ Voir le code JSON ]"}
                </button>
              </div>

              {showRawData && (
                <div className="rounded-2xl bg-slate-900 p-4 border border-slate-800 shadow-inner">
                  <div className="flex flex-wrap gap-2 mb-4">
                    {detectedKeys.map(k => (
                      <span key={k} className="px-2 py-1 bg-slate-800 rounded text-indigo-300 text-[10px] font-mono border border-slate-700">
                        {k}
                      </span>
                    ))}
                  </div>
                  <div className="max-h-48 overflow-auto text-[10px] text-slate-400 font-mono scrollbar-thin scrollbar-thumb-slate-700">
                    <pre>{JSON.stringify(data.map(d => d.row), null, 2)}</pre>
                  </div>
                </div>
              )}

              <div className="max-h-96 overflow-auto rounded-2xl border border-slate-200 shadow-sm">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 sticky top-0 overflow-hidden">
                    <tr>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter text-[10px]">OK</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Compte</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Nom Complet</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Contact</th>
                      <th className="px-4 py-3 text-left font-bold text-slate-500 uppercase tracking-tighter text-[10px]">Solde</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          {item.status === 'valid' ? (
                            <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-200" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-rose-500 shadow-sm shadow-rose-200" title={item.message} />
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs">{item.row.accountNumber}</td>
                        <td className="px-4 py-3 font-bold text-slate-900">{item.row.name}</td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500">{item.row.phone}</td>
                        <td className="px-4 py-3 font-bold text-indigo-600">{item.row.initialBalance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button 
                  onClick={startImport}
                  disabled={isImporting}
                  className="w-full py-5 bg-indigo-600 text-white text-lg font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3 active:scale-[0.99]"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-6 w-6 animate-spin" />
                      Migration en cours {importProgress}%...
                    </>
                  ) : (
                    <>
                      <Upload className="h-6 w-6" />
                      Lancer l'importation massive
                    </>
                  )}
                </button>

                {isImporting && (
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                    <div 
                      className="h-full bg-indigo-600 transition-all duration-300" 
                      style={{ width: `${importProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
