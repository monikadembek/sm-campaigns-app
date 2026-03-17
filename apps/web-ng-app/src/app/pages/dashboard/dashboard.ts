import { Component, computed, inject } from '@angular/core';
import { Supabase } from '../../services/supabase';

@Component({
  selector: 'app-dashboard',
  imports: [],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard {
  private readonly supabase = inject(Supabase);
  readonly user = computed(() => this.supabase.currentUser());
}
