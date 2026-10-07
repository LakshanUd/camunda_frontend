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

  // ─── Shared Datasets ───────────────────────────────────────────────────────
  workflows: any[]  = [];
  users: any[]      = [];
  groups: any[]     = [];
  toast: { type: 'success' | 'error'; msg: string } | null = null;
  private toastTimer: any;

  // ─── Unified Selected Workflow ─────────────────────────────────────────────
  selectedWorkflow: any         = null;
  workflowAuthorizations: any[] = [];
  authLoading                   = false;

  // ─── Inline Access Grant (No Modals) ───────────────────────────────────────
  addEntityType: 'USER' | 'GROUP' = 'USER';
  selectedUserToAdd: any        = null;
  selectedGroupToAdd: any       = null;
  grantingAccess                = false;

  // ─── Task Routing Rules Pipeline ───────────────────────────────────────────
  workflowTasks: any[]          = [];
  taskRulesMap: { [taskId: string]: any } = {};
  tasksLoading                  = false;

  // ─── Slide-Over Routing Drawer (No Popups) ─────────────────────────────────
  showRuleDrawer                = false;
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

  // ─── LOAD INITIAL DATA ─────────────────────────────────────────────────────

  loadAll(): void {
    // 1. Fetch available workflows from Camunda
    this.http.get<any[]>(`${this.API}/available-workflows`).subscribe({
      next: d => {
        this.workflows = d || [];
        // Auto-select first workflow if available
        if (this.workflows.length > 0 && !this.selectedWorkflow) {
          this.onWorkflowSelect(this.workflows[0]);
        }
      },
      error: err => console.error('Failed to load workflows', err)
    });

    // 2. Fetch active users
    this.http.get<any[]>(`${this.API}/users`).subscribe({
      next: d => this.users = d || [],
      error: err => console.error('Failed to load users', err)
    });

    // 3. Fetch groups pool
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

  // ─── UNIFIED WORKFLOW SELECTION ───────────────────────────────────────────

  onWorkflowSelect(wf: any): void {
    this.selectedWorkflow = wf;
    this.selectedUserToAdd = null;
    this.selectedGroupToAdd = null;
    this.showRuleDrawer = false;

    if (!wf) {
      this.workflowAuthorizations = [];
      this.workflowTasks = [];
      this.taskRulesMap = {};
      return;
    }

    const key = this.getWorkflowKey(wf);
    this.loadAuthorizations(key);
    this.loadTasksAndRules(key);
  }

  loadAuthorizations(key: string): void {
    this.authLoading = true;
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

  loadTasksAndRules(key: string): void {
    this.tasksLoading = true;
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

  // ─── INLINE ACCESS GRANT (NO POPUPS) ──────────────────────────────────────

  grantAccessInline(): void {
    if (!this.selectedWorkflow) return;
    const key = this.getWorkflowKey(this.selectedWorkflow);

    if (this.addEntityType === 'USER') {
      if (!this.selectedUserToAdd) {
        this.showToast('error', 'Please select a user to grant access');
        return;
      }
      this.grantingAccess = true;
      this.http.post(`${this.API}/workflow/${key}/authorizations/user`, { userId: this.selectedUserToAdd.id }).subscribe({
        next: () => {
          this.grantingAccess = false;
          const addedName = this.selectedUserToAdd.fullName || this.selectedUserToAdd.username;
          this.selectedUserToAdd = null;
          this.loadAuthorizations(key);
          this.showToast('success', `Access granted to user "${addedName}"`);
        },
        error: err => {
          this.grantingAccess = false;
          this.showToast('error', err.error?.error || 'Failed to grant user access');
        }
      });
    } else {
      if (!this.selectedGroupToAdd) {
        this.showToast('error', 'Please select a group to grant access');
        return;
      }
      this.grantingAccess = true;
      this.http.post(`${this.API}/workflow/${key}/authorizations/group`, { groupId: this.selectedGroupToAdd.id }).subscribe({
        next: () => {
          this.grantingAccess = false;
          const addedGroup = this.selectedGroupToAdd.name || this.selectedGroupToAdd.id;
          this.selectedGroupToAdd = null;
          this.loadAuthorizations(key);
          this.showToast('success', `Access granted to group "${addedGroup}"`);
        },
        error: err => {
          this.grantingAccess = false;
          this.showToast('error', err.error?.error || 'Failed to grant group access');
        }
      });
    }
  }

  revokeAuthorization(auth: any): void {
    if (!this.selectedWorkflow) return;
    const key = this.getWorkflowKey(this.selectedWorkflow);

    let url: string;
    if (auth.type === 'USER') {
      url = `${this.API}/workflow/${key}/authorizations/user/${auth.userId}`;
    } else {
      url = `${this.API}/workflow/${key}/authorizations/group/${auth.groupId}`;
    }

    this.http.delete(url).subscribe({
      next: () => {
        this.workflowAuthorizations = this.workflowAuthorizations.filter(a => a.id !== auth.id);
        this.showToast('success', 'Access revoked successfully');
      },
      error: err => this.showToast('error', err.error?.error || 'Failed to revoke authorization')
    });
  }

  // ─── SLIDE-OVER ROUTING DRAWER ─────────────────────────────────────────────

  openRuleDrawer(task: any): void {
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
    this.showRuleDrawer = true;
  }

  closeRuleDrawer(): void {
    this.showRuleDrawer = false;
    this.editingTask = null;
  }

  saveRule(): void {
    if (!this.editingTask || !this.selectedWorkflow) return;
    const key = this.getWorkflowKey(this.selectedWorkflow);

    const payload: any = { routingType: this.ruleType };
    if (this.ruleType === 'SELECT_USER')  payload.targetUserId  = this.ruleTargetUser?.id;
    if (this.ruleType === 'SELECT_GROUP') payload.targetGroupId = this.ruleTargetGroup?.id;

    if (this.ruleType === 'SELECT_USER'  && !payload.targetUserId)  {
      this.showToast('error', 'Please select a specific user');
      return;
    }
    if (this.ruleType === 'SELECT_GROUP' && !payload.targetGroupId) {
      this.showToast('error', 'Please select a candidate group');
      return;
    }

    this.ruleSubmitting = true;
    this.http.post<any>(`${this.API}/workflow/${key}/tasks/${this.editingTask.id}/rules`, payload).subscribe({
      next: res => {
        this.taskRulesMap[this.editingTask.id] = res.rule || res;
        this.closeRuleDrawer();
        this.ruleSubmitting = false;
        this.showToast('success', `Routing rule saved for "${this.editingTask.name || this.editingTask.id}"`);
      },
      error: err => {
        this.ruleSubmitting = false;
        this.showToast('error', err.error?.error || 'Failed to save rule');
      }
    });
  }

  clearRule(): void {
    if (!this.editingTask || !this.selectedWorkflow) return;
    const key = this.getWorkflowKey(this.selectedWorkflow);
    this.http.delete(`${this.API}/workflow/${key}/tasks/${this.editingTask.id}/rules`).subscribe({
      next: () => {
        delete this.taskRulesMap[this.editingTask.id];
        this.closeRuleDrawer();
        this.showToast('success', `Routing rule cleared for "${this.editingTask.name || this.editingTask.id}"`);
      },
      error: err => this.showToast('error', err.error?.error || 'Failed to clear rule')
    });
  }

  getAuthDisplayName(auth: any): string {
    if (auth.type === 'USER') {
      if (auth.username) return auth.username;
      const found = this.users.find(u => u.id === auth.userId || u.username === auth.userId);
      return found ? found.username : (auth.userId || 'User');
    } else {
      return auth.groupName || auth.groupId || 'Group';
    }
  }

  getAuthDisplayFullName(auth: any): string {
    if (auth.type === 'USER') {
      if (auth.fullName) return auth.fullName;
      const found = this.users.find(u => u.id === auth.userId || u.username === auth.userId);
      return found ? found.fullName : '';
    }
    return '';
  }

  getAssignedTargetUser(rule: any): string {
    if (!rule || !rule.targetUserId) return '';
    if (rule.targetUsername) return rule.targetUsername;
    const found = this.users.find(u => u.id === rule.targetUserId || u.username === rule.targetUserId);
    return found ? found.username : rule.targetUserId;
  }

  getAssignedTargetGroup(rule: any): string {
    if (!rule || !rule.targetGroupId) return '';
    if (rule.targetGroupName) return rule.targetGroupName;
    const found = this.groups.find(g => g.id === rule.targetGroupId || g.name === rule.targetGroupId);
    return found ? (found.name || found.id) : rule.targetGroupId;
  }

  getRoutingBadgeClass(type: string): string {
    switch (type) {
      case 'STAR':         return 'badge-blue';
      case 'DYNAMIC_USER': return 'badge-warning';
      case 'SELECT_USER':  return 'badge-success';
      case 'SELECT_GROUP': return 'badge-neutral';
      default: return 'badge-neutral';
    }
  }

  getRoutingLabel(type: string): string {
    switch (type) {
      case 'STAR':         return 'Started user (Initiator)';
      case 'DYNAMIC_USER': return 'Load Balance';
      case 'SELECT_USER':  return 'Specific User';
      case 'SELECT_GROUP': return 'Group Pool';
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
