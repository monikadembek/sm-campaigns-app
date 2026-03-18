import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { Supabase } from '../../services/supabase';
import { FormsModule, NgForm } from '@angular/forms';
import { InputOtpModule } from 'primeng/inputotp';
import { MessageModule } from 'primeng/message';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-verify',
  imports: [
    InputOtpModule,
    FormsModule,
    ButtonModule,
    CardModule,
    MessageModule,
  ],
  templateUrl: './verify.html',
  styleUrl: './verify.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Verify implements OnInit {
  private readonly supabase = inject(Supabase);
  private readonly router = inject(Router);

  errorMessage = signal('');
  code = '';
  isEmailPending = computed(() => !!this.supabase.pendingEmail());

  ngOnInit(): void {
    if (!this.isEmailPending()) {
      this.router.navigate(['/login']);
    }
  }

  async onSubmit(form: NgForm) {
    this.errorMessage.set('');
    const { code } = form.form.value;

    if (form.valid) {
      const {
        data: { session },
        error,
      } = await this.supabase.verifyOtp(
        code,
        this.supabase.pendingEmail() as string,
      );
      if (session) {
        console.log('verifyOtp data: ', session);
        this.supabase.storePendingEmail(null);
        form.resetForm();
        this.router.navigate(['']);
      }
      if (error) {
        console.log(error);
        this.errorMessage.set('Error during sign in process');
      }
    }
  }
}
