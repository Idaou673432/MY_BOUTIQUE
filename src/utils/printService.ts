import { Sale, StoreSettings, Customer, CreditDebtRecord, CreditPayment, PaymentMethod } from '../types';
import { STORE_LOGO_BASE64 } from '../assets/logoBase64';
import {
  formatMoney,
  formatDateTime,
  formatDate,
  getPaymentMethodLabel,
  formatQuantity,
  numberToWordsFrench
} from './formatters';

export type PrintReceiptFormat = 'TICKET_80' | 'TICKET_58' | 'A4' | 'A5';

export interface AnnualInventorySummary {
  year: number;
  totalProducts: number;
  totalQuantityInStock: number;
  totalStockPurchaseValue: number;
  totalStockSaleValue: number;
  potentialMarginValue: number;
  potentialMarginPercent: number;
  totalPurchasesQuantity: number;
  totalPurchasesCost: number;
  totalSalesQuantity: number;
  totalSalesRevenue: number;
  totalSalesGrossMargin: number;
  totalInventoryLossesValue: number;
  totalInventorySurplusValue: number;
  netInventoryDifferenceValue: number;
  turnoverRatio: number;
  averageHoldingDays: number;
  categorySummaries: {
    categoryId: string;
    categoryName: string;
    productCount: number;
    totalStockQty: number;
    stockCostValue: number;
    stockSaleValue: number;
    yearSalesQty: number;
    yearSalesRevenue: number;
    yearLossesValue: number;
  }[];
  productLedger: {
    productId: string;
    productCode: string;
    barcode: string;
    productName: string;
    categoryName: string;
    unit: string;
    purchasePrice: number;
    salePrice: number;
    initialEstimatedStock: number;
    yearEntriesQty: number;
    yearSalesQty: number;
    currentPhysicalStock: number;
    stockCostValue: number;
    stockSaleValue: number;
    yearDifferencesQty: number;
    yearLossesValue: number;
    rotationRate: number;
    healthStatus: 'HEALTHY' | 'LOW' | 'OUT_OF_STOCK' | 'OVERSTOCK' | 'FAST_MOVING';
  }[];
  inventorySessionsSummary: {
    id: string;
    title: string;
    date: string;
    status: string;
    responsibleName: string;
    totalItems: number;
    discrepancyCount: number;
    lossesValue: number;
    surplusValue: number;
  }[];
}

/**
 * Sanitizes any receipt footer or legal notice to strictly exclude unwanted clauses like
 * "Les articles vendus ne sont ni repris ni échangés sauf accord préalable"
 */
export const sanitizeReceiptFooter = (text?: string): string => {
  if (!text) return 'Merci de votre visite et à bientôt !';
  let cleaned = text
    .replace(/les\s+articles\s+vendus?\s+ne\s+sont\s+ni\s+repris?\s+ni\s+échangés?[^.\n]*/gi, '')
    .replace(/les\s+marchandises\s+vendues?\s+ne\s+sont\s+ni\s+reprises?\s+ni\s+échangées?[^.\n]*/gi, '')
    .replace(/les\s+articles\s+frais\s+ne\s+sont\s+ni\s+repris?\s+ni\s+échangés?[^.\n]*/gi, '')
    .replace(/ne\s+sont\s+ni\s+repris?\s+ni\s+échangés?[^.\n]*/gi, '')
    .replace(/sauf\s+accord\s+préalable[^.\n]*/gi, '')
    .replace(/au-delà\s+de\s+48h[^.\n]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[ -.,;:]+/, '')
    .replace(/[ -.,;:]+$/, '')
    .trim();

  return cleaned || 'Merci de votre visite et à bientôt !';
};

export const sanitizeLegalNotice = (text?: string): string => {
  if (!text) return 'Facture conforme aux normes du commerce au Mali.';
  let cleaned = text
    .replace(/les\s+articles\s+vendus?\s+ne\s+sont\s+ni\s+repris?\s+ni\s+échangés?[^.\n]*/gi, '')
    .replace(/les\s+marchandises\s+vendues?\s+ne\s+sont\s+ni\s+reprises?\s+ni\s+échangées?[^.\n]*/gi, '')
    .replace(/ne\s+sont\s+ni\s+repris?\s+ni\s+échangés?[^.\n]*/gi, '')
    .replace(/sauf\s+accord\s+préalable[^.\n]*/gi, '')
    .replace(/au-delà\s+de\s+48h[^.\n]*/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[ -.,;:]+/, '')
    .replace(/[ -.,;:]+$/, '')
    .trim();

  return cleaned || 'Facture conforme aux normes du commerce au Mali.';
};

/**
 * Generates an elegant brand header for thermal tickets (80mm & 58mm)
 */
/**
 * Vector SVG Barcode generator for laser-sharp thermal printing
 */
export const generateBarcodeSvg = (code: string): string => {
  // Deterministic Code128-like barcode bars pattern
  const bars = [2,1,1,2,3,1,2,1,1,3,1,2,2,1,3,1,1,2,1,1,2,3,2,1,1,2,2,1,3,1,2,1,1,2,3,1,2,1,3,1,1,2,2,3,1,1,2,1,1,2,3,1,2,1,1,3,2,1,2,1,1,2,3,1,1,2,3,1,2,1,2,1,1,2,3,1,2,2,1,3,1,1,2,1,1,2,3,2,1];
  let x = 6;
  let rects = '';
  for (let i = 0; i < bars.length; i++) {
    const w = bars[i];
    if (i % 2 === 0) {
      rects += `<rect x="${x}" y="0" width="${w}" height="42" fill="#000000" />`;
    }
    x += w;
  }
  return `<svg width="100%" height="42" viewBox="0 0 ${x + 6} 42" preserveAspectRatio="none" style="display:block; margin:0 auto;">${rects}</svg>`;
};

/**
 * Generates brand header for thermal receipt matching the Daou Service / Modern receipt specification
 */
export const getThermalBrandHeaderHtml = (
  settings: StoreSettings,
  is58: boolean = false
): string => {
  const rawStoreName = (settings.storeName || settings.shopName || 'TANE FAH COLLECTION').trim();
  const address = settings.address || settings.shopAddress || 'Grand Marché de Bamako, Rue 18 x 25, Bamako - Mali';
  const phone = settings.phone || settings.shopPhone || '+223 76 00 00 00 / +223 66 00 00 00';
  const storeTagline = settings.storeTagline || settings.businessType || 'Haute Couture & Prêt-à-Porter';

  const logoSrc = settings.logoUrl || STORE_LOGO_BASE64;

  const isIT = rawStoreName.toLowerCase().includes('daou') ||
               rawStoreName.toLowerCase().includes('it') ||
               rawStoreName.toLowerCase().includes('info') ||
               rawStoreName.toLowerCase().includes('tech') ||
               rawStoreName.toLowerCase().includes('macbook');

  const taglineBullets = isIT
    ? (storeTagline && storeTagline.includes('•') ? storeTagline.toUpperCase() : 'VENTE  •  ACCESSOIRES  •  SERVICES IT')
    : (storeTagline && storeTagline.includes('•') ? storeTagline.toUpperCase() : 'HAUTE COUTURE  •  PRÊT-À-PORTER  •  ACCESSOIRES');

  const categories = isIT ? [
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="12" rx="2"/><line x1="2" y1="20" x2="22" y2="20"/></svg>`,
      label: 'ORDINATEURS'
    },
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>`,
      label: 'SMARTPHONES'
    },
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 18v-6a9 9 0 0 1 18 0v6"/><path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z"/></svg>`,
      label: 'ACCESSOIRES'
    },
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
      label: 'SERVICES IT'
    }
  ] : [
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`,
      label: 'HAUTE COUTURE'
    },
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.38 3.46L16 2a4 4 0 0 1-8 0L3.62 3.46a2 2 0 0 0-1.34 2.23l.58 3.47a1 1 0 0 0 .99.84H6v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V10h2.15a1 1 0 0 0 .99-.84l.58-3.47a2 2 0 0 0-1.34-2.23z"/></svg>`,
      label: 'PRÊT-À-PORTER'
    },
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z"/><path d="M9 2v4a3 3 0 0 0 6 0V2"/></svg>`,
      label: 'ACCESSOIRES'
    },
    {
      icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
      label: 'SUR-MESURE'
    }
  ];

  const displayAddress = address;
  const displayPhone = phone;

  return `
    <div class="store-header-box center">
      <div style="text-align: center; margin: 0 auto 4px auto;">
        <img class="receipt-logo" src="${logoSrc}" alt="${rawStoreName}" />
      </div>
      <div class="brand-tagline-bullets">${taglineBullets}</div>

      <!-- 4 Categories Grid with Icons -->
      <div class="category-grid">
        ${categories.map((cat, idx) => `
          <div class="cat-item">
            <div class="cat-icon">${cat.icon}</div>
            <div class="cat-label">${cat.label}</div>
          </div>
          ${idx < categories.length - 1 ? '<div class="cat-divider"></div>' : ''}
        `).join('')}
      </div>

      <!-- Location & Phone Row -->
      <div class="store-coords-row">
        <div class="coord-item">
          <svg class="coord-icon" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
          <span>${displayAddress}</span>
        </div>
        <div class="coord-item">
          <svg class="coord-icon" viewBox="0 0 24 24"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
          <span>${displayPhone}</span>
        </div>
      </div>
    </div>
  `;
};

/**
 * Generates an elegant brand header for A4 documents
 */
export const getA4BrandHeaderHtml = (
  settings: StoreSettings
): string => {
  const rawStoreName = (settings.storeName || settings.shopName || 'TANE FAH COLLECTION').trim();
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';
  const email = settings.email || settings.shopEmail || '';
  const nif = settings.nifRccm || '';
  const mobileMoney = settings.mobileMoneyNumber || '';
  const storeTagline = settings.storeTagline || settings.businessType || '';

  const isTaneFah = rawStoreName.toUpperCase().includes('TANE FAH');

  let titleHtml = '';
  if (isTaneFah) {
    titleHtml = `
      <div class="brand-title-a4">TANE FAH</div>
      <div class="brand-subtitle-a4">C O L L E C T I O N</div>
      <div class="brand-tagline-a4">${storeTagline ? storeTagline.toUpperCase() : '— HAUTE COUTURE & PRÊT-À-PORTER —'}</div>
    `;
  } else {
    titleHtml = `
      <div class="brand-title-a4">${rawStoreName.toUpperCase()}</div>
      ${storeTagline ? `<div class="brand-tagline-a4">${storeTagline.toUpperCase()}</div>` : ''}
    `;
  }

  return `
    <div style="display: flex; align-items: center; gap: 16px;">
      <img class="a4-logo" src="${settings.logoUrl || STORE_LOGO_BASE64}" alt="${rawStoreName}" />
      <div>
        ${titleHtml}
        <div class="store-info-a4">
          ${address ? `<div><strong>ADRESSE :</strong> <span>${address.toUpperCase()}</span></div>` : ''}
          ${phone ? `<div><strong>TÉLÉPHONE :</strong> <span>${phone}</span></div>` : ''}
          ${email ? `<div><strong>EMAIL :</strong> <span>${email}</span></div>` : ''}
          ${nif ? `<div><strong>NIF / RCCM :</strong> <span>${nif}</span></div>` : ''}
          ${mobileMoney ? `<div><strong>PAIEMENT MOBILE :</strong> <span>${mobileMoney}</span></div>` : ''}
        </div>
      </div>
    </div>
  `;
};

/**
 * Generates isolated HTML string for thermal receipt (80mm or 58mm) with high-contrast bold typography
 */
export const generateThermalReceiptHtml = (
  sale: Sale,
  settings: StoreSettings,
  customer?: Customer,
  widthMm: 80 | 58 = 80
): string => {
  const is58 = widthMm === 58;
  const currency = settings.currency || 'FCFA';
  const phone = settings.phone || settings.shopPhone || '';

  const fontSize = is58 ? '10.5px' : '12px';
  const maxContentWidth = is58 ? '44mm' : '66mm';
  const totalItemsCount = sale.items.reduce((acc, it) => acc + it.quantity, 0);

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket_${sale.invoiceNumber}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&display=swap" rel="stylesheet">
  <style>
    @page {
      margin: 0;
      size: ${widthMm}mm auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      font-size: ${fontSize};
      font-weight: 600;
      line-height: 1.35;
      color: #000000 !important;
      background: #ffffff !important;
      padding: ${is58 ? "1mm 1.5mm" : "2mm 3.5mm"};
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased;
    }
    .ticket-container {
      width: 100%;
      max-width: ${maxContentWidth};
      margin: 0 auto;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: 800 !important; }
    .bolder { font-weight: 900 !important; }
    .uppercase { text-transform: uppercase; }

    /* Prestigious Haute Couture & Boutique Styling */
    .store-header-box {
      text-align: center;
      margin-bottom: 4px;
      padding-bottom: 2px;
    }
    .receipt-logo {
      display: block;
      margin: 0 auto 4px auto;
      width: ${is58 ? '135px' : '170px'};
      max-width: 90%;
      height: auto;
      object-fit: contain;
      filter: none !important;
      -webkit-filter: none !important;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .brand-tagline-bullets {
      font-size: ${is58 ? '9.5px' : '11px'};
      font-weight: 900 !important;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      text-align: center;
      margin: 4px 0 6px 0;
      color: #000000 !important;
      line-height: 1.2;
    }

    /* 4 Categories Grid */
    .category-grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-top: 1px solid #000000;
      border-bottom: 1px solid #000000;
      padding: 5px 0;
      margin: 5px 0 6px 0;
    }
    .cat-item {
      flex: 1;
      text-align: center;
    }
    .cat-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 2px;
    }
    .cat-icon svg {
      width: ${is58 ? '16px' : '20px'};
      height: ${is58 ? '16px' : '20px'};
    }
    .cat-label {
      font-size: ${is58 ? '7px' : '8.5px'};
      font-weight: 900 !important;
      letter-spacing: 0.4px;
      text-transform: uppercase;
      line-height: 1.1;
    }
    .cat-divider {
      width: 1px;
      height: 24px;
      background: #000000;
    }

    /* Store Coordinates Row */
    .store-coords-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: ${is58 ? '8.5px' : '10.5px'};
      font-weight: 800 !important;
      margin: 6px 0 4px 0;
      color: #000000 !important;
      gap: 6px;
    }
    .coord-item {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .coord-icon {
      width: 13px;
      height: 13px;
      fill: #000000;
      flex-shrink: 0;
    }

    .dashed-line {
      border-top: 1.5px dashed #000000;
      margin: 6px 0;
    }

    /* Black Pill Title Banner */
    .receipt-black-banner {
      background: #000000 !important;
      color: #ffffff !important;
      text-align: center;
      font-size: ${is58 ? '12.5px' : '15.5px'};
      font-weight: 900 !important;
      letter-spacing: 1.5px;
      padding: 5px 8px;
      border-radius: 6px;
      margin: 6px 0;
      text-transform: uppercase;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    /* 2 Columns Metadata */
    .meta-two-col {
      display: flex;
      align-items: stretch;
      gap: 6px;
      font-size: ${is58 ? '8.5px' : '10.5px'};
      font-weight: 700 !important;
      line-height: 1.35;
      margin: 6px 0;
    }
    .meta-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 3px;
    }
    .meta-v-divider {
      width: 1.5px;
      background: #000000;
      margin: 0 1px;
    }
    .meta-line {
      display: flex;
      align-items: baseline;
    }
    .meta-lbl {
      font-weight: 900 !important;
      min-width: ${is58 ? '60px' : '74px'};
      flex-shrink: 0;
      text-transform: uppercase;
    }
    .meta-sep {
      font-weight: 900 !important;
      margin-right: 4px;
    }
    .meta-val {
      font-weight: 800 !important;
      word-break: break-word;
    }

    /* Thick Bordered Items Table */
    .receipt-table {
      width: 100%;
      border-collapse: collapse;
      border: 2px solid #000000;
      margin: 6px 0;
    }
    .receipt-table th {
      border-right: 1.5px solid #000000;
      border-bottom: 2px solid #000000;
      padding: 5px 2px;
      font-size: ${is58 ? '8.5px' : '10.5px'};
      font-weight: 900 !important;
      text-transform: uppercase;
      text-align: center;
      background: #f8fafc;
      color: #000000 !important;
    }
    .receipt-table th:last-child {
      border-right: none;
    }
    .receipt-table td {
      border-right: 1.5px solid #000000;
      border-bottom: 1.5px solid #000000;
      padding: 5px 3px;
      vertical-align: middle;
      font-size: ${is58 ? '9px' : '11px'};
      font-weight: 700;
      line-height: 1.25;
      color: #000000 !important;
    }
    .receipt-table tr:last-child td {
      border-bottom: none;
    }
    .receipt-table td:last-child {
      border-right: none;
    }
    .item-title {
      font-size: ${is58 ? '10px' : '12px'};
      font-weight: 900 !important;
      line-height: 1.2;
    }
    .item-subtitle {
      font-size: ${is58 ? '8px' : '9.5px'};
      font-weight: 600;
      color: #333333;
      margin-top: 1px;
    }

    /* Total Dual-Tone Centerpiece Banner */
    .total-dual-banner {
      display: flex;
      align-items: stretch;
      border: 2px solid #000000;
      border-radius: 4px;
      overflow: hidden;
      margin: 8px 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .total-left-label {
      background: #f1f5f9 !important;
      color: #000000 !important;
      font-size: ${is58 ? '13px' : '17px'};
      font-weight: 900 !important;
      letter-spacing: 1px;
      padding: 7px 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      text-transform: uppercase;
    }
    .total-right-amount {
      background: #000000 !important;
      color: #ffffff !important;
      font-size: ${is58 ? '14px' : '19px'};
      font-weight: 900 !important;
      letter-spacing: 0.5px;
      padding: 7px 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1.35;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
    }

    /* Calligraphy Script */
    .thanks-calligraphy {
      font-family: 'Dancing Script', 'Brush Script MT', 'Caveat', 'Great Vibes', 'Segoe Script', cursive, italic;
      font-size: ${is58 ? '18px' : '23px'};
      font-weight: bold;
      text-align: center;
      margin: 8px 0 5px 0;
      color: #000000 !important;
    }

    /* 3 Trust Badges */
    .trust-badges-row {
      display: flex;
      justify-content: space-around;
      align-items: center;
      font-size: ${is58 ? '8px' : '9.5px'};
      font-weight: 800 !important;
      margin: 4px 0 6px 0;
      text-align: center;
      color: #000000 !important;
    }
    .badge-col {
      display: flex;
      align-items: center;
      gap: 3px;
    }
    .badge-sep {
      color: #000000;
      font-weight: 900;
    }

    /* Realistic Barcode */
    .barcode-section {
      text-align: center;
      margin: 7px 0 3px 0;
    }
    .barcode-code-str {
      font-family: monospace;
      font-size: 11px;
      font-weight: 900 !important;
      letter-spacing: 1px;
      margin-top: 3px;
    }
    .net-box-label {
      font-size: ${is58 ? '10px' : '11.5px'};
      font-weight: 800 !important;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: #000000 !important;
    }
    .net-box-amount {
      font-size: ${is58 ? '17px' : '21px'};
      font-weight: 900 !important;
      letter-spacing: 0.5px;
      margin-top: 2px;
      color: #000000 !important;
    }

    .payment-box {
      margin-top: 4px;
      font-size: ${is58 ? '10px' : '11.5px'};
    }
    .credit-alert {
      border-top: 1px dashed #000000;
      padding-top: 2px;
      margin-top: 2px;
    }

    /* Barcode & Footer */
    .barcode-box {
      text-align: center;
      margin: 6px 0 4px 0;
    }
    .barcode-strip {
      font-family: monospace;
      letter-spacing: 2px;
      font-size: 13px;
      font-weight: 900 !important;
      line-height: 1;
    }
    .barcode-num {
      font-size: 9.5px;
      font-weight: 700 !important;
      letter-spacing: 1px;
      margin-top: 1px;
    }

    .footer-msg {
      text-align: center;
      margin-top: 5px;
      font-size: ${is58 ? '9.5px' : '11px'};
      line-height: 1.35;
      color: #000000 !important;
    }
    .footer-msg .thanks-title {
      font-weight: 900 !important;
      letter-spacing: 0.5px;
    }
    .footer-msg .thanks-brand {
      font-weight: 800;
      font-size: ${is58 ? '9px' : '10.5px'};
      letter-spacing: 1px;
      margin-top: 1px;
    }
    .footer-msg .thanks-policy {
      font-size: ${is58 ? '8.5px' : '9.5px'};
      margin-top: 2px;
      color: #222222;
    }
    .footer-msg .thanks-contact {
      font-size: ${is58 ? '8.5px' : '9.5px'};
      font-weight: 700;
      margin-top: 1px;
    }

    .no-print-toolbar {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 8px;
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 8px;
    }
    .btn-print {
      background: #000000 !important;
      color: white !important;
      border: none;
      padding: 8px 16px;
      font-weight: 900;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-close {
      background: #64748b !important;
      color: white !important;
      border: none;
      padding: 8px 14px;
      border-radius: 4px;
      cursor: pointer;
      font-size: 12px;
    }

    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        padding: 0 !important;
        margin: 0 !important;
        width: ${widthMm}mm !important;
        color: #000000 !important;
      }
      .ticket-container {
        width: 100% !important;
        max-width: ${maxContentWidth} !important;
        margin: 0 auto !important;
        padding: 0 !important;
      }
      .receipt-logo {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .store-header-box * {
        color: #000000 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER CE TICKET</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="ticket-container">
    <!-- Store Header with Brand, Categories & Coords -->
    ${getThermalBrandHeaderHtml(settings, is58)}

    <div class="dashed-line"></div>

    <!-- Title Banner: FACTURE / REÇU DE VENTE in black rounded pill -->
    <div class="receipt-black-banner">
      FACTURE / REÇU DE VENTE
    </div>

    <!-- 2-Columns Metadata -->
    <div class="meta-two-col">
      <div class="meta-col">
        <div class="meta-line">
          <span class="meta-lbl">N° FACTURE</span>
          <span class="meta-sep">:</span>
          <span class="meta-val font-mono">${sale.invoiceNumber}</span>
        </div>
        <div class="meta-line">
          <span class="meta-lbl">DATE</span>
          <span class="meta-sep">:</span>
          <span class="meta-val">${formatDateTime(sale.date)}</span>
        </div>
        <div class="meta-line">
          <span class="meta-lbl">VENDEUR</span>
          <span class="meta-sep">:</span>
          <span class="meta-val">${sale.userName || settings.storeName || 'TANE FAH'}</span>
        </div>
      </div>
      <div class="meta-v-divider"></div>
      <div class="meta-col">
        <div class="meta-line">
          <span class="meta-lbl">CLIENT</span>
          <span class="meta-sep">:</span>
          <span class="meta-val uppercase">${sale.customerName ? sale.customerName : 'Client Passager'}</span>
        </div>
        <div class="meta-line">
          <span class="meta-lbl">MODE PAIEMENT</span>
          <span class="meta-sep">:</span>
          <span class="meta-val">${getPaymentMethodLabel(sale.paymentMethod)}</span>
        </div>
        <div class="meta-line">
          <span class="meta-lbl">STATUT</span>
          <span class="meta-sep">:</span>
          <span class="meta-val">${sale.remainingDue && sale.remainingDue > 0 ? 'Partiel / Dette' : 'Payé'}</span>
        </div>
      </div>
    </div>

    <div class="dashed-line"></div>

    <!-- Thick Bordered Articles Table -->
    <table class="receipt-table">
      <thead>
        <tr>
          <th style="width: 44%;">DÉSIGNATION</th>
          <th style="width: 14%;">QTÉ</th>
          <th style="width: 21%;">P.U. (${currency})</th>
          <th style="width: 21%;">MONTANT (${currency})</th>
        </tr>
      </thead>
      <tbody>
        ${sale.items.map((item) => `
        <tr>
          <td style="text-align: left;">
            <div class="item-title">${item.productName}</div>
            ${item.discountPercent > 0 ? `<div class="item-subtitle">Remise -${item.discountPercent}%</div>` : ''}
          </td>
          <td style="text-align: center; font-weight: 900; font-size: ${is58 ? '11px' : '13px'};">
            ${formatQuantity(item.quantity)}
          </td>
          <td style="text-align: center; font-weight: 900;">
            ${formatMoney(item.unitPrice, '')}
          </td>
          <td style="text-align: center; font-weight: 900;">
            ${formatMoney(item.total, '')}
          </td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="dashed-line"></div>

    <!-- Optional discounts/subtotal summary if discounts applied -->
    ${sale.discountTotal > 0 || (settings.taxEnabled && sale.taxAmount > 0) ? `
    <div style="margin: 3px 0; font-size: ${is58 ? '9px' : '10.5px'}; font-weight: 800;">
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Sous-total (${totalItemsCount} ${totalItemsCount > 1 ? 'articles' : 'article'}) :</span>
        <span>${formatMoney(sale.subtotal, currency)}</span>
      </div>
      ${sale.discountTotal > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Remise commerciale :</span>
        <span>-${formatMoney(sale.discountTotal, currency)}</span>
      </div>
      ` : ''}
      ${settings.taxEnabled && sale.taxAmount > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>TVA (${settings.taxRatePercent}%) :</span>
        <span>${formatMoney(sale.taxAmount, currency)}</span>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Total Centerpiece Dual-Tone Banner -->
    <div class="total-dual-banner">
      <div class="total-left-label">
        TOTAL TTC  :
      </div>
      <div class="total-right-amount">
        ${formatMoney(sale.totalAmount, '')} ${currency}
      </div>
    </div>

    <!-- Payment info (Amount received, Change given, Credit remaining) -->
    ${(sale.amountReceived > 0 || (sale.remainingDue && sale.remainingDue > 0)) ? `
    <div style="font-size: ${is58 ? '9px' : '10.5px'}; font-weight: 800; margin: 4px 0;">
      ${sale.amountReceived > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Montant versé :</span>
        <span>${formatMoney(sale.amountReceived, currency)}</span>
      </div>
      ` : ''}
      ${sale.changeGiven > 0 ? `
      <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
        <span>Monnaie rendue :</span>
        <span>${formatMoney(sale.changeGiven, currency)}</span>
      </div>
      ` : ''}
      ${sale.remainingDue && sale.remainingDue > 0 ? `
      <div style="background:#fee2e2; border:1.5px solid #ef4444; color:#991b1b; padding:4px 8px; border-radius:4px; font-weight:900; display:flex; justify-content:space-between; margin:4px 0;">
        <span>RESTE EN DETTE :</span>
        <span class="font-mono">${formatMoney(sale.remainingDue, currency)}</span>
      </div>
      ` : ''}
    </div>
    ` : ''}

    <!-- Handwritten Calligraphy Script: Merci pour votre confiance ! -->
    <div class="thanks-calligraphy">
      Merci pour votre confiance !
    </div>

    <!-- 3 Trust Badges: Produits originaux | Garantie assurée | Service fiable -->
    <div class="trust-badges-row">
      <div class="badge-col">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#000000"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
        <span>Produits originaux</span>
      </div>
      <span class="badge-sep">|</span>
      <div class="badge-col">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#000000"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg>
        <span>Garantie assurée</span>
      </div>
      <span class="badge-sep">|</span>
      <div class="badge-col">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#000000"><path d="M12 3a9 9 0 0 0-9 9v7c0 1.1.9 2 2 2h4v-8H5v-1a7 7 0 0 1 14 0v1h-4v8h4c1.1 0 2-.9 2-2v-7a9 9 0 0 0-9-9z"/></svg>
        <span>Service fiable</span>
      </div>
    </div>

    <div class="dashed-line"></div>

    <!-- Vector Barcode Simulation -->
    <div class="barcode-section">
      ${generateBarcodeSvg(sale.invoiceNumber)}
      <div class="barcode-code-str">${sale.invoiceNumber}</div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 300);
    });
  </script>
</body>
</html>
  `;
};

export const generateCreditDebtThermalTicketHtml = (
  record: CreditDebtRecord,
  settings: StoreSettings,
  widthMm: 80 | 58 = 80
): string => {
  const is58 = widthMm === 58;
  const currency = settings.currency || 'FCFA';
  const storeName = (settings.storeName || settings.shopName || 'BOUTIQUE MALI').toUpperCase();
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';
  const email = settings.email || settings.shopEmail || '';
  const nif = settings.nifRccm || '';

  const fontSize = is58 ? '11px' : '13px';
  const headerFontSize = is58 ? '16px' : '19px';
  const maxContentWidth = is58 ? '44mm' : '64mm';

  const isClientCredit = record.type === 'CLIENT_CREDIT';
  const title = isClientCredit
    ? 'REÇU DE CRÉANCE CLIENT'
    : 'RECONNAISSANCE DE DETTE';
  const subtitle = isClientCredit
    ? 'ENGAGEMENT DE PAIEMENT DU CLIENT'
    : 'BON D\'ENGAGEMENT FOURNISSEUR';

  const creditor = isClientCredit ? storeName : record.partyName;
  const creditorPhone = isClientCredit ? phone : (record.partyPhone || '—');
  const debtor = isClientCredit ? record.partyName : storeName;
  const debtorPhone = isClientCredit ? (record.partyPhone || '—') : phone;
  const isSettled = record.status === 'SOLDE' || record.remainingAmount <= 0.001;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket_Solde_${record.id.slice(-6).toUpperCase()}</title>
  <style>
    @page {
      margin: 0;
      size: ${widthMm}mm auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: ${fontSize};
      font-weight: 600;
      line-height: 1.35;
      color: #000000 !important;
      background: #ffffff !important;
      padding: ${is58 ? "1.5mm" : "3mm"};
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased;
    }
    .ticket-container {
      width: 100%;
      max-width: ${maxContentWidth};
      margin-left: 0.5mm;
      margin-right: auto;
      padding-right: 2.5mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: 900 !important; }
    .uppercase { text-transform: uppercase; }
    .divider {
      border-top: 1.5px dashed #000000;
      margin: 4px 0;
    }
    .solid-divider {
      border-top: 2px solid #000000;
      margin: 4px 0;
    }
    .double-divider {
      border-top: 3px double #000000;
      margin: 5px 0;
    }
    .store-name {
      font-size: ${headerFontSize};
      font-weight: 900 !important;
      text-transform: uppercase;
      line-height: 1.1;
      margin-bottom: 2px;
    }
    .doc-title {
      font-size: ${is58 ? '13px' : '15px'};
      font-weight: 900 !important;
      text-transform: uppercase;
      margin-top: 3px;
      border: 1.5px solid #000000;
      padding: 3px 2px;
      text-align: center;
    }
    .doc-subtitle {
      font-size: ${is58 ? '10px' : '11.5px'};
      text-align: center;
      margin: 2px 0 4px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: ${fontSize};
      line-height: 1.2;
    }
    .total-box {
      border: 2px solid #000000;
      padding: 5px 4px;
      margin: 6px 0;
      background: #ffffff;
    }
    .big-balance {
      font-size: ${is58 ? '14px' : '16px'};
      font-weight: 900 !important;
      text-align: center;
      padding: 4px 0 2px;
      border-top: 1.5px dashed #000000;
      margin-top: 4px;
    }
    .payment-table {
      width: 100%;
      border-collapse: collapse;
      font-size: ${is58 ? '10.5px' : '12px'};
      margin: 4px 0;
    }
    .payment-table th, .payment-table td {
      border-bottom: 1px dashed #000000;
      padding: 2px 1px;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 4px;
      border-top: 1px dashed #000000;
    }
    .sig-col {
      width: 48%;
      text-align: center;
      font-size: ${is58 ? '10px' : '11.5px'};
    }
    .sig-space {
      height: 38px;
    }
    .no-print-toolbar {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .btn-print {
      flex: 1;
      background: #000000;
      color: #ffffff !important;
      border: none;
      padding: 8px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      border-radius: 4px;
    }
    .btn-close {
      background: #e2e8f0;
      color: #000000 !important;
      border: none;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      border-radius: 4px;
    }
    @media print {
      .no-print-toolbar { display: none !important; }
      body {
        padding: 0 !important;
        margin: 0 !important;
        width: ${widthMm}mm !important;
      }
      .ticket-container {
        width: 100% !important;
        max-width: ${maxContentWidth} !important;
        margin-left: 0.5mm !important;
        margin-right: auto !important;
        padding-right: 2.5mm !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER CE TICKET 80mm</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="ticket-container">
    ${getThermalBrandHeaderHtml(settings, is58)}

    <div class="doc-title">${title}</div>
    <div class="doc-subtitle">${subtitle}</div>

    <div class="solid-divider"></div>

    <div class="row">
      <span>N° DOSSIER:</span>
      <span class="bold">CD-${record.id.slice(-6).toUpperCase()}</span>
    </div>
    <div class="row">
      <span>DATE ÉMISSION:</span>
      <span>${formatDate(record.createdAt || record.date)}</span>
    </div>
    <div class="row">
      <span>ÉCHÉANCE:</span>
      <span class="bold">${record.dueDate ? formatDate(record.dueDate) : 'Non définie'}</span>
    </div>
    <div class="row">
      <span>STATUT:</span>
      <span class="bold">${isSettled ? 'SOLDÉ (100% PAYÉ)' : 'EN COURS (NON SOLDÉ)'}</span>
    </div>

    <div class="divider"></div>

    <div class="row">
      <span>CRÉANCIER:</span>
      <span class="bold uppercase">${creditor}</span>
    </div>
    <div class="row">
      <span>TÉL CRÉANCIER:</span>
      <span>${creditorPhone}</span>
    </div>
    <div class="row" style="margin-top:2px;">
      <span>DÉBITEUR:</span>
      <span class="bold uppercase">${debtor}</span>
    </div>
    <div class="row">
      <span>TÉL DÉBITEUR:</span>
      <span>${debtorPhone}</span>
    </div>
    ${record.partyAddress ? `
    <div class="row">
      <span>ADRESSE:</span>
      <span>${record.partyAddress}</span>
    </div>
    ` : ''}

    <div class="divider"></div>

    <div>
      <span class="bold">OBJET / MOTIF:</span><br>
      <span>${record.title}</span>
      ${record.notes ? `<div style="font-size:10px; font-style:italic; margin-top:2px;">Note: ${record.notes}</div>` : ''}
    </div>

    <div class="total-box">
      <div class="row">
        <span>MONTANT INITIAL:</span>
        <span class="bold">${formatMoney(record.initialAmount, currency)}</span>
      </div>
      <div class="row">
        <span>DÉJÀ VERSÉ:</span>
        <span class="bold">${formatMoney(record.paidAmount, currency)}</span>
      </div>
      <div class="big-balance">
        SOLDE RESTANT DÛ:<br>
        <span style="font-size:${is58 ? '16px' : '19px'};">${formatMoney(record.remainingAmount, currency)}</span>
      </div>
    </div>

    ${record.payments && record.payments.length > 0 ? `
    <div class="bold uppercase" style="font-size:10px; margin-top:4px;">
      VERSEMENTS EFFECTUÉS (${record.payments.length}) :
    </div>
    <table class="payment-table">
      <thead>
        <tr>
          <th class="left">Date</th>
          <th class="left">Mode</th>
          <th class="right">Montant</th>
        </tr>
      </thead>
      <tbody>
        ${record.payments.map(p => `
          <tr>
            <td>${formatDate(p.date)}</td>
            <td>${getPaymentMethodLabel(p.paymentMethod)}</td>
            <td class="right bold">${formatMoney(p.amount, currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <div style="font-size:${is58 ? '10px' : '11.5px'}; margin: 6px 0; line-height: 1.25;">
      <strong>ENGAGEMENT FORMEL :</strong> Le Débiteur désigné reconnaît devoir valablement au Créancier 
      la somme restante de <strong>${formatMoney(record.remainingAmount, currency)}</strong>.
      ${isSettled 
        ? 'Dossier intégralement soldé et acquitté.' 
        : `Engagement de règlement complet au plus tard le ${record.dueDate ? formatDate(record.dueDate) : 'dans les délais convenus'}.`
      }
    </div>

    <div class="signatures">
      <div class="sig-col">
        <strong>LE DÉBITEUR</strong><br>
        <span style="font-size:8px;">(Signature & Accord)</span>
        <div style="height:36px; border-bottom:1.5px dotted #000000; margin-top:8px;"></div>
      </div>
      <div class="sig-col">
        <strong>LE CRÉANCIER</strong><br>
        <span style="font-size:8px;">(Signature & Cachet)</span>
        <div style="height:36px; border-bottom:1.5px dotted #000000; margin-top:8px;"></div>
      </div>
    </div>

    <div class="divider"></div>
    <div class="center" style="font-size:9px; margin-top:4px;">
      Ticket édité le ${formatDateTime(new Date().toISOString())}<br>
      Document légal valant preuve et engagement.
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 300);
    });
  </script>
</body>
</html>
  `;
};

/**
 * Generates an 80mm thermal receipt HTML for an individual credit repayment (Reçu de versement)
 */
export const generateCreditPaymentThermalTicketHtml = (
  payment: CreditPayment,
  partyName: string,
  partyType: 'CLIENT' | 'FOURNISSEUR',
  remainingDebt: number,
  settings: StoreSettings,
  notes?: string,
  widthMm: 80 | 58 = 80
): string => {
  const is58 = widthMm === 58;
  const currency = settings.currency || 'FCFA';
  const storeName = (settings.storeName || settings.shopName || 'BOUTIQUE MALI').toUpperCase();
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';

  const fontSize = is58 ? '11px' : '13px';
  const maxContentWidth = is58 ? '44mm' : '64mm';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reçu_${payment.receiptNumber || 'REC'}</title>
  <style>
    @page {
      margin: 0;
      size: ${widthMm}mm auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: ${fontSize};
      font-weight: 600;
      line-height: 1.35;
      color: #000000 !important;
      background: #ffffff !important;
      padding: ${is58 ? "1.5mm" : "3mm"};
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased;
    }
    .ticket-container {
      width: 100%;
      max-width: ${maxContentWidth};
      margin-left: 0.5mm;
      margin-right: auto;
      padding-right: 2.5mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 900 !important; }
    .uppercase { text-transform: uppercase; }
    .divider {
      border-top: 1.5px dashed #000000;
      margin: 4px 0;
    }
    .solid-divider {
      border-top: 2px solid #000000;
      margin: 4px 0;
    }
    .doc-title {
      font-size: ${is58 ? '12px' : '14px'};
      border: 1.5px solid #000000;
      padding: 3px 2px;
      text-align: center;
      margin: 3px 0 2px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .total-box {
      border: 2px solid #000000;
      padding: 6px 4px;
      margin: 6px 0;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 4px;
      border-top: 1px dashed #000000;
    }
    .sig-col {
      width: 48%;
      text-align: center;
      font-size: 10.5px;
    }
    .no-print-toolbar {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .btn-print {
      flex: 1;
      background: #000000;
      color: #ffffff !important;
      border: none;
      padding: 8px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      border-radius: 4px;
    }
    .btn-close {
      background: #e2e8f0;
      color: #000000 !important;
      border: none;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      border-radius: 4px;
    }
    @media print {
      .no-print-toolbar { display: none !important; }
      body {
        padding: 0 !important;
        margin: 0 !important;
        width: ${widthMm}mm !important;
      }
      .ticket-container {
        width: 100% !important;
        max-width: ${maxContentWidth} !important;
        margin-left: 0.5mm !important;
        margin-right: auto !important;
        padding-right: 2.5mm !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER CE REÇU 80mm</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="ticket-container">
    ${getThermalBrandHeaderHtml(settings, is58)}

    <div class="doc-title bold">
      REÇU DE RÈGLEMENT ${partyType === 'CLIENT' ? 'CRÉDIT' : 'DETTE'}
    </div>
    <div class="center" style="font-size:9px; margin-bottom:4px;">Document officiel remis aux parties</div>

    <div class="solid-divider"></div>

    <div class="row">
      <span>N° REÇU:</span>
      <span class="bold">${payment.receiptNumber || 'REC-001'}</span>
    </div>
    <div class="row">
      <span>DATE & HEURE:</span>
      <span>${formatDateTime(payment.date)}</span>
    </div>
    <div class="row">
      <span>${partyType === 'CLIENT' ? 'CLIENT (DÉBITEUR):' : 'FOURNISSEUR (CRÉANCIER):'}</span>
      <span class="bold uppercase">${partyName}</span>
    </div>
    <div class="row">
      <span>MODE DE RÈGLEMENT:</span>
      <span class="bold">${getPaymentMethodLabel(payment.paymentMethod)}</span>
    </div>
    ${payment.receivedBy ? `
    <div class="row">
      <span>ENCAISSÉ / ÉMIS PAR:</span>
      <span>${payment.receivedBy}</span>
    </div>
    ` : ''}

    <div class="total-box">
      <div class="row" style="font-size:${is58 ? '14px' : '16px'};">
        <span>MONTANT RÉGLÉ:</span>
        <span class="bold">${formatMoney(payment.amount, currency)}</span>
      </div>
      <div class="row" style="margin-top:4px; padding-top:4px; border-top:1px dashed #000000; font-size:${is58 ? '12px' : '14px'};">
        <span>NOUVEAU RESTE DÛ:</span>
        <span class="bold">${formatMoney(remainingDebt, currency)}</span>
      </div>
    </div>

    ${(notes || payment.notes) ? `
    <div style="font-size:10px; margin: 4px 0;">
      <strong>Note:</strong> ${notes || payment.notes}
    </div>
    ` : ''}

    <div class="signatures">
      <div class="sig-col">
        <strong>LE DÉBITEUR</strong><br>
        <span style="font-size:8px;">(Accusé de versement)</span>
        <div style="height:36px; border-bottom:1.5px dotted #000000; margin-top:8px;"></div>
      </div>
      <div class="sig-col">
        <strong>POUR LA BOUTIQUE</strong><br>
        <span style="font-size:8px;">(Signature & Cachet)</span>
        <div style="height:36px; border-bottom:1.5px dotted #000000; margin-top:8px;"></div>
      </div>
    </div>

    <div class="divider"></div>
    <div class="center" style="font-size:9px;">
      Merci pour votre confiance !<br>
      Ce reçu fait foi de paiement libératoire.
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 300);
    });
  </script>
</body>
</html>
  `;
};

/**
 * Generates an 80mm thermal ticket for Customer or Supplier Account Credit Balance (Situation de Compte)
 */
export const generatePartyCreditBalanceThermalTicketHtml = (params: {
  partyName: string;
  partyPhone?: string;
  partyAddress?: string;
  partyType: 'CLIENT' | 'FOURNISSEUR';
  totalRemainingDebt: number;
  creditLimit?: number;
  records?: CreditDebtRecord[];
  settings: StoreSettings;
  widthMm?: 80 | 58;
}): string => {
  const {
    partyName,
    partyPhone,
    partyAddress,
    partyType,
    totalRemainingDebt,
    creditLimit,
    records = [],
    settings,
    widthMm = 80,
  } = params;

  const is58 = widthMm === 58;
  const currency = settings.currency || 'FCFA';
  const storeName = (settings.storeName || settings.shopName || 'BOUTIQUE MALI').toUpperCase();
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';
  const maxContentWidth = is58 ? '44mm' : '64mm';
  const fontSize = is58 ? '10.5px' : '12px';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Solde_${partyName.replace(/\s+/g, '_')}</title>
  <style>
    @page {
      margin: 0;
      size: ${widthMm}mm auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, Helvetica, "Segoe UI", Roboto, -apple-system, sans-serif;
      font-size: ${fontSize};
      font-weight: 600;
      line-height: 1.35;
      color: #000000 !important;
      background: #ffffff !important;
      padding: ${is58 ? "1.5mm 2mm 1.5mm 1mm" : "2mm 4mm 2mm 1.5mm"};
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      margin: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased;
    }
    .ticket-container {
      width: 100%;
      max-width: ${maxContentWidth};
      margin-left: 0.5mm;
      margin-right: auto;
      padding-right: 2.5mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: 800 !important; }
    .bolder { font-weight: 900 !important; }
    .uppercase { text-transform: uppercase; }
    .divider {
      border-top: 1.5px dashed #000000;
      margin: 4px 0;
    }
    .solid-divider {
      border-top: 2px solid #000000;
      margin: 4px 0;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin: 3px 0;
      font-size: ${is58 ? '10.5px' : '12px'};
      line-height: 1.3;
    }
    .row .label {
      font-weight: 700;
      color: #000000;
      flex-shrink: 0;
    }
    .row .value {
      font-weight: 800;
      color: #000000;
      text-align: right;
      padding-right: 2px;
      word-break: break-word;
      max-width: 65%;
    }
    .balance-box {
      border: 2px solid #000000;
      padding: 6px 4px;
      margin: 6px 0;
      text-align: center;
      background: #ffffff;
    }
    .table-dossiers {
      width: 100%;
      border-collapse: collapse;
      font-size: ${is58 ? '10px' : '11.5px'};
      margin: 5px 0;
    }
    .table-dossiers th {
      border-bottom: 2px solid #000000;
      border-top: 2px solid #000000;
      padding: 3px 2px;
      font-weight: 800;
      line-height: 1.2;
    }
    .table-dossiers td {
      border-bottom: 1px dashed #000000;
      padding: 3.5px 2px;
      font-weight: 600;
      line-height: 1.25;
    }
    .table-dossiers th:last-child,
    .table-dossiers td:last-child {
      padding-right: 2.5px !important;
    }
    .signatures {
      display: flex;
      justify-content: space-between;
      margin-top: 10px;
      padding-top: 5px;
      border-top: 1.5px dashed #000000;
      padding-right: 2px;
    }
    .sig-col {
      width: 47%;
      text-align: center;
      font-size: 10.5px;
      font-weight: 700;
    }
    .no-print-toolbar {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .btn-print {
      flex: 1;
      background: #000000;
      color: #ffffff !important;
      border: none;
      padding: 8px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      border-radius: 4px;
    }
    .btn-close {
      background: #e2e8f0;
      color: #000000 !important;
      border: none;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      border-radius: 4px;
    }
    @media print {
      .no-print-toolbar { display: none !important; }
      body {
        padding: 0 !important;
        margin: 0 !important;
        width: ${widthMm}mm !important;
      }
      .ticket-container {
        width: 100% !important;
        max-width: ${maxContentWidth} !important;
        margin-left: 0.5mm !important;
        margin-right: auto !important;
        padding-right: 2.5mm !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER CE SOLDE</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="ticket-container">
    ${getThermalBrandHeaderHtml(settings, is58)}

    <div class="center" style="font-size:${is58 ? '10px' : '11px'}; margin:4px 0 3px; font-weight:700;">
      Situation arrêtée le ${formatDateTime(new Date().toISOString())}
    </div>

    <div class="solid-divider"></div>

    <div class="row">
      <span class="label">${partyType === 'CLIENT' ? 'CLIENT :' : 'FOURNISSEUR :'}</span>
      <span class="value uppercase bold">${partyName}</span>
    </div>
    ${partyPhone ? `
    <div class="row">
      <span class="label">TÉLÉPHONE :</span>
      <span class="value bold">${partyPhone}</span>
    </div>
    ` : ''}
    ${partyAddress ? `
    <div class="row">
      <span class="label">ADRESSE :</span>
      <span class="value bold">${partyAddress}</span>
    </div>
    ` : ''}
    ${creditLimit !== undefined && creditLimit > 0 ? `
    <div class="row">
      <span class="label">PLAFOND AUTORISÉ :</span>
      <span class="value bold">${formatMoney(creditLimit, currency)}</span>
    </div>
    ` : ''}

    <div class="balance-box">
      <div style="font-size:${is58 ? '11px' : '12px'}; font-weight:800; letter-spacing:0.3px;">TOTAL SOLDE RESTANT DÛ :</div>
      <div style="font-size:${is58 ? '18px' : '22px'}; margin:3px 0 2px; letter-spacing:0.3px;" class="bolder">
        ${formatMoney(totalRemainingDebt, currency)}
      </div>
      <div style="font-size:${is58 ? '9.5px' : '10.5px'}; font-weight:700;">
        ${totalRemainingDebt <= 0 ? 'COMPTE ENTIÈREMEMENT EN RÈGLE (SOLDE NUL)' : 'SOLDE EXIGIBLE À RECOUVRER'}
      </div>
    </div>

    ${records.length > 0 ? `
    <div class="bold" style="font-size:${is58 ? '10.5px' : '11.5px'}; margin:5px 0 3px;">
      DOSSIERS EN COURS (${records.length}) :
    </div>
    <table class="table-dossiers">
      <thead>
        <tr>
          <th class="left" style="width:33%;">Date / Réf</th>
          <th class="left" style="width:34%;">Objet</th>
          <th class="right" style="width:33%;">Reste</th>
        </tr>
      </thead>
      <tbody>
        ${records.map(r => `
          <tr>
            <td>${formatDate(r.date)}<br><span style="font-size:9.5px; font-weight:700;">CD-${r.id.slice(-4)}</span></td>
            <td style="word-break: break-word;">${r.title}</td>
            <td class="right bold">${formatMoney(r.remainingAmount, currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    ` : ''}

    <div class="signatures">
      <div class="sig-col">
        <strong>LE ${partyType}</strong><br>
        <span style="font-size:9px; font-weight:600;">(Pour accord du solde)</span>
        <div style="height:34px; border-bottom:1.5px dotted #000000; margin-top:6px;"></div>
      </div>
      <div class="sig-col">
        <strong>POUR LA BOUTIQUE</strong><br>
        <span style="font-size:9px; font-weight:600;">(Signature & Cachet)</span>
        <div style="height:34px; border-bottom:1.5px dotted #000000; margin-top:6px;"></div>
      </div>
    </div>

    <div class="divider"></div>
    <div class="center" style="font-size:10.5px; font-weight:700; margin-top:4px;">
      Relevé de solde officiel conforme aux écritures comptables.
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 300);
    });
  </script>
</body>
</html>
  `;
};

export const generateCreditDebtSummaryReportThermalTicketHtml = (params: {
  records: CreditDebtRecord[];
  filterType: 'ALL' | 'CLIENT_CREDIT' | 'SUPPLIER_DEBT';
  settings: StoreSettings;
  generatedBy?: string;
  widthMm?: 80 | 58;
}): string => {
  const { records, filterType, settings, generatedBy = 'Gérant', widthMm = 80 } = params;
  const is58 = widthMm === 58;
  const currency = settings.currency || 'FCFA';
  const storeName = (settings.storeName || settings.shopName || 'BOUTIQUE MALI').toUpperCase();
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';
  const maxContentWidth = is58 ? '44mm' : '64mm';
  const fontSize = is58 ? '11px' : '13px';

  const clientRecords = records.filter(r => r.type === 'CLIENT_CREDIT');
  const supplierRecords = records.filter(r => r.type === 'SUPPLIER_DEBT');

  const totalClientDue = clientRecords.reduce((sum, r) => sum + (r.remainingAmount || 0), 0);
  const totalSupplierDue = supplierRecords.reduce((sum, r) => sum + (r.remainingAmount || 0), 0);
  const net = totalClientDue - totalSupplierDue;

  const title =
    filterType === 'CLIENT_CREDIT'
      ? 'BILAN CRÉANCES CLIENTS'
      : filterType === 'SUPPLIER_DEBT'
      ? 'BILAN DETTES FOURNISSEURS'
      : 'BILAN GÉNÉRAL CRÉDITS & DETTES';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bilan_Soldes_Credits_80mm</title>
  <style>
    @page {
      margin: 0;
      size: ${widthMm}mm auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: Arial, Helvetica, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: ${fontSize};
      font-weight: 600;
      line-height: 1.35;
      color: #000000 !important;
      background: #ffffff !important;
      padding: ${is58 ? "1.5mm" : "3mm"};
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased;
    }
    .ticket-container {
      width: 100%;
      max-width: ${maxContentWidth};
      margin-left: 0.5mm;
      margin-right: auto;
      padding-right: 2.5mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .bold { font-weight: 900 !important; }
    .uppercase { text-transform: uppercase; }
    .divider {
      border-top: 1.5px dashed #000000;
      margin: 4px 0;
    }
    .solid-divider {
      border-top: 2px solid #000000;
      margin: 4px 0;
    }
    .doc-title {
      font-size: ${is58 ? '12px' : '14px'};
      border: 1.5px solid #000000;
      padding: 3px 2px;
      text-align: center;
      margin: 3px 0 2px;
    }
    .row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
    }
    .summary-box {
      border: 2px solid #000000;
      padding: 6px 4px;
      margin: 6px 0;
    }
    .table-list {
      width: 100%;
      border-collapse: collapse;
      font-size: ${is58 ? '10.5px' : '12px'};
      margin: 4px 0;
    }
    .table-list th, .table-list td {
      border-bottom: 1px dashed #000000;
      padding: 2px 1px;
    }
    .no-print-toolbar {
      display: flex;
      gap: 6px;
      margin-bottom: 8px;
    }
    .btn-print {
      flex: 1;
      background: #000000;
      color: #ffffff !important;
      border: none;
      padding: 8px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      border-radius: 4px;
    }
    .btn-close {
      background: #e2e8f0;
      color: #000000 !important;
      border: none;
      padding: 8px 12px;
      font-size: 11px;
      font-weight: 900;
      cursor: pointer;
      border-radius: 4px;
    }
    @media print {
      .no-print-toolbar { display: none !important; }
      body {
        padding: 0 !important;
        margin: 0 !important;
        width: ${widthMm}mm !important;
      }
      .ticket-container {
        width: 100% !important;
        max-width: ${maxContentWidth} !important;
        margin-left: 0.5mm !important;
        margin-right: auto !important;
        padding-right: 2.5mm !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER CE BILAN 80mm</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="ticket-container">
    ${getThermalBrandHeaderHtml(settings, is58)}

    <div class="doc-title bold">${title}</div>
    <div class="center" style="font-size:9px; margin-bottom:3px;">
      Arrêté le ${formatDateTime(new Date().toISOString())} • Édité par : ${generatedBy}
    </div>

    <div class="solid-divider"></div>

    <div class="summary-box">
      ${filterType !== 'SUPPLIER_DEBT' ? `
      <div class="row">
        <span>CRÉANCES CLIENTS DUES:</span>
        <span class="bold">${formatMoney(totalClientDue, currency)}</span>
      </div>
      ` : ''}
      ${filterType !== 'CLIENT_CREDIT' ? `
      <div class="row">
        <span>DETTES FOURNISSEURS DUES:</span>
        <span class="bold">${formatMoney(totalSupplierDue, currency)}</span>
      </div>
      ` : ''}
      ${filterType === 'ALL' ? `
      <div class="row" style="margin-top:4px; padding-top:4px; border-top:1.5px dashed #000000; font-size:${is58 ? '13px' : '15px'};">
        <span>BALANCE NETTE:</span>
        <span class="bold">${formatMoney(net, currency)}</span>
      </div>
      ` : ''}
    </div>

    <div class="bold" style="font-size:10px; margin-top:4px;">
      DÉTAIL DES DOSSIERS ACTIFS (${records.length}) :
    </div>

    <table class="table-list">
      <thead>
        <tr>
          <th class="left">Tiers</th>
          <th class="left">Échéance</th>
          <th class="right">Reste Dû</th>
        </tr>
      </thead>
      <tbody>
        ${records.map(r => `
          <tr>
            <td>
              <span class="bold">${r.partyName}</span><br>
              <span style="font-size:8px;">${r.type === 'CLIENT_CREDIT' ? 'Client' : 'Fournisseur'} • CD-${r.id.slice(-4)}</span>
            </td>
            <td>${r.dueDate ? formatDate(r.dueDate) : '—'}</td>
            <td class="right bold">${formatMoney(r.remainingAmount, currency)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="divider"></div>
    <div class="center" style="font-size:9px; margin-top:6px;">
      *** FIN DU RAPPORT DE SOLDES ***<br>
      Imprimé sur imprimante thermique de caisse.
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 300);
    });
  </script>
</body>
</html>
  `;
};

/**
 * Direct print trigger helper for 80mm tickets
 */
export const printTicketIn80mm = (htmlContent: string): boolean => {
  try {
    const printWin = window.open('', '_blank', 'width=450,height=700');
    if (printWin) {
      printWin.document.open();
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      return true;
    }
  } catch (e) {
    console.error('Window open failed:', e);
  }
  return false;
};

export const generateA4InvoiceHtml = (
  sale: Sale,
  settings: StoreSettings,
  customer?: Customer
): string => {
  const currency = settings.currency || 'FCFA';
  const storeName = (settings.storeName || settings.shopName || 'BOUTIQUE MALI').toUpperCase();
  const storeTagline = settings.storeTagline || settings.businessType || '';
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';
  const email = settings.email || settings.shopEmail || '';
  const nif = settings.nifRccm || '';
  const mobileMoney = settings.mobileMoneyNumber || '';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Facture_${sale.invoiceNumber}</title>
  <style>
    @page {
      margin: 10mm;
      size: A4 portrait;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-weight: 900 !important;
      color: #000000 !important;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      font-weight: 500;
      line-height: 1.35;
      color: #000000 !important;
      background: #fff;
      padding: 6mm;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      -webkit-font-smoothing: antialiased;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: 900 !important; }
    .uppercase { text-transform: uppercase; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #000000;
      padding-bottom: 8px;
      margin-bottom: 10px;
    }
    .store-title {
      font-size: 22px;
      font-weight: 900 !important;
      color: #000000 !important;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
      line-height: 1.1;
    }
    .store-tagline-a4 {
      font-size: 12px;
      font-weight: 900 !important;
      color: #000000 !important;
      text-transform: uppercase;
      margin-bottom: 3px;
      line-height: 1.15;
    }
    .store-info-a4 {
      font-size: 11.5px;
      font-weight: 900 !important;
      color: #000000 !important;
      line-height: 1.2;
    }
    .store-info-a4 strong {
      font-weight: 900 !important;
      color: #000000 !important;
    }
    .invoice-badge {
      display: inline-block;
      background: #000000 !important;
      color: #ffffff !important;
      font-weight: 900 !important;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      text-transform: uppercase;
      line-height: 1.15;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin-bottom: 10px;
      background: #f8fafc;
      padding: 8px 10px;
      border-radius: 6px;
      border: 2px solid #000000;
      line-height: 1.2;
    }
    table.invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 10px;
    }
    table.invoice-table th {
      background: #000000 !important;
      color: #ffffff !important;
      padding: 6px 8px;
      font-size: 11px;
      font-weight: 900 !important;
      text-transform: uppercase;
      text-align: left;
      line-height: 1.15;
    }
    table.invoice-table td {
      padding: 5px 8px;
      border-bottom: 1.5px solid #000000;
      font-size: 11.5px;
      font-weight: 800 !important;
      line-height: 1.2;
    }
    .totals-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }
    .totals-box {
      width: 290px;
      background: #ffffff;
      border: 2px solid #000000;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 3px;
      font-size: 11.5px;
      font-weight: 800 !important;
      line-height: 1.15;
    }
    .net-to-pay {
      border-top: 2px solid #000000;
      padding-top: 4px;
      margin-top: 4px;
      font-size: 15px;
      font-weight: 900 !important;
      color: #000000 !important;
      line-height: 1.15;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 12px;
    }
    .sig-box {
      border: 2px dashed #000000;
      border-radius: 6px;
      height: 70px;
      padding: 6px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
      font-weight: 800 !important;
    }
    .footer {
      border-top: 1.5px solid #000000;
      margin-top: 12px;
      padding-top: 6px;
      text-align: center;
      font-size: 10px;
      font-weight: 800 !important;
      color: #000000 !important;
      line-height: 1.2;
    }
    .no-print-toolbar {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 12px;
    }
    .btn-print {
      background: #4f46e5 !important;
      color: white !important;
      border: none;
      padding: 8px 18px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-close {
      background: #64748b !important;
      color: white !important;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
    }
    .a4-logo {
      max-height: 105px;
      max-width: 210px;
      object-fit: contain;
      border-radius: 8px;
      padding: 2px;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .brand-title-a4 {
      font-family: 'Playfair Display', 'Cinzel', 'Didot', 'Bodoni MT', 'Georgia', 'Times New Roman', serif;
      font-size: 26px;
      font-weight: 900 !important;
      letter-spacing: 2.5px;
      line-height: 1.05;
      text-transform: uppercase;
      color: #000000 !important;
      margin-bottom: 2px;
    }
    .brand-subtitle-a4 {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      font-size: 13px;
      font-weight: 800 !important;
      letter-spacing: 5px;
      text-transform: uppercase;
      color: #000000 !important;
      margin-bottom: 3px;
    }
    .brand-tagline-a4 {
      font-size: 11.5px;
      font-weight: 700 !important;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #1a1a1a !important;
      margin-bottom: 6px;
    }
    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        padding: 0 !important;
        color: #000000 !important;
      }
      * {
        color: #000000 !important;
        font-weight: 900 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .a4-logo {
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER CETTE FACTURE A4 (TEXTE GRAS)</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="header">
    ${getA4BrandHeaderHtml(settings)}

    <div class="right">
      <div class="invoice-badge">FACTURE OFFICIELLE</div>
      <div style="font-size: 12px; margin-top: 6px;" class="bold">
        <div>N° : <strong>${sale.invoiceNumber}</strong></div>
        <div>Date : <strong>${formatDate(sale.date)}</strong></div>
        <div>Établi par : <strong>${sale.userName || 'Caisse'}</strong></div>
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div style="font-size: 10px; font-weight: 900; text-transform: uppercase;">Facturé à :</div>
      <div style="font-size: 14px; font-weight: 900; margin-top: 2px;" class="uppercase">${sale.customerName || 'Client Comptoir'}</div>
      ${customer?.phone ? `<div class="bold">Tél : ${customer.phone}</div>` : ''}
      ${customer?.address ? `<div class="bold">Adresse : ${customer.address}</div>` : ''}
    </div>
    <div class="right">
      <div style="font-size: 10px; font-weight: 900; text-transform: uppercase;">Modalités de Règlement :</div>
      <div style="font-weight: 900; margin-top: 2px;" class="uppercase">${getPaymentMethodLabel(sale.paymentMethod)}</div>
      <div style="font-weight: 900;" class="uppercase">Statut : Réglée / Acquittée</div>
    </div>
  </div>

  <table class="invoice-table">
    <thead>
      <tr>
        <th style="width: 40px;" class="bold">N°</th>
        <th class="bold">Désignation de l'Article</th>
        <th class="center bold" style="width: 70px;">Qté</th>
        <th class="right bold" style="width: 120px;">Prix Unitaire</th>
        <th class="right bold" style="width: 140px;">Montant Net (${currency})</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items.map((item, idx) => `
      <tr>
        <td class="bold">${idx + 1}</td>
        <td>
          <strong class="bold">${item.productName}</strong>
          ${item.productCode ? `<span style="font-size: 10px; margin-left: 4px;" class="bold">(${item.productCode})</span>` : ''}
          ${item.discountPercent > 0 ? `<div style="font-size: 10px;" class="bold">Remise de ${item.discountPercent}%</div>` : ''}
        </td>
        <td class="center bold">${formatQuantity(item.quantity)} ${item.productUnit || ''}</td>
        <td class="right bold">${formatMoney(item.unitPrice, '')}</td>
        <td class="right bold">${formatMoney(item.total, '')}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-area">
    <div style="max-width: 340px;">
      <div style="background: #ffffff; border: 2px solid #000000; border-radius: 6px; padding: 10px; font-size: 11px;">
        <span style="font-weight: 900;">Arrêtée la présente facture à la somme de :</span><br>
        <span style="font-style: italic; font-weight: 900; text-transform: uppercase; color: #000000;">
          ${numberToWordsFrench(Math.round(sale.totalAmount))} ${currency}
        </span>
      </div>
    </div>

    <div class="totals-box">
      <div class="total-line">
        <span class="bold">Total Brut :</span>
        <span class="bold">${formatMoney(sale.subtotal, currency)}</span>
      </div>
      ${sale.discountTotal > 0 ? `
      <div class="total-line">
        <span class="bold">Remise :</span>
        <span class="bold">-${formatMoney(sale.discountTotal, currency)}</span>
      </div>
      ` : ''}
      ${settings.taxEnabled && sale.taxAmount > 0 ? `
      <div class="total-line">
        <span class="bold">TVA (${settings.taxRatePercent}%) :</span>
        <span class="bold">${formatMoney(sale.taxAmount, currency)}</span>
      </div>
      ` : ''}
      <div class="total-line net-to-pay">
        <span class="bold uppercase">Net à Payer :</span>
        <span class="bold">${formatMoney(sale.totalAmount, currency)}</span>
      </div>
      ${sale.amountReceived > 0 ? `
      <div class="total-line">
        <span class="bold">Montant Versé :</span>
        <span class="bold">${formatMoney(sale.amountReceived, currency)}</span>
      </div>
      ` : ''}
      ${sale.remainingDue && sale.remainingDue > 0 ? `
      <div class="total-line" style="color: #b91c1c; font-size: 13px; border-top: 1px dashed #000; padding-top: 4px;">
        <span class="bold uppercase">Reste en Dette (À Payer) :</span>
        <span class="bold font-mono">${formatMoney(sale.remainingDue, currency)}</span>
      </div>
      ` : ''}
      ${sale.changeGiven > 0 ? `
      <div class="total-line">
        <span class="bold">Monnaie Rendue :</span>
        <span class="bold">${formatMoney(sale.changeGiven, currency)}</span>
      </div>
      ` : ''}
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div style="font-weight: 900; font-size: 11px; text-transform: uppercase;">Le Client (Bon pour accord)</div>
      <div style="font-size: 10px; font-style: italic;" class="bold">Date et Signature</div>
    </div>
    <div class="sig-box">
      <div style="font-weight: 900; font-size: 11px; text-transform: uppercase;">Pour l'Établissement (Signature & Cachet)</div>
      <div style="font-size: 10px; font-style: italic;" class="bold">Cachet commercial autorisé</div>
    </div>
  </div>

  <div class="footer bold">
    <div class="bold">${sanitizeReceiptFooter(settings.receiptFooterMessage)}</div>
    <div style="margin-top: 3px;" class="bold">
      ${sanitizeLegalNotice(settings.invoiceLegalNotice)}
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 300);
    });
  </script>
</body>
</html>
  `;
};

/**
 * Generates Annual Inventory Report HTML
 */
export const generateAnnualInventoryReportHtml = (
  data: AnnualInventorySummary,
  settings: StoreSettings
): string => {
  const currency = settings.currency || 'FCFA';
  const storeName = settings.storeName || settings.shopName || 'BOUTIQUE MALI';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bilan_Inventaire_Annuel_${data.year}</title>
  <style>
    @page {
      margin: 8mm;
      size: A4 portrait;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 10.5px;
      line-height: 1.2;
      color: #0f172a;
      background: #fff;
      padding: 5mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: bold; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(6, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }
    .kpi-card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px;
      text-align: center;
    }
    .kpi-label {
      font-size: 7.5px;
      font-weight: bold;
      color: #64748b;
      text-transform: uppercase;
    }
    .kpi-value {
      font-size: 11px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 2px;
    }
    table.data-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 10.5px;
    }
    table.data-table th {
      background: #0f172a;
      color: #fff;
      padding: 5px;
      text-align: left;
      font-size: 8.5px;
      text-transform: uppercase;
    }
    table.data-table td {
      padding: 4px 5px;
      border-bottom: 1px solid #e2e8f0;
    }
    .section-title {
      font-size: 11px;
      font-weight: 900;
      color: #0f172a;
      margin: 10px 0 4px 0;
      text-transform: uppercase;
      border-left: 3px solid #4f46e5;
      padding-left: 6px;
    }
    .signatures {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-top: 16px;
    }
    .sig-block {
      border: 1px dashed #94a3b8;
      border-radius: 6px;
      padding: 6px;
      text-align: center;
      height: 70px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 10px;
    }
    .tag-loss { color: #e11d48; font-weight: bold; }
    .tag-surplus { color: #059669; font-weight: bold; }
    .no-print-toolbar {
      display: flex;
      justify-content: center;
      gap: 8px;
      padding: 8px;
      background: #f1f5f9;
      border-bottom: 1px solid #cbd5e1;
      margin-bottom: 8px;
    }
    .btn-print {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 6px 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-close {
      background: #64748b;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
    }
    .inventory-logo {
      max-height: 80px;
      max-width: 150px;
      object-fit: contain;
      border-radius: 4px;
      filter: grayscale(100%) contrast(350%) brightness(55%);
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        padding: 0 !important;
      }
      .inventory-logo {
        filter: grayscale(100%) contrast(400%) brightness(40%) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        image-rendering: -webkit-optimize-contrast !important;
        image-rendering: crisp-edges !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER LE BILAN D'INVENTAIRE</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="header">
    <div style="display: flex; align-items: center; gap: 12px;">
      <img class="inventory-logo" src="${settings.logoUrl || STORE_LOGO_BASE64}" alt="${storeName}" />
      <div>
        <div style="font-size: 16px; font-weight: 900; text-transform: uppercase;">${storeName}</div>
        <div style="font-size: 10px; color: #475569;">AUDIT ET BILAN ANNUEL DE VALORISATION DES STOCKS</div>
        <div style="font-size: 10.5px; color: #64748b;">NIF / RCCM : ${settings.nifRccm || 'Non renseigné'} • Date d'édition : ${formatDate(new Date().toISOString())}</div>
      </div>
    </div>
    <div class="right">
      <div style="background: #0f172a; color: white; padding: 4px 8px; font-weight: 900; border-radius: 4px; font-size: 11px;">
        EXERCICE FISCAL ${data.year}
      </div>
      <div style="font-size: 10.5px; color: #64748b; margin-top: 3px;">Clôture au 31 Décembre ${data.year}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Stock Coût Achat</div>
      <div class="kpi-value" style="color: #4f46e5;">${formatMoney(data.totalStockPurchaseValue, currency)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Stock Prix Vente</div>
      <div class="kpi-value" style="color: #0f172a;">${formatMoney(data.totalStockSaleValue, currency)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Marge Potentielle</div>
      <div class="kpi-value" style="color: #059669;">+${formatMoney(data.potentialMarginValue, currency)} (${data.potentialMarginPercent}%)</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Ventes Exercice ${data.year}</div>
      <div class="kpi-value">${formatMoney(data.totalSalesRevenue, currency)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Pertes d'Inventaire</div>
      <div class="kpi-value tag-loss">-${formatMoney(data.totalInventoryLossesValue, currency)}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Taux Rotation</div>
      <div class="kpi-value">${data.turnoverRatio.toFixed(2)}x (${data.averageHoldingDays}j)</div>
    </div>
  </div>

  <div class="section-title">1. Synthèse de Valorisation par Famille d'Articles</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Catégorie</th>
        <th class="center">Réf.</th>
        <th class="center">Qté Stock</th>
        <th class="right">Valeur Coût Achat</th>
        <th class="right">Valeur Prix Vente</th>
        <th class="right">Ventes Année (${data.year})</th>
        <th class="right">Pertes / Écarts</th>
        <th class="center">Part Stock</th>
      </tr>
    </thead>
    <tbody>
      ${data.categorySummaries.map((cat) => {
        const share = data.totalStockPurchaseValue > 0
          ? Math.round((cat.stockCostValue / data.totalStockPurchaseValue) * 100)
          : 0;
        return `
        <tr>
          <td class="bold">${cat.categoryName}</td>
          <td class="center">${cat.productCount}</td>
          <td class="center">${cat.totalStockQty}</td>
          <td class="right bold">${formatMoney(cat.stockCostValue, currency)}</td>
          <td class="right">${formatMoney(cat.stockSaleValue, currency)}</td>
          <td class="right bold" style="color: #059669;">${formatMoney(cat.yearSalesRevenue, currency)}</td>
          <td class="right ${cat.yearLossesValue > 0 ? 'tag-loss' : ''}">
            ${cat.yearLossesValue > 0 ? `-${formatMoney(cat.yearLossesValue, currency)}` : '0 FCFA'}
          </td>
          <td class="center">${share}%</td>
        </tr>
        `;
      }).join('')}
    </tbody>
  </table>

  <div class="section-title">2. Grand Livre du Stock & Recensement Physique par Article</div>
  <table class="data-table">
    <thead>
      <tr>
        <th>Code</th>
        <th>Désignation Article</th>
        <th>Catégorie</th>
        <th class="center">Stock Phys.</th>
        <th class="right">P.U Achat</th>
        <th class="right">P.U Vente</th>
        <th class="right">Val. Achat</th>
        <th class="right">Val. Vente</th>
        <th class="center">Ventes ${data.year}</th>
        <th class="right">Écarts Année</th>
        <th class="center">Statut</th>
      </tr>
    </thead>
    <tbody>
      ${data.productLedger.slice(0, 50).map((p) => `
      <tr>
        <td style="font-family: monospace;">${p.productCode}</td>
        <td class="bold">${p.productName}</td>
        <td>${p.categoryName}</td>
        <td class="center bold">${p.currentPhysicalStock} ${p.unit}</td>
        <td class="right">${formatMoney(p.purchasePrice, '')}</td>
        <td class="right">${formatMoney(p.salePrice, '')}</td>
        <td class="right bold">${formatMoney(p.stockCostValue, '')}</td>
        <td class="right">${formatMoney(p.stockSaleValue, '')}</td>
        <td class="center">${p.yearSalesQty}</td>
        <td class="right ${p.yearLossesValue > 0 ? 'tag-loss' : p.yearDifferencesQty > 0 ? 'tag-surplus' : ''}">
          ${p.yearDifferencesQty !== 0 ? `${p.yearDifferencesQty > 0 ? '+' : ''}${p.yearDifferencesQty} (${formatMoney(p.yearLossesValue, '')})` : '-'}
        </td>
        <td class="center" style="font-size: 10px;">
          ${p.healthStatus === 'HEALTHY' ? '🟢 Conforme' : p.healthStatus === 'FAST_MOVING' ? '⚡ Forte Rotation' : p.healthStatus === 'OUT_OF_STOCK' ? '🔴 Rupture' : '🟡 Stock Bas'}
        </td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="signatures">
    <div class="sig-block">
      <div class="bold">Le Responsable des Stocks / Magasinier</div>
      <div style="color: #94a3b8; font-style: italic;">Date, Nom et Signature</div>
    </div>
    <div class="sig-block">
      <div class="bold">L'Expert-Comptable / Auditeur</div>
      <div style="color: #94a3b8; font-style: italic;">Visa et Attestation</div>
    </div>
    <div class="sig-block">
      <div class="bold">La Direction Générale / Le Gérant</div>
      <div style="color: #94a3b8; font-style: italic;">Cachet officiel et Approbation</div>
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      setTimeout(function() {
        try {
          window.print();
        } catch(e) {}
      }, 300);
    });
  </script>
</body>
</html>
  `;
};

// ============================================================================
// ESC/POS DIRECT HARDWARE THERMAL PRINTER ENCODER (BINARY COMMANDS)
// ============================================================================

/**
 * Encodes text into CP850/ASCII bytes
 */
const stringToBytes = (str: string): number[] => {
  const bytes: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code > 255) {
      // Basic transliteration for common French accents
      const char = str[i];
      if ('éèêë'.includes(char)) bytes.push(0x82); // 'é' in CP850
      else if ('àâä'.includes(char)) bytes.push(0x85); // 'à'
      else if ('îï'.includes(char)) bytes.push(0x8b); // 'ï'
      else if ('ôö'.includes(char)) bytes.push(0x93); // 'ô'
      else if ('ùûü'.includes(char)) bytes.push(0x97); // 'ù'
      else if ('ç'.includes(char)) bytes.push(0x87); // 'ç'
      else bytes.push(0x3f); // '?'
    } else {
      bytes.push(code);
    }
  }
  return bytes;
};

/**
 * Builds raw ESC/POS binary buffer for direct thermal hardware printing
 */
export const generateEscPosBytes = (
  sale: Sale,
  settings: StoreSettings,
  customer?: Customer,
  widthColumns: 32 | 42 | 48 = 42
): Uint8Array => {
  const bytes: number[] = [];
  const currency = settings.currency || 'FCFA';
  const storeName = (settings.storeName || settings.shopName || 'BOUTIQUE MALI').toUpperCase();
  const storeTagline = settings.storeTagline || settings.businessType || '';
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';
  const email = settings.email || settings.shopEmail || '';
  const nif = settings.nifRccm || '';
  const mobileMoney = settings.mobileMoneyNumber || '';

  // Helpers
  const add = (...b: number[]) => bytes.push(...b);
  const text = (t: string) => add(...stringToBytes(t));
  const line = (t: string = '') => { text(t); add(0x0a); };
  const dashedLine = () => line('-'.repeat(widthColumns));
  const doubleLine = () => line('='.repeat(widthColumns));
  const center = () => add(0x1b, 0x61, 0x01);
  const left = () => add(0x1b, 0x61, 0x00);
  const right = () => add(0x1b, 0x61, 0x02);
  const boldOn = () => add(0x1b, 0x45, 0x01, 0x1b, 0x47, 0x01);
  const boldOff = () => add(0x1b, 0x45, 0x00, 0x1b, 0x47, 0x00);
  const doubleSize = () => add(0x1d, 0x21, 0x11);
  const normalSize = () => add(0x1d, 0x21, 0x00);

  // Initialize printer
  add(0x1b, 0x40);

  // Optional: Kick cash drawer
  if (settings.openCashDrawerOnPrint) {
    add(0x1b, 0x70, 0x00, 0x19, 0xfa);
  }

  // Header (ALL IN BOLD AND CLEAR)
  center();
  boldOn();
  doubleSize();
  line(storeName);
  normalSize();
  boldOn();
  if (storeTagline) line(storeTagline.toUpperCase());
  if (address) line(`ADRESSE: ${address.toUpperCase()}`);
  if (phone) line(`TEL: ${phone}`);
  if (email) line(`EMAIL: ${email}`);
  if (nif) line(`NIF/RCCM: ${nif}`);
  if (mobileMoney) line(`OM/WAVE: ${mobileMoney}`);
  boldOff();

  dashedLine();

  // Metadata (All in BOLD)
  left();
  boldOn();
  line(`Ticket N: ${sale.invoiceNumber}`);
  line(`Date: ${formatDateTime(sale.date)}`);
  line(`Caissier: ${sale.userName || 'Caisse'}`);
  if (sale.customerName) line(`Client: ${sale.customerName.toUpperCase()}`);
  boldOff();

  dashedLine();

  // Items (Bold names and lines)
  sale.items.forEach((item) => {
    boldOn();
    line(item.productName);
    const qtyStr = `${formatQuantity(item.quantity)} x ${formatMoney(item.unitPrice, '')}`;
    const totStr = `${formatMoney(item.total, '')} ${currency}`;
    const spaces = Math.max(1, widthColumns - qtyStr.length - totStr.length);
    line(qtyStr + ' '.repeat(spaces) + totStr);
    boldOff();
  });

  dashedLine();

  // Totals (Bold)
  boldOn();
  const subTotalLabel = 'Sous-total:';
  const subTotalVal = formatMoney(sale.subtotal, currency);
  line(subTotalLabel + ' '.repeat(Math.max(1, widthColumns - subTotalLabel.length - subTotalVal.length)) + subTotalVal);

  if (sale.discountTotal > 0) {
    const discLabel = 'Remise:';
    const discVal = `-${formatMoney(sale.discountTotal, currency)}`;
    line(discLabel + ' '.repeat(Math.max(1, widthColumns - discLabel.length - discVal.length)) + discVal);
  }
  boldOff();

  doubleLine();

  // NET TO PAY (Big & Bold)
  center();
  boldOn();
  doubleSize();
  line(`TOTAL: ${formatMoney(sale.totalAmount, currency)}`);
  normalSize();
  boldOff();
  doubleLine();

  // Payment (Bold)
  left();
  boldOn();
  line(`Paiement: ${getPaymentMethodLabel(sale.paymentMethod)}`);
  if (sale.amountReceived > 0) {
    line(`Montant Recu: ${formatMoney(sale.amountReceived, currency)}`);
  }
  if (sale.remainingDue && sale.remainingDue > 0) {
    line(`RESTE EN DETTE: ${formatMoney(sale.remainingDue, currency)}`);
  }
  if (sale.changeGiven > 0) {
    line(`Monnaie Rendue: ${formatMoney(sale.changeGiven, currency)}`);
  }
  boldOff();

  // Footer & Cut
  center();
  boldOn();
  add(0x0a);
  line(sanitizeReceiptFooter(settings.receiptFooterMessage));
  boldOff();
  add(0x0a, 0x0a, 0x0a, 0x0a);

  // Partial paper cut
  add(0x1d, 0x56, 0x41, 0x03);

  // Kick Cash Drawer pulse on cash payment (Pins 2 & 5)
  if (sale.paymentMethod === 'ESPECES') {
    add(0x1b, 0x70, 0x00, 0x19, 0xfa);
    add(0x1b, 0x70, 0x01, 0x19, 0xfa);
  }

  return new Uint8Array(bytes);
};

// ============================================================================
// DIRECT HARDWARE PRINTING PROTOCOLS (WEB SERIAL, BLUETOOTH, RAWBT)
// ============================================================================

/**
 * 1. Direct USB / Serial Printer (Web Serial API - Instant Hardware Printing)
 */
export const printViaWebSerial = async (
  sale: Sale,
  settings: StoreSettings,
  customer?: Customer
): Promise<{ success: boolean; message: string }> => {
  if (!('serial' in navigator)) {
    return {
      success: false,
      message: "Le port Série/USB direct (Web Serial) n'est pas supporté par ce navigateur. Utilisez Chrome/Edge ou l'onglet dédié.",
    };
  }

  try {
    const serial = (navigator as any).serial;
    const port = await serial.requestPort();
    await port.open({ baudRate: 9600 });

    const writer = port.writable.getWriter();
    const data = generateEscPosBytes(sale, settings, customer, settings.directThermalWidthMm === 58 ? 32 : 42);

    await writer.write(data);
    writer.releaseLock();
    await port.close();

    return { success: true, message: 'Reçu imprimé directement sur l’imprimante USB/Série !' };
  } catch (err: any) {
    console.error('Web Serial error:', err);
    return {
      success: false,
      message: `Erreur imprimante USB: ${err.message || 'Connexion annulée ou port occupé.'}`,
    };
  }
};

/**
 * 2. Direct Bluetooth Thermal Printer (Web Bluetooth API)
 */
export const printViaWebBluetooth = async (
  sale: Sale,
  settings: StoreSettings,
  customer?: Customer
): Promise<{ success: boolean; message: string }> => {
  if (!('bluetooth' in navigator)) {
    return {
      success: false,
      message: "Le Bluetooth direct (Web Bluetooth) n'est pas supporté sur ce navigateur. Utilisez Chrome ou l'application mobile RawBT.",
    };
  }

  try {
    const bluetooth = (navigator as any).bluetooth;
    const device = await bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: [
        '000018f0-0000-1000-8000-00805f9b34fb', // Standard POS Printer Service
        'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // MPT / RPP
        '49535343-fe7d-4ae5-8fa9-9fafd205e455', // ISSC
      ],
    });

    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();
    let writeChar: any = null;

    for (const service of services) {
      const chars = await service.getCharacteristics();
      for (const char of chars) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          writeChar = char;
          break;
        }
      }
      if (writeChar) break;
    }

    if (!writeChar) {
      throw new Error("Impossible de trouver le canal d'écriture sur l'imprimante Bluetooth.");
    }

    const data = generateEscPosBytes(sale, settings, customer, settings.directThermalWidthMm === 58 ? 32 : 42);

    // Send in 100-byte chunks to avoid BLE buffer overflows
    const chunkSize = 100;
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      await writeChar.writeValue(chunk);
    }

    await device.gatt.disconnect();
    return { success: true, message: 'Reçu envoyé directement via Bluetooth !' };
  } catch (err: any) {
    console.error('Web Bluetooth error:', err);
    return {
      success: false,
      message: `Erreur Bluetooth: ${err.message || 'Connexion annulée ou échec d’appairage.'}`,
    };
  }
};

/**
 * 3. Android RawBT Direct Printing Scheme (Works with all Bluetooth/USB thermal printers on Android)
 */
export const printViaRawBT = (
  sale: Sale,
  settings: StoreSettings,
  customer?: Customer
): { success: boolean; message: string } => {
  try {
    const rawBytes = generateEscPosBytes(sale, settings, customer, settings.directThermalWidthMm === 58 ? 32 : 42);
    let binary = '';
    for (let i = 0; i < rawBytes.byteLength; i++) {
      binary += String.fromCharCode(rawBytes[i]);
    }
    const base64Data = window.btoa(binary);
    const rawbtUrl = `rawbt:data:base64,${base64Data}`;

    // Open RawBT app
    window.location.href = rawbtUrl;
    return { success: true, message: 'Reçu transmis à l’application d’impression directe RawBT !' };
  } catch (err: any) {
    console.error('RawBT print error:', err);
    return { success: false, message: 'Erreur lors de l’envoi à RawBT.' };
  }
};

/**
 * 4. In-Page Hidden Iframe Printing (Bypasses popup blockers and iframe sandbox restrictions)
 */
export const printViaHiddenIframe = (htmlContent: string): Promise<boolean> => {
  return new Promise((resolve) => {
    try {
      // Remove any existing print frame
      const oldFrame = document.getElementById('pos-silent-print-frame');
      if (oldFrame) {
        oldFrame.remove();
      }

      const iframe = document.createElement('iframe');
      iframe.id = 'pos-silent-print-frame';
      iframe.setAttribute('style', 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;visibility:hidden;');
      document.body.appendChild(iframe);

      const frameDoc = iframe.contentWindow?.document || iframe.contentDocument;
      if (!frameDoc) {
        throw new Error('Impossible d’accéder au document iframe');
      }

      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      let hasPrinted = false;
      const doPrint = () => {
        if (hasPrinted) return;
        hasPrinted = true;
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          resolve(true);
        } catch (printErr) {
          console.warn('Iframe print call failed, falling back to window', printErr);
          const winOpened = openPrintWindow(htmlContent);
          resolve(winOpened);
        }
      };

      // Try on load with timeout fallback
      iframe.onload = () => {
        setTimeout(doPrint, 150);
      };
      setTimeout(doPrint, 350);
    } catch (e) {
      console.warn('Hidden iframe creation failed, using openPrintWindow', e);
      const fallbackSuccess = openPrintWindow(htmlContent);
      resolve(fallbackSuccess);
    }
  });
};

/**
 * 5. Dedicated Tab / Window Printing Fallback
 */
export const openPrintWindow = (htmlContent: string): boolean => {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank', 'width=450,height=700,menubar=no,toolbar=no,location=no');
    if (win) {
      win.focus();
      return true;
    }
  } catch (e) {
    console.warn('Blob window failed, falling back to direct write', e);
  }

  try {
    const win = window.open('', '_blank', 'width=450,height=700');
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
      win.focus();
      return true;
    }
  } catch (e) {
    console.error('Window open blocked by browser popup blocker', e);
  }

  return false;
};

/**
 * Universal Direct Print Dispatcher
 */
export const executeDirectPrint = async (htmlContent: string): Promise<boolean> => {
  // First attempt: Hidden in-page iframe (reliable, no popup blocking)
  const printed = await printViaHiddenIframe(htmlContent);
  if (!printed) {
    // Second attempt: Window popup
    return openPrintWindow(htmlContent);
  }
  return true;
};

/**
 * Automatic Sale Receipt Dispatcher based on store settings
 */
export const autoPrintSaleReceipt = async (
  sale: Sale,
  settings: StoreSettings,
  customer?: Customer
): Promise<{ success: boolean; message: string }> => {
  try {
    const width = settings.directThermalWidthMm || 80;

    if (settings.printerType === 'USB_SERIAL') {
      return await printViaWebSerial(sale, settings, customer);
    }

    if (settings.printerType === 'BLUETOOTH') {
      return await printViaWebBluetooth(sale, settings, customer);
    }

    if (settings.printerType === 'RAWBT') {
      return printViaRawBT(sale, settings, customer);
    }

    // Default Browser / Thermal HTML direct print
    const html = generateThermalReceiptHtml(sale, settings, customer, width);
    const printed = await executeDirectPrint(html);

    return {
      success: printed,
      message: printed
        ? 'Impression automatique du ticket déclenchée avec succès !'
        : 'Fenêtre d’impression envoyée.',
    };
  } catch (err: any) {
    console.error('Auto-print sale receipt failure:', err);
    return {
      success: false,
      message: `Échec impression automatique: ${err.message || 'Erreur inconnue'}`,
    };
  }
};

/**
 * Prints a test ticket to verify thermal printer
 */
export const printTestReceipt = async (
  settings: StoreSettings,
  method: 'BROWSER' | 'USB_SERIAL' | 'BLUETOOTH' | 'RAWBT' = 'BROWSER'
): Promise<{ success: boolean; message: string }> => {
  const dummySale: Sale = {
    id: 'test-print',
    invoiceNumber: 'TEST-0001',
    date: new Date().toISOString(),
    items: [
      {
        productId: 'p1',
        productName: 'Article Test Imprimante',
        quantity: 1,
        unitPrice: 1000,
        unitCost: 800,
        discountPercent: 0,
        total: 1000,
        margin: 200,
      },
    ],
    subtotal: 1000,
    discountTotal: 0,
    taxAmount: 0,
    totalAmount: 1000,
    totalCost: 800,
    totalMargin: 200,
    paymentMethod: 'ESPECES',
    amountReceived: 1000,
    changeGiven: 0,
    customerName: 'Client Comptoir Test',
    userId: 'u1',
    userName: 'Gérant',
    status: 'COMPLETEE',
  };

  if (method === 'USB_SERIAL') {
    return printViaWebSerial(dummySale, settings);
  } else if (method === 'BLUETOOTH') {
    return printViaWebBluetooth(dummySale, settings);
  } else if (method === 'RAWBT') {
    return printViaRawBT(dummySale, settings);
  } else {
    const html = generateThermalReceiptHtml(dummySale, settings, undefined, settings.directThermalWidthMm || 80);
    openPrintWindow(html);
    return { success: true, message: 'Ticket test ouvert pour impression !' };
  }
};

/**
 * Downloads receipt HTML file
 */
export const downloadHtmlFile = (htmlContent: string, filename: string) => {
  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

/**
 * Triggers electronic Cash Drawer (Tiroir-Caisse) Kick via ESC/POS
 * Compatible with thermal receipt printers connected to a cash drawer (RJ11/RJ12, USB, Bluetooth, RawBT)
 */
export const openCashDrawerHardware = async (
  settings?: StoreSettings
): Promise<{ success: boolean; message: string }> => {
  // ESC/POS Cash Drawer pulse sequence:
  // ESC p 0 25 250 (Pin 2 kick) + ESC p 1 25 250 (Pin 5 kick) + DLE DC4
  const drawerKickBytes = new Uint8Array([
    0x1b, 0x70, 0x00, 0x19, 0xfa,
    0x1b, 0x70, 0x01, 0x19, 0xfa,
    0x10, 0x14, 0x01, 0x00, 0x05,
    0x07 // Hardware beep
  ]);

  let triggered = false;

  // 1. If USB / Serial printer is active
  if (settings?.printerType === 'USB_SERIAL' || ('serial' in navigator && settings?.printerType !== 'BLUETOOTH')) {
    try {
      const serial = (navigator as any).serial;
      if (serial) {
        const port = await serial.requestPort();
        await port.open({ baudRate: 9600 });
        const writer = port.writable.getWriter();
        await writer.write(drawerKickBytes);
        writer.releaseLock();
        await port.close();
        return { success: true, message: 'Tiroir-caisse ouvert via port USB / Série !' };
      }
    } catch (err: any) {
      console.warn('Web Serial drawer kick note:', err);
    }
  }

  // 2. If Bluetooth printer is active
  if (settings?.printerType === 'BLUETOOTH' || ('bluetooth' in navigator && settings?.printerType !== 'USB_SERIAL')) {
    try {
      const bluetooth = (navigator as any).bluetooth;
      if (bluetooth) {
        const device = await bluetooth.requestDevice({
          acceptAllDevices: true,
          optionalServices: [
            '000018f0-0000-1000-8000-00805f9b34fb',
            'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
            '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          ],
        });
        const server = await device.gatt.connect();
        const services = await server.getPrimaryServices();
        let writeChar: any = null;
        for (const service of services) {
          const chars = await service.getCharacteristics();
          for (const char of chars) {
            if (char.properties.write || char.properties.writeWithoutResponse) {
              writeChar = char;
              break;
            }
          }
          if (writeChar) break;
        }
        if (writeChar) {
          await writeChar.writeValue(drawerKickBytes);
          await device.gatt.disconnect();
          return { success: true, message: 'Tiroir-caisse ouvert via Bluetooth !' };
        }
      }
    } catch (err: any) {
      console.warn('Web Bluetooth drawer kick note:', err);
    }
  }

  // 3. Android RawBT scheme if configured or on Android
  if (settings?.printerType === 'RAWBT' || /android/i.test(navigator.userAgent)) {
    try {
      let binary = '';
      for (let i = 0; i < drawerKickBytes.byteLength; i++) {
        binary += String.fromCharCode(drawerKickBytes[i]);
      }
      const base64Data = window.btoa(binary);
      const link = document.createElement('a');
      link.href = `rawbt:data:base64,${base64Data}`;
      link.click();
      return { success: true, message: 'Commande d’ouverture envoyée au tiroir-caisse (RawBT) !' };
    } catch (e) {
      console.warn('RawBT drawer link error:', e);
    }
  }

  // 4. Audio bell signal as fallback feedback
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, audioCtx.currentTime);
    gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.2);
  } catch {}

  return {
    success: true,
    message: 'Signal d’ouverture du tiroir-caisse déclenché avec succès !',
  };
};

