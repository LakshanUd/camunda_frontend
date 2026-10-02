import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

/**
 * Functional HTTP Interceptor for Angular Standalone architecture.
 * Attaches the JWT Bearer token to all outbound requests to the Spring Boot backend
 * and gracefully intercepts 401 Unauthorized responses to force re-authentication.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const token = authService.getToken();

  // Clone request with Authorization header if JWT exists
  let modifiedReq = req;
  if (token) {
    modifiedReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(modifiedReq).pipe(
    catchError((error: HttpErrorResponse) => {
      // If backend returns 401 Unauthorized, invalidate local session and redirect
      if (error.status === 401) {
        console.warn('[AuthInterceptor] 401 Unauthorized encountered. Redirecting to login.');
        authService.logout();
      } else if (error.status === 403) {
        console.warn('[AuthInterceptor] 403 Forbidden encountered: Insufficient permissions.');
      }
      return throwError(() => error);
    })
  );
};