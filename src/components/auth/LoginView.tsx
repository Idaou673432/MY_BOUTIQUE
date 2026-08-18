import React, { useState, useEffect } from 'react';
import {
  Lock,
  User,
  KeyRound,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
  CheckCircle2,
  Monitor,
  Store,
  LogIn,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { UserRole } from '../../types';

interface LoginViewProps {
  onLoginSuccess?: (role: UserRole) => void;
}

const LOCAL_STORAGE_SAVED_USERNAME_KEY = 'boutique_mali_workstation_username';

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const { settings, loginWithCredentials } = useStore();

  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [rememberUser, setRememberUser] = useState<boolean>(true);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showHelpModal, setShowHelpModal] = useState<boolean>(false);

  // Load remembered username for this PC on initial render
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem(LOCAL_STORAGE_SAVED_USERNAME_KEY);
      if (savedUser) {
        setUsername(savedUser);
      }
    } catch (e) {
      console.warn('localStorage error', e);
    }
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const cleanUsername = username.trim();
    const cleanPassword = password.trim();

    if (!cleanUsername) {
      setErrorMsg('Veuillez saisir votre nom d\'utilisateur ou identifiant.');
      return;
    }

    if (!cleanPassword) {
      setErrorMsg('Veuillez renseigner votre mot de passe ou code PIN.');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    setTimeout(() => {
      const result = loginWithCredentials(cleanUsername, cleanPassword);
      setIsLoading(false);

      if (result.success && result.user) {
        // Save or remove remembered username on this PC
        try {
          if (rememberUser) {
            localStorage.setItem(LOCAL_STORAGE_SAVED_USERNAME_KEY, cleanUsername);
          } else {
            localStorage.removeItem(LOCAL_STORAGE_SAVED_USERNAME_KEY);
          }
        } catch (err) {
          console.warn('localStorage save failed', err);
        }

        if (onLoginSuccess) {
          onLoginSuccess(result.user.role);
        }
      } else {
        setErrorMsg(result.message || 'Nom d\'utilisateur ou mot de passe incorrect.');
        setPassword('');
      }
    }, 250);
  };

  const handleForgetSavedUser = () => {
    setUsername('');
    setPassword('');
    setErrorMsg(null);
    try {
      localStorage.removeItem(LOCAL_STORAGE_SAVED_USERNAME_KEY);
    } catch (e) {
      // ignore
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 text-slate-100 font-sans relative overflow-hidden">
      {/* Background Ambience Glow */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-emerald-600/15 rounded-full blur-3xl pointer-events-none" />

      {/* Main Authentication Container */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden z-10 animate-in fade-in zoom-in-95">
        
        {/* Header with Store Branding & Mali Badge */}
        <div className="p-6 sm:p-7 border-b border-slate-800 bg-slate-900/80 text-center relative">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 rounded-full text-[11px] font-bold mb-4 shadow-inner">
            <span>🇲🇱</span> Mali - Bamako
          </div>

          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white font-black text-2xl mx-auto mb-3 shadow-lg shadow-indigo-600/30">
            {settings.storeName ? settings.storeName.charAt(0).toUpperCase() : <Store className="w-7 h-7" />}
          </div>

          <h1 className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
            {settings.storeName || 'BOUTIQUE MALI PRO'}
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            {settings.storeTagline || 'Commerce Général & Vente au détail'}
          </p>

          <div className="mt-3 flex items-center justify-center gap-2 text-[11px] text-indigo-300 bg-indigo-950/40 border border-indigo-900/50 py-1.5 px-3 rounded-xl max-w-xs mx-auto">
            <Monitor className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="font-semibold truncate">Connexion Poste Individuel Sécurisé</span>
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
          
          {/* Error notification banner */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-950/70 border border-rose-800/80 rounded-2xl text-rose-300 text-xs font-semibold flex items-center gap-2.5 animate-in shake">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Username Input Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Nom d'utilisateur attribué *</span>
              </label>
              {username && (
                <button
                  type="button"
                  onClick={handleForgetSavedUser}
                  className="text-[10px] text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Effacer
                </button>
              )}
            </div>

            <div className="relative">
              <input
                type="text"
                required
                autoFocus={!username}
                autoComplete="username"
                placeholder="Ex: MD, fatou.gerante, ibrahim.caisse..."
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full pl-3.5 pr-4 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all"
              />
            </div>
            <p className="text-[10px] text-slate-500">
              Identifiant, numéro de téléphone ou adresse email assigné par votre gérant.
            </p>
          </div>

          {/* Password / PIN Input Field */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                <span>Mot de passe / Code PIN *</span>
              </label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 transition-colors"
              >
                {showPassword ? (
                  <>
                    <EyeOff className="w-3.5 h-3.5" />
                    <span>Masquer</span>
                  </>
                ) : (
                  <>
                    <Eye className="w-3.5 h-3.5" />
                    <span>Afficher</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrorMsg(null);
                }}
                className="w-full pl-3.5 pr-10 py-3 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-medium text-white placeholder:text-slate-600 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none transition-all tracking-wider"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <Lock className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Remember username on this PC checkbox */}
          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-400 hover:text-slate-300">
              <input
                type="checkbox"
                checked={rememberUser}
                onChange={(e) => setRememberUser(e.target.checked)}
                className="rounded bg-slate-950 border-slate-700 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
              />
              <span>Mémoriser mon identifiant sur ce PC</span>
            </label>

            <button
              type="button"
              onClick={() => setShowHelpModal(true)}
              className="text-[11px] text-slate-500 hover:text-indigo-400 flex items-center gap-1"
            >
              <HelpCircle className="w-3 h-3" />
              <span>Aide</span>
            </button>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              id="btn-workstation-login-submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-2xl text-xs sm:text-sm font-bold shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  <span>Ouvrir ma Session de Travail</span>
                </>
              )}
            </button>
          </div>
        </form>

        {/* Security & Confidentiality Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800/80 text-center space-y-1.5">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Accès individuel et confidentiel</span>
          </div>
          <p className="text-[10px] text-slate-500 leading-tight">
            Les autres utilisateurs ne peuvent pas voir votre session. Chaque action sur ce poste est enregistrée avec votre identifiant.
          </p>
        </div>
      </div>

      {/* Help Modal */}
      {showHelpModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 text-white rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-2.5 text-indigo-400">
              <HelpCircle className="w-5 h-5" />
              <h3 className="font-bold text-sm">Assistance de Connexion</h3>
            </div>
            
            <p className="text-xs text-slate-300 leading-relaxed">
              Pour vous connecter à votre poste de travail, utilisez le <strong>nom d'utilisateur</strong> et le <strong>mot de passe / code PIN</strong> qui vous ont été communiqués par votre administrateur.
            </p>

            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
              <p className="text-indigo-300 font-bold">Exemples d'identifiants préconfigurés :</p>
              <div className="space-y-1 text-slate-400 font-mono text-[10px]">
                <p>• Admin : <span className="text-white font-bold">MD</span> (PIN: 1234)</p>
                <p>• Gérant : <span className="text-white font-bold">fatou.gerante</span> (PIN: 5678)</p>
                <p>• Vendeur : <span className="text-white font-bold">ibrahim.caisse</span> (PIN: 0000)</p>
              </div>
            </div>

            <p className="text-[10px] text-slate-400">
              En cas d'oubli de mot de passe, demandez à l'administrateur de réinitialiser votre code PIN depuis l'onglet <strong>Utilisateurs & Mots de Passe</strong>.
            </p>

            <button
              type="button"
              onClick={() => setShowHelpModal(false)}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              J'ai compris
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
