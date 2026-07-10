import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-edit',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './group-edit.component.html',
  styleUrls: ['./group-edit.component.css']
})
export class GroupEditComponent implements OnInit {
  groupId: string = '';
  groupData = { id: '', name: '', type: '' };
  successMessage = '';

  constructor(
    private route: ActivatedRoute, 
    private http: HttpClient, 
    private router: Router
  ) {}

  ngOnInit() {
    this.groupId = this.route.snapshot.paramMap.get('id') || '';
    this.loadGroup();
  }

  loadGroup() {
    this.http.get<any>(`http://localhost:8082/api/groups/${this.groupId}`).subscribe({
      next: (data) => this.groupData = data,
      error: () => alert('Error loading group details.')
    });
  }

  updateGroup() {
    if (!this.groupData.name || !this.groupData.type) {
      alert("Name and Type cannot be empty.");
      return;
    }

    this.http.put(`http://localhost:8082/api/groups/${this.groupId}`, this.groupData).subscribe({
      next: () => {
        this.successMessage = 'Group updated successfully!';
        setTimeout(() => this.successMessage = '', 3000);
      },
      error: () => alert('Error updating group.')
    });
  }

  deleteGroup() {
    if (confirm(`CRITICAL WARNING:\nAre you sure you want to permanently delete the group: ${this.groupData.name}?`)) {
      this.http.delete(`http://localhost:8082/api/groups/${this.groupId}`).subscribe({
        next: () => {
          alert('Group deleted.');
          this.router.navigate(['/admin/groups']);
        },
        error: () => alert('Failed to delete group.')
      });
    }
  }
}