import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-task-dispatcher',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './task-dispatcher.component.html',
  styleUrls: ['./task-dispatcher.component.css']
})
export class TaskDispatcherComponent implements OnInit {
  activeTab: 'unassigned' | 'global' = 'unassigned';
  tasks: any[] = [];
  users: any[] = [];
  loading = true;

  // Assignment Modal State
  showModal = false;
  selectedTaskId = '';
  selectedTaskName = '';
  targetUserId = '';

  constructor(private http: HttpClient, public authService: AuthService) {}

  ngOnInit(): void {
    this.loadUsers();
    this.switchTab('unassigned');
  }

  // Load user dictionary once for the dropdown
  loadUsers(): void {
    this.http.get<any[]>('http://localhost:8082/api/tasks/users').subscribe({
      next: (data) => this.users = data,
      error: () => console.error('Failed to load user list')
    });
  }

  switchTab(tab: 'unassigned' | 'global'): void {
    this.activeTab = tab;
    this.loading = true;
    
    if (tab === 'unassigned') {
      // Fetch tasks waiting in candidate group holding pools
      this.http.get<any[]>('http://localhost:8082/api/tasks/unassigned').subscribe({
        next: (data) => { this.tasks = data; this.loading = false; },
        error: () => this.loading = false
      });
    } else {
      // Fetch ALL active tasks across the company (isAdmin = true)
      this.http.get<any[]>(`http://localhost:8082/api/tasks/my-tasks?userId=admin&isAdmin=true`).subscribe({
        next: (data) => { this.tasks = data; this.loading = false; },
        error: () => this.loading = false
      });
    }
  }

  openAssignModal(task: any): void {
    this.selectedTaskId = task.id;
    this.selectedTaskName = task.name;
    this.targetUserId = task.assignee || ''; // Default to current owner if reassigning
    this.showModal = true;
  }

  confirmAssignment(): void {
    if (!this.targetUserId) {
      if (!confirm('No user selected. This will UNASSIGN the task and return it to the group pool. Continue?')) {
        return;
      }
    }

    this.http.post(`http://localhost:8082/api/tasks/${this.selectedTaskId}/assign`, { userId: this.targetUserId })
      .subscribe({
        next: () => {
          this.showModal = false;
          this.switchTab(this.activeTab); // Refresh current table
        },
        error: (err) => alert('Assignment failed: ' + err.error?.message)
      });
  }
}