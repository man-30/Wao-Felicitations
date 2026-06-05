import { FormEvent, useEffect, useMemo, useState } from 'react';
import { db } from '../localStorageDB';
import { ActionLog, AdminCodeRequest, Client, EmployeePayment, Expense, Transaction, User, UserRole } from '../types';
import { actionTypeLabel, generateAdminCode as generateSensitiveCode, refreshAdminCodeRequests } from '../adminCodes';
import InsuranceFundCard from './InsuranceFundCard';
import { api } from '../config/api';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  ClipboardList,
  Copy,
  Download,
  FileDown,
  HandCoins,
  LineChart,
  RefreshCw,
  Search,
  ShieldAlert,
  Sparkles,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import {
  Cell,
  CartesianGrid,
  Legend,
  Line,
  LineChart as ReLineChart,
  Pie,
  PieChart as RePieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type RangeKey = 'global' | 'today' | 'week' | 'month' | 'year' | 'custom';

interface AdminCockpitProps {
  currentUser: User;
}

type RangeBounds = { start: Date; end: Date } | null;

const PIE_COLORS = ['#6366f1', '#22c55e', '#f59e0b'];

function parseDate(value: string) {
  return new Date(value.includes('T') ? value : `${value}T00:00:00`);
}

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat('fr-FR').format(Math.round(value)) + ' FCFA';
}

function formatLabel(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' }).format(date);
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfWeek(date: Date) {
  const day = date.getDay() || 7;
  const start = new Date(date);
  start.setDate(date.getDate() - (day - 1));
  return startOfDay(start);
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfYear(date: Date) {
  return new Date(date.getFullYear(), 0, 1);
}

function withinBounds(dateValue: string, bounds: RangeBounds) {
  if (!bounds) return true;
  const date = parseDate(dateValue).getTime();
  return date >= bounds.start.getTime() && date <= bounds.end.getTime();
}

function csvValue(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`;
}

export default function AdminCockpit({ currentUser }: AdminCockpitProps) {
  const [users, setUsers] = useState<User[]>(db.getUsers());
  const [clients, setClients] = useState<Client[]>(db.getClients());
  const [transactions, setTransactions] = useState<Transaction[]>(db.getTransactions());
  const [expenses, setExpenses] = useState<Expense[]>(db.getExpenses());
  const [logs, setLogs] = useState<ActionLog[]>(db.getLogs());
  const [codeRequests, setCodeRequests] = useState<AdminCodeRequest[]>(refreshAdminCodeRequests());
  const [employeePayments, setEmployeePayments] = useState<EmployeePayment[]>(db.getEmployeePayments());

  // Synchronisation avec le backend au montage
  useEffect(() => {
    const loadData = async () => {
      try {
        const [apiUsers, apiClients] = await Promise.all([
          api.getUsers(),
          api.getClients()
        ]);
        setUsers(apiUsers);
        setClients(apiClients);
        // Sync with local DB for consistency in other components
        db.saveUsers(apiUsers);
        db.syncDataFromServer(apiClients);
      } catch (err) {
        console.error('Failed to sync admin data with backend:', err);
      }
    };
    loadData();
  }, []);

  // Synchronisation temps réel complète — polling 3s (pour les logs et codes)
  useEffect(() => {
    const interval = setInterval(() => {
      // Payments
      const freshPay = db.getEmployeePayments();
      setEmployeePayments(prev => {
        const a = JSON.stringify(prev.map(p => p.id + p.status));
        const b = JSON.stringify(freshPay.map(p => p.id + p.status));
        return a !== b ? freshPay : prev;
      });
      // On continue de poller les logs et codes qui sont souvent locaux ou spécifiques
      setLogs(db.getLogs());
      setCodeRequests(refreshAdminCodeRequests());
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const [range, setRange] = useState<RangeKey>('global');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [searchUser, setSearchUser] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [createRole, setCreateRole] = useState<Exclude<UserRole, 'admin'>>('caissier');
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createZone, setCreateZone] = useState('');
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentReason, setPaymentReason] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  const [showWipeConfirm, setShowWipeConfirm] = useState(false);
  const [wipeConfirmPhrase, setWipeConfirmPhrase] = useState('');

  const referenceDate = useMemo(() => {
    const allDates = [
      ...transactions.map((item) => parseDate(item.date)),
      ...expenses.map((item) => parseDate(item.date)),
      ...clients.map((item) => parseDate(item.createdAt)),
      ...users.map((item) => parseDate(item.createdAt)),
    ].filter((item) => !Number.isNaN(item.getTime()));

    if (!allDates.length) return new Date();
    return allDates.reduce((latest, date) => (date.getTime() > latest.getTime() ? date : latest), allDates[0]);
  }, [clients, expenses, transactions, users]);

  const rangeBounds = useMemo<RangeBounds>(() => {
    if (range === 'global') return null;
    if (range === 'custom') {
      if (!customFrom || !customTo) return null;
      return { start: startOfDay(parseDate(customFrom)), end: new Date(parseDate(customTo).setHours(23, 59, 59, 999)) };
    }

    const end = startOfDay(referenceDate);
    if (range === 'today') return { start: end, end: new Date(end.getTime() + 86_399_999) };
    if (range === 'week') return { start: startOfWeek(referenceDate), end: new Date(end.getTime() + 86_399_999) };
    if (range === 'month') return { start: startOfMonth(referenceDate), end: new Date(end.getTime() + 86_399_999) };
    return { start: startOfYear(referenceDate), end: new Date(end.getTime() + 86_399_999) };
  }, [customFrom, customTo, range, referenceDate]);

  const approvedTransactions = useMemo(
    () => transactions.filter((transaction) => transaction.status === 'approved' && withinBounds(transaction.date, rangeBounds)),
    [rangeBounds, transactions],
  );

  const allOperations = useMemo(() => {
    const txOperations = transactions
      .filter((transaction) => withinBounds(transaction.date, rangeBounds))
      .map((transaction) => ({
        kind: 'transaction' as const,
        date: transaction.date,
        label: transaction.type,
        amount: transaction.amount,
        client: transaction.clientName,
        agent: transaction.collectedByName || transaction.validatedByName || 'Système',
        status: transaction.status,
      }));

    const expenseOperations = expenses
      .filter((expense) => withinBounds(expense.date, rangeBounds))
      .map((expense) => ({
        kind: 'expense' as const,
        date: expense.date,
        label: expense.category,
        amount: expense.amount,
        client: expense.description,
        agent: expense.recordedByName || 'Caissier',
        status: 'approved' as const,
      }));

    return [...txOperations, ...expenseOperations].sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
  }, [expenses, rangeBounds, transactions]);

  const globalDeposits = useMemo(
    () => transactions.filter((transaction) => transaction.status === 'approved' && (transaction.type === 'depot' || transaction.type === 'cotisation')),
    [transactions],
  );
  const globalWithdrawals = useMemo(
    () => transactions.filter((transaction) => transaction.status === 'approved' && transaction.type === 'retrait'),
    [transactions],
  );
  const globalExpenses = expenses;

  const deposits = approvedTransactions.filter((transaction) => transaction.type === 'depot' || transaction.type === 'cotisation');
  const withdrawals = approvedTransactions.filter((transaction) => transaction.type === 'retrait');
  const repayments = approvedTransactions.filter((transaction) => transaction.type === 'remboursement_dette');
  const periodExpenses = expenses.filter((expense) => withinBounds(expense.date, rangeBounds));

  const totalDeposits = deposits.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalWithdrawals = withdrawals.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalRepayments = repayments.reduce((sum, transaction) => sum + transaction.amount, 0);
  const totalCharges = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const totalEntries = approvedTransactions
    .filter((transaction) => transaction.type !== 'retrait')
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const processedEmployeePayments = employeePayments
    .filter((payment) => payment.status === 'processed')
    .reduce((sum, payment) => sum + payment.amount, 0);
  const totalExpensesForNet = totalCharges + totalWithdrawals + processedEmployeePayments;
  const netBalance = totalEntries - totalExpensesForNet;
  const profit = totalDeposits - totalWithdrawals - totalCharges;
  const cashBalance = totalDeposits + totalRepayments - totalWithdrawals - totalCharges;

  const todayStart = startOfDay(referenceDate);
  const todayEnd = new Date(todayStart.getTime() + 86_399_999);
  const todayTransactions = transactions.filter((transaction) => parseDate(transaction.date).getTime() >= todayStart.getTime() && parseDate(transaction.date).getTime() <= todayEnd.getTime());
  const todayDeposits = todayTransactions.filter((transaction) => transaction.status === 'approved' && (transaction.type === 'depot' || transaction.type === 'cotisation')).length;
  const todayWithdrawals = todayTransactions.filter((transaction) => transaction.status === 'approved' && transaction.type === 'retrait').length;
  const todayNewClients = clients.filter((client) => parseDate(client.createdAt).getTime() >= todayStart.getTime() && parseDate(client.createdAt).getTime() <= todayEnd.getTime()).length;

  const pendingOlderThanTwoDays = transactions.filter((transaction) => transaction.status === 'pending' && todayStart.getTime() - parseDate(transaction.date).getTime() > 2 * 86_400_000);
  const activeCodeRequests = codeRequests.filter((request) => request.status === 'pending' || request.status === 'generated');

  const dailySeries = useMemo(() => {
    const bucket = new Map<string, { deposits: number; withdrawals: number; charges: number; revenue: number }>();
    const selectedSource = rangeBounds ? [...transactions.filter((transaction) => withinBounds(transaction.date, rangeBounds)), ...periodExpenses.map((expense) => ({ date: expense.date, amount: expense.amount, type: 'expense' as const }))] : [...transactions.map((transaction) => ({ date: transaction.date, amount: transaction.amount, type: transaction.type } as const)), ...periodExpenses.map((expense) => ({ date: expense.date, amount: expense.amount, type: 'expense' as const }))];

    selectedSource.forEach((entry) => {
      const key = entry.date;
      if (!bucket.has(key)) bucket.set(key, { deposits: 0, withdrawals: 0, charges: 0, revenue: 0 });
      const current = bucket.get(key)!;
      if (entry.type === 'expense') {
        current.charges += entry.amount;
        return;
      }
      if (entry.type === 'retrait') current.withdrawals += entry.amount;
      if (entry.type === 'depot' || entry.type === 'cotisation') current.deposits += entry.amount;
      if (entry.type === 'remboursement_dette') current.revenue += entry.amount;
    });

    return [...bucket.entries()]
      .sort(([a], [b]) => parseDate(a).getTime() - parseDate(b).getTime())
      .map(([date, values]) => ({
        date: formatLabel(parseDate(date)),
        deposits: values.deposits,
        withdrawals: values.withdrawals,
        charges: values.charges,
        revenue: values.revenue,
      }));
  }, [periodExpenses, rangeBounds, transactions]);

  const clientTypeData = useMemo(() => {
    const counts = clients.reduce(
      (acc, client) => {
        acc[client.type] += 1;
        return acc;
      },
      { apprenant: 0, 'non-apprenant': 0, simple: 0 },
    );

    return [
      { name: 'Apprenants', value: counts.apprenant },
      { name: 'Non-apprenants', value: counts['non-apprenant'] },
      { name: 'Épargnants simples', value: counts.simple },
    ];
  }, [clients]);

  const commercialPerformance = useMemo(() => {
    return users
      .filter((user) => user.role === 'commercial')
      .map((commercial) => {
        const collected = approvedTransactions.filter((transaction) => transaction.collectedBy === commercial.id).reduce((sum, transaction) => sum + transaction.amount, 0);
        const activeClients = clients.filter((client) => client.assignedCommercialId === commercial.id).length;
        const activeDeposits = deposits.filter((transaction) => transaction.collectedBy === commercial.id).length;
        return {
          ...commercial,
          collected,
          activeClients,
          activeDeposits,
        };
      })
      .sort((a, b) => b.collected - a.collected);
  }, [approvedTransactions, clients, deposits, users]);

  const cashierPerformance = useMemo(() => {
    return users
      .filter((user) => user.role === 'caissier')
      .map((cashier) => {
        const withdrawalsHandled = withdrawals.filter((transaction) => transaction.validatedBy === cashier.id).length;
        const validatedDeposits = deposits.filter((transaction) => transaction.validatedBy === cashier.id).length;
        const handledExpenses = periodExpenses.filter((expense) => expense.recordedBy === cashier.id).length;
        const cashVolume = withdrawals.filter((transaction) => transaction.validatedBy === cashier.id).reduce((sum, transaction) => sum + transaction.amount, 0) + periodExpenses.filter((expense) => expense.recordedBy === cashier.id).reduce((sum, expense) => sum + expense.amount, 0) + deposits.filter((transaction) => transaction.validatedBy === cashier.id).reduce((sum, transaction) => sum + transaction.amount, 0);
        return {
          ...cashier,
          withdrawalsHandled,
          validatedDeposits,
          handledExpenses,
          cashVolume,
        };
      })
      .sort((a, b) => b.cashVolume - a.cashVolume);
  }, [deposits, periodExpenses, users, withdrawals]);

  const topCommercial = commercialPerformance[0];
  const bestDay = useMemo(() => {
    const daily = new Map<string, number>();
    allOperations.forEach((operation) => {
      const amount = operation.kind === 'expense' ? -operation.amount : operation.amount;
      daily.set(operation.date, (daily.get(operation.date) || 0) + amount);
    });
    const sorted = [...daily.entries()].sort((a, b) => b[1] - a[1]);
    if (!sorted.length) return null;
    return { date: sorted[0][0], profit: sorted[0][1] };
  }, [allOperations]);

  const alerts = useMemo(() => {
    const currentAlerts: { level: 'high' | 'medium' | 'low'; title: string; details: string }[] = [];
    if (cashBalance < 0) {
      currentAlerts.push({ level: 'high', title: 'Incohérence caisse', details: 'Le solde de caisse calculé est négatif. Vérifier les flux et les opérations de validation.' });
    }
    if (totalWithdrawals > totalDeposits * 0.8 && totalWithdrawals > 0) {
      currentAlerts.push({ level: 'high', title: 'Trop de retraits', details: 'Les retraits approchent ou dépassent un niveau critique par rapport aux dépôts du périmètre sélectionné.' });
    }
    if (pendingOlderThanTwoDays.length > 0) {
      currentAlerts.push({ level: 'medium', title: 'Opérations en attente', details: `${pendingOlderThanTwoDays.length} opération(s) sont en attente depuis plus de 48h.` });
    }
    const largeWithdrawal = withdrawals.find((transaction) => transaction.amount >= 50000);
    if (largeWithdrawal) {
      currentAlerts.push({ level: 'medium', title: 'Retrait élevé', details: `Retrait anormalement élevé détecté sur ${largeWithdrawal.clientName} (${formatMoney(largeWithdrawal.amount)}).` });
    }
    if (totalDeposits > 0 && totalCharges > totalDeposits * 0.35) {
      currentAlerts.push({ level: 'medium', title: 'Charges lourdes', details: 'Le niveau de charges représente une part élevée des dépôts sur la période.' });
    }
    if (totalDeposits > 0 && profit < 0) {
      currentAlerts.push({ level: 'high', title: 'Déficit détecté', details: 'La période analysée est déficitaire. Revoir la productivité, les retraits et les charges.' });
    }
    return currentAlerts;
  }, [cashBalance, profit, pendingOlderThanTwoDays.length, totalCharges, totalDeposits, totalWithdrawals, withdrawals]);

  const recentLogs = useMemo(() => logs.slice(0, 6), [logs]);
  const periodLabel = range === 'global' ? 'Global' : range === 'today' ? 'Aujourd’hui' : range === 'week' ? 'Cette semaine' : range === 'month' ? 'Ce mois' : range === 'year' ? 'Cette année' : 'Période personnalisée';

  const activityRows = [
    { label: 'Dépôts approuvés', value: todayDeposits },
    { label: 'Retraits approuvés', value: todayWithdrawals },
    { label: 'Nouveaux clients', value: todayNewClients },
    { label: 'En attente', value: transactions.filter((transaction) => transaction.status === 'pending').length },
  ];

  const handleExportCSV = () => {
    const rows = [
      ['date', 'type', 'montant', 'client', 'agent', 'statut', 'source'],
      ...allOperations.map((operation) => [
        operation.date,
        operation.label,
        String(operation.amount),
        operation.client,
        operation.agent,
        operation.status,
        operation.kind,
      ]),
    ];
    const csv = rows.map((row) => row.map(csvValue).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `waooo-rapport-${toDateKey(referenceDate)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateEditionCode = (user: User) => {
    const code = `EDIT-${user.id}-${toDateKey(referenceDate).replace(/-/g, '')}`;
    navigator.clipboard.writeText(code).catch(() => undefined);
    setFeedback(`Code d'édition copié pour ${user.name} : ${code}`);
  };

  const handleGenerateSensitiveCode = (requestId: string) => {
    const code = generateSensitiveCode(requestId, currentUser);
    setCodeRequests(refreshAdminCodeRequests());
    navigator.clipboard.writeText(code).catch(() => undefined);
    setFeedback(`Code généré et copié: ${code}. Validité: 10 minutes.`);
  };

  const refreshCodeRequests = () => {
    setCodeRequests(refreshAdminCodeRequests());
  };

  const handleToggleActive = (user: User) => {
    const updatedUsers = users.map((item) => (item.id === user.id ? { ...item, isActive: item.isActive === false ? true : false } : item));
    setUsers(updatedUsers);
    db.saveUsers(updatedUsers);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Activation compte', `${user.name} est maintenant ${user.isActive === false ? 'actif' : 'désactivé'}`);
    setFeedback(`${user.name} a été ${user.isActive === false ? 'réactivé' : 'désactivé'}.`);
  };

  const handleCreateUser = (e: FormEvent) => {
    e.preventDefault();
    if (!createName || !createEmail || !createPassword) {
      setFeedback('Veuillez remplir le nom, l’email et le mot de passe.');
      return;
    }

    if (users.some((item) => item.email === createEmail)) {
      setFeedback('Cet email existe déjà.');
      return;
    }

    const newUser: User = {
      id: `u_${Date.now()}`,
      name: createName,
      role: createRole,
      email: createEmail,
      password: createPassword,
      zone: createZone || undefined,
      isActive: true,
      createdAt: toDateKey(referenceDate),
    };

    const nextUsers = [...users, newUser];
    setUsers(nextUsers);
    db.saveUsers(nextUsers);
    db.addLog(currentUser.id, currentUser.name, currentUser.role, 'Création utilisateur', `Création du compte ${newUser.role} ${newUser.name}`);

    setCreateName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateZone('');
    setFeedback(`Compte ${newUser.role} créé avec succès.`);
  };

  const handlePositionPayment = () => {
    if (!selectedUser || selectedUser.role === 'admin') {
      setFeedback('Sélectionnez un employé éligible.');
      return;
    }

    if (paymentAmount <= 0) {
      setFeedback('Le montant à remettre doit être supérieur à 0.');
      return;
    }

    const payment: EmployeePayment = {
      id: 'pay_' + Date.now() + Math.random().toString(36).slice(2, 6),
      employeeId: selectedUser.id,
      employeeName: selectedUser.name,
      employeeRole: selectedUser.role,
      amount: paymentAmount,
      reason: paymentReason || undefined,
      status: 'pending',
      initiatedAt: new Date().toISOString(),
      initiatedBy: currentUser.id,
      initiatedByName: currentUser.name,
    };

    const updated = [payment, ...db.getEmployeePayments()];
    db.saveEmployeePayments(updated);
    setEmployeePayments(updated);
    db.addLog(
      currentUser.id,
      currentUser.name,
      currentUser.role,
      'Paiement Employé Positionné',
      `Paiement de ${formatMoney(paymentAmount)} positionné pour ${selectedUser.name}${paymentReason ? ` (${paymentReason})` : ''}.`,
    );
    setPaymentAmount(0);
    setPaymentReason('');
    setFeedback(`Paiement positionné pour ${selectedUser.name}. Le caissier a été notifié dans l'onglet Paiements.`);
  };

  const handleWipeData = async () => {
    setIsWiping(true);
    try {
      await api.wipeClients();
      // Clear local state
      setClients([]);
      setTransactions([]);
      // Clear local DB cache
      db.saveClients([]);
      db.saveTransactions([]);
      db.addLog(currentUser.id, currentUser.name, currentUser.role, 'REMISE À ZÉRO', 'Suppression totale de la base client et des transactions par l\'administrateur.');
      
      setFeedback('La base de données clients a été intégralement vidée.');
      setShowWipeConfirm(false);
      setWipeConfirmPhrase('');
    } catch (err: any) {
      setFeedback(`Erreur lors de la remise à zéro: ${err.message}`);
    } finally {
      setIsWiping(false);
    }
  };

  const userStats = {
    total: users.length,
    active: users.filter((user) => user.isActive !== false).length,
    inactive: users.filter((user) => user.isActive === false).length,
  };

  const clientStats = {
    total: clients.length,
    newInPeriod: clients.filter((client) => withinBounds(client.createdAt, rangeBounds)).length,
    active: clients.filter((client) => approvedTransactions.some((transaction) => transaction.clientId === client.id)).length,
    inactive: clients.filter((client) => !approvedTransactions.some((transaction) => transaction.clientId === client.id)).length,
  };

  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl shadow-slate-200/50">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-indigo-100">
              <ShieldAlert className="h-3.5 w-3.5" /> Cockpit Administrateur
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Pilotage global de Waooo Félicitation</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300">
                Vision financière, activité opérationnelle, contrôle des équipes et détection d’anomalies dans un seul espace décisionnel.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs text-slate-300">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Admin = pilotage, pas opération</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Dernière activité: {formatLabel(referenceDate)}</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Périmètre: {periodLabel}</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 no-print">
            <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/15">
              <FileDown className="h-4 w-4" /> PDF / Impression
            </button>
          </div>
        </div>
      </section>

      {activeCodeRequests.length > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-amber-950">Demandes de codes sensibles</h2>
              <p className="text-sm text-amber-800">Un caissier demande un code unique. Chaque code est valable 10 minutes et utilisable une seule fois.</p>
            </div>
            <button onClick={refreshCodeRequests} className="inline-flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-semibold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100">
              <RefreshCw className="h-3.5 w-3.5" /> Actualiser
            </button>
          </div>
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {activeCodeRequests.map((request) => (
              <div key={request.id} className="rounded-2xl border border-amber-200 bg-white p-4 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{actionTypeLabel(request.actionType)}</p>
                    <p className="mt-1 text-slate-600">{request.targetLabel}</p>
                    <p className="mt-1 text-xs text-slate-400">Demandé par {request.requestedByName} · {new Date(request.requestedAt).toLocaleString('fr-FR')}</p>
                    {request.expiresAt && <p className="mt-1 text-xs text-amber-700">Expire: {new Date(request.expiresAt).toLocaleTimeString('fr-FR')}</p>}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${request.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {request.status === 'pending' ? 'En attente' : 'Généré'}
                  </span>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {request.status === 'generated' && request.code && (
                    <code className="rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white">{request.code}</code>
                  )}
                  <button onClick={() => handleGenerateSensitiveCode(request.id)} className="rounded-xl bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                    {request.status === 'generated' ? 'Regénérer' : 'Générer le code'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Filtres de période</h2>
            <p className="text-sm text-slate-500">Analysez la caisse selon la fenêtre de contrôle souhaitée.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {(['global', 'today', 'week', 'month', 'year', 'custom'] as RangeKey[]).map((item) => (
              <button
                key={item}
                onClick={() => setRange(item)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${range === item ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                {item === 'global' ? 'Global' : item === 'today' ? 'Aujourd’hui' : item === 'week' ? 'Semaine' : item === 'month' ? 'Mois' : item === 'year' ? 'Année' : 'Custom'}
              </button>
            ))}
          </div>
        </div>
        {range === 'custom' && (
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold text-slate-500">Début</span>
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold text-slate-500">Fin</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500" />
            </label>
          </div>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        {[
          { label: 'Solde net', value: netBalance, icon: Banknote, tone: netBalance >= 0 ? 'text-emerald-700' : 'text-rose-700', bg: netBalance >= 0 ? 'bg-emerald-50' : 'bg-rose-50', sub: `Entrées ${formatMoney(totalEntries)} - dépenses ${formatMoney(totalExpensesForNet)}` },
          { label: 'Dépôts', value: totalDeposits, icon: ArrowUpRight, tone: 'text-emerald-600', bg: 'bg-emerald-50', sub: `Global: ${formatMoney(globalDeposits.reduce((sum, transaction) => sum + transaction.amount, 0))}` },
          { label: 'Retraits', value: totalWithdrawals, icon: ArrowDownRight, tone: 'text-rose-600', bg: 'bg-rose-50', sub: `Global: ${formatMoney(globalWithdrawals.reduce((sum, transaction) => sum + transaction.amount, 0))}` },
          { label: 'Charges', value: totalCharges, icon: Wallet, tone: 'text-amber-600', bg: 'bg-amber-50', sub: `Global: ${formatMoney(globalExpenses.reduce((sum, expense) => sum + expense.amount, 0))}` },
          { label: 'Solde de caisse', value: cashBalance, icon: Banknote, tone: 'text-indigo-600', bg: 'bg-indigo-50', sub: 'Entrées - sorties - charges' },
          { label: 'Bénéfice / déficit', value: profit, icon: LineChart, tone: profit >= 0 ? 'text-slate-900' : 'text-rose-600', bg: profit >= 0 ? 'bg-slate-50' : 'bg-rose-50', sub: 'Dépôts - retraits - charges' },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-500">{card.label}</p>
                  <h3 className={`mt-2 text-2xl font-semibold ${card.tone}`}>{formatMoney(card.value)}</h3>
                </div>
                <div className={`rounded-xl p-3 ${card.bg}`}>
                  <Icon className={`h-5 w-5 ${card.tone}`} />
                </div>
              </div>
              <p className="mt-3 text-xs text-slate-500">{card.sub}</p>
            </article>
          );
        })}
      </section>

      {/* Caisse Commune Assurance — temps réel */}
      <InsuranceFundCard variant="full" />

      <section className="grid gap-6 xl:grid-cols-[1.6fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Évolution des flux</h2>
              <p className="text-sm text-slate-500">Dépôts, retraits et charges dans la période sélectionnée.</p>
            </div>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ReLineChart data={dailySeries} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="deposits" name="Dépôts" stroke="#22c55e" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="withdrawals" name="Retraits" stroke="#ef4444" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="charges" name="Charges" stroke="#f59e0b" strokeWidth={2} dot={false} />
              </ReLineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Analyse client</h2>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total clients</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{clientStats.total}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Nouveaux clients</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{clientStats.newInPeriod}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Clients actifs</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{clientStats.active}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Clients inactifs</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">{clientStats.inactive}</p>
              </div>
            </div>
            <div className="mt-4 h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={clientTypeData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={64} paddingAngle={4}>
                    {clientTypeData.map((entry, index) => (
                      <Cell key={entry.name} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Widgets intelligents</h2>
            <div className="mt-4 space-y-3 text-sm">
              <div className="flex items-start gap-3 rounded-xl bg-emerald-50 p-3 text-emerald-800">
                <Sparkles className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">Top commercial du mois</p>
                  <p>{topCommercial ? `${topCommercial.name} avec ${formatMoney(topCommercial.collected)}` : 'Aucune donnée disponible'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl bg-slate-50 p-3 text-slate-800">
                <CalendarDays className="mt-0.5 h-4 w-4 text-indigo-600" />
                <div>
                  <p className="font-semibold">Jour le plus rentable</p>
                  <p>{bestDay ? `${formatLabel(parseDate(bestDay.date))} avec ${formatMoney(bestDay.profit)}` : 'Aucune donnée disponible'}</p>
                </div>
              </div>
              <div className={`flex items-start gap-3 rounded-xl p-3 ${alerts.length ? 'bg-rose-50 text-rose-800' : 'bg-emerald-50 text-emerald-800'}`}>
                <ShieldAlert className="mt-0.5 h-4 w-4" />
                <div>
                  <p className="font-semibold">Risque détecté aujourd’hui</p>
                  <p>{alerts.length ? alerts[0].title : 'Aucun signal critique sur la période observée'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Activité opérationnelle</h2>
              <p className="text-sm text-slate-500">Flux en temps réel et dernière activité enregistrée.</p>
            </div>
            <button onClick={() => setFeedback(`Flux recalculés pour ${periodLabel}.`)} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200">
              <RefreshCw className="h-3.5 w-3.5" /> Actualiser
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-4">
            {activityRows.map((item) => (
              <div key={item.label} className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">{item.label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Type</th>
                  <th className="px-4 py-3 text-left font-semibold">Montant</th>
                  <th className="px-4 py-3 text-left font-semibold">Agent</th>
                  <th className="px-4 py-3 text-left font-semibold">Client / libellé</th>
                  <th className="px-4 py-3 text-left font-semibold">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {allOperations.slice(0, 8).map((operation, index) => (
                  <tr key={`${operation.kind}-${operation.date}-${index}`} className="text-slate-700">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${operation.kind === 'expense' ? 'bg-amber-50 text-amber-700' : operation.label === 'retrait' ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                        {operation.kind === 'expense' ? 'Charge' : operation.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatMoney(operation.amount)}</td>
                    <td className="px-4 py-3">{operation.agent}</td>
                    <td className="px-4 py-3">{operation.client}</td>
                    <td className="px-4 py-3 text-slate-500">{operation.date}</td>
                  </tr>
                ))}
                {allOperations.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-400">Aucune opération sur la période choisie.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Suivi des risques & anomalies</h2>
            <div className="mt-4 space-y-3">
              {alerts.length === 0 ? (
                <div className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
                  Aucun signal critique détecté.
                </div>
              ) : (
                alerts.map((alert) => (
                  <div key={alert.title} className={`rounded-xl border p-3 text-sm ${alert.level === 'high' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 h-4 w-4" />
                      <div>
                        <p className="font-semibold">{alert.title}</p>
                        <p className="mt-1 text-sm opacity-90">{alert.details}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-base font-semibold text-slate-900">Journal global</h2>
            <div className="mt-4 space-y-3">
              {recentLogs.map((entry) => (
                <div key={entry.id} className="rounded-xl bg-slate-50 p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold text-slate-900">{entry.action}</p>
                    <span className="text-xs text-slate-400">{entry.timestamp}</span>
                  </div>
                  <p className="mt-1 text-slate-600">{entry.userName} - {entry.details}</p>
                </div>
              ))}
              {recentLogs.length === 0 && <p className="text-sm text-slate-400">Aucun log disponible.</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Performance des commerciaux</h2>
          <p className="text-sm text-slate-500">Classement, volume collecté et portefeuille client.</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Commercial</th>
                  <th className="px-4 py-3 text-left font-semibold">Collecté</th>
                  <th className="px-4 py-3 text-left font-semibold">Clients actifs</th>
                  <th className="px-4 py-3 text-left font-semibold">Dépôts</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {commercialPerformance.map((commercial, index) => (
                  <tr key={commercial.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-indigo-50 text-xs font-semibold text-indigo-600">{index + 1}</span>
                        <div>
                          <p className="font-semibold text-slate-900">{commercial.name}</p>
                          <p className="text-xs text-slate-500">{commercial.zone || 'Sans zone'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(commercial.collected)}</td>
                    <td className="px-4 py-3 text-slate-600">{commercial.activeClients}</td>
                    <td className="px-4 py-3 text-slate-600">{commercial.activeDeposits}</td>
                  </tr>
                ))}
                {commercialPerformance.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Aucun commercial.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Performance des caissiers</h2>
          <p className="text-sm text-slate-500">Volume manipulé, retraits traités et charges enregistrées.</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Caissier</th>
                  <th className="px-4 py-3 text-left font-semibold">Retraits</th>
                  <th className="px-4 py-3 text-left font-semibold">Charges</th>
                  <th className="px-4 py-3 text-left font-semibold">Volume</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {cashierPerformance.map((cashier) => (
                  <tr key={cashier.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{cashier.name}</p>
                      <p className="text-xs text-slate-500">{cashier.zone || 'Agence'}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{cashier.withdrawalsHandled}</td>
                    <td className="px-4 py-3 text-slate-600">{cashier.handledExpenses}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{formatMoney(cashier.cashVolume)}</td>
                  </tr>
                ))}
                {cashierPerformance.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-slate-400">Aucun caissier.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">Actions administratives rapides</h2>
          <p className="text-sm text-slate-500">Créer, sécuriser et consulter les comptes sans toucher aux clients.</p>
          <form onSubmit={handleCreateUser} className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold text-slate-500">Nom complet</span>
              <input value={createName} onChange={(e) => setCreateName(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500" placeholder="Ex: Alice Kouassi" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold text-slate-500">Email</span>
              <input value={createEmail} onChange={(e) => setCreateEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500" placeholder="agent@waooo.com" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold text-slate-500">Mot de passe</span>
              <input value={createPassword} onChange={(e) => setCreatePassword(e.target.value)} type="password" className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500" placeholder="********" />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-semibold text-slate-500">Rôle</span>
              <select value={createRole} onChange={(e) => setCreateRole(e.target.value as Exclude<UserRole, 'admin'>)} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500">
                <option value="caissier">Caissier</option>
                <option value="commercial">Commercial</option>
              </select>
            </label>
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="text-xs font-semibold text-slate-500">Zone / agence</span>
              <input value={createZone} onChange={(e) => setCreateZone(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2 outline-none focus:border-indigo-500" placeholder="Zone A, Agence Centre..." />
            </label>
            <div className="md:col-span-2 flex flex-wrap items-center gap-2">
              <button className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                <Users className="h-4 w-4" /> Créer le compte
              </button>
              <button type="button" onClick={() => setFeedback('Génération de code disponible depuis la liste des comptes.')} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                <ClipboardList className="h-4 w-4" /> Générer un code d’édition
              </button>
              <button type="button" onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                <Download className="h-4 w-4" /> Export rapport CSV
              </button>
            </div>
          </form>
          {feedback && <p className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-600">{feedback}</p>}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Répartition des comptes</h2>
              <p className="text-sm text-slate-500">Actifs, inactifs et visibilité rapide des utilisateurs.</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">{userStats.active}/{userStats.total} actifs</div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-xs text-slate-500">Total</p>
              <p className="mt-1 text-lg font-semibold text-slate-900">{userStats.total}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-xs text-emerald-700">Actifs</p>
              <p className="mt-1 text-lg font-semibold text-emerald-900">{userStats.active}</p>
            </div>
            <div className="rounded-xl bg-rose-50 p-3">
              <p className="text-xs text-rose-700">Désactivés</p>
              <p className="mt-1 text-lg font-semibold text-rose-900">{userStats.inactive}</p>
            </div>
          </div>
          <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-700">Utilisateurs</div>
            <div className="max-h-80 divide-y divide-slate-100 overflow-auto">
              {users.filter((user) => user.name.toLowerCase().includes(searchUser.toLowerCase()) || user.email.toLowerCase().includes(searchUser.toLowerCase())).map((user) => (
                <div key={user.id} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50">
                  <div>
                    <p className="font-semibold text-slate-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email} • {user.role}{user.zone ? ` • ${user.zone}` : ''}</p>
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${user.isActive === false ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'}`}>
                      {user.isActive === false ? 'Inactif' : 'Actif'}
                    </span>
                    <button onClick={() => setSelectedUser(user)} className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-emerald-50 hover:text-emerald-700">
                      Détails
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={searchUser} onChange={(e) => setSearchUser(e.target.value)} placeholder="Consulter un utilisateur" className="w-full bg-transparent text-sm outline-none" />
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Rapports rapides</h2>
            <p className="text-sm text-slate-500">Export, historique et accès direct aux zones de contrôle.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportCSV} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Download className="h-4 w-4" /> CSV</button>
            <button onClick={() => window.print()} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200"><FileDown className="h-4 w-4" /> PDF</button>
          </div>
        </div>
      </section>

      {/* ── Zone de Danger ────────────────────────────────────────────────── */}
      <section className="rounded-3xl border-2 border-rose-100 bg-rose-50/50 p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-rose-900 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" /> Zone de Danger
            </h2>
            <p className="text-sm text-rose-700 max-w-xl">
              Cette action supprimera **définitivement** tous les clients, comptes (épargne/tontine), dettes scolaires et transactions. 
              Utilisez cette option uniquement si vous souhaitez recommencer l'importation de zéro.
            </p>
          </div>
          <button 
            onClick={() => setShowWipeConfirm(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-6 py-3 text-sm font-bold text-white hover:bg-rose-700 shadow-lg shadow-rose-200 transition-all hover:scale-105 active:scale-95"
          >
            <RefreshCw className="h-4 w-4" /> Remise à zéro de la base
          </button>
        </div>
      </section>

      {showWipeConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl ring-4 ring-rose-500/20">
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-rose-100">
                <AlertTriangle className="h-8 w-8 text-rose-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-slate-900">Confirmation de suppression</h3>
                <p className="text-sm text-slate-600 leading-relaxed">
                  Êtes-vous absolument sûr ? Cette action est **irréversible**. <br/>
                  Toutes les données clients et transactions seront effacées du serveur et de votre navigateur.
                </p>
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-bold text-rose-700 uppercase tracking-wider">Écrivez "j'approuve" pour confirmer :</p>
                  <input 
                    type="text" 
                    value={wipeConfirmPhrase}
                    onChange={(e) => setWipeConfirmPhrase(e.target.value.toLowerCase())}
                    className="w-full rounded-xl border-2 border-slate-200 px-4 py-2 text-center font-bold outline-none focus:border-rose-500"
                    placeholder="Ecrivez ici..."
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 pt-2">
                <button 
                  onClick={handleWipeData}
                  disabled={isWiping || wipeConfirmPhrase !== "j'approuve"}
                  className="w-full rounded-2xl bg-rose-600 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  {isWiping ? 'Suppression en cours...' : 'Confirmer la suppression'}
                </button>
                <button 
                  onClick={() => setShowWipeConfirm(false)}
                  disabled={isWiping}
                  className="w-full rounded-2xl bg-slate-100 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Fiche utilisateur</h3>
                <p className="text-sm text-slate-500">Consulter et piloter le compte.</p>
              </div>
              <button onClick={() => setSelectedUser(null)} className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-2xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Nom</p>
                <p className="font-semibold text-slate-900">{selectedUser.name}</p>
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Rôle</p><p className="font-semibold text-slate-900 capitalize">{selectedUser.role}</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Statut</p><p className="font-semibold text-slate-900">{selectedUser.isActive === false ? 'Désactivé' : 'Actif'}</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Email</p><p className="font-semibold text-slate-900">{selectedUser.email}</p></div>
                <div className="rounded-2xl bg-slate-50 p-3"><p className="text-xs text-slate-500">Zone</p><p className="font-semibold text-slate-900">{selectedUser.zone || 'N/A'}</p></div>
              </div>
            </div>
            {selectedUser.role !== 'admin' && (
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-[#228B22] p-2 text-white">
                    <HandCoins className="h-4 w-4" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <p className="text-sm font-semibold text-emerald-950">Positionner un paiement pour le caissier</p>
                      <p className="mt-1 text-xs text-emerald-700">Le caissier recevra cette notification dans son espace Paiements.</p>
                    </div>
                    <label className="block space-y-1 text-sm">
                      <span className="text-xs font-semibold text-emerald-700">Montant à remettre</span>
                      <input
                        type="number"
                        value={paymentAmount || ''}
                        onChange={(event) => setPaymentAmount(Number(event.target.value))}
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 outline-none focus:border-emerald-600"
                        placeholder="Ex: 20000"
                      />
                    </label>
                    <label className="block space-y-1 text-sm">
                      <span className="text-xs font-semibold text-emerald-700">Motif / commentaire</span>
                      <input
                        value={paymentReason}
                        onChange={(event) => setPaymentReason(event.target.value)}
                        className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-2 outline-none focus:border-emerald-600"
                        placeholder="Prime, avance, remboursement transport..."
                      />
                    </label>
                    <button onClick={handlePositionPayment} className="inline-flex items-center gap-2 rounded-xl bg-[#228B22] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a6d1a]">
                      <HandCoins className="h-4 w-4" /> Valider et notifier le caissier
                    </button>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-5 flex flex-wrap gap-2">
              <button onClick={() => handleGenerateEditionCode(selectedUser)} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"><Copy className="h-4 w-4" /> Générer code</button>
              <button onClick={() => handleToggleActive(selectedUser)} className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200">
                {selectedUser.isActive === false ? <CheckCircle2 className="h-4 w-4" /> : <CircleAlert className="h-4 w-4" />}
                {selectedUser.isActive === false ? 'Réactiver' : 'Désactiver'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}