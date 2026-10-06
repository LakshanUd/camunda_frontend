import { Component, OnInit, OnDestroy } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Form } from '@bpmn-io/form-js';

export interface FormattedVariable {
  originalName: string;
  displayName: string;
  type: string;
  value: any;
  isBoolean: boolean;
  booleanValue?: boolean;
  isDate: boolean;
  dateValue?: Date;
  isJson: boolean;
  parsedJson?: any;
  isNumber: boolean;
  isText: boolean;
  isSystem: boolean;
}

@Component({
  selector: 'app-completed-tasks',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './completed-tasks.component.html',
  styleUrls: ['./completed-tasks.component.css']
})
export class CompletedTasksComponent implements OnInit, OnDestroy {
  // Level 1: Completed Instances State
  instances: any[] = [];
  filteredInstances: any[] = [];
  workflows: any[] = [];
  selectedWorkflowKey: string = '';
  selectedStatus: string = '';
  loading: boolean = false;
  hasFiltered: boolean = false;
  filterError: string = '';

  // Pagination State: Max 20 instances in one page
  pageSize: number = 20;
  currentPage: number = 1;

  // View Navigation: 'INSTANCES' or 'TASKS'
  currentView: 'INSTANCES' | 'TASKS' = 'INSTANCES';

  // Level 2: Instance Tasks State
  selectedInstance: any = null;
  instanceTasks: any[] = [];
  loadingTasks: boolean = false;

  // Level 3: Task Details Modal State
  selectedTask: any = null;
  showDetailsModal: boolean = false;
  loadingDetails: boolean = false;
  taskVariables: any[] = [];
  businessVariables: FormattedVariable[] = [];
  systemVariables: FormattedVariable[] = [];
  showSystemVars: boolean = false;

  // Level 4: Completed Form Modal State
  showFormModal: boolean = false;
  loadingForm: boolean = false;
  hasFormSchema: boolean = false;
  formMessage: string = '';
  formTaskData: any = {};
  private formInstance: any = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadWorkflows();
    // Initially load blank page - user must select status and click Filter
  }

  ngOnDestroy() {
    if (this.formInstance) {
      this.formInstance.destroy();
      this.formInstance = null;
    }
  }

  loadWorkflows() {
    this.http.get<any[]>('http://localhost:8082/api/processes').subscribe({
      next: (procs) => {
        this.workflows = procs || [];
      },
      error: (err) => console.error('Failed to load workflow definitions:', err)
    });
  }

  applyFilter() {
    if (!this.selectedStatus) {
      this.filterError = 'Please select a status to filter instances.';
      return;
    }
    this.filterError = '';
    this.hasFiltered = true;
    this.loadCompletedInstances();
  }

  loadCompletedInstances() {
    this.loading = true;
    this.filterError = '';
    let url = 'http://localhost:8082/api/instances';
    const params: string[] = [];
    if (this.selectedWorkflowKey) {
      params.push(`processDefinitionKey=${encodeURIComponent(this.selectedWorkflowKey)}`);
    }
    if (this.selectedStatus && this.selectedStatus !== 'ALL') {
      params.push(`status=${encodeURIComponent(this.selectedStatus)}`);
    }
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.instances = data || [];
        this.filteredInstances = this.instances;
        this.currentPage = 1;
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load workflow instances:', err);
        this.loading = false;
      }
    });
  }

  refreshView() {
    if (this.currentView === 'INSTANCES') {
      if (this.hasFiltered) {
        this.loadCompletedInstances();
      }
    } else {
      this.viewInstanceTasks(this.selectedInstance);
    }
  }

  // --- PAGINATION HELPERS (Max 20 instances per page) ---
  get paginatedInstances(): any[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.instances.slice(start, start + this.pageSize);
  }

  get totalPages(): number {
    return Math.ceil(this.instances.length / this.pageSize) || 1;
  }

  get startIndex(): number {
    if (this.instances.length === 0) return 0;
    return (this.currentPage - 1) * this.pageSize + 1;
  }

  get endIndex(): number {
    return Math.min(this.currentPage * this.pageSize, this.instances.length);
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }

  prevPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  // --- LEVEL 2: TASKS FOR INSTANCE ---
  viewInstanceTasks(instance: any) {
    this.selectedInstance = instance;
    this.currentView = 'TASKS';
    this.loadingTasks = true;
    this.instanceTasks = [];

    this.http.get<any[]>(`http://localhost:8082/api/instances/${instance.id}/tasks`).subscribe({
      next: (tasks) => {
        this.instanceTasks = tasks || [];
        this.loadingTasks = false;
      },
      error: (err) => {
        console.error('Failed to load tasks for instance:', err);
        this.loadingTasks = false;
      }
    });
  }

  backToInstances() {
    this.currentView = 'INSTANCES';
    this.selectedInstance = null;
    this.instanceTasks = [];
  }

  // --- LEVEL 3: TASK DETAILS ---
  openDetailsModal(task: any) {
    this.selectedTask = task;
    this.showDetailsModal = true;
    this.loadingDetails = true;
    this.taskVariables = [];
    this.businessVariables = [];
    this.systemVariables = [];
    this.showSystemVars = false;

    this.http.get<any[]>(`http://localhost:8082/api/tasks/completed/${task.id}/variables`).subscribe({
      next: (vars) => {
        this.taskVariables = vars || [];
        this.processVariables(this.taskVariables);
        this.loadingDetails = false;
      },
      error: (err) => {
        console.error('Failed to load task variables:', err);
        this.loadingDetails = false;
      }
    });
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedTask = null;
    this.taskVariables = [];
    this.businessVariables = [];
    this.systemVariables = [];
    this.showSystemVars = false;
  }

  // --- LEVEL 4: VIEW COMPLETED FORM ---
  openFormModal(task: any) {
    this.showFormModal = true;
    this.loadingForm = true;
    this.hasFormSchema = false;
    this.formMessage = '';
    this.formTaskData = {};

    this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/history-form`).subscribe({
      next: (resp) => {
        this.loadingForm = false;
        this.hasFormSchema = !!resp.hasSchema;
        this.formTaskData = resp.data || {};

        if (this.hasFormSchema && resp.schema) {
          setTimeout(() => this.renderReadOnlyForm(resp.schema, resp.data), 100);
        } else {
          this.formMessage = 'No visual form schema was defined for this task in the workflow definition.';
        }
      },
      error: (err) => {
        console.error('Failed to fetch history form schema:', err);
        this.loadingForm = false;
        this.hasFormSchema = false;
        this.formMessage = 'Could not load form schema for this task.';
      }
    });
  }

  async renderReadOnlyForm(schema: any, data: any): Promise<void> {
    const container = document.querySelector('#history-form-container');
    if (!container) return;
    container.innerHTML = '';

    try {
      if (this.formInstance) {
        this.formInstance.destroy();
      }
      this.formInstance = new Form({
        container: container,
        properties: {
          readOnly: true,
          disabled: true
        }
      });
      let parsedSchema = schema;
      if (typeof schema === 'string') {
        parsedSchema = JSON.parse(schema);
      }
      await this.formInstance.importSchema(parsedSchema, data || {});
    } catch (err) {
      console.error('Failed to render Form-JS viewer:', err);
      this.hasFormSchema = false;
      this.formMessage = 'Error rendering form schema.';
    }
  }

  closeFormModal() {
    this.showFormModal = false;
    if (this.formInstance) {
      this.formInstance.destroy();
      this.formInstance = null;
    }
  }

  // --- FORMATTING HELPERS ---
  processVariables(rawVars: any[]) {
    const list: FormattedVariable[] = [];

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

    this.businessVariables = list.filter(v => !v.isSystem);
    this.systemVariables = list.filter(v => v.isSystem);
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

  isInstanceRunning(inst: any): boolean {
    if (!inst) return false;
    return inst.state === 'ACTIVE' || !inst.endTime;
  }

  getRunningDuration(startTime?: string): number {
    if (!startTime) return 0;
    try {
      const start = new Date(startTime).getTime();
      return Math.max(0, Date.now() - start);
    } catch {
      return 0;
    }
  }

  formatDuration(durationMs?: number, isRunning?: boolean, startTime?: string): string {
    let effectiveMs = durationMs;
    if (startTime && (isRunning || effectiveMs === undefined || effectiveMs === null || effectiveMs === 0)) {
      const runningMs = this.getRunningDuration(startTime);
      if (runningMs > 0) {
        effectiveMs = runningMs;
      }
    }
    if (!effectiveMs && effectiveMs !== 0) return '0s';

    const totalSeconds = Math.floor(effectiveMs / 1000);
    let str = '';
    if (totalSeconds < 60) {
      str = `${totalSeconds}s`;
    } else {
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      if (minutes < 60) {
        str = `${minutes}m ${seconds}s`;
      } else {
        const hours = Math.floor(minutes / 60);
        const remMinutes = minutes % 60;
        if (hours < 24) {
          str = `${hours}h ${remMinutes}m`;
        } else {
          const days = Math.floor(hours / 24);
          const remHours = hours % 24;
          str = `${days}d ${remHours}h ${remMinutes}m`;
        }
      }
    }

    return isRunning ? `Running (${str})` : str;
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
}