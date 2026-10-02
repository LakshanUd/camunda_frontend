import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';

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
  imports: [CommonModule],
  templateUrl: './completed-tasks.component.html',
  styleUrls: ['./completed-tasks.component.css']
})
export class CompletedTasksComponent implements OnInit {
  completedTasks: any[] = [];
  loading: boolean = true;

  // Task Details Modal State
  selectedTask: any = null;
  taskVariables: any[] = [];
  formattedVariables: FormattedVariable[] = [];
  businessVariables: FormattedVariable[] = [];
  systemVariables: FormattedVariable[] = [];
  showDetailsModal: boolean = false;
  loadingDetails: boolean = false;
  showSystemVars: boolean = false;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadCompletedTasks();
  }

  loadCompletedTasks() {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8082/api/tasks/completed').subscribe({
      next: (data) => {
        this.completedTasks = data || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load completed tasks:', err);
        this.loading = false;
      }
    });
  }

  // "Details" action
  openDetailsModal(task: any) {
    this.selectedTask = task;
    this.showDetailsModal = true;
    this.loadingDetails = true;
    this.taskVariables = [];
    this.formattedVariables = [];
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
        console.error('Failed to load completed task variables', err);
        this.loadingDetails = false;
      }
    });
  }

  // Alias for backward compatibility if template calls viewVariables
  viewVariables(task: any) {
    this.openDetailsModal(task);
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedTask = null;
    this.taskVariables = [];
    this.formattedVariables = [];
    this.businessVariables = [];
    this.systemVariables = [];
    this.showSystemVars = false;
  }

  closeVarModal() {
    this.closeDetailsModal();
  }

  processVariables(rawVars: any[]) {
    const list: FormattedVariable[] = [];

    for (const v of rawVars) {
      if (!v || !v.name) continue;
      const originalName = v.name;
      const type = (v.type || 'String').toLowerCase();
      let value = v.value;

      // Classify whether it's a system routing or internal engine variable
      const isSystem = originalName === 'starterUserId' ||
                       originalName === 'initiator' ||
                       originalName.startsWith('execution_') ||
                       originalName.startsWith('loopCounter') ||
                       originalName.startsWith('Output_');

      const displayName = this.formatVariableName(originalName);

      // 1. Check Boolean
      let isBool = false;
      let boolVal = false;
      if (type === 'boolean' || value === true || value === false || value === 'true' || value === 'false') {
        isBool = true;
        boolVal = (value === true || value === 'true');
      }

      // 2. Check Date
      let isDt = false;
      let dtVal: Date | undefined = undefined;
      if (type === 'date' || (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2})?/.test(value))) {
        const parsed = new Date(value);
        if (!isNaN(parsed.getTime())) {
          isDt = true;
          dtVal = parsed;
        }
      }

      // 3. Check Number
      const isNum = (type === 'integer' || type === 'long' || type === 'double' || type === 'short') && typeof value === 'number';

      // 4. Check JSON Object/Array
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

      const formatted: FormattedVariable = {
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
      };

      list.push(formatted);
    }

    this.formattedVariables = list;
    this.businessVariables = list.filter(v => !v.isSystem);
    this.systemVariables = list.filter(v => v.isSystem);
  }

  formatVariableName(name: string): string {
    if (!name) return '';
    // Strip Form-js prefixes like textfield_wi757_name -> name
    const formJsMatch = name.match(/^(?:textfield|number|checkbox|checklist|radio|select|datetime|textarea|taglist|button)_[a-zA-Z0-9]+_(.*)$/i);
    let cleanName = formJsMatch ? formJsMatch[1] : name;

    if (cleanName === 'starterUserId') return 'Starter User ID';
    if (cleanName === 'initiator') return 'Process Initiator';

    // Replace underscores and hyphens with space
    cleanName = cleanName.replace(/[_-]+/g, ' ');

    // Split camelCase
    cleanName = cleanName.replace(/([a-z])([A-Z])/g, '$1 $2');
    cleanName = cleanName.replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');

    // Capitalize each word
    return cleanName
      .split(' ')
      .filter(w => w.length > 0)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
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