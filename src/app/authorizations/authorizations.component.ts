import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthorizationService } from './authorization.service';

@Component({
  selector: 'app-authorizations',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './authorizations.component.html',
  styleUrls: ['./authorizations.component.css']
})
export class AuthorizationsComponent implements OnInit {
  // The 19 independent sections matching your Spring Boot API endpoints
  sections = [
    { key: 'application', name: 'Application', defaultPerms: 'ACCESS' },
    { key: 'authorization', name: 'Authorization', defaultPerms: 'ALL' },
    { key: 'batch', name: 'Batch', defaultPerms: 'ALL' },
    { key: 'decision-definition', name: 'Decision Definition', defaultPerms: 'READ, ALL' },
    { key: 'decision-requirements-definition', name: 'Decision Requirements', defaultPerms: 'READ' },
    { key: 'deployment', name: 'Deployment', defaultPerms: 'READ, CREATE' },
    { key: 'filter', name: 'Filter', defaultPerms: 'READ, ALL' },
    { key: 'group', name: 'Group', defaultPerms: 'READ, ALL' },
    { key: 'group-membership', name: 'Group Membership', defaultPerms: 'CREATE, DELETE' },
    { key: 'historic-process-instance', name: 'Historic Process Instance', defaultPerms: 'READ' },
    { key: 'historic-task-instance', name: 'Historic Task Instance', defaultPerms: 'READ' },
    { key: 'operation-log', name: 'Operation Log', defaultPerms: 'READ' },
    { key: 'process-definition', name: 'Process Definition', defaultPerms: 'READ, CREATE_INSTANCE' },
    { key: 'process-instance', name: 'Process Instance', defaultPerms: 'READ, UPDATE' },
    { key: 'system', name: 'System', defaultPerms: 'SYSTEM' },
    { key: 'task', name: 'Task', defaultPerms: 'READ, TASK_WORK' },
    { key: 'tenant', name: 'Tenant', defaultPerms: 'READ, ALL' },
    { key: 'tenant-membership', name: 'Tenant Membership', defaultPerms: 'CREATE, DELETE' },
    { key: 'user', name: 'User', defaultPerms: 'READ, ALL' }
  ];

  activeSection = this.sections[0]; // Default to 'application'
  authorizations: any[] = [];
  
  // Modal State
  showModal = false;
  isEditMode = false;
  editingId = '';

  formData = {
    type: 1,
    permissionsStr: 'ACCESS',
    userId: '',
    groupId: '',
    resourceId: '*'
  };

  constructor(private authService: AuthorizationService) {}

  ngOnInit() {
    this.selectSection(this.sections[0]);
  }

  // Switch tabs and load data from that specific section API
  selectSection(section: any) {
    this.activeSection = section;
    this.loadData();
  }

  loadData() {
    this.authService.getAuthorizations(this.activeSection.key).subscribe({
      next: (data: any[]) => this.authorizations = data, // ADDED : any[]
      error: (err: any) => {                             // ADDED : any
        console.error(err);
        alert(`Failed to load data from /api/authorizations/${this.activeSection.key}`);
      }
    });
  }

  openCreateModal() {
    this.isEditMode = false;
    this.editingId = '';
    this.formData = {
      type: 1,
      permissionsStr: this.activeSection.defaultPerms,
      userId: '',
      groupId: '',
      resourceId: '*'
    };
    this.showModal = true;
  }

  openEditModal(auth: any) {
    this.isEditMode = true;
    this.editingId = auth.id;
    this.formData = {
      type: auth.type,
      permissionsStr: auth.permissions ? auth.permissions.join(', ') : this.activeSection.defaultPerms,
      userId: auth.userId || '',
      groupId: auth.groupId || '',
      resourceId: auth.resourceId || '*'
    };
    this.showModal = true;
  }

  save() {
    if (!this.formData.userId && !this.formData.groupId) {
      alert('Please specify either a User ID or a Group ID.');
      return;
    }

    const perms = this.formData.permissionsStr
      .split(',')
      .map(p => p.trim().toUpperCase())
      .filter(p => p.length > 0);

    const payload = {
      type: Number(this.formData.type),
      permissions: perms.length > 0 ? perms : ['ALL'],
      resourceId: this.formData.resourceId || '*',
      userId: this.formData.userId || null,
      groupId: this.formData.groupId || null
    };

    if (this.isEditMode) {
      this.authService.updateAuthorization(this.activeSection.key, this.editingId, payload).subscribe({
        next: () => {
          this.showModal = false;
          this.loadData();
        },
        error: (err: any) => alert(`Update failed: ${err.error?.message || 'Check console'}`) // ADDED : any
      });
    } else {
      this.authService.createAuthorization(this.activeSection.key, payload).subscribe({
        next: () => {
          this.showModal = false;
          this.loadData();
        },
        error: (err: any) => alert(`Create failed: ${err.error?.message || 'Check console'}`) // ADDED : any
      });
    }
  }

  deleteAuth(id: string) {
    if (confirm(`Permanently delete this rule from ${this.activeSection.name}?`)) {
      // Calls DELETE /api/authorizations/{section}/{id}
      this.authService.deleteAuthorization(this.activeSection.key, id).subscribe({
        next: () => this.loadData(),
        error: () => alert('Delete failed.')
      });
    }
  }
}