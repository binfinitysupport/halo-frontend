// Settings for the PRODUCTION build (`npm run build`).
// apiUrl is where the admin finds the backend API. If the backend runs on another domain,
// that backend's CLIENT_ORIGIN setting must include this frontend's URL (CORS).
// For `npm run dev`, angular.json swaps this file for environment.development.ts.
export const environment = {
  production: true,
  apiUrl: 'https://halo-backend-otqu.onrender.com/api',
};
