import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../auth.service';

@Component({
  selector: 'app-my-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-profile.component.html',
  styleUrls: ['./my-profile.component.css']
})
export class MyProfileComponent implements OnInit {
  userId: string = '';
  username: string = '';
  activeTab: string = 'Profile';

  profile = { id: '', firstName: '', lastName: '', email: '' };
  passwords = { current: '', new: '', repeat: '' };

  profileMsg = '';
  accountMsg = '';

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit() {
    this.userId = this.authService.getCurrentUserId();
    this.username = this.authService.getCurrentUsername();
    if (this.userId) {
      this.loadProfile();
    }
  }

  loadProfile() {
    this.http.get<any>(`http://localhost:8082/api/users/${this.userId}/profile`).subscribe({
      next: (data) => {
        this.profile = { id: this.userId, ...data };
      },
      error: (err) => console.error('Failed to load profile', err)
    });
  }

  updateProfile() {
    const payload = { id: this.profile.id, firstName: this.profile.firstName, lastName: this.profile.lastName, email: this.profile.email };
    this.http.put(`http://localhost:8082/api/users/${this.userId}/profile`, payload).subscribe({
      next: () => {
        this.profileMsg = 'Your profile was updated!';
        setTimeout(() => this.profileMsg = '', 3000);
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
      this.accountMsg = 'Please fill out all fields.';
      return;
    }

    const payload = { password: this.passwords.new, authenticatedUserPassword: this.passwords.current };
    this.http.put(`http://localhost:8082/api/users/${this.userId}/credentials`, payload).subscribe({
      next: () => {
        this.accountMsg = 'Password changed successfully!';
        this.passwords = { current: '', new: '', repeat: '' }; 
        setTimeout(() => this.accountMsg = '', 3000);
      },
      error: () => this.accountMsg = 'Incorrect current password.'
    });
  }
}