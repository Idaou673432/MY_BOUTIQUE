export const formatMoney = (amount: number, currency = 'FCFA'): string => {
  if (isNaN(amount) || amount === null || amount === undefined) return `0 ${currency}`;
  const formatted = new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return `${formatted} ${currency}`;
};

export const formatDate = (isoString?: string): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return isoString;
  }
};

export const formatDateTime = (isoString?: string): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
};

export const formatTimeOnly = (isoString?: string): string => {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    }).format(d);
  } catch {
    return isoString;
  }
};

export const generateId = (prefix = 'id'): string => {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
};

export const generateInvoiceNumber = (count: number): string => {
  const year = new Date().getFullYear();
  const padded = String(count + 1).padStart(4, '0');
  return `FAC-${year}-${padded}`;
};

export const generateQuoteNumber = (count: number): string => {
  const year = new Date().getFullYear();
  const padded = String(count + 1).padStart(4, '0');
  return `DEV-${year}-${padded}`;
};

export const generateOrderNumber = (count: number): string => {
  const year = new Date().getFullYear();
  const padded = String(count + 1).padStart(3, '0');
  return `BC-${year}-${padded}`;
};

export const getPaymentMethodLabel = (method: string): string => {
  switch (method) {
    case 'ESPECES':
      return 'Espèces (Cash FCFA)';
    case 'MOBILE_MONEY':
      return 'Mobile Money (Orange Money / Wave / Moov)';
    case 'CARTE_BANCAIRE':
      return 'Carte Bancaire / TPE';
    case 'VIREMENT':
      return 'Virement / Chèque (BDM / BOA / BMS)';
    case 'CREDIT':
      return 'À Crédit (Carnet Dette Client)';
    default:
      return method;
  }
};

export const getMovementTypeBadge = (type: string): { label: string; bg: string; text: string } => {
  switch (type) {
    case 'ENTREE':
      return { label: 'Entrée Stock', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' };
    case 'VENTE':
      return { label: 'Vente', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700' };
    case 'RETOUR_CLIENT':
      return { label: 'Retour Client', bg: 'bg-teal-50 text-teal-700 border-teal-200', text: 'text-teal-700' };
    case 'RETOUR_FOURNISSEUR':
      return { label: 'Retour Fournisseur', bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700' };
    case 'PERTE':
      return { label: 'Perte', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' };
    case 'CASSE':
      return { label: 'Casse / Avarié', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' };
    case 'AJUSTEMENT_INVENTAIRE':
      return { label: 'Ajustement Inventaire', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700' };
    case 'CORRECTION_MANUELLE':
      return { label: 'Correction Manuelle', bg: 'bg-slate-50 text-slate-700 border-slate-200', text: 'text-slate-700' };
    default:
      return { label: type, bg: 'bg-slate-50 text-slate-700 border-slate-200', text: 'text-slate-700' };
  }
};

export const getCashTransactionTypeBadge = (type: string): { label: string; bg: string; text: string } => {
  switch (type) {
    case 'OUVERTURE':
      return { label: 'Ouverture Caisse', bg: 'bg-blue-50 text-blue-700 border-blue-200', text: 'text-blue-700' };
    case 'VENTE':
      return { label: 'Encaissement Vente', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' };
    case 'ENTREE':
      return { label: 'Entrée Manuelle', bg: 'bg-teal-50 text-teal-700 border-teal-200', text: 'text-teal-700' };
    case 'SORTIE':
      return { label: 'Sortie Manuelle', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' };
    case 'DEPENSE':
      return { label: 'Dépense Caisse', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' };
    case 'RETRAIT':
      return { label: 'Retrait Propriétaire', bg: 'bg-purple-50 text-purple-700 border-purple-200', text: 'text-purple-700' };
    case 'VERSEMENT':
      return { label: 'Versement Banque', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700' };
    case 'REMBOURSEMENT_CLIENT':
      return { label: 'Remboursement Client', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' };
    case 'PAIEMENT_DETTE_CLIENT':
      return { label: 'Règlement Crédit Client', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' };
    case 'PAIEMENT_DETTE_FOURNISSEUR':
      return { label: 'Règlement Fournisseur', bg: 'bg-rose-50 text-rose-700 border-rose-200', text: 'text-rose-700' };
    case 'FERMETURE':
      return { label: 'Fermeture Caisse', bg: 'bg-slate-100 text-slate-700 border-slate-300', text: 'text-slate-700' };
    default:
      return { label: type, bg: 'bg-slate-50 text-slate-700 border-slate-200', text: 'text-slate-700' };
  }
};

export const formatQuantity = (quantity: number, unit?: string): string => {
  if (isNaN(quantity) || quantity === null || quantity === undefined) return `0 ${unit || 'pièce'}`;
  // Show decimals only if non-integer (e.g. 1.5 kg, 2.75 m)
  const isInteger = Math.floor(quantity) === quantity;
  const numStr = isInteger ? quantity.toString() : quantity.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 3 });
  return unit ? `${numStr} ${unit}` : numStr;
};

export const getBusinessTypeLabel = (type?: string): { label: string; icon: string; description: string } => {
  switch (type) {
    case 'ALIMENTATION':
      return { 
        label: 'Alimentation & Supérette', 
        icon: '🛒', 
        description: 'Épicerie, boissons, céréales au kg, produits frais, conserves' 
      };
    case 'QUINCAILLERIE':
      return { 
        label: 'Quincaillerie & Bricolage', 
        icon: '🔨', 
        description: 'Matériaux, outillage, ciment, tubes/mètre, fer, visserie' 
      };
    case 'MODE_BOUTIQUE':
      return { 
        label: 'Prêt-à-Porter & Mode', 
        icon: '👗', 
        description: 'Vêtements, chaussures/paire, sacs, accessoires de mode' 
      };
    case 'COSMETIQUE':
      return { 
        label: 'Cosmétique & Parfumerie', 
        icon: '💄', 
        description: 'Parfums, crèmes, maquillage, soins capillaires, mèches' 
      };
    case 'ELECTRONIQUE':
      return { 
        label: 'Électronique & Téléphonie', 
        icon: '📱', 
        description: 'Smartphones, câbles, chargeurs, accessoires high-tech' 
      };
    case 'PHARMACIE':
      return { 
        label: 'Pharmacie & Parapharmacie', 
        icon: '💊', 
        description: 'Produits de santé, compléments, hygiène, soins médicaux' 
      };
    case 'COMMERCE_GENERAL':
    default:
      return { 
        label: 'Commerce Général & Shop', 
        icon: '🏪', 
        description: 'Bazar, papeterie, articles divers, boutique multiservice' 
      };
  }
};

/**
 * Convert numerical amounts into French words for official commercial invoices
 */
export const numberToWordsFrench = (num: number, currency = 'Francs CFA'): string => {
  if (isNaN(num) || num === null || num === undefined) return `Zéro ${currency}`;
  const integerPart = Math.floor(Math.abs(num));
  const decimalPart = Math.round((Math.abs(num) - integerPart) * 100);

  const units = ['', 'un', 'deux', 'trois', 'quatre', 'cinq', 'six', 'sept', 'huit', 'neuf'];
  const teens = ['dix', 'onze', 'douze', 'treize', 'quatorze', 'quinze', 'seize', 'dix-sept', 'dix-huit', 'dix-neuf'];
  const tens = ['', 'dix', 'vingt', 'trente', 'quarante', 'cinquante', 'soixante', 'soixante-dix', 'quatre-vingts', 'quatre-vingt-dix'];

  const convertLessThanOneThousand = (n: number): string => {
    let result = '';
    const hundreds = Math.floor(n / 100);
    const remainder = n % 100;

    if (hundreds > 0) {
      if (hundreds === 1) {
        result += 'cent';
      } else {
        result += units[hundreds] + ' cent' + (remainder === 0 ? 's' : '');
      }
      if (remainder > 0) result += ' ';
    }

    if (remainder > 0) {
      if (remainder < 10) {
        result += units[remainder];
      } else if (remainder >= 10 && remainder < 20) {
        result += teens[remainder - 10];
      } else if (remainder < 70) {
        const ten = Math.floor(remainder / 10);
        const unit = remainder % 10;
        if (unit === 1 && ten < 8) {
          result += tens[ten] + ' et un';
        } else if (unit > 0) {
          result += tens[ten] + '-' + units[unit];
        } else {
          result += tens[ten];
        }
      } else if (remainder < 80) {
        const unit = remainder % 10;
        if (unit === 1) {
          result += 'soixante et onze';
        } else {
          result += 'soixante-' + teens[unit];
        }
      } else if (remainder < 90) {
        const unit = remainder % 10;
        if (unit === 0) {
          result += 'quatre-vingts';
        } else {
          result += 'quatre-vingt-' + units[unit];
        }
      } else {
        const unit = remainder % 10;
        result += 'quatre-vingt-' + teens[unit];
      }
    }

    return result;
  };

  const convertNumber = (n: number): string => {
    if (n === 0) return 'zéro';
    let result = '';

    const billions = Math.floor(n / 1000000000);
    const millions = Math.floor((n % 1000000000) / 1000000);
    const thousands = Math.floor((n % 1000000) / 1000);
    const remainder = n % 1000;

    if (billions > 0) {
      result += convertLessThanOneThousand(billions) + (billions > 1 ? ' milliards ' : ' milliard ');
    }

    if (millions > 0) {
      result += convertLessThanOneThousand(millions) + (millions > 1 ? ' millions ' : ' million ');
    }

    if (thousands > 0) {
      if (thousands === 1) {
        result += 'mille ';
      } else {
        result += convertLessThanOneThousand(thousands) + ' mille ';
      }
    }

    if (remainder > 0) {
      result += convertLessThanOneThousand(remainder);
    }

    return result.trim();
  };

  let words = convertNumber(integerPart);
  // Capitalize first letter
  words = words.charAt(0).toUpperCase() + words.slice(1);

  let currencyName = currency;
  if (currency === 'FCFA') currencyName = 'Francs CFA';
  else if (currency === '€' || currency === 'EUR') currencyName = 'Euros';
  else if (currency === '$' || currency === 'USD') currencyName = 'Dollars';
  else if (currency === 'MAD') currencyName = 'Dirhams';
  else if (currency === 'DZD') currencyName = 'Dinars';
  else if (currency === 'GNF') currencyName = 'Francs Guinéens';

  if (decimalPart > 0) {
    const centimesWords = convertNumber(decimalPart);
    return `${words} ${currencyName} et ${centimesWords} centimes`;
  }

  return `${words} ${currencyName}`;
};

export const getRoleBadge = (role: string): { label: string; bg: string; text: string } => {
  switch (role) {
    case 'ADMIN':
      return { label: 'Administrateur', bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', text: 'text-indigo-700' };
    case 'GERANT':
      return { label: 'Gérant', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', text: 'text-emerald-700' };
    case 'VENDEUR':
      return { label: 'Vendeur / Caissier', bg: 'bg-amber-50 text-amber-700 border-amber-200', text: 'text-amber-700' };
    default:
      return { label: role, bg: 'bg-slate-50 text-slate-700 border-slate-200', text: 'text-slate-700' };
  }
};
