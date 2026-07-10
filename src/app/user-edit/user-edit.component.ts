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
  activeTab: string = 'Profile'; // Controls which section is visible

  // Data Models
  profile = { id: '', firstName: '', lastName: '', email: '' };
  passwords = { current: '', new: '', repeat: '' };

  // Status Messages
  profileMsg = '';
  accountMsg = '';

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit() {
    // Grab the ID from the URL (e.g. /admin/users/edit/john)
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    this.loadProfile();
  }

  loadProfile() {
    this.http.get<any>(`http://localhost:8082/api/users/${this.userId}/profile`).subscribe({
      next: (data) => this.profile = { id: this.userId, ...data },
      error: () => alert('Error loading user profile.')
    });
  }

  updateProfile() {
    const payload = { id: this.profile.id, firstName: this.profile.firstName, lastName: this.profile.lastName, email: this.profile.email };
    this.http.put(`http://localhost:8082/api/users/${this.userId}/profile`, payload).subscribe({
      next: () => {
        this.profileMsg = 'Profile updated successfully!';
        setTimeout(() => this.profileMsg = '', 3000); // Clear message after 3s
      },
      error: () => this.profileMsg = 'Error updating profile.'
    });
  }

  updatePassword() {
    if (this.passwords.new !== this.passwords.repeat) {
      this.accountMsg = 'New passwords do not match!';
      return;
    }
    if (!this.passwords.current || !this.passwords.new) {
      this.accountMsg = 'Please fill out all password fields.';
      return;
    }

    // Camunda requires the new password and the current password for security
    const payload = { password: this.passwords.new, authenticatedUserPassword: this.passwords.current };
    this.http.put(`http://localhost:8082/api/users/${this.userId}/credentials`, payload).subscribe({
      next: () => {
        this.accountMsg = 'Password updated successfully!';
        this.passwords = { current: '', new: '', repeat: '' }; // Clear fields
        setTimeout(() => this.accountMsg = '', 3000);
      },
      error: () => this.accountMsg = 'Error. Current password may be incorrect.'
    });
  }

  deleteAccount() {
    if (confirm(`CRITICAL WARNING:\nAre you absolutely sure you want to permanently delete user: ${this.userId}?`)) {
      this.http.delete(`http://localhost:8082/api/users/${this.userId}`).subscribe({
        next: () => {
          alert('User deleted.');
          this.router.navigate(['/admin/users']);
        },
        error: () => alert('Failed to delete user.')
      });
    }
  }
}