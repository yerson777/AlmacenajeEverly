import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'CasilleroEverly';
  menuAbierto = false;
  navItems = [
    { label: 'Inicio', route: '/dashboard' },
    { label: 'Casilleros', route: '/casilleros' },
    { label: 'Bolsas', route: '/bolsas' },
    { label: 'Clientas', route: '/clientas' },
    { label: 'Pedidos', route: '/pedidos' },
    { label: 'Movimientos', route: '/movimientos' },
  ];

  cerrarMenu(): void {
    this.menuAbierto = false;
  }
}