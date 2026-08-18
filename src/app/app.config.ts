import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { providePrimeNG } from 'primeng/config'; // 2. Import PrimeNG Config
import Lara from '@primeng/themes/lara';

import { routes } from './app.routes'; // Import your routes here
import { authInterceptor } from './auth.interceptor';


export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideHttpClient(withInterceptors([authInterceptor])),
    provideAnimations(),
    providePrimeNG({
      theme: {
        preset: Lara // Activates the sleek Lara theme globally!
      }
    }),
    provideRouter(routes) // Tell Angular to use them
  ]
};