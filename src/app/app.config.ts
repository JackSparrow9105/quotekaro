import { ApplicationConfig, provideBrowserGlobalErrorListeners, isDevMode } from '@angular/core';
import { HashLocationStrategy, LocationStrategy } from '@angular/common';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideServiceWorker } from '@angular/service-worker';
import { routes } from './app.routes';
import { MemoryLocationStrategy, isEmbedded } from './memory-location';

const embedded = isEmbedded();

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'top' })),
    // Hash routing works on any static host without server rewrites; embedded previews keep history in memory.
    { provide: LocationStrategy, useClass: embedded ? MemoryLocationStrategy : HashLocationStrategy },
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode() && !embedded,
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
};
