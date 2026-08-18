import React, { useState } from 'react';
import {
  X,
  Lock,
  ShieldCheck,
  Briefcase,
  ShoppingCart,
  UserCheck,
  AlertCircle,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { User, UserRole, ROLE_PERMISSIONS } from '../../types';

interface SwitchUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  targetUser?: User | null;
  onSuccess?: (user: User) => void;
}

export const SwitchUserModal: React.FC<SwitchUserModalProps> = ({
  isOpen,
  onClose,
  targetUser,
  onSuccess,
}) => {
  const { users = [], switchUserWithPin } = useStore();
  const [selectedUser, setSelectedUser] = useState<User | null>(targetUser || null);
  const [pin, setPin] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  React.useEffect(() => {
    if (targetUser) {
      setSelectedUser(targetUser);
    } else if (users.length > 0 && !selectedUser) {
      setSelectedUser(users[0]);
    }
    setPin('');
    setErrorMsg(null);
  }, [targetUser, isOpen]);

  if (!isOpen) return null;

  const handleKeyPress = (num: string) => {
    if (pin.length < 8) {
      setPin(prev => prev + num);
      setErrorMsg(null);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const handleClear = () => {
    setPin('');
    setErrorMsg(null);
  };

  const handleSwitch = (overridePin?: string) => {
    if (!selectedUser) return;
    const pinToSubmit = overridePin !== undefined ? overridePin : pin;

    const res = switchUserWithPin(selectedUser.id, pinToSubmit);
    if (res.success) {
      if (onSuccess) onSuccess(selectedUser);
      onClose();
    } else {
      setErrorMsg(res.message || 'Code PIN incorrect.');
      setPin('');
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        return ShieldCheck;
      case 'GERANT':
        return Briefcase;
      case 'VENDEUR':
        return ShoppingCart;
      default:
        return UserCheck;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-slate-900 border border-slate-800 text-slate-100 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-indigo-400" />
            <h2 className="text-sm font-bold text-white">Changer d'utilisateur</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User Selection if not targeted */}
        {!targetUser && (
          <div className="my-4">
            <p className="text-xs text-slate-400 mb-2 font-medium">Sélectionner le compte :</p>
            <div className="grid grid-cols-3 gap-2">
              {users.map((u) => {
                const isSelected = selectedUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setSelectedUser(u);
                      setPin('');
                      setErrorMsg(null);
                    }}
                    className={`p-2.5 rounded-2xl border text-center transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 text-white font-bold'
                        : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-700 mx-auto mb-1 flex items-center justify-center text-xs font-bold">
                      {u.avatar || u.name.charAt(0)}
                    </div>
                    <p className="text-[11px] truncate font-bold">{u.name}</p>
                    <p className="text-[9px] text-slate-400">{u.role}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Selected User Badge */}
        {selectedUser && (
          <div className="my-4 p-3 bg-slate-800/60 rounded-2xl border border-slate-700/60 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0">
              {selectedUser.avatar || selectedUser.name.charAt(0)}
            </div>
            <div>
              <p className="text-xs font-bold text-white">{selectedUser.name}</p>
              <p className="text-[10px] text-indigo-400">
                {ROLE_PERMISSIONS[selectedUser.role]?.label || selectedUser.role}
              </p>
            </div>
          </div>
        )}

        {/* PIN Input & Pad */}
        <div className="space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="flex gap-3 items-center justify-center h-11 px-4 py-2 bg-slate-950 border border-slate-800 rounded-xl w-full max-w-[240px]">
              {Array.from({ length: 4 }).map((_, i) => {
                const isFilled = i < pin.length;
                return (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded-full transition-all ${
                      isFilled ? 'bg-indigo-500 scale-110 shadow-sm shadow-indigo-500/50' : 'bg-slate-800'
                    }`}
                  />
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => setShowPin(!showPin)}
              className="absolute right-8 text-slate-500 hover:text-slate-300 p-1"
            >
              {showPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>

          {showPin && pin && (
            <p className="text-center text-xs font-mono text-indigo-300">Code : {pin}</p>
          )}

          {errorMsg && (
            <div className="flex items-center justify-center gap-1.5 text-rose-400 text-xs font-bold">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2 max-w-[240px] mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
              <button
                key={digit}
                type="button"
                onClick={() => handleKeyPress(digit)}
                className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-base font-bold text-white border border-slate-700 transition-all flex items-center justify-center active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              type="button"
              onClick={handleClear}
              className="h-10 rounded-xl bg-slate-800/40 text-[11px] font-bold text-slate-400 border border-slate-700/40 hover:bg-slate-700/60"
            >
              Effacer
            </button>
            <button
              type="button"
              onClick={() => handleKeyPress('0')}
              className="h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-base font-bold text-white border border-slate-700 transition-all flex items-center justify-center active:scale-95"
            >
              0
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className="h-10 rounded-xl bg-slate-800/40 text-xs font-bold text-slate-400 border border-slate-700/40 hover:bg-slate-700/60"
            >
              ⌫
            </button>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold hover:bg-slate-800"
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!selectedUser || pin.length === 0}
              onClick={() => handleSwitch()}
              className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/30 flex items-center justify-center gap-1.5"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
