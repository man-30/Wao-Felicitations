import { useState } from 'react';
import { User } from './types';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import AdminCockpit from './components/AdminCockpit';
import AdminUsers from './components/AdminUsers';
import ActionLogs from './components/ActionLogs';
import ClientManagement from './components/ClientManagement';
import CommercialDashboard from './components/CommercialDashboard';
import CashierCaisse from './components/CashierCaisse';
import CashierAccounts from './components/CashierAccounts';
import CashierAudit from './components/CashierAudit';
import ApprenantEnrollment from './components/ApprenantEnrollment';
import ApprenantSuivi from './components/ApprenantSuivi';
import NonApprenantFinancement from './components/NonApprenantFinancement';

export default function App() {
  const [user, setUser] = useState<User | null>(() => {
    const stored = sessionStorage.getItem('current_user');
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
    sessionStorage.removeItem('auth_token');
    sessionStorage.removeItem('current_user');
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
        if (activeTab === 'dashboard')   return <CashierCaisse currentUser={user} />;
        if (activeTab === 'clients')     return <ClientManagement currentUser={user} />;
        if (activeTab === 'accounts')    return <CashierAccounts currentUser={user} />;
        if (activeTab === 'apprenants')  return <ApprenantEnrollment currentUser={user} />;
        if (activeTab === 'cotisations') return <ApprenantSuivi currentUser={user} />;
        if (activeTab === 'financements')return <NonApprenantFinancement currentUser={user} />;
        if (activeTab === 'caisse')      return <CashierCaisse currentUser={user} />;
        if (activeTab === 'audit')       return <CashierAudit currentUser={user} />;
        return <CashierCaisse currentUser={user} />;

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
