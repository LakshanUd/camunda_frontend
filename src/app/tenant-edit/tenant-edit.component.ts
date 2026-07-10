import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tenant-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tenant-edit.component.html',
  styleUrls: ['./tenant-edit.component.css']
})
export class TenantEditComponent implements OnInit {
  tenantId: string = '';
  tenantData = { id: '', name: '' };
  successMessage = '';

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit() {
    this.tenantId = this.route.snapshot.paramMap.get('id') || '';
    this.loadTenant();
  }

  loadTenant() {
    this.http.get<any>(`http://localhost:8082/api/tenants/${this.tenantId}`).subscribe({
      next: (data) => this.tenantData = data,
      error: () => alert('Error loading tenant details.')
    });
  }

  updateTenant() {
    if (!this.tenantData.name) {
      alert("Name cannot be empty.");
      return;
    }

    this.http.put(`http://localhost:8082/api/tenants/${this.tenantId}`, this.tenantData).subscribe({
      next: () => {
        this.successMessage = 'Tenant updated successfully!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => alert('Error updating tenant.')
    });
  }

  deleteTenant() {
    if (confirm(`CRITICAL WARNING:\nAre you sure you want to permanently delete the tenant: ${this.tenantData.name}?`)) {
      this.http.delete(`http://localhost:8082/api/tenants/${this.tenantId}`).subscribe({
        next: () => {
          alert('Tenant deleted.');
          this.router.navigate(['/admin/tenants']);
        },
        error: () => alert('Failed to delete tenant.')
      });
    }
  }
}