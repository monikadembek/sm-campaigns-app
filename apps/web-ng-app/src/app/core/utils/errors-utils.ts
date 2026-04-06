import { HttpErrorResponse } from '@angular/common/http';

export function handleHttpErrorResponseMessage(err: HttpErrorResponse): string {
  let errorText = '';
  if (err instanceof HttpErrorResponse) {
    switch (err.status) {
      case 400:
        errorText = 'Invalid request. Please check your input.';
        break;
      case 401:
        errorText = 'Unauthorized access.Please log in to continue.';
        break;
      case 404:
        errorText = 'The requested resource was not found.';
        break;
      case 403:
        errorText = "You don't have permission to access this resource.";
        break;
      case 429:
        errorText = 'Too many requests. Please slow down.';
        break;
      case 500:
        errorText = 'Server error occured. Our team has been notified.';
        break;
      case 503:
        errorText = 'Service temporarily unavailable. Please try again later.';
        break;
      default:
        errorText = 'An error occured.';
    }
  }
  return errorText;
}
