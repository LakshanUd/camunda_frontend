import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { Form } from '@bpmn-io/form-js';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './my-tasks.component.html',
  styleUrls: ['./my-tasks.component.css']
})
export class MyTasksComponent implements OnInit {
  tasks: any[] = [];
  users: any[] = [];
  loading = true;
  activeFilter: 'ALL' | 'DIRECT' | 'GROUP' = 'ALL';

  // Task Completion Modal State
  showCompleteModal = false;
  selectedTaskId = '';
  selectedTaskName = '';
  submitting = false;
  
  // Native Camunda Form State
  formInstance: any = null;
  loadingForm = false;
  hasFormSchema = true;

  constructor(private http: HttpClient, public authService: AuthService) {}

  ngOnInit(): void {
    this.loadMyTasks();
    this.loadUsers();
  }

  loadMyTasks(): void {
    this.loading = true;
    const username = this.authService.getCurrentUsername();
    this.http.get<any[]>(`http://localhost:8082/api/tasks/my-tasks?userId=${username}`)
      .subscribe({
        next: (data) => {
          this.tasks = data || [];
          this.loading = false;
        },
        error: (err) => {
          console.error('Error fetching tasks:', err);
          this.loading = false;
        }
      });
  }

  loadUsers(): void {
    this.http.get<any[]>('http://localhost:8082/api/tasks/users').subscribe({
      next: (data) => this.users = data || [],
      error: () => console.error('Failed to load user list')
    });
  }

  get filteredTasks(): any[] {
    const currentUsername = this.authService.getCurrentUsername();
    if (this.activeFilter === 'DIRECT') {
      return this.tasks.filter(t => t.assignee && (t.assignee === currentUsername || t.assignee === this.authService.getCurrentUserId()));
    }
    if (this.activeFilter === 'GROUP') {
      return this.tasks.filter(t => !t.assignee && t.candidateGroup);
    }
    return this.tasks;
  }

  get directTasksCount(): number {
    const currentUsername = this.authService.getCurrentUsername();
    return this.tasks.filter(t => t.assignee && (t.assignee === currentUsername || t.assignee === this.authService.getCurrentUserId())).length;
  }

  get groupTasksCount(): number {
    return this.tasks.filter(t => !t.assignee && t.candidateGroup).length;
  }

  isDirectlyAssigned(task: any): boolean {
    const currentUsername = this.authService.getCurrentUsername();
    return !!task.assignee && (task.assignee === currentUsername || task.assignee === this.authService.getCurrentUserId());
  }

  canUnclaim(task: any): boolean {
    return this.isDirectlyAssigned(task) && !!(task.candidateGroup || (task.candidateGroups && task.candidateGroups.length > 0));
  }

  claimTask(task: any, event?: Event): void {
    if (event) event.stopPropagation();
    const currentUsername = this.authService.getCurrentUsername();
    this.http.post(`http://localhost:8082/api/tasks/${task.id}/claim`, { userId: currentUsername }).subscribe({
      next: () => {
        task.assignee = currentUsername;
        task.assigneeName = currentUsername;
        this.loadMyTasks();
      },
      error: (err) => alert('Failed to claim task: ' + (err.error?.message || err.message))
    });
  }

  unclaimTask(task: any, event?: Event): void {
    if (event) event.stopPropagation();
    const groupId = task.candidateGroup || (task.candidateGroups && task.candidateGroups.length > 0 ? task.candidateGroups[0] : null);

    this.http.post(`http://localhost:8082/api/tasks/${task.id}/unclaim`, { groupId: groupId }).subscribe({
      next: () => {
        this.loadMyTasks();
      },
      error: (err) => alert('Failed to unclaim task: ' + (err.error?.message || err.message))
    });
  }

  openCompleteModal(task: any): void {
    this.selectedTaskId = task.id;
    this.selectedTaskName = task.name || task.taskDefinitionKey || task.id;
    this.showCompleteModal = true;
    this.loadingForm = true;
    this.hasFormSchema = true;
    this.submitting = false;

    // Fetch BOTH the deployed JSON Form Schema AND existing task variables
    this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/deployed-form`).subscribe({
      next: (schema) => {
        this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/variables`).subscribe({
          next: (vars) => {
            const initialData: any = {};
            Object.keys(vars || {}).forEach(k => initialData[k] = vars[k].value);
            setTimeout(() => this.renderNativeForm(schema, initialData), 100);
          },
          error: () => setTimeout(() => this.renderNativeForm(schema, {}), 100)
        });
      },
      error: () => {
        this.loadingForm = false;
        this.hasFormSchema = false;
      }
    });
  }

  async renderNativeForm(schema: any, data: any): Promise<void> {
    const container = document.querySelector('#camunda-form-container');
    if (!container) return;
    container.innerHTML = '';

    try {
      if (this.formInstance) {
        this.formInstance.destroy();
      }
      this.formInstance = new Form({ container: container });
      let parsedSchema = schema;
      if (typeof schema === 'string') {
        parsedSchema = JSON.parse(schema);
      }
      await this.formInstance.importSchema(parsedSchema, data);
      this.loadingForm = false;

      // Hook up the form's OWN submit button inside the bpmn.io form viewer
      this.formInstance.on('submit', (event: any) => {
        if (event.errors && Object.keys(event.errors).length > 0) {
          return; // Form-JS handles inline error validation display
        }
        this.submitTaskDirectly(event.data);
      });
    } catch (err) {
      console.error('Failed to render form-js:', err);
      this.loadingForm = false;
      this.hasFormSchema = false;
    }
  }

  submitTaskDirectly(formData: any): void {
    this.submitting = true;
    const payload: any = { variables: {} };

    Object.keys(formData || {}).forEach(key => {
      const val = formData[key];
      payload.variables[key] = {
        value: val,
        type: typeof val === 'number' ? 'Long' : typeof val === 'boolean' ? 'Boolean' : 'String'
      };
    });

    this.http.post(`http://localhost:8082/api/tasks/${this.selectedTaskId}/submit`, payload)
      .subscribe({
        next: () => {
          this.submitting = false;
          this.closeCompleteModal();
          alert('Task submitted and completed successfully!');
          this.loadMyTasks();
        },
        error: (err) => {
          this.submitting = false;
          alert('Failed to submit task: ' + (err.error?.message || err.error?.error || 'Server error'));
        }
      });
  }

  submitFallbackWithoutForm(): void {
    this.submitting = true;
    this.http.post(`http://localhost:8082/api/tasks/${this.selectedTaskId}/submit`, { variables: {} })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.closeCompleteModal();
          alert('Task completed successfully!');
          this.loadMyTasks();
        },
        error: (err) => {
          this.submitting = false;
          alert('Failed to complete task: ' + (err.error?.message || err.error?.error || 'Server error'));
        }
      });
  }

  closeCompleteModal(): void {
    this.showCompleteModal = false;
    if (this.formInstance) {
      this.formInstance.destroy();
      this.formInstance = null;
    }
  }
}