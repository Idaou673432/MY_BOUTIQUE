import React, { useState, useMemo } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Edit2,
  Lock,
  Search,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  Key,
  Trash2,
  Copy,
  Sparkles,
  RefreshCw,
  Phone,
  Mail,
  ShieldAlert,
  UserCheck,
  Check,
  Building,
  Smartphone
} from 'lucide-react';
import { useStore } from '../../context/StoreContext';
import { User, UserRole, ROLE_PERMISSIONS } from '../../types';
import { formatDateTime, getRoleBadge } from '../../utils/formatters';

interface UsersViewProps {
  initialTab?: 'users' | 'audit';
}

export const UsersView: React.FC<UsersViewProps> = ({ initialTab = 'users' }) => {
  const { 
    users = [], 
    activityLogs = [], 
    auditLogs = [], 
    addUser, 
    updateUser, 
    deleteUser, 
    currentUser 
  } = useStore();

  const [activeTab, setActiveTab] = useState<'users' | 'audit'>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | UserRole>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'INACTIVE'>('ALL');

  // User Edit / Create modal
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Dedicated Change Password / PIN modal
  const [showPinModal, setShowPinModal] = useState(false);
  const [targetUserForPin, setTargetUserForPin] = useState<User | null>(null);
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [showPinInModal, setShowPinInModal] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinSuccessMsg, setPinSuccessMsg] = useState<string | null>(null);

  // Delete modal
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // State to reveal PIN in table for Admin
  const [visiblePins, setVisiblePins] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form data for creating or editing user profile
  const [formData, setFormData] = useState({
    username: '',
    fullName: '',
    email: '',
    phone: '',
    role: 'VENDEUR' as UserRole,
    pin: '1234',
    active: true,
  });

  const [showFormPin, setShowFormPin] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const effectiveLogs = useMemo(() => {
    return auditLogs.length > 0 ? auditLogs : activityLogs;
  }, [auditLogs, activityLogs]);

  const filteredUsers = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (users || []).filter((u) => {
      if (!u) return false;
      const displayName = (u.fullName || u.name || '').toLowerCase();
      const username = (u.username || u.name || '').toLowerCase();
      const email = (u.email || '').toLowerCase();
      const phone = (u.phone || '').toLowerCase();

      const matchesSearch =
        displayName.includes(q) ||
        username.includes(q) ||
        email.includes(q) ||
        phone.includes(q);

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ACTIVE' && u.active) ||
        (statusFilter === 'INACTIVE' && !u.active);

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchTerm, roleFilter, statusFilter]);

  const filteredAuditLogs = useMemo(() => {
    const q = (searchTerm || '').toLowerCase().trim();
    return (effectiveLogs || []).filter((log) => {
      if (!log) return false;
      const userName = (log.userName || '').toLowerCase();
      const action = (log.action || '').toLowerCase();
      const details = (log.details || '').toLowerCase();
      const target = (log.targetItem || (log as any).entity || '').toLowerCase();
      return (
        userName.includes(q) ||
        action.includes(q) ||
        details.includes(q) ||
        target.includes(q)
      );
    });
  }, [effectiveLogs, searchTerm]);

  const isAdmin = currentUser.role === 'ADMIN';

  // Toggle PIN visibility in the list
  const togglePinVisibility = (userId: string) => {
    setVisiblePins((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Copy PIN to clipboard
  const handleCopyPin = (userId: string, pin: string) => {
    navigator.clipboard.writeText(pin);
    setCopiedId(userId);
    setTimeout(() => setCopiedId(null), 2000);
    showToast('Code PIN copié dans le presse-papier !');
  };

  // Copy full workstation login credentials sheet
  const handleCopyCredentialsSheet = (u: User) => {
    const username = u.username || (u.name ? u.name.toLowerCase().replace(/\s+/g, '.') : 'user');
    const pin = u.pin || (u.role === 'ADMIN' ? '1234' : u.role === 'GERANT' ? '5678' : '0000');
    const roleLabel = u.role === 'ADMIN' ? 'Administrateur' : u.role === 'GERANT' ? 'Gérant' : 'Vendeur (Caisse)';
    const text = `🏪 Accès Poste de Travail - Boutique Mali\n👤 Collaborateur : ${u.fullName || u.name}\n🔑 Identifiant PC : ${username}\n🔒 Mot de passe / PIN : ${pin}\n💼 Poste & Rôle : ${roleLabel}\n🇲🇱 Bamako, Mali`;

    navigator.clipboard.writeText(text);
    setCopiedId(u.id);
    setTimeout(() => setCopiedId(null), 2000);
    showToast(`Identifiants de connexion pour le PC de ${u.fullName || u.name} copiés !`);
  };

  // Open User Add Modal
  const handleOpenAddModal = () => {
    setEditingUser(null);
    setFormError(null);
    setFormData({
      username: '',
      fullName: '',
      email: '',
      phone: '+223 ',
      role: 'VENDEUR',
      pin: Math.floor(1000 + Math.random() * 9000).toString(),
      active: true,
    });
    setShowFormPin(true);
    setShowUserModal(true);
  };

  // Open User Edit Modal
  const handleOpenEditModal = (u: User) => {
    setEditingUser(u);
    setFormError(null);
    setFormData({
      username: u.username || (u.name ? u.name.toLowerCase().replace(/\s+/g, '.') : ''),
      fullName: u.fullName || u.name || '',
      email: u.email || '',
      phone: u.phone || '+223 ',
      role: u.role,
      pin: u.pin || '1234',
      active: u.active,
    });
    setShowFormPin(false);
    setShowUserModal(true);
  };

  // Generate random 4-digit PIN
  const generateRandomPin = () => {
    const random = Math.floor(1000 + Math.random() * 9000).toString();
    return random;
  };

  // Save User (Create / Update Account)
  const handleSaveUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formData.fullName.trim()) {
      setFormError('Le nom complet est obligatoire.');
      return;
    }

    if (!formData.pin || formData.pin.length < 4) {
      setFormError('Le code PIN / mot de passe doit comporter au moins 4 chiffres.');
      return;
    }

    const finalName = formData.fullName.trim();
    const finalUsername = (formData.username.trim() || finalName.toLowerCase().replace(/\s+/g, '.'));

    const userPayload = {
      name: finalName,
      fullName: finalName,
      username: finalUsername,
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      role: formData.role,
      active: formData.active,
      pin: formData.pin.trim(),
      avatar: finalName.split(' ').map(n => n.charAt(0)).join('').toUpperCase().slice(0, 2) || 'UT',
    };

    if (editingUser) {
      updateUser(editingUser.id, userPayload);
      showToast(`Compte de ${finalName} mis à jour avec succès.`);
    } else {
      addUser(userPayload);
      showToast(`Nouvel utilisateur ${finalName} créé avec succès.`);
    }

    setShowUserModal(false);
  };

  // Open dedicated Change PIN Modal
  const handleOpenPinModal = (u: User) => {
    setTargetUserForPin(u);
    setNewPin('');
    setConfirmPin('');
    setPinError(null);
    setPinSuccessMsg(null);
    setShowPinInModal(true);
    setShowPinModal(true);
  };

  // Submit PIN change
  const handleSaveNewPin = (e: React.FormEvent) => {
    e.preventDefault();
    setPinError(null);

    if (!targetUserForPin) return;

    if (!newPin || newPin.length < 4) {
      setPinError('Le code PIN doit comporter au moins 4 chiffres (ex: 1234).');
      return;
    }

    if (!/^\d+$/.test(newPin)) {
      setPinError('Le code PIN doit contenir uniquement des chiffres.');
      return;
    }

    if (confirmPin && newPin !== confirmPin) {
      setPinError('La confirmation ne correspond pas au nouveau code PIN.');
      return;
    }

    updateUser(targetUserForPin.id, { pin: newPin.trim() });
    setPinSuccessMsg(`Code PIN de ${targetUserForPin.fullName || targetUserForPin.name} changé avec succès !`);
    showToast(`Code PIN de ${targetUserForPin.fullName || targetUserForPin.name} mis à jour (${newPin}).`);

    setTimeout(() => {
      setShowPinModal(false);
      setTargetUserForPin(null);
      setPinSuccessMsg(null);
    }, 1200);
  };

  // Toggle user active / inactive status
  const handleToggleUserStatus = (u: User) => {
    if (u.id === currentUser.id) {
      showToast('Vous ne pouvez pas désactiver votre propre compte actuellement connecté.');
      return;
    }

    const newStatus = !u.active;
    updateUser(u.id, { active: newStatus });
    showToast(`Compte de ${u.fullName || u.name} ${newStatus ? 'activé' : 'désactivé'}.`);
  };

  // Delete user confirmation
  const handleConfirmDeleteUser = () => {
    if (!userToDelete) return;

    if (userToDelete.id === currentUser.id) {
      setDeleteError('Impossible de supprimer le compte actuellement en cours d\'utilisation.');
      return;
    }

    const adminCount = users.filter(u => u.role === 'ADMIN' && u.active).length;
    if (userToDelete.role === 'ADMIN' && adminCount <= 1) {
      setDeleteError('Impossible de supprimer le dernier Administrateur du système.');
      return;
    }

    const success = deleteUser(userToDelete.id);
    if (success) {
      showToast(`Utilisateur ${userToDelete.fullName || userToDelete.name} supprimé avec succès.`);
      setUserToDelete(null);
      setDeleteError(null);
    } else {
      setDeleteError('Erreur lors de la suppression de l\'utilisateur.');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 animate-in slide-in-from-top-2">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-600" />
              Gestion des Utilisateurs, Mots de Passe & Audit
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
              🇲🇱 Mali - Bamako
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Contrôle d'accès par rôle (RBAC), réinitialisation des codes PIN & mots de passe, et journalisation inviolable.
          </p>
        </div>

        {isAdmin && activeTab === 'users' && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Créer un Utilisateur</span>
          </button>
        )}
      </div>

      {/* Admin Quick Security Advice Banner */}
      {isAdmin && (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5 font-bold">
            <Key className="w-4 h-4" />
          </div>
          <div className="text-xs text-amber-900 space-y-1">
            <p className="font-bold">Espace Administrateur : Gestion des Mots de Passe & Droits</p>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              En tant qu'administrateur, vous avez l'autorité exclusive de <strong>réinitialiser le code PIN</strong> de n'importe quel compte (vendeur, gérant ou admin), de <strong>modifier les identifiants</strong>, de <strong>changer les rôles</strong> ou de <strong>désactiver un accès</strong> en un clic.
            </p>
          </div>
        </div>
      )}

      {/* TABS & SEARCH / FILTER BAR */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'users'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Comptes & Codes PIN ({users.length})
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === 'audit'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Journal d'Audit ({effectiveLogs.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={
                activeTab === 'users'
                  ? 'Rechercher par nom, @identifiant, téléphone (+223...) ou email...'
                  : 'Rechercher une action dans le journal d\'audit...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* User Filters (Roles & Status) */}
        {activeTab === 'users' && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
            <span className="text-[11px] font-semibold text-slate-500">Filtrer par rôle :</span>
            {(['ALL', 'ADMIN', 'GERANT', 'VENDEUR'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRoleFilter(r)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  roleFilter === r
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {r === 'ALL' ? 'Tous les rôles' : ROLE_PERMISSIONS[r]?.label || r}
              </button>
            ))}

            <span className="text-[11px] font-semibold text-slate-500 ml-2">Statut :</span>
            {(['ALL', 'ACTIVE', 'INACTIVE'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  statusFilter === st
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st === 'ALL' ? 'Tous' : st === 'ACTIVE' ? 'Actifs' : 'Désactivés'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* USERS LIST TABLE */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Utilisateur</th>
                  <th className="p-3.5">Rôle & Poste</th>
                  <th className="p-3.5">Contact (Mali)</th>
                  <th className="p-3.5">Code PIN / Mot de Passe</th>
                  <th className="p-3.5">Statut</th>
                  {isAdmin && <th className="p-3.5 text-right">Actions Administrateur</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((u) => {
                    const badge = getRoleBadge(u.role);
                    const displayName = u.fullName || u.name || 'Utilisateur';
                    const displayUsername = u.username || (u.name ? u.name.toLowerCase().replace(/\s+/g, '.') : 'user');
                    const isPinVisible = visiblePins[u.id];
                    const isCurrentUser = currentUser.id === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name & Avatar */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black text-xs flex items-center justify-center shrink-0">
                              {u.avatar || displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-900">{displayName}</p>
                                {isCurrentUser && (
                                  <span className="px-1.5 py-0.2 bg-indigo-100 text-indigo-800 text-[9px] font-bold rounded">
                                    Vous
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] font-mono text-slate-400">@{displayUsername}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="p-3.5">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bg}`}
                          >
                            {badge.label}
                          </span>
                        </td>

                        {/* Contact */}
                        <td className="p-3.5 text-slate-600 text-[11px]">
                          <p className="flex items-center gap-1 font-medium text-slate-800">
                            <Phone className="w-3 h-3 text-slate-400" />
                            {u.phone || '+223 Non renseigné'}
                          </p>
                          {u.email && (
                            <p className="flex items-center gap-1 text-slate-400 text-[10px] mt-0.5">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {u.email}
                            </p>
                          )}
                        </td>

                        {/* PIN / Password column */}
                        <td className="p-3.5">
                          <div className="flex items-center gap-2">
                            <div className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg font-mono font-bold text-xs text-slate-800 min-w-[70px] text-center">
                              {isPinVisible ? u.pin || '1234' : '••••'}
                            </div>

                            {/* Eye toggle */}
                            <button
                              type="button"
                              onClick={() => togglePinVisibility(u.id)}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-all"
                              title={isPinVisible ? 'Masquer le code PIN' : 'Afficher le code PIN'}
                            >
                              {isPinVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>

                            {/* Copy PIN */}
                            <button
                              type="button"
                              onClick={() => handleCopyPin(u.id, u.pin || '1234')}
                              className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-all"
                              title="Copier le code PIN"
                            >
                              {copiedId === u.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u)}
                            disabled={!isAdmin || isCurrentUser}
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all ${
                              u.active
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                            } ${!isAdmin || isCurrentUser ? 'cursor-default' : 'cursor-pointer'}`}
                            title={isAdmin && !isCurrentUser ? 'Cliquer pour changer le statut' : undefined}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${u.active ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                            {u.active ? 'Actif' : 'Désactivé'}
                          </button>
                        </td>

                        {/* Admin Action Buttons */}
                        {isAdmin && (
                          <td className="p-3.5 text-right">
                            <div className="inline-flex items-center gap-1">
                              {/* Change PIN button */}
                              <button
                                type="button"
                                onClick={() => handleOpenPinModal(u)}
                                className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all"
                                title="Changer le code PIN / Mot de passe"
                              >
                                <Key className="w-3.5 h-3.5 text-amber-600" />
                                <span>Changer PIN</span>
                              </button>

                              {/* Copy Full Credentials Sheet */}
                              <button
                                type="button"
                                onClick={() => handleCopyCredentialsSheet(u)}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all"
                                title="Copier la fiche d'identifiants du poste (Identifiant + PIN)"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              {/* Edit Profile button */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(u)}
                                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all"
                                title="Modifier le compte"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* Delete button (protected) */}
                              {!isCurrentUser && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUserToDelete(u);
                                    setDeleteError(null);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Supprimer l'utilisateur"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={isAdmin ? 6 : 5} className="p-8 text-center text-slate-400 text-xs">
                      Aucun utilisateur trouvé avec ces critères de recherche.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUDIT LOG TABLE */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Activity className="w-4 h-4 text-indigo-600" />
              Journal des Opérations & Modifications Système
            </h2>
            <span className="text-[10px] text-slate-500">
              Historique complet et traçable en temps réel
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="p-3.5">Date & Heure</th>
                  <th className="p-3.5">Utilisateur</th>
                  <th className="p-3.5">Action Exécutée</th>
                  <th className="p-3.5">Cible / Catégorie</th>
                  <th className="p-3.5">Détails & Modifications</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAuditLogs.length > 0 ? (
                  filteredAuditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3.5 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatDateTime(log.timestamp || (log as any).date || new Date().toISOString())}
                      </td>
                      <td className="p-3.5 font-bold text-slate-900 whitespace-nowrap">
                        {log.userName || 'Système'}
                      </td>
                      <td className="p-3.5 font-bold text-indigo-700">{log.action}</td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {log.targetItem || (log as any).entity || log.category || 'Général'}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-700 text-xs">{log.details}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                      Aucune activité enregistrée.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 1. DEDICATED MODAL: CHANGER LE CODE PIN / MOT DE PASSE */}
      {showPinModal && targetUserForPin && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-5 bg-gradient-to-r from-amber-600 to-amber-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-black text-sm">Changer le Code PIN / Mot de Passe</h3>
                  <p className="text-[11px] text-amber-100">
                    Compte : <strong>{targetUserForPin.fullName || targetUserForPin.name}</strong> ({targetUserForPin.role})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPinModal(false)}
                className="text-white/80 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveNewPin} className="p-5 space-y-4 text-xs">
              {pinError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{pinError}</span>
                </div>
              )}

              {pinSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>{pinSuccessMsg}</span>
                </div>
              )}

              {/* Current user badge */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-black text-xs flex items-center justify-center">
                    {targetUserForPin.avatar || targetUserForPin.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">{targetUserForPin.fullName || targetUserForPin.name}</p>
                    <p className="text-[10px] text-slate-500 font-mono">@{targetUserForPin.username || targetUserForPin.name.toLowerCase()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-slate-500 block">PIN actuel :</span>
                  <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {targetUserForPin.pin || '1234'}
                  </span>
                </div>
              </div>

              {/* New PIN input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-slate-700">Nouveau Code PIN (4 à 8 chiffres) *</label>
                  <button
                    type="button"
                    onClick={() => {
                      const rand = generateRandomPin();
                      setNewPin(rand);
                      setConfirmPin(rand);
                    }}
                    className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Générer aléatoire
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showPinInModal ? 'text' : 'password'}
                    required
                    maxLength={8}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="Ex: 1234 ou 5678"
                    value={newPin}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, '');
                      setNewPin(val);
                      setPinError(null);
                    }}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-base font-mono font-black text-center tracking-widest text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPinInModal(!showPinInModal)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                  >
                    {showPinInModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Quick keypad helpers */}
              <div className="space-y-1">
                <span className="text-[10px] text-slate-400 font-semibold block">Saisie rapide :</span>
                <div className="grid grid-cols-5 gap-1 text-center font-mono text-xs">
                  {['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      onClick={() => {
                        if (newPin.length < 8) {
                          setNewPin((prev) => prev + digit);
                          setConfirmPin((prev) => prev + digit);
                        }
                      }}
                      className="py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg font-bold text-slate-800 transition-colors"
                    >
                      {digit}
                    </button>
                  ))}
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setNewPin('');
                      setConfirmPin('');
                    }}
                    className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold"
                  >
                    Effacer la saisie
                  </button>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-200 -mx-5 -mb-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowPinModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={!newPin || newPin.length < 4}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Key className="w-4 h-4" />
                  <span>Enregistrer le Nouveau PIN</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. MODAL: AJOUTER / MODIFIER UN COMPTE UTILISATEUR */}
      {showUserModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleSaveUser}
            className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95"
          >
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm">
                  {editingUser ? 'Modifier le Compte Utilisateur' : 'Créer un Nouveau Compte'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="text-slate-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 font-medium flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Names */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Nom & Prénom Complet *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Ousmane Koné"
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Identifiant de Connexion *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: ousmane.k"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {/* Phone (Mali) & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Téléphone (Mali +223) *
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="+223 76 00 00 00"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Orange Mali (7x/8x), Malitel (6x/9x), Telecel
                  </p>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Professionnel</label>
                  <input
                    type="email"
                    placeholder="agent@boutiquemali.ml"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Rôle & Permissions Attribuées *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-bold text-slate-900 bg-white"
                >
                  <option value="VENDEUR">Vendeur / Caissier (POS, Encaissements, Ventes uniquement)</option>
                  <option value="GERANT">Gérant (Gestion Stocks, Achats Fournisseurs, Dépenses, Dettes)</option>
                  <option value="ADMIN">Administrateur (Contrôle Total, Utilisateurs, PINs & Clôtures)</option>
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  {formData.role === 'VENDEUR' && 'Accès restreint à la caisse et au catalogue produit sans accès aux marges financières.'}
                  {formData.role === 'GERANT' && 'Accès à toutes les opérations opérationnelles (stocks, fournisseurs, inventaires).'}
                  {formData.role === 'ADMIN' && 'Contrôle complet avec gestion des comptes, paramètres de la boutique et mot de passe.'}
                </p>
              </div>

              {/* Code PIN / Password Field */}
              <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-bold text-indigo-950 flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" />
                    Code PIN de Sécurité (4 à 8 chiffres) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, pin: generateRandomPin() })}
                    className="text-[11px] text-indigo-700 hover:text-indigo-900 font-bold flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3 text-amber-500" />
                    Générer PIN
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showFormPin ? 'text' : 'password'}
                    required
                    maxLength={8}
                    pattern="[0-9]*"
                    inputMode="numeric"
                    placeholder="Ex: 1234"
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value.replace(/\D/g, '') })}
                    className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl font-mono font-bold text-indigo-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none text-sm tracking-widest text-center"
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPin(!showFormPin)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-indigo-700"
                  >
                    {showFormPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-indigo-700">
                  L'utilisateur utilisera ce code PIN pour se connecter et déverrouiller son poste de travail.
                </p>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="user_active_chk_modal"
                  checked={formData.active}
                  onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                />
                <label htmlFor="user_active_chk_modal" className="font-semibold text-slate-700 select-none">
                  Compte actif et autorisé à se connecter au système
                </label>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUserModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-all"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{editingUser ? 'Enregistrer les Modifications' : 'Créer l\'Utilisateur'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 3. MODAL: CONFIRMATION SUPPRESSION UTILISATEUR */}
      {userToDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 p-5 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Supprimer cet Utilisateur ?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Êtes-vous sûr de vouloir supprimer définitivement le compte de{' '}
                <strong>{userToDelete.fullName || userToDelete.name}</strong> ?
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-medium text-left">
                {deleteError}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setUserToDelete(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteUser}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                Confirmer la Suppression
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
