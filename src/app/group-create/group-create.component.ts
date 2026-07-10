import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './group-create.component.html',
  styleUrls: ['./group-create.component.css']
})
export class GroupCreateComponent {
  groupData = {
    id: '',
    name: '',
    type: 'WORKFLOW' // Default Camunda group type
  };
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  onCreateGroup() {
    if (!this.groupData.id || !this.groupData.name || !this.groupData.type) {
      this.errorMessage = "Please fill out all required fields (*).";
      return;
    }

    this.http.post('http://localhost:8082/api/groups/create', this.groupData).subscribe({
      next: () => {
        alert("Group Created Successfully!");
        this.router.navigate(['/admin/groups']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = "Failed to create group. The ID might already exist.";
      }
    });
  }
}