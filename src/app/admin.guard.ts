import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login']);
    return false;
  }

  if (authService.isAdmin()) {
    return true;
  } else {
    // Standard user attempted to access an admin URL -> Bounce them to their tasks
    alert('Access Denied: You do not have Global Administrator privileges.');
    router.navigate(['/my-tasks']);
    return false;
  }
};