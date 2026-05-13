import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { api } from '../config/api';
import { Upload, X, CheckCircle2, AlertTriangle, FileSpreadsheet, Loader2, Download } from 'lucide-react';

interface ExcelImportDialogProps {
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

export default function ExcelImportDialog({ onClose, onImportSuccess }: ExcelImportDialogProps) {
  const [data, setData] = useState<ValidationResult[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [report, setReport] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const findKey = (row: any, ...aliases: string[]) => {
    const keys = Object.keys(row);
    for (const alias of aliases) {
      const found = keys.find(k => k.trim().toLowerCase() === alias.toLowerCase());
      if (found) return row[found];
    }
    return undefined;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsParsing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rawData = XLSX.utils.sheet_to_json(ws) as any[];

        const mappedData: ValidationResult[] = rawData.map((row: any) => {
          const importRow: ImportRow = {
            name: findKey(row, 'Nom Complet', 'Nom', 'Full Name') || '',
            type: findKey(row, 'Type', 'Client Type') || 'simple',
            phone: String(findKey(row, 'Téléphone', 'Tél', 'Phone', 'Tel') || ''),
            address: findKey(row, 'Adresse', 'Address') || '',
            accountNumber: findKey(row, 'N° De Compte', 'Compte', 'Account Number', 'Account') || '',
            commercialName: findKey(row, 'Commercial', 'Agent') || '',
            initialBalance: Number(findKey(row, 'Solde Initial', 'Solde', 'Initial Balance', 'Balance') || 0),
          };

          let status: 'valid' | 'invalid' | 'warning' = 'valid';
          let message = 'Prêt';

          if (!importRow.name || !importRow.phone || !importRow.accountNumber) {
            status = 'invalid';
            message = 'Champs obligatoires manquants (Nom, Tél, Compte)';
          }

          return { row: importRow, status, message };
        });

        setData(mappedData);
      } catch (err) {
        console.error('Error parsing excel:', err);
        alert('Erreur lors de la lecture du fichier Excel.');
      } finally {
        setIsParsing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const startImport = async () => {
    const validRows = data.filter(d => d.status !== 'invalid').map(d => d.row);
    if (validRows.length === 0) return;

    setIsImporting(true);
    try {
      const response = await api.request<any>('/api/clients/import-excel', {
        method: 'POST',
        body: JSON.stringify({ clients: validRows }),
      });
      setReport(response);
      if (response.successCount > 0) {
        onImportSuccess();
      }
    } catch (err: any) {
      alert('Erreur lors de l\'import : ' + err.message);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = () => {
    const templateData = [
      {
        'N° De Compte': 'ACC-001',
        'Nom Complet': 'Exemple Client',
        'Type': 'simple',
        'Téléphone': '0101010101',
        'Adresse': 'Cotonou',
        'Commercial': 'ADMIN',
        'Solde Initial': 0
      }
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'WF_Import_Template.xlsx');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-6 bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-600 p-2.5 text-white">
              <FileSpreadsheet className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Importation massive clients</h2>
              <p className="text-sm text-slate-500">Uploadez votre fichier Excel (MIGRATION_WF.xlsx)</p>
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
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="group cursor-pointer flex flex-col items-center justify-center w-full max-w-md p-10 border-2 border-dashed border-slate-300 rounded-3xl hover:border-indigo-500 hover:bg-indigo-50 transition-all"
              >
                <div className="rounded-full bg-slate-100 p-4 group-hover:bg-indigo-100 mb-4 transition-colors">
                  <Upload className="h-10 w-10 text-slate-400 group-hover:text-indigo-600" />
                </div>
                <p className="text-lg font-semibold text-slate-900">Cliquez pour choisir un fichier</p>
                <p className="text-sm text-slate-500 mt-2 text-center">Format .xlsx supporté selon le modèle de migration</p>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept=".xlsx" 
                  onChange={handleFileUpload}
                  disabled={isParsing}
                />
              </div>
              
              <button 
                onClick={downloadTemplate}
                className="mt-8 flex items-center gap-2 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
              >
                <Download className="h-4 w-4" /> Télécharger le modèle Excel
              </button>
            </div>
          ) : report ? (
            <div className="space-y-6">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-6 text-center">
                <CheckCircle2 className="h-12 w-12 text-emerald-600 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-emerald-900">Importation terminée</h3>
                <div className="mt-4 grid grid-cols-3 gap-4">
                  <div className="p-3 bg-white rounded-xl border border-emerald-100">
                    <p className="text-xs text-emerald-600 font-semibold uppercase">Succès</p>
                    <p className="text-2xl font-bold text-emerald-900">{report.successCount}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-amber-100">
                    <p className="text-xs text-amber-600 font-semibold uppercase">Ignorés/Doublons</p>
                    <p className="text-2xl font-bold text-amber-900">{report.ignoredCount}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-rose-100">
                    <p className="text-xs text-rose-600 font-semibold uppercase">Erreurs</p>
                    <p className="text-2xl font-bold text-rose-900">{report.errorCount}</p>
                  </div>
                </div>
              </div>

              {report.errors?.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-bold text-slate-900">Détails des erreurs</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {report.errors.map((err: any, idx: number) => (
                      <div key={idx} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm">
                        <p className="text-rose-600 font-semibold">{err.rowName || 'Ligne ' + (idx + 1)}</p>
                        <p className="text-slate-600">{err.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <button 
                onClick={onClose}
                className="w-full py-4 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-colors"
              >
                Terminer
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-900">Aperçu des données ({data.length} lignes)</h3>
                <button 
                  onClick={() => setData([])}
                  className="text-sm font-semibold text-rose-600 hover:text-rose-700"
                >
                  Annuler
                </button>
              </div>

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">Statut</th>
                      <th className="px-4 py-3 text-left font-semibold">N° Compte</th>
                      <th className="px-4 py-3 text-left font-semibold">Nom</th>
                      <th className="px-4 py-3 text-left font-semibold">Tél</th>
                      <th className="px-4 py-3 text-left font-semibold">Type</th>
                      <th className="px-4 py-3 text-left font-semibold">Commercial</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {data.map((item, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-3">
                          {item.status === 'valid' ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <AlertTriangle className="h-5 w-5 text-rose-500" title={item.message} />
                          )}
                        </td>
                        <td className="px-4 py-3">{item.row.accountNumber}</td>
                        <td className="px-4 py-3 font-medium text-slate-900">{item.row.name}</td>
                        <td className="px-4 py-3 font-mono">{item.row.phone}</td>
                        <td className={`px-4 py-3 capitalize ${item.row.type === 'apprenant' ? 'text-indigo-600' : 'text-slate-600'}`}>
                          {item.row.type}
                        </td>
                        <td className="px-4 py-3 italic">{item.row.commercialName}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex gap-3">
                <button 
                  disabled={isImporting || data.filter(d => d.status !== 'invalid').length === 0}
                  onClick={startImport}
                  className="flex-1 py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Importation en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-5 w-5" />
                      Confirmer l'importation ({data.filter(d => d.status !== 'invalid').length} valides)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
