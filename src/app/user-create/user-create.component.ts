import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.css']
})
export class UserCreateComponent {
  userData = {
    username: '',
    fullName: '',
    email: '',
    password: '',
    passwordRepeat: '',
    role: 'ROLE_WORKER',
    active: true
  };
  errorMessage = '';
  loading = false;

  constructor(private http: HttpClient, private router: Router) {}

  onCreateUser() {
    this.errorMessage = '';
    if (!this.userData.username || !this.userData.fullName || !this.userData.email || !this.userData.password) {
      this.errorMessage = 'Please fill out all required fields (*).';
      return;
    }
    if (this.userData.password !== this.userData.passwordRepeat) {
      this.errorMessage = 'Passwords do not match!';
      return;
    }

    const payload = {
      username: this.userData.username.trim(),
      fullName: this.userData.fullName.trim(),
      email: this.userData.email.trim(),
      password: this.userData.password,
      roles: [this.userData.role],
      active: this.userData.active
    };

    this.loading = true;
    this.http.post('http://localhost:8082/api/users', payload).subscribe({
      next: () => {
        this.loading = false;
        alert('User created successfully in custom MySQL database!');
        this.router.navigate(['/admin/users']);
      },
      error: (err) => {
        this.loading = false;
        console.error('Create user error:', err);
        this.errorMessage = err.error?.message || err.error?.details?.password || 'Failed to create user. Please check requirements.';
      }
    });
  }
}