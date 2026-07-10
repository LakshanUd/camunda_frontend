import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-user-create',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './user-create.component.html',
  styleUrls: ['./user-create.component.css']
})
export class UserCreateComponent {
  // Map our frontend variables to exactly what Camunda API requires
  userData = {
    id: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    passwordRepeat: ''
  };
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  onCreateUser() {
    // Custom Frontend Validation
    if (!this.userData.id || !this.userData.firstName || !this.userData.lastName || !this.userData.password) {
      this.errorMessage = "Please fill out all required fields (*).";
      return;
    }
    if (this.userData.password !== this.userData.passwordRepeat) {
      this.errorMessage = "Passwords do not match!";
      return;
    }

    // Camunda requires a specific nested JSON payload
    const payload = {
      profile: {
        id: this.userData.id,
        firstName: this.userData.firstName,
        lastName: this.userData.lastName,
        email: this.userData.email
      },
      credentials: {
        password: this.userData.password
      }
    };

    this.http.post('http://localhost:8082/api/users/create', payload).subscribe({
      next: () => {
        alert("User Created Successfully!");
        this.router.navigate(['/admin/users']);
      },
      error: (err) => {
        console.error(err);
        this.errorMessage = "Failed to create user. ID might already exist.";
      }
    });
  }
}