import { Routes } from '@angular/router';
import { Dashboard } from './pages/dashboard';
import { QuoteList } from './pages/quote-list';
import { QuoteEdit } from './pages/quote-edit';
import { QuoteDetail } from './pages/quote-detail';
import { ProformaDetail } from './pages/proforma-detail';
import { Customers } from './pages/customers';
import { Inventory } from './pages/inventory';
import { Settings } from './pages/settings';


export const routes: Routes = [
  { path: '', component: Dashboard, title: 'QuoteKaro' },
  { path: 'quotes', component: QuoteList, title: 'Quotes · QuoteKaro' },
  { path: 'quotes/new', component: QuoteEdit, title: 'New quote · QuoteKaro' },
  { path: 'quotes/:id', component: QuoteDetail, title: 'Quote · QuoteKaro' },
  { path: 'quotes/:id/edit', component: QuoteEdit, title: 'Edit quote · QuoteKaro' },
  { path: 'proforma/:id', component: ProformaDetail, title: 'Proforma · QuoteKaro' },
  { path: 'customers', component: Customers, title: 'Customers · QuoteKaro' },
  // Opened less often, so loaded on demand to keep the first load small
  { path: 'customers/:id', loadComponent: () => import('./pages/customer-detail').then((m) => m.CustomerDetail), title: 'Customer · QuoteKaro' },
  { path: 'challans/new', loadComponent: () => import('./pages/challan-edit').then((m) => m.ChallanEdit), title: 'New delivery challan · QuoteKaro' },
  { path: 'challans/:id', loadComponent: () => import('./pages/challan-detail').then((m) => m.ChallanDetail), title: 'Delivery challan · QuoteKaro' },
  { path: 'reports', loadComponent: () => import('./pages/reports').then((m) => m.Reports), title: 'Reports · QuoteKaro' },
  { path: 'inventory', component: Inventory, title: 'Inventory · QuoteKaro' },
  { path: 'products', redirectTo: 'inventory' },
  { path: 'settings', component: Settings, title: 'Settings · QuoteKaro' },
  { path: '**', redirectTo: '' },
];
