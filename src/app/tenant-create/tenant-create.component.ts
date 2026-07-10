import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tenant-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './tenant-create.component.html',
  styleUrls: ['./tenant-create.component.css']
})
export class TenantCreateComponent {
  tenantData = { id: '', name: '' };
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  onCreateTenant() {
    if (!this.tenantData.id || !this.tenantData.name) {
      this.errorMessage = "Please fill out all required fields (*).";
      return;
    }

    this.http.post('http://localhost:8082/api/tenants/create', this.tenantData).subscribe({
      next: () => {
        alert("Tenant Created Successfully!");
        this.router.navigate(['/admin/tenants']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = "Failed to create tenant. The ID might already exist.";
      }
    });
  }
}