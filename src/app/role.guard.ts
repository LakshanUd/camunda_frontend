import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/**
 * Route guard that verifies role-based access control (RBAC).
 * Expects an array of allowed roles in route.data['roles'].
 * Defaults to requiring 'ROLE_ADMIN'.
 */
export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isLoggedIn()) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const expectedRoles: string[] = route.data?.['roles'] || ['ROLE_ADMIN'];
  const hasAccess = expectedRoles.some((role) => authService.hasRole(role));

  if (hasAccess) {
    return true;
  }

  alert('Access Denied: You do not possess the required role permissions to view this screen.');
  router.navigate(['/my-tasks']);
  return false;
};
