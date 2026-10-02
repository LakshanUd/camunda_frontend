import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-edit.component.html',
  styleUrls: ['./user-edit.component.css']
})
export class UserEditComponent implements OnInit {
  userId: string = '';
  user: any = {
    id: '',
    username: '',
    fullName: '',
    email: '',
    active: true,
    roles: ['ROLE_WORKER']
  };

  selectedRole = 'ROLE_WORKER';
  newPassword = '';
  repeatPassword = '';

  errorMessage = '';
  successMessage = '';
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    if (this.userId) {
      this.loadUser();
    }
  }

  loadUser() {
    this.loading = true;
    this.http.get<any>(`http://localhost:8082/api/users/${this.userId}`).subscribe({
      next: (data) => {
        this.user = data;
        if (data.roles && data.roles.length > 0) {
          this.selectedRole = data.roles[0];
        }
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        console.error('Error loading user:', err);
        this.errorMessage = 'Failed to load user profile from MySQL.';
      }
    });
  }

  updateProfile() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.user.fullName || !this.user.email) {
      this.errorMessage = 'Full Name and Email are required.';
      return;
    }

    if (this.newPassword && this.newPassword !== this.repeatPassword) {
      this.errorMessage = 'New passwords do not match.';
      return;
    }

    const nonPrimaryRoles = (this.user.roles || []).filter(
      (r: string) => r !== 'ROLE_ADMIN' && r !== 'ROLE_WORKER' && r !== 'ROLE_MANAGER' && r !== this.selectedRole
    );
    const updatedRoles = Array.from(new Set([this.selectedRole, ...nonPrimaryRoles]));

    const payload: any = {
      fullName: this.user.fullName.trim(),
      email: this.user.email.trim(),
      active: this.user.active,
      roles: updatedRoles
    };

    if (this.newPassword && this.newPassword.trim().length > 0) {
      payload.password = this.newPassword.trim();
    }

    this.loading = true;
    this.http.put(`http://localhost:8082/api/users/${this.userId}`, payload).subscribe({
      next: () => {
        this.loading = false;
        this.successMessage = 'User profile updated successfully in MySQL!';
        this.newPassword = '';
        this.repeatPassword = '';
        setTimeout(() => (this.successMessage = ''), 3000);
      },
      error: (err) => {
        this.loading = false;
        console.error('Update error:', err);
        this.errorMessage = err.error?.message || 'Failed to update user profile.';
      }
    });
  }

  deleteAccount() {
    if (confirm(`CRITICAL WARNING:\nAre you sure you want to permanently delete user '${this.user.username}' from MySQL?`)) {
      this.http.delete(`http://localhost:8082/api/users/${this.userId}`).subscribe({
        next: () => {
          alert('User deleted successfully.');
          this.router.navigate(['/admin/users']);
        },
        error: (err) => {
          console.error('Delete error:', err);
          alert('Failed to delete user.');
        }
      });
    }
  }
}