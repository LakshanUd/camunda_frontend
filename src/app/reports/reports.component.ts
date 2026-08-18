import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { ToolbarModule } from 'primeng/toolbar';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, TableModule, ButtonModule, ToolbarModule, InputTextModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.css']
})
export class ReportsComponent implements OnInit {
  ledgerData: any[] = [];
  dynamicColumns: any[] = [];
  loading = true;

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadBusinessLedger();
  }

  loadBusinessLedger(): void {
    this.loading = true;
    this.http.get<any[]>('http://localhost:8082/api/reports/business-ledger').subscribe({
      next: (data) => {
        this.ledgerData = data || [];
        
        // Dynamically discover columns based on the payload (handles limitless custom fields!)
        if (this.ledgerData.length > 0) {
          // Extract all unique keys from all rows to ensure no columns are missed
          const allKeys = new Set<string>();
          this.ledgerData.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));
          
          this.dynamicColumns = Array.from(allKeys).map(key => ({
            field: key,
            header: this.formatHeader(key)
          }));

          // Sort columns to put Process ID and Last Updated first
          this.dynamicColumns.sort((a, b) => {
            if (a.field === 'Process ID') return -1;
            if (b.field === 'Process ID') return 1;
            if (a.field === 'Last Updated') return -1;
            if (b.field === 'Last Updated') return 1;
            return a.field.localeCompare(b.field);
          });
        }
        
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load ledger', err);
        this.loading = false;
      }
    });
  }

  // Helper to make camelCase keys look like proper table headers (e.g., "customerName" -> "Customer Name")
  private formatHeader(key: string): string {
    if (key === 'Process ID' || key === 'Last Updated') return key;
    const result = key.replace(/([A-Z])/g, " $1");
    return result.charAt(0).toUpperCase() + result.slice(1);
  }
}