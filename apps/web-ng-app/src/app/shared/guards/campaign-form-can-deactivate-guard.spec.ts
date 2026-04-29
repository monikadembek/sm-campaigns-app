import { TestBed } from '@angular/core/testing';
import { CanDeactivateFn } from '@angular/router';
import { firstValueFrom, Subject } from 'rxjs';
import { campaignFormCanDeactivateGuard, CanDeactivateComponent } from './campaign-form-can-deactivate-guard';

const executeGuard: CanDeactivateFn<CanDeactivateComponent> = (...guardParameters) =>
  TestBed.runInInjectionContext(() => campaignFormCanDeactivateGuard(...guardParameters));

describe('campaignFormCanDeactivateGuard', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('returns true when component.canDeactivate returns true', () => {
    const component: CanDeactivateComponent = { canDeactivate: () => true };

    const result = executeGuard(component, {} as never, {} as never, {} as never);

    expect(result).toBe(true);
  });

  it('returns false when component.canDeactivate returns false', () => {
    const component: CanDeactivateComponent = { canDeactivate: () => false };

    const result = executeGuard(component, {} as never, {} as never, {} as never);

    expect(result).toBe(false);
  });

  it('passes through the Observable returned by component.canDeactivate', async () => {
    const subject$ = new Subject<boolean>();
    const component: CanDeactivateComponent = { canDeactivate: () => subject$.asObservable() };

    const result = executeGuard(component, {} as never, {} as never, {} as never);
    const promise = firstValueFrom(result as Subject<boolean>);

    subject$.next(true);
    subject$.complete();

    expect(await promise).toBe(true);
  });

  it('passes through an Observable that resolves to false', async () => {
    const subject$ = new Subject<boolean>();
    const component: CanDeactivateComponent = { canDeactivate: () => subject$.asObservable() };

    const result = executeGuard(component, {} as never, {} as never, {} as never);
    const promise = firstValueFrom(result as Subject<boolean>);

    subject$.next(false);
    subject$.complete();

    expect(await promise).toBe(false);
  });
});
