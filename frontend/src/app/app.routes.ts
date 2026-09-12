import { Routes } from '@angular/router';
import { DashboardComponent } from './dashboard/dashboard.component';
import { CasillerosComponent } from './casilleros/casilleros.component';
import { ClientasComponent } from './clientas/clientas.component';
import { PedidosComponent } from './pedidos/pedidos.component';
import { BolsasComponent } from './bolsas/bolsas.component';
import { MovimientosComponent } from './movimientos/movimientos.component';
import { CajaComponent } from './caja/caja.component';
import { LoginComponent } from './login/login.component';
import { MainLayoutComponent } from './layout/main-layout.component';
import { UsuariosComponent } from './usuarios/usuarios.component';
import { authGuard, loginGuard, superAdminGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent, canActivate: [loginGuard] },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: DashboardComponent },
      { path: 'casilleros', component: CasillerosComponent },
      { path: 'clientas', component: ClientasComponent },
      { path: 'pedidos', component: PedidosComponent },
      { path: 'bolsas', component: BolsasComponent },
      { path: 'movimientos', component: MovimientosComponent },
      { path: 'caja', component: CajaComponent },
      { path: 'usuarios', component: UsuariosComponent, canActivate: [superAdminGuard] },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];