import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-workflow-assignment',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './workflow-assignment.component.html',
  styleUrls: ['./workflow-assignment.component.css']
})
export class WorkflowAssignmentComponent implements OnInit {

  // ─── Active Tab ───────────────────────────────────────────────────────────
  activeTab: 'authorizations' | 'routing' = 'authorizations';

  // ─── Shared Data ──────────────────────────────────────────────────────────
  workflows: any[]  = [];
  users: any[]      = [];
  groups: any[]     = [];
  toast: { type: 'success' | 'error'; msg: string } | null = null;
  private toastTimer: any;

  // ─── Tab 1: Workflow Authorizations (Assign Groups & Users) ────────────────
  selectedAuthWorkflow: any     = null;
  workflowAuthorizations: any[] = [];
  authLoading                   = false;

  // Add user modal
  showAddUserModal              = false;
  authUserToAdd: any            = null;

  // Add group modal
  showAddGroupModal             = false;
  authGroupToAdd: any           = null;

  // ─── Tab 2: Task Routing Rules ────────────────────────────────────────────
  selectedRoutingWorkflow: any  = null;
  workflowTasks: any[]          = [];
  taskRulesMap: { [taskId: string]: any } = {};
  tasksLoading                  = false;

  // Rule editor modal
  showRuleModal                 = false;
  editingTask: any              = null;
  ruleType: string              = 'STAR';
  ruleTargetUser: any           = null;
  ruleTargetGroup: any          = null;
  ruleSubmitting                = false;

  private readonly API = 'http://localhost:8082/api/assignments';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAll();
  }

  // ─── LOADERS ──────────────────────────────────────────────────────────────

  loadAll(): void {
    // 1. Fetch available workflows from Camunda
    this.http.get<any[]>(`${this.API}/available-workflows`).subscribe({
      next: d => this.workflows = d || [],
      error: err => console.error('Failed to load workflows', err)
    });

    // 2. Fetch active users from custom MySQL DB
    this.http.get<any[]>(`${this.API}/users`).subscribe({
      next: d => this.users = d || [],
      error: err => console.error('Failed to load users', err)
    });

    // 3. Fetch groups pool (from existing group management at /admin/groups)
    this.http.get<any[]>(`${this.API}/groups`).subscribe({
      next: d => this.groups = d || [],
      error: err => console.error('Failed to load groups pool', err)
    });
  }

  showToast(type: 'success' | 'error', msg: string): void {
    clearTimeout(this.toastTimer);
    this.toast = { type, msg };
    this.toastTimer = setTimeout(() => this.toast = null, 4000);
  }

  getWorkflowKey(wf: any): string {
    if (!wf) return '';
    if (wf.key) return wf.key;
    if (wf.id?.includes(':')) return wf.id.split(':')[0];
    return wf.id || '';
  }

  // ─── TAB 1: WORKFLOW AUTHORIZATIONS ───────────────────────────────────────

  onAuthWorkflowChange(): void {
    if (!this.selectedAuthWorkflow) {
      this.workflowAuthorizations = [];
      return;
    }
    this.authLoading = true;
    const key = this.getWorkflowKey(this.selectedAuthWorkflow);
    this.http.get<any[]>(`${this.API}/workflow/${key}/authorizations`).subscribe({
      next: d => {
        this.workflowAuthorizations = d || [];
        this.authLoading = false;
      },
      error: err => {
        console.error('Failed to load authorizations', err);
        this.authLoading = false;
        this.showToast('error', 'Failed to load authorizations');
      }
    });
  }

  // ── Add User Authorization ──

  openAddUserModal(): void {
    this.authUserToAdd = null;
    this.showAddUserModal = true;
  }

  confirmAddUser(): void {
    if (!this.authUserToAdd || !this.selectedAuthWorkflow) return;
    const key = this.getWorkflowKey(this.selectedAuthWorkflow);
    this.http.post(`${this.API}/workflow/${key}/authorizations/user`, { userId: this.authUserToAdd.id }).subscribe({
      next: () => {
        this.showAddUserModal = false;
        this.onAuthWorkflowChange();
        this.showToast('success', `User "${this.authUserToAdd.fullName || this.authUserToAdd.username}" assigned to workflow`);
      },
      error: err => this.showToast('error', err.error?.error || 'Failed to assign user')
    });
  }

  // ── Add Group Authorization ──

  openAddGroupModal(): void {
    this.authGroupToAdd = null;
    this.showAddGroupModal = true;
  }

  confirmAddGroup(): void {
    if (!this.authGroupToAdd || !this.selectedAuthWorkflow) return;
    const key = this.getWorkflowKey(this.selectedAuthWorkflow);
    this.http.post(`${this.API}/workflow/${key}/authorizations/group`, { groupId: this.authGroupToAdd.id }).subscribe({
      next: () => {
        this.showAddGroupModal = false;
        this.onAuthWorkflowChange();
        this.showToast('success', `Group "${this.authGroupToAdd.name || this.authGroupToAdd.id}" assigned to workflow`);
      },
      error: err => this.showToast('error', err.error?.error || 'Failed to assign group')
    });
  }

  // ── Remove Authorization ──

  revokeAuthorization(auth: any): void {
    if (!this.selectedAuthWorkflow) return;
    const key = this.getWorkflowKey(this.selectedAuthWorkflow);

    let url: string;
    if (auth.type === 'USER') {
      url = `${this.API}/workflow/${key}/authorizations/user/${auth.userId}`;
    } else {
      url = `${this.API}/workflow/${key}/authorizations/group/${auth.groupId}`;
    }

    this.http.delete(url).subscribe({
      next: () => {
        this.workflowAuthorizations = this.workflowAuthorizations.filter(a => a.id !== auth.id);
        this.showToast('success', 'Authorization revoked successfully');
      },
      error: err => this.showToast('error', err.error?.error || 'Failed to revoke authorization')
    });
  }

  // ─── TAB 2: TASK ROUTING RULES ────────────────────────────────────────────

  onRoutingWorkflowChange(): void {
    if (!this.selectedRoutingWorkflow) {
      this.workflowTasks = [];
      this.taskRulesMap = {};
      return;
    }
    this.tasksLoading = true;
    const key = this.getWorkflowKey(this.selectedRoutingWorkflow);

    this.http.get<any[]>(`${this.API}/available-workflows/${key}/tasks`).subscribe({
      next: tasks => {
        this.workflowTasks = tasks || [];
        this.tasksLoading = false;
      },
      error: () => this.tasksLoading = false
    });

    this.http.get<any[]>(`${this.API}/workflow/${key}/rules`).subscribe({
      next: rules => {
        this.taskRulesMap = {};
        (rules || []).forEach(r => this.taskRulesMap[r.taskId] = r);
      }
    });
  }

  openRuleModal(task: any): void {
    this.editingTask = task;
    const existing = this.taskRulesMap[task.id];
    if (existing) {
      this.ruleType = existing.routingType || 'STAR';
      this.ruleTargetUser  = existing.routingType === 'SELECT_USER'
          ? this.users.find(u => u.id === existing.targetUserId || u.username === existing.targetUserId) || null
          : null;
      this.ruleTargetGroup = existing.routingType === 'SELECT_GROUP'
          ? this.groups.find(g => g.id === existing.targetGroupId) || null
          : null;
    } else {
      this.ruleType = 'STAR';
      this.ruleTargetUser = null;
      this.ruleTargetGroup = null;
    }
    this.showRuleModal = true;
  }

  saveRule(): void {
    if (!this.editingTask || !this.selectedRoutingWorkflow) return;
    const key = this.getWorkflowKey(this.selectedRoutingWorkflow);

    const payload: any = { routingType: this.ruleType };
    if (this.ruleType === 'SELECT_USER')  payload.targetUserId  = this.ruleTargetUser?.id;
    if (this.ruleType === 'SELECT_GROUP') payload.targetGroupId = this.ruleTargetGroup?.id;

    if (this.ruleType === 'SELECT_USER'  && !payload.targetUserId)  {
      this.showToast('error', 'Please select a user');
      return;
    }
    if (this.ruleType === 'SELECT_GROUP' && !payload.targetGroupId) {
      this.showToast('error', 'Please select a group');
      return;
    }

    this.ruleSubmitting = true;
    this.http.post<any>(`${this.API}/workflow/${key}/tasks/${this.editingTask.id}/rules`, payload).subscribe({
      next: res => {
        this.taskRulesMap[this.editingTask.id] = res.rule || res;
        this.showRuleModal = false;
        this.ruleSubmitting = false;
        this.showToast('success', `Routing rule saved for "${this.editingTask.name}"`);
      },
      error: err => {
        this.ruleSubmitting = false;
        this.showToast('error', err.error?.error || 'Failed to save rule');
      }
    });
  }

  clearRule(): void {
    if (!this.editingTask || !this.selectedRoutingWorkflow) return;
    const key = this.getWorkflowKey(this.selectedRoutingWorkflow);
    this.http.delete(`${this.API}/workflow/${key}/tasks/${this.editingTask.id}/rules`).subscribe({
      next: () => {
        delete this.taskRulesMap[this.editingTask.id];
        this.showRuleModal = false;
        this.showToast('success', `Routing rule cleared for "${this.editingTask.name}"`);
      },
      error: err => this.showToast('error', err.error?.error || 'Failed to clear rule')
    });
  }

  getRoutingBadgeClass(type: string): string {
    switch (type) {
      case 'STAR':         return 'badge-star';
      case 'DYNAMIC_USER': return 'badge-dynamic';
      case 'SELECT_USER':  return 'badge-user';
      case 'SELECT_GROUP': return 'badge-group';
      default: return 'badge-none';
    }
  }

  getRoutingLabel(type: string): string {
    switch (type) {
      case 'STAR':         return '★ Started user (Initiator)';
      case 'DYNAMIC_USER': return '⚡ Load Balance';
      case 'SELECT_USER':  return '👤 Specific User';
      case 'SELECT_GROUP': return '👥 Group Pool';
      default: return 'Unrouted';
    }
  }

  getAlreadyAuthorizedUserIds(): Set<string> {
    return new Set(this.workflowAuthorizations.filter(a => a.type === 'USER').map(a => a.userId));
  }

  getAlreadyAuthorizedGroupIds(): Set<string> {
    return new Set(this.workflowAuthorizations.filter(a => a.type === 'GROUP').map(a => a.groupId));
  }

  getAvailableUsers(): any[] {
    const authIds = this.getAlreadyAuthorizedUserIds();
    return this.users.filter(u => !authIds.has(u.id));
  }

  getAvailableGroups(): any[] {
    const authIds = this.getAlreadyAuthorizedGroupIds();
    return this.groups.filter(g => !authIds.has(g.id));
  }
}
