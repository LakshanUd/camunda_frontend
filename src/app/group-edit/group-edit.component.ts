import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './group-edit.component.html',
  styleUrls: ['./group-edit.component.css']
})
export class GroupEditComponent implements OnInit {
  groupId: string = '';
  groupData = { id: '', name: '', type: '' };
  successMessage = '';
  
  // Group Members State
  members: any[] = [];
  allUsers: any[] = [];
  selectedUserToAdd: string = '';
  loadingMembers: boolean = false;
  memberActionMessage: string = '';

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit() {
    this.groupId = this.route.snapshot.paramMap.get('id') || '';
    this.loadGroup();
    this.loadMembers();
    this.loadAllUsers();
  }

  loadGroup() {
    this.http.get<any>(`http://localhost:8082/api/groups/${this.groupId}`).subscribe({
      next: (data) => this.groupData = data,
      error: () => alert('Error loading group details.')
    });
  }

  loadMembers() {
    this.loadingMembers = true;
    this.http.get<any[]>(`http://localhost:8082/api/groups/${this.groupId}/members`).subscribe({
      next: (data) => {
        this.members = data || [];
        this.loadingMembers = false;
      },
      error: (err) => {
        console.error('Error loading group members:', err);
        this.loadingMembers = false;
      }
    });
  }

  loadAllUsers() {
    this.http.get<any[]>('http://localhost:8082/api/tasks/users').subscribe({
      next: (data) => this.allUsers = data || [],
      error: (err) => console.error('Error loading user list:', err)
    });
  }

  get availableUsersToAdd(): any[] {
    const currentMemberUsernames = new Set(this.members.map(m => m.username || m.id));
    return this.allUsers.filter(u => !currentMemberUsernames.has(u.username) && !currentMemberUsernames.has(u.id));
  }

  addUserToGroup() {
    if (!this.selectedUserToAdd) {
      alert('Please select a user to add to this group.');
      return;
    }

    this.http.post(`http://localhost:8082/api/groups/${this.groupId}/members/${this.selectedUserToAdd}`, {}).subscribe({
      next: () => {
        this.memberActionMessage = `User added to ${this.groupData.name || this.groupId} successfully!`;
        this.selectedUserToAdd = '';
        this.loadMembers();
        setTimeout(() => this.memberActionMessage = '', 4000);
      },
      error: (err) => alert('Failed to add user to group: ' + (err.error?.message || err.message))
    });
  }

  removeUserFromGroup(user: any) {
    const username = user.username || user.id;
    const displayName = user.fullName || username;

    if (confirm(`Are you sure you want to remove '${displayName}' from group '${this.groupData.name || this.groupId}'?`)) {
      this.http.delete(`http://localhost:8082/api/groups/${this.groupId}/members/${username}`).subscribe({
        next: () => {
          this.memberActionMessage = `User '${displayName}' removed from group.`;
          this.loadMembers();
          setTimeout(() => this.memberActionMessage = '', 4000);
        },
        error: (err) => alert('Failed to remove user from group: ' + (err.error?.message || err.message))
      });
    }
  }

  updateGroup() {
    if (!this.groupData.name || !this.groupData.type) {
      alert("Name and Type cannot be empty.");
      return;
    }

    this.http.put(`http://localhost:8082/api/groups/${this.groupId}`, this.groupData).subscribe({
      next: () => {
        this.successMessage = 'Group updated successfully!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => alert('Error updating group.')
    });
  }

  deleteGroup() {
    if (confirm(`CRITICAL WARNING:\nAre you sure you want to permanently delete the group: ${this.groupData.name}?`)) {
      this.http.delete(`http://localhost:8082/api/groups/${this.groupId}`).subscribe({
        next: () => {
          alert('Group deleted.');
          this.router.navigate(['/admin/groups']);
        },
        error: () => alert('Failed to delete group.')
      });
    }
  }
}