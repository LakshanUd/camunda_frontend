import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

// PrimeNG Modules
import { ChartModule } from 'primeng/chart';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-audit-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ChartModule, TableModule, TagModule, InputTextModule],
  templateUrl: './audit-dashboard.component.html',
  styleUrls: ['./audit-dashboard.component.css']
})
export class AuditDashboardComponent implements OnInit {
  // Audit Log State
  logs: any[] = [];
  loadingLogs = true;

  // Executive KPIs
  kpis = { total: 0, completed: 0, pending: 0 };
  
  // Chart Data Configurations
  workloadChartData: any;
  decisionChartData: any;
  chartOptions: any;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.initChartOptions();
    this.loadAnalytics();
    this.loadAuditLogs();
  }

  loadAnalytics(): void {
    this.http.get<any>('http://localhost:8082/api/analytics/dashboard').subscribe({
      next: (data) => {
        this.kpis = data.kpis;
        
        // Map Backend Workload Data -> PrimeNG Bar Chart
        this.workloadChartData = {
          labels: Object.keys(data.workload),
          datasets: [{
            label: 'Active Tasks',
            backgroundColor: '#0ea5e9',
            data: Object.values(data.workload)
          }]
        };

        // Map Backend Decision Data -> PrimeNG Pie Chart
        this.decisionChartData = {
          labels: Object.keys(data.decisions),
          datasets: [{
            data: Object.values(data.decisions),
            backgroundColor: ['#10b981', '#ef4444', '#f59e0b', '#8b5cf6', '#64748b']
          }]
        };
      },
      error: (err) => console.error('Failed to load analytics', err)
    });
  }

  loadAuditLogs(): void {
    this.loadingLogs = true;
    this.http.get<any[]>('http://localhost:8082/api/audit/logs').subscribe({
      next: (data) => {
        this.logs = data || [];
        this.loadingLogs = false;
      },
      error: (err) => {
        console.error('Failed to load audit logs:', err);
        this.loadingLogs = false;
      }
    });
  }

  initChartOptions(): void {
    const documentStyle = getComputedStyle(document.documentElement);
    const textColor = documentStyle.getPropertyValue('--text-color');
    const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary');
    const surfaceBorder = documentStyle.getPropertyValue('--surface-border');

    this.chartOptions = {
      plugins: { legend: { labels: { color: textColor } } },
      scales: {
        x: { ticks: { color: textColorSecondary }, grid: { color: surfaceBorder } },
        y: { ticks: { color: textColorSecondary, stepSize: 1 }, grid: { color: surfaceBorder } }
      }
    };
  }
}