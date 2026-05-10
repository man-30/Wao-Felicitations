import React, { useState } from 'react';
import { User, UserRole } from '../types';
import { db } from '../localStorageDB';
import { Lock, UserCheck, Shield, Wallet, Users } from 'lucide-react';
import confetti from 'canvas-confetti';
import api from '../config/api';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [useBackend, setUseBackend] = useState(true);

  const users = db.getUsers();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (useBackend) {
        // API Backend authentication
        const response = await api.login(email, password);
        localStorage.setItem('auth_token', response.token);
        localStorage.setItem('current_user', JSON.stringify(response.user));
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
        });
        onLoginSuccess(response.user);
      } else {
        // LocalStorage fallback
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
          if (user.isActive === false) {
            setError('Ce compte est désactivé. Contactez un administrateur.');
            return;
          }
          db.addLog(user.id, user.name, user.role, 'Connexion', 'Utilisateur connecté avec succès');
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 }
          });
          onLoginSuccess(user);
        } else {
          setError('Identifiants incorrects');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erreur de connexion');
      // Fallback to localStorage on network error
      if (err.message.includes('fetch')) {
        setUseBackend(false);
        setError('Backend indisponible. Mode hors ligne activé.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (user: User) => {
    if (user.isActive === false) {
      setError('Ce compte est désactivé.');
      return;
    }
    localStorage.removeItem('auth_token');
    localStorage.setItem('current_user', JSON.stringify(user));
    db.addLog(user.id, user.name, user.role, 'Connexion', `Connexion rapide en tant que ${user.name}`);
    confetti({
      particleCount: 50,
      spread: 50,
      origin: { y: 0.6 }
    });
    onLoginSuccess(user);
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-700 flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>;
      case 'caissier':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-blue-100 text-blue-700 flex items-center gap-1"><Wallet className="w-3 h-3" /> Caissier</span>;
      case 'commercial':
        return <span className="px-2 py-1 text-xs font-semibold rounded bg-green-100 text-green-700 flex items-center gap-1"><Users className="w-3 h-3" /> Commercial</span>;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-md border border-gray-100">
        <div className="text-center">
          <img
            src="/waooo-logo.png"
            alt="Logo Waooo Félicitation"
            className="mx-auto h-24 w-24 rounded-full bg-white object-contain p-2 shadow-sm ring-1 ring-gray-100"
          />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Waooo Félicitation
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Plateforme d'Épargne et Financement
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleLogin}>
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm font-medium border border-red-200">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm -space-y-px">
            <div className="relative">
              <label htmlFor="email-address" className="sr-only">Email</label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Adresse Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="relative">
              <label htmlFor="password" className="sr-only">Mot de passe</label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="appearance-none rounded-none relative block w-full px-3 py-3 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-indigo-500 group-hover:text-indigo-400" aria-hidden="true" />
              </span>
              Se connecter
            </button>
          </div>
        </form>

        <div className="mt-8">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">Accès rapide (Mode MVP)</span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            {users.map(user => (
              <button
                key={user.id}
                onClick={() => handleQuickLogin(user)}
                className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-semibold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  {getRoleBadge(user.role)}
                  <UserCheck className="w-4 h-4 text-gray-400" />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
