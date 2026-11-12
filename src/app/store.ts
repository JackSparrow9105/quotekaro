import { Injectable, computed, effect, signal } from '@angular/core';

export interface Company {
  name: string;
  logo: string; // data URL or ''
  color: string;
  gstin: string;
  state: string;
  address: string;
  phone: string;
  email: string;
  bank: string;
  terms: string;
  docTemplate?: DocTemplate; // default layout for quotes & proformas
  upiId?: string; // e.g. yourcompany@hdfcbank — shown as a QR on proformas
  upiName?: string; // payee name shown in UPI apps
  team?: string[]; // salespeople, for "Prepared by" and reports
}

export type DocTemplate = 'classic' | 'modern' | 'gst' | 'elegant';

export const DOC_TEMPLATES: { key: DocTemplate; name: string; desc: string }[] = [
  { key: 'classic', name: 'Classic', desc: 'Clean and simple' },
  { key: 'modern', name: 'Modern', desc: 'Colour header, info cards' },
  { key: 'gst', name: 'GST / ERP', desc: 'Boxed, HSN tax summary' },
  { key: 'elegant', name: 'Elegant', desc: 'Minimal, premium look' },
];

/** Amount in words, Indian numbering (lakh / crore). */
export function inWords(amount: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve',
    'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  const two = (n: number) => (n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : ''));
  const three = (n: number) => (n >= 100 ? ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + two(n % 100) : '') : two(n));
  const words = (n: number): string => {
    if (n === 0) return 'Zero';
    const parts: string[] = [];
    const crore = Math.floor(n / 1e7);
    if (crore) parts.push(words(crore) + ' Crore');
    n %= 1e7;
    const lakh = Math.floor(n / 1e5);
    if (lakh) parts.push(two(lakh) + ' Lakh');
    n %= 1e5;
    const th = Math.floor(n / 1000);
    if (th) parts.push(two(th) + ' Thousand');
    n %= 1000;
    if (n) parts.push(three(n));
    return parts.join(' ');
  };
  const v = Math.abs(amount || 0);
  const rupees = Math.floor(v);
  const paise = Math.round((v - rupees) * 100);
  return 'Indian Rupees ' + words(rupees) + (paise ? ' and ' + two(paise) + ' Paise' : '') + ' Only';
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  gstin: string;
  state: string;
  address: string;
}

export interface Product {
  id: string;
  name: string;
  hsn: string;
  unit: string;
  rate: number;
  gst: number;
  trackStock: boolean; // false for services
  stock: number;
  reorderLevel: number; // low-stock alert at or below this
  sku?: string; // your item code
  barcode?: string; // EAN / UPC / any printed code
}

export type MoveType = 'in' | 'out' | 'adjust';

export interface StockMove {
  id: string;
  productId: string;
  date: string;
  type: MoveType;
  qty: number; // signed change in stock
  note: string;
  supplier?: string; // purchases
  billNo?: string;
  rate?: number; // purchase cost per unit
}

export type PayMode = 'UPI' | 'Bank transfer' | 'Cash' | 'Cheque' | 'Card';
export const PAY_MODES: PayMode[] = ['UPI', 'Bank transfer', 'Cash', 'Cheque', 'Card'];

export interface Payment {
  id: string;
  date: string;
  amount: number;
  mode: PayMode;
  ref: string; // UTR / cheque no.
  note: string;
}

export type PayStatus = 'unpaid' | 'part' | 'paid';

export interface ChallanItem {
  productId: string;
  name: string;
  hsn: string;
  unit: string;
  qty: number;
}

export interface Challan {
  id: string;
  number: string;
  quoteId: string;
  proformaId: string; // '' when made straight from a won quote
  customerId: string;
  date: string;
  items: ChallanItem[];
  vehicle: string;
  transporter: string;
  lrNo: string; // LR / docket no.
  notes: string;
}

export interface LedgerRow {
  date: string;
  kind: 'proforma' | 'payment';
  ref: string;
  text: string;
  debit: number;
  credit: number;
  balance: number;
  link: unknown[];
}

export interface LineItem {
  productId: string;
  name: string;
  hsn: string;
  unit: string;
  qty: number;
  rate: number;
  discount: number; // percent
  gst: number; // percent
}

export type QuoteStatus = 'draft' | 'sent' | 'won' | 'lost';

export interface Quote {
  id: string;
  number: string;
  customerId: string;
  date: string; // yyyy-mm-dd
  validTill: string;
  items: LineItem[];
  notes: string;
  status: QuoteStatus;
  followUp: string; // yyyy-mm-dd or ''
  lostReason: string;
  proformaId: string;
  revision: number;
  preparedBy?: string;
}

export interface Proforma {
  id: string;
  number: string;
  quoteId: string;
  customerId: string;
  date: string;
  items: LineItem[];
  notes: string;
  payments?: Payment[];
}

export interface Totals {
  subtotal: number;
  discount: number;
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  total: number;
  interState: boolean;
}

interface State {
  company: Company;
  customers: Customer[];
  products: Product[];
  quotes: Quote[];
  proformas: Proforma[];
  moves: StockMove[];
  challans: Challan[];
  seq: { quote: number; proforma: number; challan: number };
}

const KEY = 'quotekaro-demo-v2';

export const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana',
  'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra',
  'Odisha', 'Punjab', 'Rajasthan', 'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand',
  'West Bengal',
];

export function today(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

export function inr(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(n || 0);
}

export function fmtDate(s: string): string {
  if (!s) return '';
  const d = new Date(s + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function seed(): State {
  const customers: Customer[] = [
    { id: 'c1', name: 'Sharma Builders Pvt Ltd', contact: 'Rakesh Sharma', phone: '9810012345', gstin: '09AAACS1234F1Z5', state: 'Uttar Pradesh', address: 'Sector 62, Noida' },
    { id: 'c2', name: 'Metro Infra Projects', contact: 'Anita Verma', phone: '9899054321', gstin: '07AABCM5678K1Z2', state: 'Delhi', address: 'Okhla Phase 2, New Delhi' },
    { id: 'c3', name: 'Greenfield Solar LLP', contact: 'Vikram Singh', phone: '9971123456', gstin: '06AAGFG4321L1Z8', state: 'Haryana', address: 'Udyog Vihar, Gurugram' },
  ];
  const products: Product[] = [
    { id: 'p1', name: 'Copper bonded earthing electrode 3 m', hsn: '8538', unit: 'pcs', rate: 4850, gst: 18, trackStock: true, stock: 42, reorderLevel: 15, sku: 'EE-CB-3M', barcode: '8901234500017' },
    { id: 'p2', name: 'Earthing backfill compound 25 kg', hsn: '3824', unit: 'bag', rate: 1250, gst: 18, trackStock: true, stock: 18, reorderLevel: 25, sku: 'BF-25KG', barcode: '8901234500024' },
    { id: 'p3', name: 'ESE lightning arrester', hsn: '8535', unit: 'pcs', rate: 38500, gst: 18, trackStock: true, stock: 3, reorderLevel: 2, sku: 'LA-ESE', barcode: '' },
    { id: 'p4', name: 'Copper strip 25x3 mm', hsn: '7409', unit: 'm', rate: 820, gst: 18, trackStock: true, stock: 240, reorderLevel: 100, sku: 'CS-25X3', barcode: '' },
    { id: 'p5', name: 'Earth pit cover (polymer)', hsn: '3926', unit: 'pcs', rate: 650, gst: 18, trackStock: true, stock: 6, reorderLevel: 10, sku: 'EPC-POLY', barcode: '8901234500031' },
    { id: 'p6', name: 'Installation & testing charges', hsn: '9954', unit: 'job', rate: 7500, gst: 18, trackStock: false, stock: 0, reorderLevel: 0 },
  ];
  const moves: StockMove[] = [
    { id: 'm1', productId: 'p1', date: today(-30), type: 'in', qty: 50, note: 'Opening stock' },
    { id: 'm2', productId: 'p2', date: today(-30), type: 'in', qty: 38, note: 'Opening stock' },
    { id: 'm3', productId: 'p3', date: today(-30), type: 'in', qty: 3, note: 'Opening stock' },
    { id: 'm4', productId: 'p4', date: today(-30), type: 'in', qty: 240, note: 'Opening stock' },
    { id: 'm5', productId: 'p5', date: today(-30), type: 'in', qty: 16, note: 'Opening stock' },
    { id: 'm6', productId: 'p1', date: today(-15), type: 'in', qty: 2, note: 'Purchase · Ravi Traders · Bill 2231', supplier: 'Ravi Traders', billNo: '2231', rate: 3900 },
    { id: 'm7', productId: 'p1', date: today(-8), type: 'out', qty: -10, note: 'PI-2026-001 · Sharma Builders' },
    { id: 'm8', productId: 'p2', date: today(-8), type: 'out', qty: -20, note: 'PI-2026-001 · Sharma Builders' },
    { id: 'm9', productId: 'p5', date: today(-8), type: 'out', qty: -10, note: 'PI-2026-001 · Sharma Builders' },
  ];
  const item = (p: Product, qty: number, discount = 0): LineItem => ({
    productId: p.id, name: p.name, hsn: p.hsn, unit: p.unit, qty, rate: p.rate, discount, gst: p.gst,
  });
  const quotes: Quote[] = [
    { id: 'q1', number: 'QT-2026-001', customerId: 'c1', date: today(-12), validTill: today(18), items: [item(products[0], 10, 5), item(products[1], 20), item(products[4], 10), item(products[5], 1)], notes: '', status: 'won', followUp: '', lostReason: '', proformaId: 'pi1', revision: 1, preparedBy: 'Amit' },
    { id: 'q2', number: 'QT-2026-002', customerId: 'c2', date: today(-6), validTill: today(24), items: [item(products[2], 2), item(products[3], 60, 3), item(products[5], 2)], notes: '', status: 'sent', followUp: today(0), lostReason: '', proformaId: '', revision: 2, preparedBy: 'Neha' },
    { id: 'q3', number: 'QT-2026-003', customerId: 'c3', date: today(-4), validTill: today(26), items: [item(products[0], 24, 8), item(products[1], 48)], notes: '', status: 'sent', followUp: today(-1), lostReason: '', proformaId: '', revision: 1, preparedBy: 'Amit' },
    { id: 'q4', number: 'QT-2026-004', customerId: 'c1', date: today(-20), validTill: today(10), items: [item(products[2], 1)], notes: '', status: 'lost', followUp: '', lostReason: 'Price too high', proformaId: '', revision: 1, preparedBy: 'Neha' },
    { id: 'q5', number: 'QT-2026-005', customerId: 'c2', date: today(-1), validTill: today(29), items: [item(products[0], 6), item(products[4], 6)], notes: '', status: 'draft', followUp: today(3), lostReason: '', proformaId: '', revision: 1, preparedBy: 'Amit' },
  ];
  const proformas: Proforma[] = [
    { id: 'pi1', number: 'PI-2026-001', quoteId: 'q1', customerId: 'c1', date: today(-8), items: quotes[0].items.map((i) => ({ ...i })), notes: '50% advance with order, balance before dispatch.',
      payments: [{ id: 'pay1', date: today(-7), amount: 40000, mode: 'UPI', ref: 'UTR 4312 8890 1123', note: 'Advance' }] },
  ];
  const challans: Challan[] = [
    { id: 'dc1', number: 'DC-2026-001', quoteId: 'q1', proformaId: 'pi1', customerId: 'c1', date: today(-5),
      items: [{ productId: 'p1', name: products[0].name, hsn: products[0].hsn, unit: 'pcs', qty: 6 }, { productId: 'p2', name: products[1].name, hsn: products[1].hsn, unit: 'bag', qty: 20 }],
      vehicle: 'UP 14 CT 2231', transporter: 'Own vehicle', lrNo: '', notes: 'Part delivery. Balance electrodes and covers to follow.' },
  ];
  return {
    company: {
      name: 'Your Company Pvt Ltd',
      logo: '',
      color: '#E8930C',
      gstin: '09ABCDE1234F1Z5',
      state: 'Uttar Pradesh',
      address: 'Plot 12, Industrial Area, Ghaziabad, UP 201001',
      phone: '98765 43210',
      email: 'sales@yourcompany.in',
      bank: 'HDFC Bank · A/c 50200012345678 · IFSC HDFC0001234',
      terms: '1. Prices are exclusive of freight.\n2. Delivery within 7 working days of PO.\n3. Payment: 50% advance, balance before dispatch.\n4. Quote valid for 30 days.',
      upiId: 'yourcompany@hdfcbank',
      upiName: 'Your Company Pvt Ltd',
      team: ['Amit', 'Neha'],
    },
    customers,
    products,
    quotes,
    proformas,
    moves,
    challans,
    seq: { quote: 5, proforma: 1, challan: 1 },
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const s = JSON.parse(raw) as State;
      if (Array.isArray(s.moves)) {
        // Older saved data: add the newer collections
        s.challans ??= [];
        s.seq = { quote: s.seq?.quote ?? 0, proforma: s.seq?.proforma ?? 0, challan: s.seq?.challan ?? 0 };
        s.proformas = s.proformas.map((p) => ({ ...p, payments: p.payments ?? [] }));
        return s;
      }
    }
  } catch {
    /* storage unavailable */
  }
  return seed();
}

@Injectable({ providedIn: 'root' })
export class Store {
  private readonly state = signal<State>(load());

  readonly company = computed(() => this.state().company);
  readonly docTemplate = computed<DocTemplate>(() => this.state().company.docTemplate || 'classic');
  readonly customers = computed(() => this.state().customers);
  readonly products = computed(() => this.state().products);
  readonly quotes = computed(() => [...this.state().quotes].sort((a, b) => b.number.localeCompare(a.number)));
  readonly proformas = computed(() => this.state().proformas);
  readonly moves = computed(() => this.state().moves);
  readonly challans = computed(() => [...this.state().challans].sort((a, b) => b.number.localeCompare(a.number)));
  readonly team = computed(() => this.state().company.team ?? []);

  /** Proformas with money still to collect, oldest first. */
  readonly receivables = computed(() =>
    this.state()
      .proformas.map((p) => ({ p, ...this.payInfo(p) }))
      .filter((r) => r.due > 0)
      .sort((a, b) => a.p.date.localeCompare(b.p.date)),
  );
  readonly outstanding = computed(() => this.receivables().reduce((s, r) => s + r.due, 0));

  readonly lowStock = computed(() =>
    this.state().products.filter((p) => p.trackStock && p.stock <= p.reorderLevel),
  );

  readonly inventory = computed(() => {
    const tracked = this.state().products.filter((p) => p.trackStock);
    return {
      items: tracked.length,
      units: tracked.reduce((s, p) => s + Math.max(0, p.stock), 0),
      value: tracked.reduce((s, p) => s + Math.max(0, p.stock) * p.rate, 0),
      low: tracked.filter((p) => p.stock <= p.reorderLevel).length,
    };
  });

  readonly stats = computed(() => {
    const qs = this.state().quotes;
    const won = qs.filter((q) => q.status === 'won');
    const lost = qs.filter((q) => q.status === 'lost');
    const open = qs.filter((q) => q.status === 'sent' || q.status === 'draft');
    const decided = won.length + lost.length;
    return {
      openCount: open.length,
      openValue: open.reduce((s, q) => s + this.totals(q).total, 0),
      wonCount: won.length,
      wonValue: won.reduce((s, q) => s + this.totals(q).total, 0),
      lostCount: lost.length,
      winRate: decided ? Math.round((won.length / decided) * 100) : 0,
    };
  });

  readonly followUps = computed(() =>
    this.state()
      .quotes.filter((q) => q.followUp && (q.status === 'sent' || q.status === 'draft') && q.followUp <= today(0))
      .sort((a, b) => a.followUp.localeCompare(b.followUp)),
  );

  readonly upcoming = computed(() =>
    this.state()
      .quotes.filter((q) => q.followUp && (q.status === 'sent' || q.status === 'draft') && q.followUp > today(0))
      .sort((a, b) => a.followUp.localeCompare(b.followUp)),
  );

  constructor() {
    effect(() => {
      const s = this.state();
      try {
        localStorage.setItem(KEY, JSON.stringify(s));
      } catch {
        /* storage unavailable */
      }
    });
  }

  customer(id: string): Customer | undefined {
    return this.state().customers.find((c) => c.id === id);
  }
  quote(id: string): Quote | undefined {
    return this.state().quotes.find((q) => q.id === id);
  }
  proforma(id: string): Proforma | undefined {
    return this.state().proformas.find((p) => p.id === id);
  }
  product(id: string): Product | undefined {
    return this.state().products.find((p) => p.id === id);
  }
  challan(id: string): Challan | undefined {
    return this.state().challans.find((c) => c.id === id);
  }
  challansFor(quoteId: string): Challan[] {
    return this.state()
      .challans.filter((c) => c.quoteId === quoteId)
      .sort((a, b) => a.number.localeCompare(b.number));
  }

  /** Find a product by SKU or barcode (exact, case-insensitive). */
  productByCode(code: string): Product | undefined {
    const c = code.trim().toLowerCase();
    if (!c) return undefined;
    return this.state().products.find((p) => (p.sku ?? '').toLowerCase() === c || (p.barcode ?? '').toLowerCase() === c);
  }

  /** Amount paid / due on a proforma. */
  payInfo(p: Proforma): { total: number; paid: number; due: number; status: PayStatus } {
    const total = this.totals(p).total;
    const paid = Math.round((p.payments ?? []).reduce((s, x) => s + (x.amount || 0), 0) * 100) / 100;
    const due = Math.max(0, Math.round((total - paid) * 100) / 100);
    return { total, paid, due, status: paid <= 0 ? 'unpaid' : due > 0 ? 'part' : 'paid' };
  }

  /** Ordered vs delivered quantity per product for a won quote / its proforma. */
  deliveryFor(quoteId: string): { productId: string; name: string; hsn: string; unit: string; ordered: number; delivered: number }[] {
    const q = this.quote(quoteId);
    if (!q) return [];
    const pi = q.proformaId ? this.proforma(q.proformaId) : undefined;
    const rows = new Map<string, { productId: string; name: string; hsn: string; unit: string; ordered: number; delivered: number }>();
    for (const i of (pi ?? q).items) {
      const r = rows.get(i.productId) ?? { productId: i.productId, name: i.name, hsn: i.hsn, unit: i.unit, ordered: 0, delivered: 0 };
      r.ordered += i.qty || 0;
      rows.set(i.productId, r);
    }
    for (const c of this.challansFor(quoteId)) {
      for (const i of c.items) {
        const r = rows.get(i.productId);
        if (r) r.delivered += i.qty || 0;
      }
    }
    return [...rows.values()];
  }

  /** Statement for a customer: proformas raised (debit) and payments received (credit). */
  ledger(customerId: string): LedgerRow[] {
    const rows: Omit<LedgerRow, 'balance'>[] = [];
    for (const p of this.state().proformas.filter((x) => x.customerId === customerId)) {
      rows.push({ date: p.date, kind: 'proforma', ref: p.number, text: 'Proforma invoice', debit: this.totals(p).total, credit: 0, link: ['/proforma', p.id] });
      for (const pay of p.payments ?? []) {
        rows.push({
          date: pay.date, kind: 'payment', ref: p.number,
          text: `Payment · ${pay.mode}${pay.ref ? ' · ' + pay.ref : ''}`, debit: 0, credit: pay.amount, link: ['/proforma', p.id],
        });
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || (a.kind === 'proforma' ? -1 : 1));
    let bal = 0;
    return rows.map((r) => {
      bal = Math.round((bal + r.debit - r.credit) * 100) / 100;
      return { ...r, balance: bal };
    });
  }

  movesFor(productId: string): StockMove[] {
    return this.state()
      .moves.filter((m) => m.productId === productId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  }

  /** Items in a document that need more stock than is available. */
  shortages(items: LineItem[]): { name: string; unit: string; need: number; have: number }[] {
    const need = new Map<string, number>();
    for (const i of items) need.set(i.productId, (need.get(i.productId) ?? 0) + (i.qty || 0));
    const out: { name: string; unit: string; need: number; have: number }[] = [];
    for (const [id, qty] of need) {
      const p = this.product(id);
      if (p?.trackStock && qty > p.stock) out.push({ name: p.name, unit: p.unit, need: qty, have: p.stock });
    }
    return out;
  }

  totals(doc: { items: LineItem[]; customerId: string }): Totals {
    const interState = (this.customer(doc.customerId)?.state || '') !== this.state().company.state;
    let subtotal = 0, discount = 0, tax = 0;
    for (const i of doc.items) {
      const gross = (i.qty || 0) * (i.rate || 0);
      const d = gross * ((i.discount || 0) / 100);
      subtotal += gross;
      discount += d;
      tax += (gross - d) * ((i.gst || 0) / 100);
    }
    const taxable = subtotal - discount;
    const r = (n: number) => Math.round(n * 100) / 100;
    return {
      subtotal: r(subtotal),
      discount: r(discount),
      taxable: r(taxable),
      cgst: interState ? 0 : r(tax / 2),
      sgst: interState ? 0 : r(tax / 2),
      igst: interState ? r(tax) : 0,
      total: Math.round(taxable + tax),
      interState,
    };
  }

  // ---- mutations
  private patch(fn: (s: State) => State) {
    this.state.update(fn);
  }

  saveCompany(c: Company) {
    this.patch((s) => ({ ...s, company: { ...c } }));
  }

  setDocTemplate(t: DocTemplate) {
    this.patch((s) => ({ ...s, company: { ...s.company, docTemplate: t } }));
  }

  saveCustomer(c: Customer): Customer {
    const rec = { ...c, id: c.id || uid() };
    this.patch((s) => ({
      ...s,
      customers: s.customers.some((x) => x.id === rec.id) ? s.customers.map((x) => (x.id === rec.id ? rec : x)) : [...s.customers, rec],
    }));
    return rec;
  }

  saveProduct(p: Product) {
    const isNew = !p.id;
    const rec = { ...p, id: p.id || uid() };
    this.patch((s) => {
      const moves = [...s.moves];
      if (isNew && rec.trackStock && rec.stock) {
        moves.push({ id: uid(), productId: rec.id, date: today(0), type: 'in', qty: rec.stock, note: 'Opening stock' });
      }
      if (!isNew) {
        // Stock is changed only through stock in / adjust, never by editing details
        const prev = s.products.find((x) => x.id === rec.id);
        if (prev) rec.stock = prev.stock;
      }
      return {
        ...s,
        moves,
        products: s.products.some((x) => x.id === rec.id) ? s.products.map((x) => (x.id === rec.id ? rec : x)) : [...s.products, rec],
      };
    });
  }

  /** Record stock received (qty > 0), optionally as a purchase with supplier, bill and cost. */
  stockIn(productId: string, qty: number, note: string, purchase: { date?: string; supplier?: string; billNo?: string; rate?: number } = {}) {
    if (!(qty > 0)) return;
    const supplier = (purchase.supplier ?? '').trim();
    const billNo = (purchase.billNo ?? '').trim();
    const label = note || (supplier || billNo ? ['Purchase', supplier, billNo && 'Bill ' + billNo].filter(Boolean).join(' · ') : 'Stock received');
    const move: StockMove = { id: uid(), productId, date: purchase.date || today(0), type: 'in', qty, note: label };
    if (supplier) move.supplier = supplier;
    if (billNo) move.billNo = billNo;
    if (purchase.rate && purchase.rate > 0) move.rate = purchase.rate;
    this.patch((s) => ({
      ...s,
      products: s.products.map((p) => (p.id === productId ? { ...p, stock: p.stock + qty } : p)),
      moves: [...s.moves, move],
    }));
  }

  /** Set stock to a counted quantity (e.g. after a physical count, damage or loss). */
  adjustStock(productId: string, counted: number, note: string) {
    const p = this.product(productId);
    if (!p || !(counted >= 0)) return;
    const diff = counted - p.stock;
    if (!diff) return;
    this.patch((s) => ({
      ...s,
      products: s.products.map((x) => (x.id === productId ? { ...x, stock: counted } : x)),
      moves: [...s.moves, { id: uid(), productId, date: today(0), type: 'adjust', qty: diff, note: note || 'Stock count adjustment' }],
    }));
  }

  deleteProduct(id: string) {
    this.patch((s) => ({ ...s, products: s.products.filter((p) => p.id !== id) }));
  }

  newQuote(): Quote {
    return {
      id: '', number: '', customerId: '', date: today(0), validTill: today(30), items: [], notes: '',
      status: 'draft', followUp: today(3), lostReason: '', proformaId: '', revision: 1,
    };
  }

  saveQuote(q: Quote): Quote {
    let rec = { ...q, items: q.items.map((i) => ({ ...i })) };
    this.patch((s) => {
      if (!rec.id) {
        const n = s.seq.quote + 1;
        rec = { ...rec, id: uid(), number: `QT-${new Date().getFullYear()}-${String(n).padStart(3, '0')}` };
        return { ...s, seq: { ...s.seq, quote: n }, quotes: [...s.quotes, rec] };
      }
      const prev = s.quotes.find((x) => x.id === rec.id);
      if (prev && prev.status !== 'draft' && JSON.stringify(prev.items) !== JSON.stringify(rec.items)) {
        rec = { ...rec, revision: prev.revision + 1 };
      }
      return { ...s, quotes: s.quotes.map((x) => (x.id === rec.id ? rec : x)) };
    });
    return rec;
  }

  updateQuote(id: string, changes: Partial<Quote>) {
    this.patch((s) => ({ ...s, quotes: s.quotes.map((q) => (q.id === id ? { ...q, ...changes } : q)) }));
  }

  duplicateQuote(id: string): Quote | undefined {
    const q = this.quote(id);
    if (!q) return undefined;
    return this.saveQuote({ ...q, id: '', number: '', date: today(0), validTill: today(30), status: 'draft', followUp: today(3), lostReason: '', proformaId: '', revision: 1 });
  }

  convertToProforma(quoteId: string): Proforma | undefined {
    const q = this.quote(quoteId);
    if (!q) return undefined;
    if (q.proformaId) return this.proforma(q.proformaId);
    let pi!: Proforma;
    this.patch((s) => {
      const n = s.seq.proforma + 1;
      pi = {
        id: uid(), number: `PI-${new Date().getFullYear()}-${String(n).padStart(3, '0')}`, quoteId: q.id,
        customerId: q.customerId, date: today(0), items: q.items.map((i) => ({ ...i })), notes: q.notes, payments: [],
      };
      // Confirmed order: take the items out of stock
      const custName = s.customers.find((c) => c.id === q.customerId)?.name ?? '';
      const moves = [...s.moves];
      let products = s.products;
      for (const i of q.items) {
        const p = products.find((x) => x.id === i.productId);
        if (!p?.trackStock || !i.qty) continue;
        products = products.map((x) => (x.id === p.id ? { ...x, stock: x.stock - i.qty } : x));
        moves.push({ id: uid(), productId: p.id, date: today(0), type: 'out', qty: -i.qty, note: `${pi.number} · ${custName}` });
      }
      return {
        ...s,
        products,
        moves,
        seq: { ...s.seq, proforma: n },
        proformas: [...s.proformas, pi],
        quotes: s.quotes.map((x) => (x.id === q.id ? { ...x, proformaId: pi.id, status: 'won', followUp: '' } : x)),
      };
    });
    return pi;
  }

  // ---- payments
  addPayment(proformaId: string, pay: Omit<Payment, 'id'>) {
    if (!(pay.amount > 0)) return;
    this.patch((s) => ({
      ...s,
      proformas: s.proformas.map((p) => (p.id === proformaId ? { ...p, payments: [...(p.payments ?? []), { ...pay, id: uid() }] } : p)),
    }));
  }

  deletePayment(proformaId: string, paymentId: string) {
    this.patch((s) => ({
      ...s,
      proformas: s.proformas.map((p) => (p.id === proformaId ? { ...p, payments: (p.payments ?? []).filter((x) => x.id !== paymentId) } : p)),
    }));
  }

  // ---- delivery challans (stock already left at proforma; challans record what was dispatched)
  saveChallan(c: Challan): Challan {
    let rec: Challan = { ...c, items: c.items.filter((i) => i.qty > 0).map((i) => ({ ...i })) };
    this.patch((s) => {
      if (!rec.id) {
        const n = (s.seq.challan ?? 0) + 1;
        rec = { ...rec, id: uid(), number: `DC-${new Date().getFullYear()}-${String(n).padStart(3, '0')}` };
        return { ...s, seq: { ...s.seq, challan: n }, challans: [...s.challans, rec] };
      }
      return { ...s, challans: s.challans.map((x) => (x.id === rec.id ? rec : x)) };
    });
    return rec;
  }

  deleteChallan(id: string) {
    this.patch((s) => ({ ...s, challans: s.challans.filter((c) => c.id !== id) }));
  }

  reset() {
    this.state.set(seed());
  }
}
