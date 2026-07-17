import { Component } from '@angular/core';
import { CommonModule } from '@angular/common'; // Needed for *ngIf
import { RouterModule } from '@angular/router'; // Needed for routerLink and RouterOutlet
import { AuthService } from './auth.service';   // 1. Import your new RBAC Security Service

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule], 
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'Camunda Enterprise Workflow';

  // 2. Inject AuthService as 'public' so app.component.html can read role flags and session data directly
  constructor(public authService: AuthService) {}

  /* Note: Old manual localStorage methods (isLoggedIn, getCurrentUser, logout) 
     have been removed because they are now centralized and secured inside AuthService! */
}