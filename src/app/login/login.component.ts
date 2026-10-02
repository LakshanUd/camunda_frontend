import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  errorMessage = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin() {
    this.errorMessage = '';
    if (!this.credentials.username || !this.credentials.password) {
      this.errorMessage = 'Please provide both username and password.';
      return;
    }

    this.loading = true;

    this.authService.login(this.credentials).subscribe({
      next: (response) => {
        this.loading = false;
        // Route dynamically based on privileges
        if (response.isAdmin) {
          this.router.navigate(['/admin/users']);
        } else {
          this.router.navigate(['/my-tasks']);
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Login error:', err);
        if (err.status === 401) {
          this.errorMessage = 'Invalid username or password.';
        } else if (err.error?.message) {
          this.errorMessage = err.error.message;
        } else {
          this.errorMessage = 'Server error connecting to backend service.';
        }
      }
    });
  }
}