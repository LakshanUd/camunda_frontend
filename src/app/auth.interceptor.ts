import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

// Intercepts all outbound HTTP requests and attaches the logged-in User ID as a header
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const userId = authService.getCurrentUserId();

  // If a user is currently logged in, clone the request and attach the X-User-Id header
  if (userId) {
    const clonedReq = req.clone({
      setHeaders: {
        'X-User-Id': userId
      }
    });
    return next(clonedReq);
  }

  return next(req);
};