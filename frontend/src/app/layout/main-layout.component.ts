import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './main-layout.component.html'
})
export class MainLayoutComponent implements OnInit, OnDestroy {
  menuAbierto = false;
  colapsada = localStorage.getItem('everly_menu') === '1';
  navItems = [
    { label: 'Inicio', route: '/dashboard', icon: 'bi-speedometer2' },
    { label: 'Casilleros', route: '/casilleros', icon: 'bi-boxes' },
    { label: 'Bolsas', route: '/bolsas', icon: 'bi-bag' },
    { label: 'Clientas', route: '/clientas', icon: 'bi-people' },
    { label: 'Pedidos', route: '/pedidos', icon: 'bi-receipt-cutoff' },
    { label: 'Caja', route: '/caja', icon: 'bi-cash-coin' },
    { label: 'Movimientos', route: '/movimientos', icon: 'bi-clock-history' },
    { label: 'Usuarios', route: '/usuarios', icon: 'bi-person-gear' },
  ];
  private destroy$ = new Subject<void>();

  constructor(
    private router: Router,
    public auth: AuthService
  ) {}

  get itemsVisibles() {
    return this.navItems.filter((i) => i.route !== '/usuarios' || this.auth.usuario?.role === 'super_admin');
  }

  ngOnInit(): void {
    this.router.events
      .pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        this.menuAbierto = false;
      });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  alternarMenu(): void {
    this.menuAbierto = !this.menuAbierto;
  }

  alternarColapsada(): void {
    this.colapsada = !this.colapsada;
    localStorage.setItem('everly_menu', this.colapsada ? '1' : '0');
  }

  salir(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  rolNombre(): string {
    const r = this.auth.usuario?.role;
    switch (r) {
      case 'super_admin': return 'Super administrador';
      case 'administrador': return 'Administrador';
      case 'cajera': return 'Cajera';
      default: return 'Solo lectura';
    }
  }
}