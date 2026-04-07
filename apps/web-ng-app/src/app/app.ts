import { Component, computed, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Supabase } from './core/auth/services/supabase';
import { TopMenu } from './core/layout/top-menu/top-menu';
import { ToastModule } from 'primeng/toast';
import { Spinner } from './core/layout/spinner/spinner';
import { LoadingService } from './core/services/loading.service';

@Component({
  imports: [RouterModule, TopMenu, ToastModule, Spinner],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  private readonly supabaseService = inject(Supabase);
  private readonly router = inject(Router);
  private readonly spinnerService = inject(LoadingService);

  isSpinnerLoading = this.spinnerService.isLoading;

  isLoggedIn = computed(() =>
    this.supabaseService.currentSession() ? true : false,
  );
  userEmail = computed(() => this.supabaseService.currentUser()?.email || '');

  async signOut() {
    await this.supabaseService.signOut();
    this.router.navigate(['login']);
  }
}
