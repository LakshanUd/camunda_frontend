import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Form } from '@bpmn-io/form-js';

export interface WorkflowTask {
  id: string;
  name: string;
  taskDefinitionKey?: string;
  processDefinitionKey?: string;
  processDefinitionId?: string;
  processInstanceId?: string;
  assignee?: string;
  assigneeName?: string;
  candidateGroup?: string;
  candidateGroupName?: string;
  candidateGroups?: string[];
  candidateUsers?: string[];
  created?: string;
  startTime?: string;
  endTime?: string;
  duration?: number;
  status: 'NOT_STARTED' | 'ACTIVE' | 'COMPLETED';
  deleteReason?: string;
  formRef?: string;
}

@Component({
  selector: 'app-workflow-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './workflow-tasks.component.html',
  styleUrls: ['./workflow-tasks.component.css']
})
export class WorkflowTasksComponent implements OnInit {
  processes: any[] = [];
  selectedProcessKey: string = '';
  selectedStatus: string = ''; // '' means all statuses
  
  tasksList: WorkflowTask[] = [];
  filteredTasks: WorkflowTask[] = [];
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

  // Active Task Work Modal State
  selectedActiveTask: any = null;
  bpmnForm: any = null;
  hasDeployedForm: boolean = false;
  fallbackVariables: { key: string; value: any; type: string }[] = [];
  assigneeInput: string = '';

  // Completed Task Details Modal State
  selectedCompletedTask: WorkflowTask | null = null;
  showCompletedDetailsModal: boolean = false;
  loadingHistoryVars: boolean = false;
  completedVariables: any[] = [];
  formattedCompletedVariables: any[] = [];
  businessCompletedVariables: any[] = [];
  systemCompletedVariables: any[] = [];
  showCompletedSystemVars: boolean = false;

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProcessDefinitions();
    this.loadUsersAndGroups();
    
    this.route.queryParams.subscribe(params => {
      if (params['processKey']) {
        this.selectedProcessKey = params['processKey'];
      }
      this.loadTasksForWorkflow();
    });
  }

  loadProcessDefinitions(): void {
    this.http.get<any[]>('http://localhost:8082/api/processes').subscribe({
      next: (data) => this.processes = data || [],
      error: (err) => console.error('Failed to load process definitions', err)
    });
  }

  onFilterChange(): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { processKey: this.selectedProcessKey || null },
      queryParamsHandling: 'merge'
    });
    this.applyStatusFilter();
  }

  applyStatusFilter(): void {
    if (!this.selectedStatus) {
      this.filteredTasks = [...this.tasksList];
    } else {
      this.filteredTasks = this.tasksList.filter(t => t.status === this.selectedStatus);
    }
  }

  loadTasksForWorkflow(): void {
    this.loading = true;
    this.tasksList = [];
    this.filteredTasks = [];

    const activeUrl = this.selectedProcessKey 
      ? `http://localhost:8082/api/tasks/active?processDefinitionKey=${this.selectedProcessKey}`
      : `http://localhost:8082/api/tasks/active`;

    const completedUrl = this.selectedProcessKey
      ? `http://localhost:8082/api/tasks/completed?processDefinitionKey=${this.selectedProcessKey}`
      : `http://localhost:8082/api/tasks/completed`;

    // 1. Fetch process definitions to parse XML for tasks not started yet
    this.http.get<any[]>('http://localhost:8082/api/processes').subscribe({
      next: (procList) => {
        this.processes = procList || [];
        const targetProcs = this.selectedProcessKey 
          ? this.processes.filter(p => p.key === this.selectedProcessKey)
          : this.processes;

        if (targetProcs.length === 0) {
          this.loading = false;
          return;
        }

        // Fetch BPMN XML for each target process
        const xmlPromises = targetProcs.map(p => 
          this.http.get<any>(`http://localhost:8082/api/processes/${p.id}/xml`).toPromise()
            .then(res => ({ proc: p, xml: res ? res.bpmn20Xml : '' }))
            .catch(() => ({ proc: p, xml: '' }))
        );

        Promise.all(xmlPromises).then(xmlResults => {
          const definedTasksMap = new Map<string, WorkflowTask>();

          xmlResults.forEach(item => {
            if (item.xml) {
              try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(item.xml, 'text/xml');
                const allElements = xmlDoc.getElementsByTagName('*');
                const userTasks: Element[] = [];
                for (let i = 0; i < allElements.length; i++) {
                  if (allElements[i].localName === 'userTask') {
                    userTasks.push(allElements[i]);
                  }
                }

                userTasks.forEach((uNode: any) => {
                  const defKey = uNode.getAttribute('id');
                  const name = uNode.getAttribute('name') || defKey;
                  const formRef = uNode.getAttribute('camunda:formRef') || uNode.getAttribute('formRef') || '';

                  if (defKey) {
                    const uniqueKey = `${item.proc.key}_${defKey}`;
                    definedTasksMap.set(uniqueKey, {
                      id: defKey,
                      name: name,
                      taskDefinitionKey: defKey,
                      processDefinitionKey: item.proc.key,
                      processDefinitionId: item.proc.id,
                      status: 'NOT_STARTED',
                      formRef: formRef
                    });
                  }
                });
              } catch (e) {
                console.error('Failed to parse BPMN XML for process', item.proc.key, e);
              }
            }
          });

          const getProcKey = (t: any): string => {
            if (t.processDefinitionKey) return t.processDefinitionKey;
            if (t.processDefinitionId && t.processDefinitionId.includes(':')) {
              return t.processDefinitionId.split(':')[0];
            }
            return t.processDefinitionId || '';
          };

          // Fetch Active and Completed tasks
          this.http.get<any[]>(activeUrl).subscribe({
            next: (activeData) => {
              const activeTasks: WorkflowTask[] = (activeData || []).map(t => {
                const procKey = getProcKey(t);
                return {
                  ...t,
                  processDefinitionKey: procKey,
                  status: 'ACTIVE' as const
                };
              });

              this.http.get<any[]>(completedUrl).subscribe({
                next: (completedData) => {
                  const completedTasks: WorkflowTask[] = (completedData || []).map(t => {
                    const procKey = getProcKey(t);
                    return {
                      ...t,
                      processDefinitionKey: procKey,
                      status: 'COMPLETED' as const
                    };
                  });

                  const allCombined: WorkflowTask[] = [];
                  const seenIds = new Set<string>();
                  const seenTaskDefKeys = new Set<string>();

                  // 1. Add ACTIVE tasks first (highest priority)
                  activeTasks.forEach(at => {
                    const idKey = at.id;
                    const defKey = `${at.processDefinitionKey}_${at.taskDefinitionKey || at.id}`;
                    if (!seenIds.has(idKey)) {
                      seenIds.add(idKey);
                      seenTaskDefKeys.add(defKey);
                      allCombined.push(at);
                    }
                  });

                  // 2. Add COMPLETED tasks next (deduplicated by instance ID, recording defKey)
                  completedTasks.forEach(ct => {
                    const idKey = ct.id;
                    const defKey = `${ct.processDefinitionKey}_${ct.taskDefinitionKey || ct.id}`;
                    if (!seenIds.has(idKey)) {
                      seenIds.add(idKey);
                      seenTaskDefKeys.add(defKey);
                      allCombined.push(ct);
                    }
                  });

                  // 3. Add NOT_STARTED tasks (from BPMN XML diagram) if neither active nor completed
                  definedTasksMap.forEach((defTask) => {
                    const defKey = `${defTask.processDefinitionKey}_${defTask.taskDefinitionKey}`;
                    if (!seenTaskDefKeys.has(defKey)) {
                      seenTaskDefKeys.add(defKey);
                      allCombined.push(defTask);
                    }
                  });

                  this.tasksList = allCombined;
                  this.applyStatusFilter();
                  this.loading = false;
                },
                error: (err) => {
                  console.error('Error loading completed tasks', err);
                  this.tasksList = activeTasks;
                  this.applyStatusFilter();
                  this.loading = false;
                }
              });
            },
            error: (err) => {
              console.error('Error loading active tasks', err);
              this.loading = false;
            }
          });
        });
      },
      error: (err) => {
        console.error('Error loading process list', err);
        this.loading = false;
      }
    });
  }

  // --- ACTION FOR NOT STARTED TASKS ---
  startWorkflowInstance(task: WorkflowTask): void {
    if (!task.processDefinitionId) return;
    const processName = task.processDefinitionKey || 'Workflow';
    const isConfirmed = confirm(`Start a new instance of "${processName}" to activate task "${task.name}"?`);
    if (isConfirmed) {
      this.http.post(`http://localhost:8082/api/processes/${task.processDefinitionId}/start`, {}).subscribe({
        next: (res: any) => {
          alert(`Workflow Instance Started! (Instance ID: ${res.id || 'started'})`);
          this.loadTasksForWorkflow();
        },
        error: (err) => {
          console.error('Failed to start process instance', err);
          alert('Could not start workflow instance.');
        }
      });
    }
  }

  // --- ACTION FOR ACTIVE TASKS ---
  openWorkTaskModal(task: WorkflowTask): void {
    this.selectedActiveTask = task;
    this.assigneeInput = task.assignee || '';
    this.fallbackVariables = [];
    this.hasDeployedForm = false;

    this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/form-schema`).subscribe({
      next: (responseSchema) => {
        this.hasDeployedForm = true;
        this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/variables`).subscribe(vars => {
          const formData: any = {};
          if (vars) {
            for (const key in vars) {
              formData[key] = vars[key].value;
            }
          }

          setTimeout(async () => {
            const container = document.getElementById('workflow-task-form-container');
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
        this.hasDeployedForm = false;
        this.loadFallbackVariables(task.id);
      }
    });
  }

  loadFallbackVariables(taskId: string): void {
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
        this.fallbackVariables.push({ key: 'approved', value: true, type: 'Boolean' });
      }
    });
  }

  addFallbackVariable(): void {
    this.fallbackVariables.push({ key: '', value: '', type: 'String' });
  }

  removeFallbackVariable(index: number): void {
    this.fallbackVariables.splice(index, 1);
  }

  loadUsersAndGroups(): void {
    this.http.get<any[]>('http://localhost:8082/api/assignments/users').subscribe({
      next: (users) => this.availableUsers = users || [],
      error: () => {}
    });
    this.http.get<any[]>('http://localhost:8082/api/assignments/groups').subscribe({
      next: (groups) => this.availableGroups = groups || [],
      error: () => {}
    });
  }

  openAssignModal(task: any): void {
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

  closeAssignModal(): void {
    this.displayAssignModal = false;
    this.taskToAssign = null;
  }

  saveTaskAssignment(): void {
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
        if (this.selectedActiveTask && this.selectedActiveTask.id === assignedTask.id) {
          if (this.assignTargetType === 'USER') {
            this.selectedActiveTask.assignee = this.selectedAssigneeUserId;
            const u = this.availableUsers.find(x => x.username === this.selectedAssigneeUserId);
            this.selectedActiveTask.assigneeName = u ? u.fullName : this.selectedAssigneeUserId;
            this.selectedActiveTask.candidateGroup = null;
            this.selectedActiveTask.candidateGroupName = null;
          } else if (this.assignTargetType === 'GROUP') {
            this.selectedActiveTask.assignee = null;
            this.selectedActiveTask.assigneeName = null;
            this.selectedActiveTask.candidateGroup = this.selectedAssigneeGroupId;
            const g = this.availableGroups.find(x => x.id === this.selectedAssigneeGroupId);
            this.selectedActiveTask.candidateGroupName = g ? g.name : this.selectedAssigneeGroupId;
          } else {
            this.selectedActiveTask.assignee = null;
            this.selectedActiveTask.assigneeName = null;
            this.selectedActiveTask.candidateGroup = null;
            this.selectedActiveTask.candidateGroupName = null;
          }
        }
        this.loadTasksForWorkflow();
      },
      error: (err) => {
        this.assignLoading = false;
        alert('Failed to update assignment: ' + (err.error?.message || err.message || 'Unknown error'));
      }
    });
  }

  assignTask(task: any, newAssignee: string): void {
    if (!newAssignee) return;
    this.http.post(`http://localhost:8082/api/tasks/${task.id}/assign`, { userId: newAssignee }).subscribe({
      next: () => {
        this.loadTasksForWorkflow();
      },
      error: () => alert('Failed to assign task.')
    });
  }

  submitFallbackForm(): void {
    const formattedVariables: any = { variables: {} };
    this.fallbackVariables.forEach(varItem => {
      if (varItem.key && varItem.key.trim() !== '') {
        formattedVariables.variables[varItem.key] = { value: varItem.value };
      }
    });

    this.http.post(`http://localhost:8082/api/tasks/${this.selectedActiveTask.id}/submit`, formattedVariables)
      .subscribe({
        next: () => {
          alert('Task Completed Successfully!');
          this.closeWorkModal();
          this.loadTasksForWorkflow();
        },
        error: (err) => alert('Failed to submit task.')
      });
  }

  submitBpmnForm(data: any, errors: any): void {
    if (errors && Object.keys(errors).length > 0) return;
    const formattedVariables: any = { variables: {} };
    for (const key in data) {
      formattedVariables.variables[key] = { value: data[key] };
    }

    this.http.post(`http://localhost:8082/api/tasks/${this.selectedActiveTask.id}/submit`, formattedVariables)
      .subscribe({
        next: () => {
          alert('Task Completed Successfully!');
          this.closeWorkModal();
          this.loadTasksForWorkflow();
        },
        error: (err) => alert('Failed to submit task.')
      });
  }

  closeWorkModal(): void {
    this.selectedActiveTask = null;
    if (this.bpmnForm) {
      this.bpmnForm.destroy();
      this.bpmnForm = null;
    }
  }

  // --- ACTION FOR COMPLETED TASKS ---
  openCompletedDetailsModal(task: WorkflowTask): void {
    this.selectedCompletedTask = task;
    this.showCompletedDetailsModal = true;
    this.loadingHistoryVars = true;
    this.completedVariables = [];
    this.formattedCompletedVariables = [];
    this.businessCompletedVariables = [];
    this.systemCompletedVariables = [];
    this.showCompletedSystemVars = false;

    this.http.get<any[]>(`http://localhost:8082/api/tasks/completed/${task.id}/variables`).subscribe({
      next: (vars) => {
        this.completedVariables = vars || [];
        this.processCompletedVariables(this.completedVariables);
        this.loadingHistoryVars = false;
      },
      error: (err) => {
        console.error('Failed to load variables for completed task', err);
        this.loadingHistoryVars = false;
      }
    });
  }

  closeCompletedDetailsModal(): void {
    this.showCompletedDetailsModal = false;
    this.selectedCompletedTask = null;
    this.completedVariables = [];
    this.formattedCompletedVariables = [];
    this.businessCompletedVariables = [];
    this.systemCompletedVariables = [];
    this.showCompletedSystemVars = false;
  }

  processCompletedVariables(rawVars: any[]): void {
    const list: any[] = [];

    for (const v of rawVars) {
      if (!v || !v.name) continue;
      const originalName = v.name;
      const type = (v.type || 'String').toLowerCase();
      let value = v.value;

      const isSystem = originalName === 'starterUserId' ||
                       originalName === 'initiator' ||
                       originalName.startsWith('execution_') ||
                       originalName.startsWith('loopCounter') ||
                       originalName.startsWith('Output_');

      const displayName = this.formatVariableName(originalName);

      let isBool = false;
      let boolVal = false;
      if (type === 'boolean' || value === true || value === false || value === 'true' || value === 'false') {
        isBool = true;
        boolVal = (value === true || value === 'true');
      }

      let isDt = false;
      let dtVal: Date | undefined = undefined;
      if (type === 'date' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(value))) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          isDt = true;
          dtVal = parsed;
        }
      }

      const isNum = (type === 'integer' || type === 'long' || type === 'double' || type === 'short') && typeof value === 'number';

      let isJsonObj = false;
      let parsedJson: any = null;
      if (type === 'json' || type === 'object' || (typeof value === 'string' && (value.trim().startsWith('{') || value.trim().startsWith('[')))) {
        try {
          if (typeof value === 'string') {
            parsedJson = JSON.parse(value);
          } else {
            parsedJson = value;
          }
          if (typeof parsedJson === 'object' && parsedJson !== null) {
            isJsonObj = true;
          }
        } catch (e) {
          isJsonObj = false;
        }
      }

      list.push({
        originalName,
        displayName,
        type: v.type || 'String',
        value,
        isBoolean: isBool,
        booleanValue: boolVal,
        isDate: isDt,
        dateValue: dtVal,
        isJson: isJsonObj,
        parsedJson,
        isNumber: isNum,
        isText: !isBool && !isDt && !isJsonObj,
        isSystem
      });
    }

    this.formattedCompletedVariables = list;
    this.businessCompletedVariables = list.filter(v => !v.isSystem);
    this.systemCompletedVariables = list.filter(v => v.isSystem);
  }

  formatVariableName(name: string): string {
    if (!name) return '';
    const formJsMatch = name.match(/^(?:textfield|number|checkbox|checklist|radio|select|datetime|textarea|taglist|button)_[a-zA-Z0-9]+_(.*)$/i);
    let cleanName = formJsMatch ? formJsMatch[1] : name;

    if (cleanName === 'starterUserId') return 'Starter User ID';
    if (cleanName === 'initiator') return 'Process Initiator';

    cleanName = cleanName.replace(/[_-]+/g, ' ');
    cleanName = cleanName.replace(/([a-z])([A-Z])/g, '$1 $2');
    cleanName = cleanName.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

    return cleanName
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  isObject(val: any): boolean {
    return typeof val === 'object' && val !== null && !Array.isArray(val);
  }

  isArray(val: any): boolean {
    return Array.isArray(val);
  }

  getObjectKeys(obj: any): string[] {
    return obj ? Object.keys(obj) : [];
  }

  formatDuration(durationMs?: number): string {
    if (!durationMs && durationMs !== 0) return 'N/A';
    const totalSeconds = Math.floor(durationMs / 1000);
    if (totalSeconds < 60) return `${totalSeconds}s`;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    if (minutes < 60) return `${minutes}m ${seconds}s`;
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    if (hours < 24) return `${hours}h ${remMinutes}m`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h ${remMinutes}m`;
  }
}
