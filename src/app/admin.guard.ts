import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Guard for protecting administrative screens and command center modules.
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  if (authService.isAdmin() || authService.hasRole('ROLE_ADMIN')) {
    return true;
  }

  alert('Access Denied: You do not have Global Administrator privileges.');
  router.navigate(['/my-tasks']);
  return false;
};