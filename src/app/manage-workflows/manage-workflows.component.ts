import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

// Only using the PrimeNG modules that are proven to compile in this environment
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-manage-workflows',
  standalone: true,
  imports: [
    CommonModule, FormsModule, TableModule, ButtonModule, DialogModule, TagModule
  ],
  templateUrl: './manage-workflows.component.html',
  styleUrls: ['./manage-workflows.component.css']
})
export class ManageWorkflowsComponent implements OnInit {
  activeView: 'USER_WORKFLOW' | 'WORKFLOW_USER' | 'TASK_USER' = 'USER_WORKFLOW';

  users: any[] = [];
  workflows: any[] = [];
  userWorkflowsMap: { [userId: string]: string[] } = {};
  workflowUserCounts: { [wfKey: string]: number } = {};
  taskRulesMap: { [taskId: string]: any } = {};

  actionMessage: { type: 'success' | 'error'; text: string } | null = null;
  private messageTimeout: any = null;

  private readonly API_BASE = 'http://localhost:8082/api';

  constructor(private http: HttpClient, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['view']) this.activeView = params['view'];
    });
    this.loadInitialData();
  }

  loadInitialData(): void {
    // 1. Fetch Live Users
    this.http.get<any[]>(`${this.API_BASE}/users`).subscribe({
      next: (data) => this.users = data || [],
      error: (err) => console.error('Failed to load users', err)
    });
    
    // 2. Fetch Live Workflows directly from Camunda
    this.http.get<any[]>(`${this.API_BASE}/assignments/available-workflows`).subscribe({
      next: (data) => this.workflows = data || [],
      error: (err) => console.error('Failed to load workflows', err)
    });

    // 3. Fetch Assignment Summary
    this.refreshSummary();
  }

  refreshSummary(): void {
    this.http.get<any>(`${this.API_BASE}/assignments/summary`).subscribe({
      next: (summary) => {
        this.userWorkflowsMap = summary?.userWorkflows || {};
        this.workflowUserCounts = summary?.workflowUserCounts || {};
      },
      error: (err) => console.error('Failed to load summary', err)
    });
  }

  getWorkflowKey(wf: any): string {
    if (!wf) return '';
    if (typeof wf === 'string') {
      return wf.includes(':') ? wf.split(':')[0] : wf;
    }
    if (wf.key) return wf.key;
    if (wf.id && wf.id.includes(':')) return wf.id.split(':')[0];
    return wf.id || '';
  }

  getUserAssignedWorkflows(userId: string): any[] {
    const keys = this.userWorkflowsMap[userId] || [];
    const keySet = new Set(keys);
    return this.workflows.filter(w => {
      const wk = this.getWorkflowKey(w);
      return keySet.has(wk) || keySet.has(w.id) || keySet.has(w.key);
    });
  }

  getUserAssignedCount(userId: string): number {
    return (this.userWorkflowsMap[userId] || []).length;
  }

  getWorkflowUserCount(wf: any): number {
    const key = this.getWorkflowKey(wf);
    return this.workflowUserCounts[key] || 0;
  }

  showMessage(type: 'success' | 'error', text: string): void {
    if (this.messageTimeout) clearTimeout(this.messageTimeout);
    this.actionMessage = { type, text };
    this.messageTimeout = setTimeout(() => {
      this.actionMessage = null;
    }, 4000);
  }

  // ==========================================
  // VIEW 1: Assign Workflows For User
  // ==========================================
  displayUserWorkflowModal = false;
  selectedUser: any = null;
  selectedWorkflowKeys: Set<string> = new Set<string>();

  openUserWorkflowModal(user: any): void {
    this.selectedUser = user;
    this.selectedWorkflowKeys = new Set<string>();

    // Fetch user's current workflow assignments
    this.http.get<any[]>(`${this.API_BASE}/assignments/user/${user.id}/workflows`).subscribe({
      next: (assignments) => {
        const assignedKeys = (assignments || []).map(a => this.getWorkflowKey(a.workflowId));
        this.selectedWorkflowKeys = new Set<string>(assignedKeys);
        this.displayUserWorkflowModal = true;
      },
      error: () => {
        const fallbackKeys = (this.userWorkflowsMap[user.id] || []).map(k => this.getWorkflowKey(k));
        this.selectedWorkflowKeys = new Set<string>(fallbackKeys);
        this.displayUserWorkflowModal = true;
      }
    });
  }

  isWorkflowSelected(wf: any): boolean {
    return this.selectedWorkflowKeys.has(this.getWorkflowKey(wf));
  }

  toggleWorkflow(wf: any): void {
    const key = this.getWorkflowKey(wf);
    if (this.selectedWorkflowKeys.has(key)) {
      this.selectedWorkflowKeys.delete(key);
    } else {
      this.selectedWorkflowKeys.add(key);
    }
  }

  selectAllWorkflows(): void {
    this.workflows.forEach(w => this.selectedWorkflowKeys.add(this.getWorkflowKey(w)));
  }

  clearAllWorkflows(): void {
    this.selectedWorkflowKeys.clear();
  }

  saveUserWorkflows(): void {
    const workflowIds = Array.from(this.selectedWorkflowKeys);
    const payload = { workflowIds };
    this.http.post(`${this.API_BASE}/assignments/user/${this.selectedUser.id}/workflows`, payload).subscribe({
      next: () => {
        this.userWorkflowsMap[this.selectedUser.id] = workflowIds;
        this.refreshSummary();
        this.displayUserWorkflowModal = false;
        this.showMessage('success', `Workflows updated for ${this.selectedUser.fullName || this.selectedUser.username}`);
      },
      error: (err) => {
        this.showMessage('error', 'Failed to save assignments: ' + (err.error?.message || err.message));
      }
    });
  }

  // ==========================================
  // VIEW 2: Assign Users For Workflow
  // ==========================================
  displayWorkflowUserModal = false;
  selectedWorkflow: any = null;
  currentWorkflowUsers: any[] = [];
  newUserToWorkflow: any = null;

  openWorkflowUserModal(workflow: any): void {
    this.selectedWorkflow = workflow;
    this.newUserToWorkflow = null;
    const wfKey = this.getWorkflowKey(workflow);

    this.http.get<any[]>(`${this.API_BASE}/assignments/workflow/${wfKey}/users`).subscribe({
      next: (data) => {
        this.currentWorkflowUsers = data || [];
        this.displayWorkflowUserModal = true;
      },
      error: (err) => {
        console.error('Failed to load workflow users', err);
        this.currentWorkflowUsers = [];
        this.displayWorkflowUserModal = true;
      }
    });
  }

  getAvailableUsersForWorkflow(): any[] {
    const assignedIds = new Set(this.currentWorkflowUsers.map(u => u.userId));
    return this.users.filter(u => !assignedIds.has(u.id));
  }

  removeUserFromWorkflow(userId: string): void {
    const wfKey = this.getWorkflowKey(this.selectedWorkflow);
    this.http.delete(`${this.API_BASE}/assignments/workflow/${wfKey}/users/${userId}`).subscribe({
      next: () => {
        this.currentWorkflowUsers = this.currentWorkflowUsers.filter(u => u.userId !== userId);
        this.refreshSummary();
        this.showMessage('success', 'User removed from workflow successfully');
      },
      error: (err) => {
        this.showMessage('error', 'Failed to remove user: ' + (err.error?.message || err.message));
      }
    });
  }

  addUserToWorkflow(): void {
    if (!this.newUserToWorkflow) return;
    
    if (this.currentWorkflowUsers.find(u => u.userId === this.newUserToWorkflow.id)) {
      this.showMessage('error', 'User is already assigned to this workflow!');
      return;
    }

    const wfKey = this.getWorkflowKey(this.selectedWorkflow);
    const payload = { userId: this.newUserToWorkflow.id };
    this.http.post(`${this.API_BASE}/assignments/workflow/${wfKey}/users`, payload).subscribe({
      next: () => {
        this.http.get<any[]>(`${this.API_BASE}/assignments/workflow/${wfKey}/users`).subscribe(data => {
          this.currentWorkflowUsers = data || [];
        });
        this.newUserToWorkflow = null;
        this.refreshSummary();
        this.showMessage('success', 'User added to workflow successfully');
      },
      error: (err) => {
        this.showMessage('error', 'Failed to assign user: ' + (err.error?.message || err.message));
      }
    });
  }

  // ==========================================
  // VIEW 3: Assign Users To Task
  // ==========================================
  workflowForTasks: any = null;
  tasks: any[] = [];
  displayTaskUserModal = false;
  selectedTask: any = null;
  
  taskAssignmentType: 'STAR' | 'DYNAMIC' | 'SELECT' = 'STAR';
  taskUserToAdd: any = null;

  onWorkflowSelect(): void {
    if (!this.workflowForTasks) {
      this.tasks = [];
      this.taskRulesMap = {};
      return;
    }
    
    const wfKey = this.getWorkflowKey(this.workflowForTasks);
    // Fetch actual tasks from the BPMN file via the backend
    this.http.get<any[]>(`${this.API_BASE}/assignments/available-workflows/${wfKey}/tasks`).subscribe({
      next: (data) => this.tasks = data || [],
      error: (err) => {
        console.error('Failed to load tasks', err);
        this.tasks = [];
      }
    });

    // Fetch existing rules for this workflow
    this.http.get<any[]>(`${this.API_BASE}/assignments/workflow/${wfKey}/rules`).subscribe({
      next: (rules) => {
        this.taskRulesMap = {};
        (rules || []).forEach(r => {
          this.taskRulesMap[r.taskId] = r;
        });
      },
      error: (err) => console.error('Failed to load task rules', err)
    });
  }

  openTaskUserModal(task: any): void {
    this.selectedTask = task;
    const existingRule = this.taskRulesMap[task.id];
    if (existingRule) {
      this.taskAssignmentType = existingRule.assignmentType || 'STAR';
      if (this.taskAssignmentType === 'SELECT' && existingRule.assigneeUserId) {
        this.taskUserToAdd = this.users.find(u => u.id === existingRule.assigneeUserId || u.username === existingRule.assigneeUserId) || null;
      } else {
        this.taskUserToAdd = null;
      }
    } else {
      this.taskAssignmentType = 'STAR';
      this.taskUserToAdd = null;
    }
    this.displayTaskUserModal = true;
  }

  selectStrategy(type: 'STAR' | 'DYNAMIC' | 'SELECT'): void {
    this.taskAssignmentType = type;
  }

  saveTaskRule(): void {
    if (!this.selectedTask || !this.workflowForTasks) return;
    const wfKey = this.getWorkflowKey(this.workflowForTasks);
    const payload: any = {
      assignmentType: this.taskAssignmentType,
      assigneeUserId: this.taskAssignmentType === 'SELECT' ? (this.taskUserToAdd?.id || this.taskUserToAdd?.username) : null
    };

    this.http.post<any>(`${this.API_BASE}/assignments/workflow/${wfKey}/tasks/${this.selectedTask.id}/rules`, payload).subscribe({
      next: (res) => {
        const rawRule = res?.rule || res;
        const rule: any = {
          id: rawRule.id,
          workflowId: wfKey,
          taskId: this.selectedTask.id,
          assignmentType: this.taskAssignmentType,
          assigneeUserId: payload.assigneeUserId
        };
        if (rule.assignmentType === 'SELECT' && this.taskUserToAdd) {
          rule.assigneeFullName = this.taskUserToAdd.fullName;
          rule.assigneeUsername = this.taskUserToAdd.username;
        }
        this.taskRulesMap[this.selectedTask.id] = rule;
        this.displayTaskUserModal = false;
        this.showMessage('success', `Routing strategy configured for "${this.selectedTask.name}"`);
      },
      error: (err) => {
        this.showMessage('error', 'Failed to save rule: ' + (err.error?.message || err.message));
      }
    });
  }

  clearTaskRule(): void {
    if (!this.selectedTask || !this.workflowForTasks) return;
    const wfKey = this.getWorkflowKey(this.workflowForTasks);
    this.http.delete(`${this.API_BASE}/assignments/workflow/${wfKey}/tasks/${this.selectedTask.id}/rules`).subscribe({
      next: () => {
        delete this.taskRulesMap[this.selectedTask.id];
        this.displayTaskUserModal = false;
        this.showMessage('success', `Routing rule cleared for "${this.selectedTask.name}"`);
      },
      error: (err) => {
        this.showMessage('error', 'Failed to clear rule: ' + (err.error?.message || err.message));
      }
    });
  }
}