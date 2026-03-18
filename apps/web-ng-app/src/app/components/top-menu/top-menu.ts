import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  OnInit,
  output,
} from '@angular/core';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { ButtonModule } from 'primeng/button';
import { Router } from '@angular/router';

@Component({
  selector: 'app-top-menu',
  imports: [MenubarModule, ButtonModule],
  templateUrl: './top-menu.html',
  styleUrl: './top-menu.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopMenu implements OnInit {
  private readonly router = inject(Router);

  isLoggedIn = input<boolean>(false);
  userEmail = input('');
  signOut = output<void>();

  items: MenuItem[] | undefined;

  ngOnInit(): void {
    this.items = [
      // {
      //   label: 'Home',
      //   icon: 'pi pi-home',
      // },
    ];
  }

  navigateToLoginPage(): void {
    this.router.navigate(['/login']);
  }

  emitSignOut() {
    this.signOut.emit();
  }
}
