import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private base = environment.apiUrl;
  private tokenKey = 'everly_token';
  private userKey = 'everly_user';

  constructor(private http: HttpClient) {}

  get token(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  get usuario(): AuthUser | null {
    const raw = localStorage.getItem(this.userKey);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthUser;
    } catch {
      return null;
    }
  }

  isLoggedIn(): boolean {
    return !!this.token;
  }

  login(email: string, password: string): Observable<void> {
    return this.http
      .post<{ data: { token: string; user: AuthUser } }>(`${this.base}/auth/login`, { email, password })
      .pipe(
        map((res) => {
          localStorage.setItem(this.tokenKey, res.data.token);
          localStorage.setItem(this.userKey, JSON.stringify(res.data.user));
        })
      );
  }

  logout(): void {
    const tk = this.token;
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    if (tk) {
      this.http.post(`${this.base}/auth/logout`, {}).subscribe({ error: () => {} });
    }
  }
}