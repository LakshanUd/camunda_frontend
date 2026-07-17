import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Fixes NG8103 (*ngIf warning)
import { FormsModule } from '@angular/forms';
import { AuthService, UserSession } from '../auth.service'; // Imports RBAC Service

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule], // Both required for template directives
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  // Restored to match your login.component.html [(ngModel)] bindings
  credentials = { username: '', password: '' };
  errorMessage = '';

  constructor(
    private http: HttpClient, 
    private router: Router, 
    private authService: AuthService
  ) {}

  onLogin() {
    this.errorMessage = ''; // Clear previous errors

    // Call the new RBAC authentication endpoint from Step 1A
    this.http.post<UserSession>('http://localhost:8082/api/auth/login', this.credentials)
      .subscribe({
        next: (sessionData) => {
          // 1. Save structured session (creates 'camunda_user_session' key in localStorage)
          this.authService.saveSession(sessionData);

          // 2. Route dynamically based on privileges
          if (sessionData.isAdmin) {
            this.router.navigate(['/admin/dispatcher']); // Send Admins to Command Center
          } else {
            this.router.navigate(['/my-tasks']);         // Send Workers to personal task table
          }
        },
        error: (err) => {
          console.error('Login error:', err);
          if (err.status === 401) {
            this.errorMessage = 'Invalid Username or Password.';
          } else {
            this.errorMessage = 'Server error connecting to Camunda backend.';
          }
        }
      });
  }
}