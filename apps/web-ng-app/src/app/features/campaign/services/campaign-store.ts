import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class CampaignStore {
  #campaignId = signal<string>('');
  campaignId = this.#campaignId.asReadonly();

  setCampaignId(id: string): void {
    this.#campaignId.set(id);
  }
}
