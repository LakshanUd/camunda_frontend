import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Form } from '@bpmn-io/form-js';

@Component({
  selector: 'app-active-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './active-tasks.component.html',
  styleUrls: ['./active-tasks.component.css']
})
export class ActiveTasksComponent implements OnInit {
  activeTasks: any[] = [];
  loading: boolean = true;
  
  // Users & Groups for Assignment
  availableUsers: any[] = [];
  availableGroups: any[] = [];

  // Assign Modal State
  displayAssignModal: boolean = false;
  taskToAssign: any = null;
  assignTargetType: 'USER' | 'GROUP' | 'UNASSIGN' = 'USER';
  selectedAssigneeUserId: string = '';
  selectedAssigneeGroupId: string = '';
  assignLoading: boolean = false;

  // Selected Task & Form State
  selectedTask: any = null;
  bpmnForm: any = null;
  hasDeployedForm: boolean = false;
  
  // Fallback simple variables form
  fallbackVariables: { key: string; value: any; type: string }[] = [];
  assigneeInput: string = '';

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTasks();
    this.loadUsersAndGroups();
  }

  loadUsersAndGroups() {
    this.http.get<any[]>('http://localhost:8082/api/assignments/users').subscribe({
      next: (users) => this.availableUsers = users || [],
      error: () => {}
    });
    this.http.get<any[]>('http://localhost:8082/api/assignments/groups').subscribe({
      next: (groups) => this.availableGroups = groups || [],
      error: () => {}
    });
  }

  loadTasks() {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8082/api/tasks/active').subscribe({
      next: (data) => {
        this.activeTasks = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load active tasks:', err);
        this.loading = false;
      }
    });
  }

  openAssignModal(task: any) {
    this.taskToAssign = task;
    this.assignLoading = false;
    if (task.assignee) {
      this.assignTargetType = 'USER';
      this.selectedAssigneeUserId = task.assignee;
      this.selectedAssigneeGroupId = '';
    } else if (task.candidateGroup) {
      this.assignTargetType = 'GROUP';
      this.selectedAssigneeGroupId = task.candidateGroup.split(',')[0].trim();
      this.selectedAssigneeUserId = '';
    } else {
      this.assignTargetType = 'USER';
      this.selectedAssigneeUserId = '';
      this.selectedAssigneeGroupId = '';
    }
    this.displayAssignModal = true;
  }

  closeAssignModal() {
    this.displayAssignModal = false;
    this.taskToAssign = null;
  }

  saveTaskAssignment() {
    if (!this.taskToAssign) return;

    this.assignLoading = true;
    let payload: any = { type: this.assignTargetType };

    if (this.assignTargetType === 'USER') {
      if (!this.selectedAssigneeUserId) {
        alert('Please select a user to assign.');
        this.assignLoading = false;
        return;
      }
      payload.userId = this.selectedAssigneeUserId;
    } else if (this.assignTargetType === 'GROUP') {
      if (!this.selectedAssigneeGroupId) {
        alert('Please select a group to assign.');
        this.assignLoading = false;
        return;
      }
      payload.groupId = this.selectedAssigneeGroupId;
    } else if (this.assignTargetType === 'UNASSIGN') {
      payload.unassign = true;
    }

    this.http.post(`http://localhost:8082/api/tasks/${this.taskToAssign.id}/assign`, payload).subscribe({
      next: () => {
        this.assignLoading = false;
        const assignedTask = this.taskToAssign;
        this.closeAssignModal();
        if (this.selectedTask && this.selectedTask.id === assignedTask.id) {
          if (this.assignTargetType === 'USER') {
            this.selectedTask.assignee = this.selectedAssigneeUserId;
            const u = this.availableUsers.find(x => x.username === this.selectedAssigneeUserId);
            this.selectedTask.assigneeName = u ? u.fullName : this.selectedAssigneeUserId;
            this.selectedTask.candidateGroup = null;
            this.selectedTask.candidateGroupName = null;
          } else if (this.assignTargetType === 'GROUP') {
            this.selectedTask.assignee = null;
            this.selectedTask.assigneeName = null;
            this.selectedTask.candidateGroup = this.selectedAssigneeGroupId;
            const g = this.availableGroups.find(x => x.id === this.selectedAssigneeGroupId);
            this.selectedTask.candidateGroupName = g ? g.name : this.selectedAssigneeGroupId;
          } else {
            this.selectedTask.assignee = null;
            this.selectedTask.assigneeName = null;
            this.selectedTask.candidateGroup = null;
            this.selectedTask.candidateGroupName = null;
          }
        }
        this.loadTasks();
      },
      error: (err) => {
        this.assignLoading = false;
        alert('Failed to update assignment: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }

  assignTask(task: any, newAssignee: string) {
    if (!newAssignee) return;
    this.http.post(`http://localhost:8082/api/tasks/${task.id}/assign`, { userId: newAssignee }).subscribe({
      next: () => {
        this.loadTasks();
      },
      error: (err) => alert('Failed to assign task.')
    });
  }

  openActionForm(task: any) {
    this.selectedTask = task;
    this.assigneeInput = task.assignee || '';
    this.fallbackVariables = [];
    this.hasDeployedForm = false;

    // 1. Check for Deployed Form Schema
    this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/form-schema`).subscribe({
      next: (responseSchema) => {
        this.hasDeployedForm = true;
        // Fetch variables to prefill
        this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/variables`).subscribe(vars => {
          const formData: any = {};
          if (vars) {
            for (const key in vars) {
              formData[key] = vars[key].value;
            }
          }

          setTimeout(async () => {
            const container = document.getElementById('camunda-form-container');
            if (!container) return;
            container.innerHTML = '';
            
            try {
              if (this.bpmnForm) this.bpmnForm.destroy();
              this.bpmnForm = new Form();
              let parsedSchema = responseSchema;
              if (typeof responseSchema === 'string') parsedSchema = JSON.parse(responseSchema);

              await this.bpmnForm.importSchema(parsedSchema, formData);
              this.bpmnForm.attachTo(container);

              this.bpmnForm.on('submit', (event: any) => {
                this.submitBpmnForm(event.data, event.errors);
              });
            } catch (err) {
              console.error('Form rendering error:', err);
              this.hasDeployedForm = false;
              this.loadFallbackVariables(task.id);
            }
          }, 50);
        });
      },
      error: () => {
        // No BPMN JSON form schema attached -> load task variables as fallback form
        this.hasDeployedForm = false;
        this.loadFallbackVariables(task.id);
      }
    });
  }

  loadFallbackVariables(taskId: string) {
    this.http.get<any>(`http://localhost:8082/api/tasks/${taskId}/variables`).subscribe(vars => {
      this.fallbackVariables = [];
      if (vars && Object.keys(vars).length > 0) {
        for (const key in vars) {
          this.fallbackVariables.push({
            key: key,
            value: vars[key].value,
            type: vars[key].type || 'String'
          });
        }
      } else {
        // Add a default field if no variables exist
        this.fallbackVariables.push({ key: 'approved', value: true, type: 'Boolean' });
      }
    });
  }

  addFallbackVariable() {
    this.fallbackVariables.push({ key: '', value: '', type: 'String' });
  }

  removeFallbackVariable(index: number) {
    this.fallbackVariables.splice(index, 1);
  }

  submitFallbackForm() {
    const formattedVariables: any = { variables: {} };
    this.fallbackVariables.forEach(varItem => {
      if (varItem.key && varItem.key.trim() !== '') {
        formattedVariables.variables[varItem.key] = { value: varItem.value };
      }
    });

    this.http.post(`http://localhost:8082/api/tasks/${this.selectedTask.id}/submit`, formattedVariables)
      .subscribe({
        next: () => {
          alert('Task Submitted Successfully!');
          this.closeForm();
          this.loadTasks();
        },
        error: (err) => {
          console.error('Submission Error', err);
          alert('Failed to submit task.');
        }
      });
  }

  submitBpmnForm(data: any, errors: any) {
    if (errors && Object.keys(errors).length > 0) return;
    const formattedVariables: any = { variables: {} };
    for (const key in data) {
      formattedVariables.variables[key] = { value: data[key] };
    }

    this.http.post(`http://localhost:8082/api/tasks/${this.selectedTask.id}/submit`, formattedVariables)
      .subscribe({
        next: () => {
          alert('Task Submitted Successfully!');
          this.closeForm();
          this.loadTasks();
        },
        error: (err) => {
          console.error('Submission Error', err);
          alert('Failed to submit task.');
        }
      });
  }

  closeForm() {
    this.selectedTask = null;
    if (this.bpmnForm) {
      this.bpmnForm.destroy();
      this.bpmnForm = null;
    }
  }
}