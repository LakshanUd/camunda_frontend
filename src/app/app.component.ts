import { Component } from '@angular/core';
import { RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common'; // Needed for *ngIf

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, CommonModule], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Camunda Task Manager';

  constructor(private router: Router) {}

  // Checks if 'loggedInUser' exists in the browser storage
  isLoggedIn(): boolean {
    return localStorage.getItem('loggedInUser') !== null;
  }

  // Gets the currently logged-in user ID
  getCurrentUser(): string {
    return localStorage.getItem('loggedInUser') || '';
  }

  logout() {
    localStorage.removeItem('loggedInUser'); // Erase the session
    this.router.navigate(['/login']); // Kick them back to login screen
  }
}