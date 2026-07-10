import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router'; // To redirect after login
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  credentials = { username: '', password: '' };
  errorMessage = '';

  constructor(private http: HttpClient, private router: Router) {}

  onLogin() {
    this.http.post<any>('http://localhost:8082/api/users/login', this.credentials)
      .subscribe({
        next: (response) => {
          if (response.authenticated) {
            // Success! Save the user's ID to the browser memory
            localStorage.setItem('loggedInUser', response.authenticatedUser);
            // Redirect them to the active tasks page
            this.router.navigate(['/active-tasks']);
          } else {
            this.errorMessage = 'Invalid User ID or Password';
          }
        },
        error: (err) => {
          console.error(err);
          this.errorMessage = 'Server error connecting to Camunda.';
        }
      });
  }
}