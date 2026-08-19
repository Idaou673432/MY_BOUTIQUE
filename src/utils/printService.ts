import { Sale, StoreSettings, Customer } from '../types';
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
 * Generates isolated HTML string for thermal receipt (80mm or 58mm)
 */
export const generateThermalReceiptHtml = (
  sale: Sale,
  settings: StoreSettings,
  customer?: Customer,
  widthMm: 80 | 58 = 80
): string => {
  const is58 = widthMm === 58;
  const currency = settings.currency || 'FCFA';
  const storeName = settings.storeName || settings.shopName || 'BOUTIQUE MALI';
  const storeTagline = settings.storeTagline || 'Commerce Général';
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';
  const nif = settings.nifRccm || '';

  const fontSize = is58 ? '10px' : '12px';
  const headerFontSize = is58 ? '13px' : '15px';
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
    }
    body {
      font-family: 'Courier New', Courier, monospace, -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: ${fontSize};
      line-height: 1.25;
      color: #000;
      background: #fff;
      padding: ${is58 ? '2mm' : '4mm'};
      width: ${widthMm}mm;
      max-width: ${widthMm}mm;
      margin: 0 auto;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket-container {
      width: 100%;
      max-width: ${maxContentWidth};
      margin: 0 auto;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .divider {
      border-top: 1px dashed #000;
      margin: 4px 0;
    }
    .double-divider {
      border-top: 2px solid #000;
      margin: 5px 0;
    }
    .store-name {
      font-size: ${headerFontSize};
      font-weight: 900;
      letter-spacing: 0.5px;
      margin-bottom: 2px;
    }
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 2px;
      font-size: ${fontSize};
    }
    .item-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .item-table th {
      border-bottom: 1px dashed #000;
      padding: 2px 0;
      font-size: ${is58 ? '9px' : '10px'};
      text-transform: uppercase;
    }
    .item-table td {
      padding: 2px 0;
      vertical-align: top;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: ${is58 ? '11px' : '13px'};
      font-weight: 900;
      margin: 3px 0;
    }
    .barcode {
      text-align: center;
      margin: 6px 0 2px 0;
      font-family: monospace;
      letter-spacing: 3px;
      font-size: 11px;
      font-weight: bold;
    }
    .footer-msg {
      text-align: center;
      font-size: ${is58 ? '8.5px' : '9.5px'};
      margin-top: 5px;
      color: #222;
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
      background: #4f46e5;
      color: white;
      border: none;
      padding: 6px 14px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    .btn-close {
      background: #64748b;
      color: white;
      border: none;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 12px;
    }
    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        padding: 0 !important;
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
    <!-- Store Header -->
    <div class="center">
      <div class="store-name uppercase">${storeName}</div>
      ${storeTagline ? `<div style="font-size: ${is58 ? '8.5px' : '10px'}">${storeTagline}</div>` : ''}
      ${address ? `<div style="font-size: ${is58 ? '8.5px' : '10px'}">${address}</div>` : ''}
      ${phone ? `<div style="font-size: ${is58 ? '8.5px' : '10px'}">Tél: ${phone}</div>` : ''}
      ${nif ? `<div style="font-size: ${is58 ? '8px' : '9px'}">NIF: ${nif}</div>` : ''}
    </div>

    <div class="divider"></div>

    <!-- Metadata -->
    <div>
      <div class="meta-row">
        <span>Ticket N°:</span>
        <span class="bold">${sale.invoiceNumber}</span>
      </div>
      <div class="meta-row">
        <span>Date:</span>
        <span>${formatDateTime(sale.date)}</span>
      </div>
      <div class="meta-row">
        <span>Caissier:</span>
        <span>${sale.userName || 'Caisse 1'}</span>
      </div>
      ${sale.customerName ? `
      <div class="meta-row">
        <span>Client:</span>
        <span class="bold">${sale.customerName}</span>
      </div>
      ` : ''}
    </div>

    <div class="divider"></div>

    <!-- Articles Table -->
    <table class="item-table">
      <thead>
        <tr>
          <th class="left">Article</th>
          <th class="center">Qté</th>
          <th class="right">P.U</th>
          <th class="right">Total</th>
        </tr>
      </thead>
      <tbody>
        ${sale.items.map((item) => `
        <tr>
          <td class="left" style="max-width: ${is58 ? '24mm' : '36mm'}; word-break: break-word;">
            <div class="bold">${item.productName}</div>
            ${item.discountPercent > 0 ? `<div style="font-size: 8px; color: #333;">Remise -${item.discountPercent}%</div>` : ''}
          </td>
          <td class="center">${formatQuantity(item.quantity)}</td>
          <td class="right">${formatMoney(item.unitPrice, '')}</td>
          <td class="right bold">${formatMoney(item.total, '')}</td>
        </tr>
        `).join('')}
      </tbody>
    </table>

    <div class="divider"></div>

    <!-- Totals -->
    <div>
      <div class="meta-row">
        <span>Sous-total:</span>
        <span>${formatMoney(sale.subtotal, currency)}</span>
      </div>
      ${sale.discountTotal > 0 ? `
      <div class="meta-row">
        <span>Remise accordée:</span>
        <span>-${formatMoney(sale.discountTotal, currency)}</span>
      </div>
      ` : ''}
      ${settings.taxEnabled && sale.taxAmount > 0 ? `
      <div class="meta-row">
        <span>TVA (${settings.taxRatePercent}%):</span>
        <span>${formatMoney(sale.taxAmount, currency)}</span>
      </div>
      ` : ''}
      <div class="double-divider"></div>
      <div class="total-row">
        <span>NET À PAYER:</span>
        <span>${formatMoney(sale.totalAmount, currency)}</span>
      </div>
      <div class="double-divider"></div>
    </div>

    <!-- Payment info -->
    <div style="font-size: ${is58 ? '9px' : '10.5px'}; margin-top: 3px;">
      <div class="meta-row">
        <span>Mode de règlement:</span>
        <span class="bold">${getPaymentMethodLabel(sale.paymentMethod)}</span>
      </div>
      ${sale.amountReceived > 0 ? `
      <div class="meta-row">
        <span>Montant Reçu:</span>
        <span>${formatMoney(sale.amountReceived, currency)}</span>
      </div>
      ` : ''}
      ${sale.changeGiven > 0 ? `
      <div class="meta-row bold">
        <span>Monnaie Rendue:</span>
        <span>${formatMoney(sale.changeGiven, currency)}</span>
      </div>
      ` : ''}
    </div>

    <!-- Barcode simulation -->
    <div class="barcode">
      ||||| ||| |||| || |||||| | |||
      <div style="font-size: 8px; font-weight: normal; letter-spacing: 0;">${sale.invoiceNumber}</div>
    </div>

    <!-- Footer message -->
    <div class="footer-msg">
      <div>${settings.receiptFooterMessage || 'Merci de votre visite et à bientôt !'}</div>
      <div style="margin-top: 2px;">Les articles vendus ne sont ni repris ni échangés sauf accord préalable.</div>
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
 * Generates official A4 invoice HTML
 */
export const generateA4InvoiceHtml = (
  sale: Sale,
  settings: StoreSettings,
  customer?: Customer
): string => {
  const currency = settings.currency || 'FCFA';
  const storeName = settings.storeName || settings.shopName || 'BOUTIQUE MALI';
  const storeTagline = settings.storeTagline || 'Commerce Général';
  const address = settings.address || settings.shopAddress || 'Bamako, Mali';
  const phone = settings.phone || settings.shopPhone || '';
  const email = settings.email || settings.shopEmail || '';
  const nif = settings.nifRccm || '';

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
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #0f172a;
      background: #fff;
      padding: 10mm;
    }
    .center { text-align: center; }
    .right { text-align: right; }
    .left { text-align: left; }
    .bold { font-weight: bold; }
    .uppercase { text-transform: uppercase; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 12px;
      margin-bottom: 16px;
    }
    .store-title {
      font-size: 20px;
      font-weight: 900;
      color: #0f172a;
      text-transform: uppercase;
    }
    .invoice-badge {
      display: inline-block;
      background: #0f172a;
      color: #fff;
      font-weight: 900;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      text-transform: uppercase;
    }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-bottom: 16px;
      background: #f8fafc;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #e2e8f0;
    }
    table.invoice-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    table.invoice-table th {
      background: #0f172a;
      color: #fff;
      padding: 8px;
      font-size: 10px;
      text-transform: uppercase;
      text-align: left;
    }
    table.invoice-table td {
      padding: 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 11px;
    }
    .totals-area {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .totals-box {
      width: 260px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 12px;
    }
    .total-line {
      display: flex;
      justify-content: space-between;
      margin-bottom: 4px;
    }
    .net-to-pay {
      border-top: 1px solid #cbd5e1;
      padding-top: 6px;
      margin-top: 6px;
      font-size: 14px;
      font-weight: 900;
      color: #4338ca;
    }
    .signatures {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 24px;
    }
    .sig-box {
      border: 1px dashed #cbd5e1;
      border-radius: 8px;
      height: 90px;
      padding: 8px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      text-align: center;
    }
    .footer {
      border-top: 1px solid #e2e8f0;
      margin-top: 24px;
      padding-top: 10px;
      text-align: center;
      font-size: 9px;
      color: #64748b;
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
      background: #4f46e5;
      color: white;
      border: none;
      padding: 8px 18px;
      font-weight: bold;
      border-radius: 6px;
      cursor: pointer;
    }
    .btn-close {
      background: #64748b;
      color: white;
      border: none;
      padding: 8px 14px;
      border-radius: 6px;
      cursor: pointer;
    }
    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        padding: 0 !important;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-toolbar">
    <button class="btn-print" onclick="window.print()">🖨️ IMPRIMER CETTE FACTURE A4</button>
    <button class="btn-close" onclick="window.close()">✕ Fermer</button>
  </div>

  <div class="header">
    <div>
      <div class="store-title">${storeName}</div>
      ${storeTagline ? `<div style="font-size: 11px; color: #475569;">${storeTagline}</div>` : ''}
      <div style="font-size: 10px; color: #475569; margin-top: 4px;">
        ${address ? `<div>${address}</div>` : ''}
        ${phone ? `<div>Tél: <strong>${phone}</strong></div>` : ''}
        ${email ? `<div>Email: ${email}</div>` : ''}
        ${nif ? `<div>NIF / RCCM : <strong>${nif}</strong></div>` : ''}
      </div>
    </div>

    <div class="right">
      <div class="invoice-badge">FACTURE OFFICIELLE</div>
      <div style="font-size: 11px; margin-top: 6px;">
        <div>N° : <strong>${sale.invoiceNumber}</strong></div>
        <div>Date : <strong>${formatDate(sale.date)}</strong></div>
        <div>Établi par : <strong>${sale.userName}</strong></div>
      </div>
    </div>
  </div>

  <div class="info-grid">
    <div>
      <div style="font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Facturé à :</div>
      <div style="font-size: 13px; font-weight: bold; margin-top: 2px;">${sale.customerName || 'Client Comptoir'}</div>
      ${customer?.phone ? `<div>Tél : ${customer.phone}</div>` : ''}
      ${customer?.address ? `<div>Adresse : ${customer.address}</div>` : ''}
    </div>
    <div class="right">
      <div style="font-size: 9px; font-weight: bold; color: #94a3b8; text-transform: uppercase;">Modalités de Règlement :</div>
      <div style="font-weight: bold; margin-top: 2px;">${getPaymentMethodLabel(sale.paymentMethod)}</div>
      <div style="color: #059669; font-weight: bold;">Statut : Réglée / Acquittée</div>
    </div>
  </div>

  <table class="invoice-table">
    <thead>
      <tr>
        <th style="width: 40px;">N°</th>
        <th>Désignation de l'Article</th>
        <th class="center" style="width: 70px;">Qté</th>
        <th class="right" style="width: 110px;">Prix Unitaire</th>
        <th class="right" style="width: 120px;">Montant Net (${currency})</th>
      </tr>
    </thead>
    <tbody>
      ${sale.items.map((item, idx) => `
      <tr>
        <td style="color: #64748b;">${idx + 1}</td>
        <td>
          <strong>${item.productName}</strong>
          ${item.productCode ? `<span style="font-size: 9px; color: #94a3b8; margin-left: 4px;">(${item.productCode})</span>` : ''}
          ${item.discountPercent > 0 ? `<div style="font-size: 9px; color: #059669;">Remise de ${item.discountPercent}%</div>` : ''}
        </td>
        <td class="center font-bold">${formatQuantity(item.quantity)} ${item.productUnit || ''}</td>
        <td class="right">${formatMoney(item.unitPrice, '')}</td>
        <td class="right bold">${formatMoney(item.total, '')}</td>
      </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals-area">
    <div style="max-width: 320px;">
      <div style="background: #eef2ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 8px; font-size: 10px;">
        <span style="font-weight: bold;">Arrêtée la présente facture à la somme de :</span><br>
        <span style="font-style: italic; font-weight: bold; text-transform: uppercase; color: #312e81;">
          ${numberToWordsFrench(Math.round(sale.totalAmount))} ${currency}
        </span>
      </div>
    </div>

    <div class="totals-box">
      <div class="total-line">
        <span>Total Brut :</span>
        <span>${formatMoney(sale.subtotal, currency)}</span>
      </div>
      ${sale.discountTotal > 0 ? `
      <div class="total-line" style="color: #059669;">
        <span>Remise :</span>
        <span>-${formatMoney(sale.discountTotal, currency)}</span>
      </div>
      ` : ''}
      ${settings.taxEnabled && sale.taxAmount > 0 ? `
      <div class="total-line">
        <span>TVA (${settings.taxRatePercent}%) :</span>
        <span>${formatMoney(sale.taxAmount, currency)}</span>
      </div>
      ` : ''}
      <div class="total-line net-to-pay">
        <span>Net à Payer :</span>
        <span>${formatMoney(sale.totalAmount, currency)}</span>
      </div>
    </div>
  </div>

  <div class="signatures">
    <div class="sig-box">
      <div style="font-weight: bold; font-size: 10px; text-transform: uppercase;">Le Client (Bon pour accord)</div>
      <div style="color: #94a3b8; font-size: 9px; font-style: italic;">Date et Signature</div>
    </div>
    <div class="sig-box">
      <div style="font-weight: bold; font-size: 10px; text-transform: uppercase;">Pour l'Établissement (Signature & Cachet)</div>
      <div style="color: #94a3b8; font-size: 9px; font-style: italic;">Cachet commercial autorisé</div>
    </div>
  </div>

  <div class="footer">
    <div>${settings.receiptFooterMessage || 'Merci de votre confiance.'}</div>
    <div style="margin-top: 2px;">
      ${settings.invoiceLegalNotice || 'Facture établie conformément aux lois en vigueur. En cas de contestation, seuls les tribunaux compétents sont habilités.'}
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
      line-height: 1.35;
      color: #0f172a;
      background: #fff;
      padding: 6mm;
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
    @media print {
      .no-print-toolbar {
        display: none !important;
      }
      body {
        padding: 0 !important;
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
    <div>
      <div style="font-size: 16px; font-weight: 900; text-transform: uppercase;">${storeName}</div>
      <div style="font-size: 10px; color: #475569;">AUDIT ET BILAN ANNUEL DE VALORISATION DES STOCKS</div>
      <div style="font-size: 9px; color: #64748b;">NIF / RCCM : ${settings.nifRccm || 'Non renseigné'} • Date d'édition : ${formatDate(new Date().toISOString())}</div>
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
  const storeName = settings.storeName || settings.shopName || 'BOUTIQUE MALI';
  const storeTagline = settings.storeTagline || 'Commerce General';
  const address = settings.address || settings.shopAddress || '';
  const phone = settings.phone || settings.shopPhone || '';

  // Helpers
  const add = (...b: number[]) => bytes.push(...b);
  const text = (t: string) => add(...stringToBytes(t));
  const line = (t: string = '') => { text(t); add(0x0a); };
  const dashedLine = () => line('-'.repeat(widthColumns));
  const doubleLine = () => line('='.repeat(widthColumns));
  const center = () => add(0x1b, 0x61, 0x01);
  const left = () => add(0x1b, 0x61, 0x00);
  const right = () => add(0x1b, 0x61, 0x02);
  const boldOn = () => add(0x1b, 0x45, 0x01);
  const boldOff = () => add(0x1b, 0x45, 0x00);
  const doubleSize = () => add(0x1d, 0x21, 0x11);
  const normalSize = () => add(0x1d, 0x21, 0x00);

  // Initialize printer
  add(0x1b, 0x40);

  // Optional: Kick cash drawer
  if (settings.openCashDrawerOnPrint) {
    add(0x1b, 0x70, 0x00, 0x19, 0xfa);
  }

  // Header
  center();
  boldOn();
  doubleSize();
  line(storeName.toUpperCase());
  normalSize();
  boldOff();
  if (storeTagline) line(storeTagline);
  if (address) line(address);
  if (phone) line(`Tel: ${phone}`);
  if (settings.nifRccm) line(`NIF: ${settings.nifRccm}`);

  dashedLine();

  // Metadata
  left();
  line(`Ticket N: ${sale.invoiceNumber}`);
  line(`Date: ${formatDateTime(sale.date)}`);
  line(`Caissier: ${sale.userName || 'Caisse'}`);
  if (sale.customerName) line(`Client: ${sale.customerName}`);

  dashedLine();

  // Items
  sale.items.forEach((item) => {
    boldOn();
    line(item.productName);
    boldOff();

    const qtyStr = `${formatQuantity(item.quantity)} x ${formatMoney(item.unitPrice, '')}`;
    const totStr = `${formatMoney(item.total, '')} ${currency}`;
    const spaces = Math.max(1, widthColumns - qtyStr.length - totStr.length);
    line(qtyStr + ' '.repeat(spaces) + totStr);
  });

  dashedLine();

  // Totals
  const subTotalLabel = 'Sous-total:';
  const subTotalVal = formatMoney(sale.subtotal, currency);
  line(subTotalLabel + ' '.repeat(Math.max(1, widthColumns - subTotalLabel.length - subTotalVal.length)) + subTotalVal);

  if (sale.discountTotal > 0) {
    const discLabel = 'Remise:';
    const discVal = `-${formatMoney(sale.discountTotal, currency)}`;
    line(discLabel + ' '.repeat(Math.max(1, widthColumns - discLabel.length - discVal.length)) + discVal);
  }

  doubleLine();

  // NET TO PAY (Big & Bold)
  center();
  boldOn();
  doubleSize();
  line(`TOTAL: ${formatMoney(sale.totalAmount, currency)}`);
  normalSize();
  boldOff();
  doubleLine();

  // Payment
  left();
  line(`Paiement: ${getPaymentMethodLabel(sale.paymentMethod)}`);
  if (sale.amountReceived > 0) {
    line(`Montant Recu: ${formatMoney(sale.amountReceived, currency)}`);
  }
  if (sale.changeGiven > 0) {
    boldOn();
    line(`Monnaie Rendue: ${formatMoney(sale.changeGiven, currency)}`);
    boldOff();
  }

  // Footer & Cut
  center();
  add(0x0a);
  line(settings.receiptFooterMessage || 'Merci de votre confiance !');
  line('A bientot.');
  add(0x0a, 0x0a, 0x0a, 0x0a);

  // Partial paper cut
  add(0x1d, 0x56, 0x41, 0x03);

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
 * 4. Bulletproof Dedicated Tab Printing (Bypasses all iframe sandbox blocks!)
 */
export const openPrintWindow = (htmlContent: string): boolean => {
  try {
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.focus();
      return true;
    }
  } catch (e) {
    console.warn('Blob window failed, falling back to direct write', e);
  }

  try {
    const win = window.open('', '_blank', 'width=450,height=650');
    if (win) {
      win.document.open();
      win.document.write(htmlContent);
      win.document.close();
      win.focus();
      return true;
    }
  } catch (e) {
    console.error('Window open blocked', e);
  }

  // Last resort: trigger window.print
  window.print();
  return false;
};

/**
 * Universal Direct Print Dispatcher
 */
export const executeDirectPrint = (htmlContent: string): Promise<boolean> => {
  return new Promise((resolve) => {
    // Open in dedicated print window (100% reliable across browsers and iframe environments)
    const opened = openPrintWindow(htmlContent);
    resolve(opened);
  });
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
