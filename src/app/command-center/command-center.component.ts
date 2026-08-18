import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG UI Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { RadioButtonModule } from 'primeng/radiobutton';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-command-center',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    TableModule, 
    ButtonModule, 
    DialogModule, 
    SelectModule, 
    RadioButtonModule,
    TagModule
  ],
  templateUrl: './command-center.component.html',
  styleUrls: ['./command-center.component.css']
})
export class CommandCenterComponent implements OnInit {
  
  // Data Arrays
  assignedTasks: any[] = [];
  unassignedTasks: any[] = [];
  users: any[] = [];
  groups: any[] = [];
  
  // UI State
  activeTab: 'ASSIGNED' | 'UNASSIGNED' = 'UNASSIGNED';
  loading = true;

  // Assignment Modal State
  displayAssignModal = false;
  selectedTask: any = null;
  assignmentMethod: 'USER' | 'GROUP' | 'AUTO' = 'USER';
  selectedUser: any = null;
  selectedGroup: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadTasks();
    this.loadUsersAndGroups();
  }

  // --- DATA FETCHING ---
  
  loadTasks(): void {
    this.loading = true;
    
    // Fetch Unassigned Tasks (The Pool)
    this.http.get<any[]>('http://localhost:8082/api/tasks/unassigned').subscribe({
      next: (data) => this.unassignedTasks = data || [],
      error: (err) => console.error('Failed to load unassigned tasks', err)
    });

    // Fetch Assigned Tasks (System-wide overview for admins)
    // Note: You will need an admin endpoint for this in Spring Boot, but we can reuse the generic one for now
    this.http.get<any[]>('http://localhost:8082/api/tasks?userId=all').subscribe({
      next: (data) => {
        this.assignedTasks = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load assigned tasks', err);
        this.loading = false;
      }
    });
  }

  loadUsersAndGroups(): void {
    this.http.get<any[]>('http://localhost:8082/api/users').subscribe(data => this.users = data);
    this.http.get<any[]>('http://localhost:8082/api/groups').subscribe(data => this.groups = data);
  }

  // --- MODAL CONTROLS & EXECUTION ---

  openAssignModal(task: any): void {
    this.selectedTask = task;
    this.assignmentMethod = 'USER'; // Default
    this.selectedUser = null;
    this.selectedGroup = null;
    this.displayAssignModal = true;
  }

  confirmAssignment(): void {
    if (!this.selectedTask) return;

    let payload = {};

    if (this.assignmentMethod === 'USER') {
      if (!this.selectedUser) return; // Prevent submitting empty user
      payload = { userId: this.selectedUser.id };
    } 
    else if (this.assignmentMethod === 'GROUP') {
      // For now, we simulate returning it to the general group pool
      payload = { groupId: 'general_queue' };
    } 
    else if (this.assignmentMethod === 'AUTO') {
      payload = { autoDispatch: true };
    }

    // Fire the command to Spring Boot!
    this.http.post(`http://localhost:8082/api/tasks/${this.selectedTask.id}/assign`, payload).subscribe({
      next: () => {
        this.displayAssignModal = false;
        this.loadTasks(); // Instantly refresh the tables to show the update!
      },
      error: (err) => {
        console.error('Dispatch failed', err);
        alert('Failed to dispatch task. Check backend logs.');
      }
    });
  }
}