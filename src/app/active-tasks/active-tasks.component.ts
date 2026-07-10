import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { Form } from '@bpmn-io/form-js'; // Import the official Camunda Form engine

@Component({
  selector: 'app-active-tasks',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './active-tasks.component.html',
  styleUrls: ['./active-tasks.component.css']
})
export class ActiveTasksComponent implements OnInit {
  activeTasks: any[] = [];
  selectedTask: any = null;
  bpmnForm: any = null; // Holds the bpmn-io form instance

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.http.get<any[]>('http://localhost:8082/api/tasks/active').subscribe(data => this.activeTasks = data);
  }

  openActionForm(task: any) {
    this.selectedTask = task;

    // 1. Fetch Form Schema
    this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/form-schema`).subscribe({
      next: (responseSchema) => {
        // 2. Fetch Variables
        this.http.get<any>(`http://localhost:8082/api/tasks/${task.id}/variables`).subscribe(vars => {
          
          const formData: any = {};
          for (const key in vars) {
            formData[key] = vars[key].value;
          }

          // 3. Give Angular 50ms to finish drawing the popup HTML window
          setTimeout(async () => {
            const container = document.getElementById('camunda-form-container');
            
            if (!container) {
              console.error("CRITICAL ERROR: Angular did not draw the form container div!");
              return;
            }

            container.innerHTML = ''; // Clear out old forms
            
            try {
              // 1. Destroy old instances
              if (this.bpmnForm) {
                this.bpmnForm.destroy();
              }

              // 2. Initialize bpmn-io
              this.bpmnForm = new Form();

              let parsedSchema = responseSchema;
              if (typeof responseSchema === 'string') {
                parsedSchema = JSON.parse(responseSchema);
              }

              // 3. CRITICAL FIX: Pass the data as the second argument!
              await this.bpmnForm.importSchema(parsedSchema, formData);

              // 4. Attach to the screen
              this.bpmnForm.attachTo(container);

              // 5. Listen for the native Camunda Form submit button!
              this.bpmnForm.on('submit', (event: any) => {
                this.submitForm(event.data, event.errors);
              });

            } catch (err) {
              console.error('BPMN-IO Form Rendering Error:', err);
              alert('Error drawing the form. Please check the Browser Console (F12) for details.');
            }

          }, 50); // 50ms delay guarantees the HTML div exists before bpmn-io looks for it
        });
      },
      error: (err) => {
        alert("This task does not have a Camunda Form deployed with it!");
        console.error(err);
        this.closeForm();
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

  // This button is clicked in the HTML, which tells bpmn-io to do its job
  triggerFormSubmit() {
    if (this.bpmnForm) {
      this.bpmnForm.submit(); // Forces bpmn-io to validate and fire the 'submit' event
    }
  }

  submitForm(data: any, errors: any) {
    // If bpmn-io detects required fields are missing, stop the submission
    if (errors && Object.keys(errors).length > 0) {
      console.warn('Form validation failed:', errors);
      return; 
    }

    // Format the simple JSON back into what Camunda expects
    const formattedVariables: any = { variables: {} };
    for (const key in data) {
      formattedVariables.variables[key] = { value: data[key] };
    }

    this.http.post(`http://localhost:8082/api/tasks/${this.selectedTask.id}/submit`, formattedVariables)
      .subscribe({
        next: () => {
          alert('Task Submitted Successfully!');
          this.closeForm();
          this.loadTasks(); // Refresh list after submit
        },
        error: (err) => {
          console.error("Submission Error", err);
          alert('Failed to submit task. Check console.');
        }
      });
  }
}