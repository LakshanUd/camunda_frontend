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
  activeTab: string = 'Profile'; 

  profile = { id: '', firstName: '', lastName: '', email: '' };
  passwords = { current: '', new: '', repeat: '' };

  // Data arrays
  userGroups: any[] = [];
  availableGroups: any[] = [];
  userTenants: any[] = [];
  availableTenants: any[] = [];

  // UI States for adding
  showAddGroup = false;
  selectedGroupId = '';
  showAddTenant = false;
  selectedTenantId = '';

  // Messages
  profileMsg = '';
  accountMsg = '';

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit() {
    this.userId = this.route.snapshot.paramMap.get('id') || '';
    this.loadProfile();
    this.loadMemberships();
  }

  loadProfile() {
    this.http.get<any>(`http://localhost:8082/api/users/${this.userId}/profile`).subscribe({
      next: (data) => this.profile = { id: this.userId, ...data },
      error: () => alert('Error loading user profile.')
    });
  }

  loadMemberships() {
    // Load Groups
    this.http.get<any[]>('http://localhost:8082/api/groups').subscribe(allGroups => {
      this.http.get<any[]>(`http://localhost:8082/api/users/${this.userId}/groups`).subscribe(userGroups => {
        this.userGroups = userGroups;
        // Filter out groups the user is already in to populate the dropdown
        this.availableGroups = allGroups.filter(g => !userGroups.some(ug => ug.id === g.id));
      });
    });

    // Load Tenants
    this.http.get<any[]>('http://localhost:8082/api/tenants').subscribe(allTenants => {
      this.http.get<any[]>(`http://localhost:8082/api/users/${this.userId}/tenants`).subscribe(userTenants => {
        this.userTenants = userTenants;
        // Filter out tenants the user is already in
        this.availableTenants = allTenants.filter(t => !userTenants.some(ut => ut.id === t.id));
      });
    });
  }

  // --- Profile & Account Methods ---
  updateProfile() {
    const payload = { id: this.profile.id, firstName: this.profile.firstName, lastName: this.profile.lastName, email: this.profile.email };
    this.http.put(`http://localhost:8082/api/users/${this.userId}/profile`, payload).subscribe({
      next: () => {
        this.profileMsg = 'Profile updated successfully!';
        setTimeout(() => this.profileMsg = '', 3000);
      }
    });
  }

  updatePassword() {
    if (this.passwords.new !== this.passwords.repeat) { this.accountMsg = 'New passwords do not match!'; return; }
    const payload = { password: this.passwords.new, authenticatedUserPassword: this.passwords.current };
    this.http.put(`http://localhost:8082/api/users/${this.userId}/credentials`, payload).subscribe({
      next: () => {
        this.accountMsg = 'Password updated successfully!';
        this.passwords = { current: '', new: '', repeat: '' };
        setTimeout(() => this.accountMsg = '', 3000);
      },
      error: () => this.accountMsg = 'Error. Current password may be incorrect.'
    });
  }

  deleteAccount() {
    if (confirm(`CRITICAL WARNING:\nAre you sure you want to permanently delete user: ${this.userId}?`)) {
      this.http.delete(`http://localhost:8082/api/users/${this.userId}`).subscribe({
        next: () => { alert('User deleted.'); this.router.navigate(['/admin/users']); }
      });
    }
  }

  // --- Group Actions ---
  addGroup() {
    if (!this.selectedGroupId) return;
    this.http.put(`http://localhost:8082/api/users/${this.userId}/groups/${this.selectedGroupId}`, {}).subscribe({
      next: () => {
        this.showAddGroup = false;
        this.selectedGroupId = '';
        this.loadMemberships(); // Refresh tables
      },
      error: () => alert('Failed to add group.')
    });
  }

  removeGroup(groupId: string) {
    if (confirm(`Remove user from group ${groupId}?`)) {
      this.http.delete(`http://localhost:8082/api/users/${this.userId}/groups/${groupId}`).subscribe({
        next: () => this.loadMemberships(),
        error: () => alert('Failed to remove group.')
      });
    }
  }

  // --- Tenant Actions ---
  addTenant() {
    if (!this.selectedTenantId) return;
    this.http.put(`http://localhost:8082/api/users/${this.userId}/tenants/${this.selectedTenantId}`, {}).subscribe({
      next: () => {
        this.showAddTenant = false;
        this.selectedTenantId = '';
        this.loadMemberships();
      },
      error: () => alert('Failed to add tenant.')
    });
  }

  removeTenant(tenantId: string) {
    if (confirm(`Remove user from tenant ${tenantId}?`)) {
      this.http.delete(`http://localhost:8082/api/users/${this.userId}/tenants/${tenantId}`).subscribe({
        next: () => this.loadMemberships(),
        error: () => alert('Failed to remove tenant.')
      });
    }
  }
}