import { Component, OnInit, OnDestroy } from '@angular/core';
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
export class MyTasksComponent implements OnInit, OnDestroy {
  tasks: any[] = [];
  users: any[] = [];
  loading = true;
  activeFilter: 'ALL' | 'DIRECT' | 'GROUP' = 'ALL';
  searchQuery = '';

  // Master-Detail Workspace State (NO MODALS)
  selectedTask: any = null;
  selectedTaskId = '';
  selectedTaskName = '';
  submitting = false;

  // Native Camunda Form State
  formInstance: any = null;
  loadingForm = false;
  hasFormSchema = true;

  // In-app Notification Feedback
  feedbackMessage: string | null = null;
  feedbackType: 'success' | 'error' | 'info' = 'info';

  constructor(private http: HttpClient, public authService: AuthService) {}

  ngOnInit(): void {
    this.loadMyTasks();
    this.loadUsers();
  }

  ngOnDestroy(): void {
    this.destroyFormInstance();
  }

  showFeedback(message: string, type: 'success' | 'error' | 'info' = 'info'): void {
    this.feedbackMessage = message;
    this.feedbackType = type;
    setTimeout(() => {
      if (this.feedbackMessage === message) {
        this.feedbackMessage = null;
      }
    }, 4000);
  }

  loadMyTasks(): void {
    this.loading = true;
    const username = this.authService.getCurrentUsername();
    this.http.get<any[]>(`http://localhost:8082/api/tasks/my-tasks?userId=${username}`)
      .subscribe({
        next: (data) => {
          this.tasks = data || [];
          this.loading = false;

          // If the currently selected task was finished or removed, deselect it
          if (this.selectedTask && !this.tasks.some(t => t.id === this.selectedTask.id)) {
            this.deselectTask();
          } else if (this.selectedTask) {
            // Update reference
            this.selectedTask = this.tasks.find(t => t.id === this.selectedTask.id);
          }
        },
        error: (err) => {
          console.error('Error fetching tasks:', err);
          this.loading = false;
          this.showFeedback('Failed to load tasks from server', 'error');
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
    let list = this.tasks;

    if (this.activeFilter === 'DIRECT') {
      list = list.filter(t => t.assignee && (t.assignee === currentUsername || t.assignee === this.authService.getCurrentUserId()));
    } else if (this.activeFilter === 'GROUP') {
      list = list.filter(t => !t.assignee && t.candidateGroup);
    }

    if (this.searchQuery && this.searchQuery.trim().length > 0) {
      const q = this.searchQuery.trim().toLowerCase();
      list = list.filter(t =>
        (t.name && t.name.toLowerCase().includes(q)) ||
        (t.taskDefinitionKey && t.taskDefinitionKey.toLowerCase().includes(q)) ||
        (t.processInstanceId && t.processInstanceId.toLowerCase().includes(q)) ||
        (t.id && t.id.toLowerCase().includes(q))
      );
    }

    return list;
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
        this.showFeedback(`Task claimed successfully: ${task.name || task.id}`, 'success');
        this.loadMyTasks();
      },
      error: (err) => {
        this.showFeedback('Failed to claim task: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  unclaimTask(task: any, event?: Event): void {
    if (event) event.stopPropagation();
    const groupId = task.candidateGroup || (task.candidateGroups && task.candidateGroups.length > 0 ? task.candidateGroups[0] : null);

    this.http.post(`http://localhost:8082/api/tasks/${task.id}/unclaim`, { groupId: groupId }).subscribe({
      next: () => {
        this.showFeedback('Task released back to candidate group pool', 'info');
        if (this.selectedTask?.id === task.id) {
          this.deselectTask();
        }
        this.loadMyTasks();
      },
      error: (err) => {
        this.showFeedback('Failed to unclaim task: ' + (err.error?.message || err.message), 'error');
      }
    });
  }

  selectTask(task: any): void {
    if (this.selectedTask?.id === task.id) return;
    this.destroyFormInstance();

    this.selectedTask = task;
    this.selectedTaskId = task.id;
    this.selectedTaskName = task.name || task.taskDefinitionKey || task.id;
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
            setTimeout(() => this.renderNativeForm(schema, initialData), 80);
          },
          error: () => setTimeout(() => this.renderNativeForm(schema, {}), 80)
        });
      },
      error: () => {
        this.loadingForm = false;
        this.hasFormSchema = false;
      }
    });
  }

  deselectTask(): void {
    this.destroyFormInstance();
    this.selectedTask = null;
    this.selectedTaskId = '';
    this.selectedTaskName = '';
  }

  private destroyFormInstance(): void {
    if (this.formInstance) {
      try {
        this.formInstance.destroy();
      } catch (e) {
        console.warn('Error destroying form instance:', e);
      }
      this.formInstance = null;
    }
  }

  async renderNativeForm(schema: any, data: any): Promise<void> {
    const container = document.querySelector('#camunda-form-container');
    if (!container) return;
    container.innerHTML = '';

    try {
      this.destroyFormInstance();
      this.formInstance = new Form({ container: container });
      let parsedSchema = schema;
      if (typeof schema === 'string') {
        parsedSchema = JSON.parse(schema);
      }
      await this.formInstance.importSchema(parsedSchema, data);
      this.loadingForm = false;

      // Listen for form internal submit if form has its own button
      this.formInstance.on('submit', (event: any) => {
        if (event.errors && Object.keys(event.errors).length > 0) {
          return;
        }
        this.submitTaskDirectly(event.data);
      });
    } catch (err) {
      console.error('Failed to render form-js:', err);
      this.loadingForm = false;
      this.hasFormSchema = false;
    }
  }

  triggerFormSubmit(): void {
    if (this.submitting) return;

    if (!this.hasFormSchema || !this.formInstance) {
      this.submitFallbackWithoutForm();
      return;
    }

    try {
      const result = this.formInstance.submit();
      if (result && result.errors && Object.keys(result.errors).length > 0) {
        this.showFeedback('Please resolve required form validation errors before completing.', 'error');
        return;
      }
      if (result && result.data) {
        this.submitTaskDirectly(result.data);
      }
    } catch (e) {
      console.error('Error triggering form submit:', e);
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
          this.showFeedback(`Task '${this.selectedTaskName}' completed successfully!`, 'success');
          this.deselectTask();
          this.loadMyTasks();
        },
        error: (err) => {
          this.submitting = false;
          this.showFeedback('Failed to submit task: ' + (err.error?.message || err.error?.error || 'Server error'), 'error');
        }
      });
  }

  submitFallbackWithoutForm(): void {
    this.submitting = true;
    this.http.post(`http://localhost:8082/api/tasks/${this.selectedTaskId}/submit`, { variables: {} })
      .subscribe({
        next: () => {
          this.submitting = false;
          this.showFeedback(`Task '${this.selectedTaskName}' completed successfully!`, 'success');
          this.deselectTask();
          this.loadMyTasks();
        },
        error: (err) => {
          this.submitting = false;
          this.showFeedback('Failed to complete task: ' + (err.error?.message || err.error?.error || 'Server error'), 'error');
        }
      });
  }
}