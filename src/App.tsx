import { useState } from 'react';
import { User } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import AdminCockpit from './components/AdminCockpit';
import AdminUsers from './components/AdminUsers';
import ActionLogs from './components/ActionLogs';
import ClientManagement from './components/ClientManagement';
import SavingsManagement from './components/SavingsManagement';
import WithdrawalManagement from './components/WithdrawalManagement';
import ProductsAndCharges from './components/ProductsAndCharges';
import CommercialDashboard from './components/CommercialDashboard';
import CashierDashboard from './components/CashierDashboard';
import CashierCaisse from './components/CashierCaisse';
import CashierAccounts from './components/CashierAccounts';
import CashierAudit from './components/CashierAudit';
import ApprenantEnrollment from './components/ApprenantEnrollment';
import ApprenantSuivi from './components/ApprenantSuivi';
import NonApprenantFinancement from './components/NonApprenantFinancement';
import CashierPayments from './components/CashierPayments';
import InsuranceFundManagement from './components/InsuranceFundManagement';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('current_user');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as User;
    } catch {
      return null;
    }
  });
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  if (!user) {
    return <Login onLoginSuccess={(u) => { setUser(u); setActiveTab('dashboard'); }} />;
  }

  const handleLogout = () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('current_user');
    setUser(null);
  };

  const renderContent = () => {
    switch (user.role) {
      case 'admin':
        if (activeTab === 'dashboard') return <AdminCockpit currentUser={user} />;
        if (activeTab === 'clients')   return <ClientManagement currentUser={user} />;
        if (activeTab === 'users')     return <AdminUsers currentUser={user} />;
        if (activeTab === 'logs')      return <ActionLogs />;
        return <AdminCockpit currentUser={user} />;

      case 'caissier':
        if (activeTab === 'dashboard')   return <CashierDashboard currentUser={user} />;
        if (activeTab === 'clients')     return <ClientManagement currentUser={user} />;
        if (activeTab === 'accounts')    return <CashierAccounts currentUser={user} />;
        if (activeTab === 'apprenants')  return <ApprenantEnrollment currentUser={user} />;
        if (activeTab === 'cotisations') return <ApprenantSuivi currentUser={user} />;
        if (activeTab === 'financements')return <NonApprenantFinancement currentUser={user} />;
        if (activeTab === 'deposits')    return <SavingsManagement currentUser={user} />;
        if (activeTab === 'payments')    return <CashierPayments currentUser={user} />;
        if (activeTab === 'withdrawals') return <WithdrawalManagement currentUser={user} />;
        if (activeTab === 'expenses')    return <ProductsAndCharges currentUser={user} />;
        if (activeTab === 'insurance')   return <InsuranceFundManagement currentUser={user} />;
        if (activeTab === 'caisse')      return <CashierCaisse currentUser={user} />;
        if (activeTab === 'audit')       return <CashierAudit currentUser={user} />;
        return <CashierDashboard currentUser={user} />;

      case 'commercial':
        return <CommercialDashboard currentUser={user} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar
        currentUser={user}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onLogout={handleLogout}
      />
      <main className="w-full px-3 py-4 sm:px-5 lg:px-8 lg:py-6">
        <div className="mx-auto w-full max-w-[1800px]">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
