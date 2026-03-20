import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Supabase } from './services/supabase';
import { TopMenu } from './components/top-menu/top-menu';
import { ToastModule } from 'primeng/toast';

@Component({
  imports: [RouterModule, TopMenu, ToastModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly supabaseService = inject(Supabase);
  private readonly router = inject(Router);

  isLoggedIn = computed(() =>
    this.supabaseService.currentSession() ? true : false,
  );
  userEmail = computed(() => this.supabaseService.currentUser()?.email || '');

  async signOut() {
    await this.supabaseService.signOut();
    this.router.navigate(['login']);
  }
}
