import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  // bc there might be multiple concurrent requests a number that counts current requests
  // is used instead of boolean
  #isLoading = signal<number>(0);

  isLoading = computed(() => this.#isLoading() > 0);

  loadingOn() {
    this.#isLoading.update((val) => val + 1);
  }

  loadingOff() {
    this.#isLoading.update((val) => val - 1);
  }
}
