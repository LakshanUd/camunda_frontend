import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';

export interface AuthResponse {
  token: string;
  type: string;
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  isAdmin: boolean;
}

export interface UserSession {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: string[];
  isAdmin: boolean;
  token: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly API_URL = 'http://localhost:8082/api/auth';
  private readonly SESSION_KEY = 'camunda_auth_session';
  private readonly TOKEN_KEY = 'camunda_jwt_token';

  // Angular Reactive Signals
  private currentUserSignal = signal<UserSession | null>(this.loadSessionFromStorage());
  public currentUser = this.currentUserSignal.asReadonly();
  public isLoggedIn = computed(() => this.currentUserSignal() !== null);
  public isAdmin = computed(() => this.currentUserSignal()?.isAdmin ?? false);

  constructor(private http: HttpClient, private router: Router) {}

  /**
   * Authenticate against custom MySQL backend (/api/auth/login)
   */
  login(credentials: { username: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/login`, credentials).pipe(
      tap((response) => {
        this.saveSession(response);
      })
    );
  }

  /**
   * Register new user account against custom MySQL backend (/api/auth/register)
   */
  register(userData: {
    username: string;
    email: string;
    fullName: string;
    password: string;
    roles?: string[];
  }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.API_URL}/register`, userData).pipe(
      tap((response) => {
        this.saveSession(response);
      })
    );
  }

  /**
   * Securely saves JWT token and user profile metadata in sessionStorage.
   * sessionStorage isolates tokens to the active tab and clears on tab closure.
   */
  public saveSession(response: AuthResponse): void {
    const session: UserSession = {
      id: response.id,
      username: response.username,
      email: response.email,
      fullName: response.fullName,
      roles: response.roles || [],
      isAdmin: response.isAdmin || (response.roles && (response.roles.includes('ROLE_ADMIN') || response.roles.includes('ADMIN'))),
      token: response.token
    };

    sessionStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
    sessionStorage.setItem(this.TOKEN_KEY, response.token);
    this.currentUserSignal.set(session);
  }

  public getSession(): UserSession | null {
    return this.currentUserSignal();
  }

  public getToken(): string | null {
    return sessionStorage.getItem(this.TOKEN_KEY);
  }

  public getCurrentUserId(): string {
    return this.currentUserSignal()?.id || '';
  }

  public getCurrentUsername(): string {
    return this.currentUserSignal()?.username || '';
  }

  public hasRole(role: string): boolean {
    const session = this.currentUserSignal();
    if (!session || !session.roles) return false;
    const normalized = role.startsWith('ROLE_') ? role : `ROLE_${role}`;
    return session.roles.includes(role) || session.roles.includes(normalized);
  }

  public logout(): void {
    sessionStorage.removeItem(this.SESSION_KEY);
    sessionStorage.removeItem(this.TOKEN_KEY);
    this.currentUserSignal.set(null);
    this.router.navigate(['/login']);
  }

  private loadSessionFromStorage(): UserSession | null {
    try {
      const data = sessionStorage.getItem(this.SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }
}