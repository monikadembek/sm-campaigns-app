import { CanDeactivateFn } from '@angular/router';
import { Observable } from 'rxjs';

export interface CanDeactivateComponent {
  canDeactivate(): boolean | Observable<boolean>;
}

export const campaignFormCanDeactivateGuard: CanDeactivateFn<CanDeactivateComponent> = (
  component: CanDeactivateComponent,
): boolean | Observable<boolean> => {
  return component.canDeactivate();
};
