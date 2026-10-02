import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-processes',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './processes.component.html',
  styleUrls: ['./processes.component.css']
})
export class ProcessesComponent implements OnInit {
  processes: any[] = [];
  loading: boolean = true;
  
  // BPMN XML Modal State
  selectedProcessXml: string | null = null;
  selectedProcessName: string = '';
  showXmlModal: boolean = false;

  constructor(private http: HttpClient, private router: Router) {}

  viewWorkflowTasks(process: any): void {
    this.router.navigate(['/workflow-tasks'], { queryParams: { processKey: process.key } });
  }

  ngOnInit() {
    this.loadProcesses();
  }

  loadProcesses() {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8082/api/processes').subscribe({
      next: (data) => {
        this.processes = data || [];
        this.loading = false;
        
        // Fetch instance count for each process
        this.processes.forEach(process => {
          this.http.get<any>(`http://localhost:8082/api/processes/${process.id}/instances/count`)
            .subscribe({
              next: (countData) => process.instanceCount = countData.count,
              error: () => process.instanceCount = 0
            });
        });
      },
      error: (err) => {
        console.error('Failed to load processes:', err);
        this.loading = false;
      }
    });
  }

  startProcess(process: any): void {
    const processName = process.name || process.key;
    const isConfirmed = confirm(`Are you sure you want to start a new instance of "${processName}"?`);
    
    if (isConfirmed) {
      this.http.post(`http://localhost:8082/api/processes/${process.id}/start`, {}).subscribe({
        next: (res: any) => {
          alert(`Success! A new instance of "${processName}" (ID: ${res.id || 'started'}) has been created.`);
          this.loadProcesses();
        },
        error: (err) => {
          console.error('Failed to start process', err);
          alert('Error: Could not start process instance.');
        }
      });
    }
  }

  viewXml(process: any): void {
    this.selectedProcessName = process.name || process.key;
    this.http.get<any>(`http://localhost:8082/api/processes/${process.id}/xml`).subscribe({
      next: (data) => {
        this.selectedProcessXml = data.bpmn20Xml;
        this.showXmlModal = true;
      },
      error: (err) => {
        alert('Could not fetch BPMN XML diagram.');
      }
    });
  }

  closeXmlModal(): void {
    this.showXmlModal = false;
    this.selectedProcessXml = null;
  }
}