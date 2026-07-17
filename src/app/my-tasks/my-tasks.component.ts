import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../auth.service';
import { Form } from '@bpmn-io/form-js'; // 1. Import official Camunda form library

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

  // Modal & Step Navigation State
  showCompleteModal = false;
  step = 1; // Step 1 = Native Form | Step 2 = Route Next Stage
  selectedTaskId = '';
  selectedTaskName = '';
  nextReviewer = '';
  
  // Native Camunda Form State
  formInstance: any = null;
  loadingForm = false;
  hasFormSchema = true;
  capturedFormData: any = {};

  constructor(private http: HttpClient, public authService: AuthService) {}

  ngOnInit(): void {
    this.loadMyTasks();
    this.loadUsers();
  }

  loadMyTasks(): void {
    const userId = this.authService.getCurrentUserId();
    this.http.get<any[]>(`http://localhost:8082/api/tasks/my-tasks?userId=${userId}&isAdmin=false`)
      .subscribe({
        next: (data) => {
          this.tasks = data;
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
      next: (data) => this.users = data,
      error: () => console.error('Failed to load user list')
    });
  }

  openCompleteModal(task: any): void {
    this.selectedTaskId = task.id;
    this.selectedTaskName = task.name;
    this.nextReviewer = '';
    this.step = 1; // Start at Step 1 (Form)
    this.capturedFormData = {};
    this.showCompleteModal = true;
    this.loadingForm = true;
    this.hasFormSchema = true;

    // Fetch BOTH the deployed JSON Form Schema AND existing task variables
    this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/deployed-form`).subscribe({
      next: (schema) => {
        this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/variables`).subscribe({
          next: (vars) => {
            // Convert Camunda variables { key: { value: X } } to Form-JS format { key: X }
            const initialData: any = {};
            Object.keys(vars || {}).forEach(k => initialData[k] = vars[k].value);

            // Give Angular 100ms to render the DOM container before attaching form-js
            setTimeout(() => this.renderNativeForm(schema, initialData), 100);
          },
          error: () => setTimeout(() => this.renderNativeForm(schema, {}), 100)
        });
      },
      error: () => {
        // Fallback if no form schema exists in Modeler
        this.loadingForm = false;
        this.hasFormSchema = false;
      }
    });
  }

  // Uses @bpmn-io/form-js to render the official form inside #camunda-form-container
  async renderNativeForm(schema: any, data: any): Promise<void> {
    const container = document.querySelector('#camunda-form-container');
    if (!container) return;
    container.innerHTML = ''; // Clear previous forms

    try {
      this.formInstance = new Form({ container: container });
      await this.formInstance.importSchema(schema, data);
      this.loadingForm = false;
    } catch (err) {
      console.error('Failed to render form-js:', err);
      this.loadingForm = false;
      this.hasFormSchema = false;
    }
  }

  // STEP 1 PROCEED: Captures form edits and moves to Step 2 (Routing)
  async proceedToRouting(): Promise<void> {
    if (this.hasFormSchema && this.formInstance) {
      // Validate and extract edited form data from form-js
      const { data, errors } = await this.formInstance.submit();
      
      if (errors && Object.keys(errors).length > 0) {
        alert('Please complete all required form fields correctly before proceeding.');
        return;
      }
      this.capturedFormData = data;
    }
    // Transition to Step 2: Route Next Stage
    this.step = 2;
  }

  // STEP 2 SUBMIT: Sends form data + routing variable to Camunda
  confirmComplete(): void {
    const payload: any = { variables: {} };

    // 1. Attach form data captured from @bpmn-io/form-js
    Object.keys(this.capturedFormData || {}).forEach(key => {
      const val = this.capturedFormData[key];
      payload.variables[key] = {
        value: val,
        type: typeof val === 'number' ? 'Long' : typeof val === 'boolean' ? 'Boolean' : 'String'
      };
    });

    // 2. Attach dynamic routing variable if selected
    if (this.nextReviewer) {
      payload.variables['nextReviewer'] = { value: this.nextReviewer, type: 'String' };
    }

    // 3. Send final completion request to Camunda engine
    this.http.post(`http://localhost:8082/api/tasks/${this.selectedTaskId}/complete`, payload)
      .subscribe({
        next: () => {
          this.showCompleteModal = false;
          alert('Task completed and routed successfully!');
          this.loadMyTasks();
        },
        error: (err) => alert('Failed to complete task: ' + (err.error?.error || 'Server error'))
      });
  }
}