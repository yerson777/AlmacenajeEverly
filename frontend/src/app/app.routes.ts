import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CasillerosComponent } from './casilleros/casilleros.component';
import { ClientasComponent } from './clientas/clientas.component';
import { PedidosComponent } from './pedidos/pedidos.component';
import { BolsasComponent } from './bolsas/bolsas.component';
import { MovimientosComponent } from './movimientos/movimientos.component';

export const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'casilleros', component: CasillerosComponent },
  { path: 'clientas', component: ClientasComponent },
  { path: 'pedidos', component: PedidosComponent },
  { path: 'bolsas', component: BolsasComponent },
  { path: 'movimientos', component: MovimientosComponent },
];