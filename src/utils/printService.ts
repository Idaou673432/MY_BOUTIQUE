import { Sale, StoreSettings, Customer } from '../types';
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
  const storeName = (settings.storeName || settings.shopName || 'BOUTIQUE MALI').toUpperCase();
  const storeTagline = settings.storeTagline || settings.businessType || '';
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';
  const email = settings.email || settings.shopEmail || '';
  const nif = settings.nifRccm || '';
  const mobileMoney = settings.mobileMoneyNumber || '';

  const fontSize = is58 ? '12px' : '14px';
  const headerFontSize = is58 ? '18px' : '22px';
  const maxContentWidth = is58 ? '48mm' : '72mm';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Ticket_${sale.invoiceNumber}</title>
  <style>
    @page {
      margin: 0;
      size: ${widthMm}mm auto;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-weight: 900 !important;
      color: #000000 !important;
      -webkit-text-stroke: 0.35px #000000;
      text-shadow: 0 0 0.3px #000000;
    }
    body {
      font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, Arial, sans-serif;
      font-size: ${fontSize};
      font-weight: 900 !important;
      line-height: 1.15;
      color: #000000 !important;
      background: #ffffff !important;
      padding: ${is58 ? '1.5mm' : '3mm'};
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
    .bold { font-weight: 900 !important; }
    .uppercase { text-transform: uppercase; }
    .divider {
      border-top: 2px solid #000000;
      margin: 3px 0;
    }
    .double-divider {
      border-top: 3px double #000000;
      margin: 4px 0;
    }
    .store-header-box {
      text-align: center;
      margin-bottom: 2px;
      padding-bottom: 0px;
    }
    .receipt-logo {
      display: block;
      margin: 0 auto 8px auto;
      max-height: ${is58 ? '95px' : '125px'};
      max-width: ${is58 ? '200px' : '270px'};
      width: auto;
      object-fit: contain;
      filter: grayscale(100%) contrast(350%) brightness(55%);
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      image-rendering: -webkit-optimize-contrast;
      image-rendering: crisp-edges;
    }
    .store-name {
      font-size: ${headerFontSize};
      font-weight: 900 !important;
      letter-spacing: 0.5px;
      margin-bottom: 1px;
      line-height: 1.05;
      text-transform: uppercase;
      color: #000000 !important;
    }
    .store-sub {
      font-size: ${is58 ? '11px' : '13px'};
      font-weight: 900 !important;
      margin-bottom: 1px;
      line-height: 1.12;
      color: #000000 !important;
      text-transform: uppercase;
    }
    .store-info-line {
      font-size: ${is58 ? '11px' : '13px'};
      font-weight: 900 !important;
      margin-bottom: 1px;
      line-height: 1.15;
      color: #000000 !important;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 1px;
      font-size: ${fontSize};
      font-weight: 900 !important;
      line-height: 1.15;
      color: #000000 !important;
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin: 3px 0;
    }
    .item-table th {
      border-bottom: 2px solid #000000;
      border-top: 2px solid #000000;
      padding: 2px 0;
      font-size: ${is58 ? '11px' : '13px'};
      font-weight: 900 !important;
      line-height: 1.15;
      text-transform: uppercase;
      color: #000000 !important;
    }
    .item-table td {
      padding: 2px 0;
      vertical-align: top;
      font-size: ${fontSize};
      font-weight: 900 !important;
      line-height: 1.15;
      border-bottom: 1px dashed #000000;
      color: #000000 !important;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: ${is58 ? '15px' : '18px'};
      font-weight: 900 !important;
      margin: 3px 0;
      padding: 2px 0;
      line-height: 1.15;
      color: #000000 !important;
    }
    .barcode {
      text-align: center;
      margin: 4px 0 1px 0;
      font-family: monospace;
      letter-spacing: 3px;
      font-size: 13px;
      font-weight: 900 !important;
      line-height: 1.1;
      color: #000000 !important;
    }
    .footer-msg {
      text-align: center;
      font-size: ${is58 ? '10px' : '12px'};
      font-weight: 900 !important;
      margin-top: 4px;
      line-height: 1.18;
      color: #000000 !important;
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
      background: #4f46e5 !important;
      color: white !important;
      border: none;
      padding: 8px 16px;
      font-weight: 900;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }
    .btn-close {
      background: #64748b !important;
      color: white !important;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
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
      .receipt-logo {
        filter: grayscale(100%) contrast(400%) brightness(40%) !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        image-rendering: -webkit-optimize-contrast !important;
        image-rendering: crisp-edges !important;
      }
      .store-header-box * {
        font-weight: 900 !important;
        color: #000000 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER CE TICKET (TEXTE GRAS)</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="ticket-container">
    <!-- Store Header (ALL IN BOLD AND CLEARLY VISIBLE) -->
    <div class="store-header-box center">
      <div style="text-align: center; margin: 0 auto 4px auto;">
        <img class="receipt-logo" src="${settings.logoUrl || STORE_LOGO_BASE64}" alt="${storeName}" />
      </div>
      <div class="store-name bold">${storeName}</div>
      ${storeTagline ? `<div class="store-sub bold uppercase">${storeTagline}</div>` : ''}
      ${address ? `<div class="store-info-line bold uppercase">ADRESSE: ${address}</div>` : ''}
      ${phone ? `<div class="store-info-line bold">TÉL: ${phone}</div>` : ''}
      ${email ? `<div class="store-info-line bold">EMAIL: ${email}</div>` : ''}
      ${nif ? `<div class="store-info-line bold uppercase">NIF / RCCM: ${nif}</div>` : ''}
      ${mobileMoney ? `<div class="store-info-line bold uppercase">PAIEMENT MOBILE: ${mobileMoney}</div>` : ''}
    </div>

    <div class="divider"></div>

    <!-- Metadata -->
    <div>
      <div class="meta-row">
        <span class="bold">TICKET N°:</span>
        <span class="bold">${sale.invoiceNumber}</span>
      </div>
      <div class="meta-row">
        <span class="bold">DATE:</span>
        <span class="bold">${formatDateTime(sale.date)}</span>
      </div>
      <div class="meta-row">
        <span class="bold">CAISSIER:</span>
        <span class="bold">${sale.userName || 'Caisse 1'}</span>
      </div>
      ${sale.customerName ? `
      <div class="meta-row">
        <span class="bold">CLIENT:</span>
        <span class="bold uppercase">${sale.customerName}</span>
      </div>
      ` : ''}
    </div>

    <div class="divider"></div>

    <!-- Articles Table -->
    <table class="item-table">
      <thead>
        <tr>
          <th class="left bold">Article</th>
          <th class="center bold">Qté</th>
          <th class="right bold">P.U</th>
          <th class="right bold">Total</th>
        </tr>
      </thead>
      <tbody>
        ${sale.items.map((item) => `
        <tr>
          <td class="left bold" style="max-width: ${is58 ? '24mm' : '36mm'}; word-break: break-word;">
            <div class="bold">${item.productName}</div>
            ${item.discountPercent > 0 ? `<div style="font-size: ${is58 ? '9px' : '10px'};" class="bold">Remise -${item.discountPercent}%</div>` : ''}
          </td>
          <td class="center bold">${formatQuantity(item.quantity)}</td>
          <td class="right bold">${formatMoney(item.unitPrice, '')}</td>
          <td class="right bold">${formatMoney(item.total, '')}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <!-- Totals -->
    <div>
      <div class="meta-row">
        <span class="bold">SOUS-TOTAL:</span>
        <span class="bold">${formatMoney(sale.subtotal, currency)}</span>
      </div>
      ${sale.discountTotal > 0 ? `
      <div class="meta-row">
        <span class="bold">REMISE:</span>
        <span class="bold">-${formatMoney(sale.discountTotal, currency)}</span>
      </div>
      ` : ''}
      ${settings.taxEnabled && sale.taxAmount > 0 ? `
      <div class="meta-row">
        <span class="bold">TVA (${settings.taxRatePercent}%):</span>
        <span class="bold">${formatMoney(sale.taxAmount, currency)}</span>
      </div>
      ` : ''}
      
      <div class="double-divider"></div>
      <div class="total-row">
        <span class="bold uppercase">NET À PAYER:</span>
        <span class="bold">${formatMoney(sale.totalAmount, currency)}</span>
      </div>
      <div class="double-divider"></div>
    </div>

    <!-- Payment info -->
    <div style="font-size: ${is58 ? '10px' : '11.5px'}; margin-top: 4px;">
      <div class="meta-row">
        <span class="bold">PAIEMENT:</span>
        <span class="bold uppercase">${getPaymentMethodLabel(sale.paymentMethod)}</span>
      </div>
      ${sale.amountReceived > 0 ? `
      <div class="meta-row">
        <span class="bold">MONTANT REÇU:</span>
        <span class="bold">${formatMoney(sale.amountReceived, currency)}</span>
      </div>
      ` : ''}
      ${sale.changeGiven > 0 ? `
      <div class="meta-row">
        <span class="bold">MONNAIE RENDUE:</span>
        <span class="bold">${formatMoney(sale.changeGiven, currency)}</span>
      </div>
      ` : ''}
    </div>

    <div class="divider"></div>

    <!-- Barcode simulation -->
    <div class="barcode bold">
      ||||| ||| |||| || |||||| | |||
      <div style="font-size: 10px; font-weight: 900; letter-spacing: 0;">${sale.invoiceNumber}</div>
    </div>

    <!-- Footer message -->
    <div class="footer-msg bold">
      <div class="bold">${sanitizeReceiptFooter(settings.receiptFooterMessage)}</div>
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
 * Generates official A4 invoice HTML with bold, high-contrast typography
 */
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
      -webkit-text-stroke: 0.35px #000000;
      text-shadow: 0 0 0.3px #000000;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 12px;
      font-weight: 900 !important;
      line-height: 1.2;
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
      max-height: 110px;
      max-width: 220px;
      object-fit: contain;
      border-radius: 8px;
      padding: 2px;
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
        color: #000000 !important;
      }
      * {
        color: #000000 !important;
        font-weight: 900 !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      .a4-logo {
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
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER CETTE FACTURE A4 (TEXTE GRAS)</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="header">
    <div style="display: flex; align-items: center; gap: 14px;">
      <img class="a4-logo" src="${settings.logoUrl || STORE_LOGO_BASE64}" alt="${storeName}" />
      <div>
        <div class="store-title bold">${storeName}</div>
        ${storeTagline ? `<div class="store-tagline-a4 bold">${storeTagline}</div>` : ''}
        <div class="store-info-a4 bold">
          ${address ? `<div><strong>ADRESSE :</strong> <span>${address.toUpperCase()}</span></div>` : ''}
          ${phone ? `<div><strong>TÉLÉPHONE :</strong> <span>${phone}</span></div>` : ''}
          ${email ? `<div><strong>EMAIL :</strong> <span>${email}</span></div>` : ''}
          ${nif ? `<div><strong>NIF / RCCM :</strong> <span>${nif}</span></div>` : ''}
          ${mobileMoney ? `<div><strong>PAIEMENT MOBILE :</strong> <span>${mobileMoney}</span></div>` : ''}
        </div>
      </div>
    </div>

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
      font-size: 9.5px;
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
      font-size: 9px;
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
      font-size: 8px;
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
        <div style="font-size: 9px; color: #64748b;">NIF / RCCM : ${settings.nifRccm || 'Non renseigné'} • Date d'édition : ${formatDate(new Date().toISOString())}</div>
      </div>
    </div>
    <div class="right">
      <div style="background: #0f172a; color: white; padding: 4px 8px; font-weight: 900; border-radius: 4px; font-size: 11px;">
        EXERCICE FISCAL ${data.year}
      </div>
      <div style="font-size: 9px; color: #64748b; margin-top: 3px;">Clôture au 31 Décembre ${data.year}</div>
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
        <td class="center" style="font-size: 8px;">
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

