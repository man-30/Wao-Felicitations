import { useState } from 'react';
import { User, UserRole } from '../types';
import {
  ArrowDownLeft,
  CalendarDays,
  ClipboardList,
  CreditCard,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  ShoppingBag,
  UserCircle,
  Users,
  Wallet,
  X,
} from 'lucide-react';

interface SidebarProps {
  currentUser: User;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

export default function Sidebar({ currentUser, activeTab, setActiveTab, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getNavItems = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return [
          { id: 'dashboard', label: 'Cockpit', icon: LayoutDashboard },
          { id: 'clients', label: 'Clients', icon: Users },
          { id: 'users', label: 'Utilisateurs', icon: Users },
          { id: 'logs', label: 'Audit', icon: ShieldCheck },
        ];
      case 'caissier':
        return [
          { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
          { id: 'clients', label: 'Clients', icon: Users },
          { id: 'accounts', label: 'Comptes', icon: CreditCard },
          { id: 'apprenants', label: 'Tontine Scolaire', icon: GraduationCap },
          { id: 'cotisations', label: 'Suivi Cotisations', icon: CalendarDays },
          { id: 'financements', label: 'Financement Biens', icon: ShoppingBag },
          { id: 'deposits', label: 'Dépôts', icon: Wallet },
          { id: 'withdrawals', label: 'Retraits', icon: ArrowDownLeft },
          { id: 'audit', label: 'Audit', icon: ClipboardList },
        ];
      case 'commercial':
        return [
          { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
        ];
    }
  };

  const navItems = getNavItems(currentUser.role);
  const activeItem = navItems.find((item) => item.id === activeTab) || navItems[0];
  const ActiveIcon = activeItem.icon;

  const selectTab = (tab: string) => {
    setActiveTab(tab);
    setIsOpen(false);
  };

  const logout = () => {
    setIsOpen(false);
    onLogout();
  };

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur-xl">
        <div className="flex h-16 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src="/waooo-logo.png"
              alt="Logo Waooo Félicitation"
              className="h-11 w-11 flex-shrink-0 rounded-full bg-white object-contain shadow-sm ring-1 ring-slate-100"
            />
            <div className="min-w-0">
              <p className="truncate text-sm font-black tracking-tight text-slate-950 sm:text-base">Waooo Félicitation</p>
              <div className="mt-0.5 hidden items-center gap-2 text-xs text-slate-500 sm:flex">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">
                  <ActiveIcon className="h-3 w-3" /> {activeItem.label}
                </span>
                <span className="h-1 w-1 rounded-full bg-[#D4AF37]" />
                <span className="capitalize">{currentUser.role}</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-emerald-200 hover:bg-emerald-50"
            aria-haspopup="dialog"
            aria-expanded={isOpen}
          >
            <div className="hidden sm:block">
              <p className="max-w-44 truncate text-sm font-semibold text-slate-900">{currentUser.name}</p>
              <p className="text-xs capitalize text-slate-500">{currentUser.zone || currentUser.role}</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-[#228B22] to-[#1a6d1a] text-white shadow-sm">
              <UserCircle className="h-6 w-6" />
            </div>
          </button>
        </div>
      </header>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="ml-auto flex max-h-[calc(100vh-1.5rem)] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/70 bg-white shadow-2xl sm:max-h-[calc(100vh-3rem)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-[#228B22] via-[#1a6d1a] to-[#DC2626] p-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <img src="/waooo-logo.png" alt="Logo" className="h-12 w-12 rounded-full bg-white object-contain p-1" />
                  <div>
                    <p className="text-base font-black">Menu utilisateur</p>
                    <p className="mt-0.5 text-xs text-white/80">Navigation rapide et compte</p>
                  </div>
                </div>
                <button onClick={() => setIsOpen(false)} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="border-b border-slate-100 p-5">
              <p className="text-sm font-bold text-slate-950">{currentUser.name}</p>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 capitalize">{currentUser.role}</span>
                {currentUser.zone && <span>{currentUser.zone}</span>}
              </div>
            </div>

            <nav className="flex-1 overflow-y-auto p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectTab(item.id)}
                      className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                        isActive
                          ? 'border-emerald-200 bg-emerald-50 text-emerald-900 shadow-sm'
                          : 'border-slate-100 bg-white text-slate-700 hover:border-[#D4AF37]/50 hover:bg-[#fffcf5]'
                      }`}
                    >
                      <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${isActive ? 'bg-[#228B22] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        <Icon className="h-4 w-4" />
                      </span>
                      <span className="text-sm font-semibold leading-tight">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="border-t border-slate-100 bg-slate-50 p-4">
              <button
                onClick={logout}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-4 py-3 text-sm font-bold text-white transition hover:bg-[#b91c1c]"
              >
                <LogOut className="h-4 w-4" /> Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}