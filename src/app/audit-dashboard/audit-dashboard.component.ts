import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-audit-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './audit-dashboard.component.html',
  styleUrls: ['./audit-dashboard.component.css']
})
export class AuditDashboardComponent implements OnInit {
  logs: any[] = [];
  filteredLogs: any[] = [];
  loading = true;

  // Filter & Search State
  searchTerm = '';
  selectedUserFilter = '';
  selectedActionFilter = '';

  // Executive Metric Cards
  totalActivities = 0;
  activeUsersCount = 0;
  errorCount = 0;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAuditLogs();
  }

  loadAuditLogs(): void {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8082/api/audit/logs').subscribe({
      next: (data) => {
        this.logs = data || [];
        this.filteredLogs = [...this.logs];
        this.calculateMetrics();
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load audit logs:', err);
        this.loading = false;
      }
    });
  }

  calculateMetrics(): void {
    this.totalActivities = this.logs.length;
    
    // Calculate unique active users
    const uniqueUsers = new Set(this.logs.map(log => log.userId).filter(u => u && u !== 'ANONYMOUS'));
    this.activeUsersCount = uniqueUsers.size;

    // Calculate failed executions
    this.errorCount = this.logs.filter(log => log.actionType && log.actionType.includes('_FAILED')).length;
  }

  // Instant Client-Side Search & Filtering
  applyFilters(): void {
    this.filteredLogs = this.logs.filter(log => {
      const matchesSearch = !this.searchTerm || 
        JSON.stringify(log).toLowerCase().includes(this.searchTerm.toLowerCase());
      
      const matchesUser = !this.selectedUserFilter || 
        log.userId.toLowerCase() === this.selectedUserFilter.toLowerCase();
        
      const matchesAction = !this.selectedActionFilter || 
        log.actionType.toLowerCase().includes(this.selectedActionFilter.toLowerCase());

      return matchesSearch && matchesUser && matchesAction;
    });
  }

  resetFilters(): void {
    this.searchTerm = '';
    this.selectedUserFilter = '';
    this.selectedActionFilter = '';
    this.filteredLogs = [...this.logs];
  }

  // Helper to extract clean user lists for the dropdown
  getUniqueUsers(): string[] {
    return Array.from(new Set(this.logs.map(log => log.userId).filter(Boolean)));
  }
}