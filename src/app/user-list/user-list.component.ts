import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';

export interface UserItem {
  id: string;
  username: string;
  email: string;
  fullName: string;
  active: boolean;
  roles: string[];
  createdAt?: string;
  updatedAt?: string;
}

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.css']
})
export class UserListComponent implements OnInit {
  private readonly API_URL = 'http://localhost:8082/api/users';

  users: UserItem[] = [];
  loading = false;
  errorMessage = '';
  successMessage = '';
  searchQuery = '';

  // Slide-over Drawer State (Zero Popups)
  showDrawer = false;
  drawerMode: 'CREATE' | 'EDIT' = 'CREATE';
  drawerSubmitting = false;

  // Form Data for Create
  newUser = {
    username: '',
    fullName: '',
    email: '',
    password: '',
    role: 'ROLE_WORKER',
    active: true
  };

  // Form Data for Edit
  editingUser: UserItem | null = null;
  editFormData = {
    fullName: '',
    email: '',
    password: '',
    role: 'ROLE_WORKER',
    active: true
  };

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.errorMessage = '';
    this.http.get<UserItem[]>(this.API_URL).subscribe({
      next: (data) => {
        this.users = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading users:', err);
        this.errorMessage = 'Failed to load users from database.';
        this.loading = false;
      }
    });
  }

  get filteredUsers(): UserItem[] {
    if (!this.searchQuery || this.searchQuery.trim().length === 0) {
      return this.users;
    }
    const q = this.searchQuery.trim().toLowerCase();
    return this.users.filter(u =>
      (u.username && u.username.toLowerCase().includes(q)) ||
      (u.fullName && u.fullName.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.id && u.id.toLowerCase().includes(q))
    );
  }

  openCreateDrawer() {
    this.drawerMode = 'CREATE';
    this.newUser = {
      username: '',
      fullName: '',
      email: '',
      password: '',
      role: 'ROLE_WORKER',
      active: true
    };
    this.errorMessage = '';
    this.showDrawer = true;
  }

  openEditDrawer(user: UserItem) {
    this.drawerMode = 'EDIT';
    this.editingUser = user;
    const primaryRole = user.roles && user.roles.length > 0 ? user.roles[0] : 'ROLE_WORKER';
    this.editFormData = {
      fullName: user.fullName,
      email: user.email,
      password: '',
      role: primaryRole,
      active: user.active
    };
    this.errorMessage = '';
    this.showDrawer = true;
  }

  closeDrawer() {
    this.showDrawer = false;
    this.editingUser = null;
    this.errorMessage = '';
  }

  submitCreateUser() {
    if (!this.newUser.username || !this.newUser.fullName || !this.newUser.email || !this.newUser.password) {
      this.errorMessage = 'Please complete all required fields.';
      return;
    }

    this.drawerSubmitting = true;
    const payload = {
      username: this.newUser.username.trim(),
      fullName: this.newUser.fullName.trim(),
      email: this.newUser.email.trim(),
      password: this.newUser.password,
      active: this.newUser.active,
      roles: [this.newUser.role]
    };

    this.http.post<UserItem>(this.API_URL, payload).subscribe({
      next: () => {
        this.drawerSubmitting = false;
        this.closeDrawer();
        this.setSuccess(`User '${payload.username}' created successfully.`);
        this.loadUsers();
      },
      error: (err) => {
        this.drawerSubmitting = false;
        console.error('Error creating user:', err);
        this.errorMessage = err.error?.message || err.error?.details?.password || 'Failed to create user. Please check password requirements.';
      }
    });
  }

  submitEditUser() {
    if (!this.editingUser) return;

    if (!this.editFormData.fullName || !this.editFormData.email) {
      this.errorMessage = 'Full Name and Email are required.';
      return;
    }

    this.drawerSubmitting = true;
    const payload: any = {
      fullName: this.editFormData.fullName.trim(),
      email: this.editFormData.email.trim(),
      active: this.editFormData.active,
      roles: [this.editFormData.role]
    };

    if (this.editFormData.password && this.editFormData.password.trim().length > 0) {
      payload.password = this.editFormData.password.trim();
    }

    this.http.put(`${this.API_URL}/${this.editingUser.id}`, payload).subscribe({
      next: () => {
        this.drawerSubmitting = false;
        this.closeDrawer();
        this.setSuccess(`User '${this.editingUser?.username}' updated successfully.`);
        this.loadUsers();
      },
      error: (err) => {
        this.drawerSubmitting = false;
        console.error('Error updating user:', err);
        this.errorMessage = err.error?.message || 'Failed to update user.';
      }
    });
  }

  toggleUserStatus(user: UserItem) {
    const newStatus = !user.active;
    const action = newStatus ? 'enable' : 'disable';

    if (confirm(`Are you sure you want to ${action} user '${user.username}'?`)) {
      this.http.patch(`${this.API_URL}/${user.id}/status`, { active: newStatus }).subscribe({
        next: () => {
          user.active = newStatus;
          this.setSuccess(`User '${user.username}' has been ${action}d.`);
        },
        error: (err) => {
          console.error('Error updating status:', err);
          this.errorMessage = `Failed to ${action} user.`;
        }
      });
    }
  }

  deleteUser(user: UserItem) {
    if (confirm(`CRITICAL WARNING:\nAre you sure you want to permanently delete user '${user.username}' (${user.id})?`)) {
      this.http.delete(`${this.API_URL}/${user.id}`).subscribe({
        next: () => {
          this.setSuccess(`User '${user.username}' deleted successfully.`);
          this.loadUsers();
        },
        error: (err) => {
          console.error('Error deleting user:', err);
          this.errorMessage = 'Failed to delete user.';
        }
      });
    }
  }

  private setSuccess(msg: string) {
    this.successMessage = msg;
    setTimeout(() => {
      this.successMessage = '';
    }, 4000);
  }
}