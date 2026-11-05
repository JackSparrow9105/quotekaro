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
}

export interface Proforma {
  id: string;
  number: string;
  quoteId: string;
  customerId: string;
  date: string;
  items: LineItem[];
  notes: string;
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
  seq: { quote: number; proforma: number };
}

const KEY = 'quotekaro-demo-v1';

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
    { id: 'p1', name: 'Copper bonded earthing electrode 3 m', hsn: '8538', unit: 'pcs', rate: 4850, gst: 18 },
    { id: 'p2', name: 'Earthing backfill compound 25 kg', hsn: '3824', unit: 'bag', rate: 1250, gst: 18 },
    { id: 'p3', name: 'ESE lightning arrester', hsn: '8535', unit: 'pcs', rate: 38500, gst: 18 },
    { id: 'p4', name: 'Copper strip 25x3 mm', hsn: '7409', unit: 'm', rate: 820, gst: 18 },
    { id: 'p5', name: 'Earth pit cover (polymer)', hsn: '3926', unit: 'pcs', rate: 650, gst: 18 },
    { id: 'p6', name: 'Installation & testing charges', hsn: '9954', unit: 'job', rate: 7500, gst: 18 },
  ];
  const item = (p: Product, qty: number, discount = 0): LineItem => ({
    productId: p.id, name: p.name, hsn: p.hsn, unit: p.unit, qty, rate: p.rate, discount, gst: p.gst,
  });
  const quotes: Quote[] = [
    { id: 'q1', number: 'QT-2026-001', customerId: 'c1', date: today(-12), validTill: today(18), items: [item(products[0], 10, 5), item(products[1], 20), item(products[4], 10), item(products[5], 1)], notes: '', status: 'won', followUp: '', lostReason: '', proformaId: 'pi1', revision: 1 },
    { id: 'q2', number: 'QT-2026-002', customerId: 'c2', date: today(-6), validTill: today(24), items: [item(products[2], 2), item(products[3], 60, 3), item(products[5], 2)], notes: '', status: 'sent', followUp: today(0), lostReason: '', proformaId: '', revision: 2 },
    { id: 'q3', number: 'QT-2026-003', customerId: 'c3', date: today(-4), validTill: today(26), items: [item(products[0], 24, 8), item(products[1], 48)], notes: '', status: 'sent', followUp: today(-1), lostReason: '', proformaId: '', revision: 1 },
    { id: 'q4', number: 'QT-2026-004', customerId: 'c1', date: today(-20), validTill: today(10), items: [item(products[2], 1)], notes: '', status: 'lost', followUp: '', lostReason: 'Price too high', proformaId: '', revision: 1 },
    { id: 'q5', number: 'QT-2026-005', customerId: 'c2', date: today(-1), validTill: today(29), items: [item(products[0], 6), item(products[4], 6)], notes: '', status: 'draft', followUp: today(3), lostReason: '', proformaId: '', revision: 1 },
  ];
  const proformas: Proforma[] = [
    { id: 'pi1', number: 'PI-2026-001', quoteId: 'q1', customerId: 'c1', date: today(-8), items: quotes[0].items.map((i) => ({ ...i })), notes: '50% advance with order, balance before dispatch.' },
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
    },
    customers,
    products,
    quotes,
    proformas,
    seq: { quote: 5, proforma: 1 },
  };
}

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as State;
  } catch {
    /* storage unavailable */
  }
  return seed();
}

@Injectable({ providedIn: 'root' })
export class Store {
  private readonly state = signal<State>(load());

  readonly company = computed(() => this.state().company);
  readonly customers = computed(() => this.state().customers);
  readonly products = computed(() => this.state().products);
  readonly quotes = computed(() => [...this.state().quotes].sort((a, b) => b.number.localeCompare(a.number)));
  readonly proformas = computed(() => this.state().proformas);

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

  saveCustomer(c: Customer): Customer {
    const rec = { ...c, id: c.id || uid() };
    this.patch((s) => ({
      ...s,
      customers: s.customers.some((x) => x.id === rec.id) ? s.customers.map((x) => (x.id === rec.id ? rec : x)) : [...s.customers, rec],
    }));
    return rec;
  }

  saveProduct(p: Product) {
    const rec = { ...p, id: p.id || uid() };
    this.patch((s) => ({
      ...s,
      products: s.products.some((x) => x.id === rec.id) ? s.products.map((x) => (x.id === rec.id ? rec : x)) : [...s.products, rec],
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
        customerId: q.customerId, date: today(0), items: q.items.map((i) => ({ ...i })), notes: q.notes,
      };
      return {
        ...s,
        seq: { ...s.seq, proforma: n },
        proformas: [...s.proformas, pi],
        quotes: s.quotes.map((x) => (x.id === q.id ? { ...x, proformaId: pi.id, status: 'won', followUp: '' } : x)),
      };
    });
    return pi;
  }

  reset() {
    this.state.set(seed());
  }
}
