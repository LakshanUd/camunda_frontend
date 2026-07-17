import { Injectable } from '@angular/core';
import { Router } from '@angular/router';

export interface UserSession {
  userId: string;
  groups: string[];
  isAdmin: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly SESSION_KEY = 'camunda_user_session';

  constructor(private router: Router) {}

  saveSession(session: UserSession): void {
    localStorage.setItem(this.SESSION_KEY, JSON.stringify(session));
  }

  getSession(): UserSession | null {
    const data = localStorage.getItem(this.SESSION_KEY);
    return data ? JSON.parse(data) : null;
  }

  isLoggedIn(): boolean {
    return this.getSession() !== null;
  }

  isAdmin(): boolean {
    const session = this.getSession();
    return session ? session.isAdmin : false;
  }

  getCurrentUserId(): string {
    const session = this.getSession();
    return session ? session.userId : '';
  }

  logout(): void {
    localStorage.removeItem(this.SESSION_KEY);
    this.router.navigate(['/login']);
  }
}