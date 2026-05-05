import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { PostCreateForm } from './components/post-create-form/post-create-form';
import { CreatePostRequest } from '@sm-campaigns-app/datatypes';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PostCreateApi } from './services/post-create-api';
import { ConfirmationService, MessageService } from 'primeng/api';
import { handleHttpErrorResponseMessage } from '../../core/utils/errors-utils';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Observable, Subject } from 'rxjs';
import { CanDeactivateComponent } from '../../shared/guards/campaign-form-can-deactivate-guard';

@Component({
  selector: 'app-post-create',
  imports: [PostCreateForm, ConfirmDialogModule],
  templateUrl: './post-create.html',
  styleUrl: './post-create.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCreate implements CanDeactivateComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly postCreateApiService = inject(PostCreateApi);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  campaignId = signal<string>('');
  campaignName = signal('');
  postCreateFormComponent = viewChild.required(PostCreateForm);
  private submitted = false;
  isFormDirty = computed(() => {
    return this.postCreateFormComponent().postForm.dirty;
  });

  constructor() {
    this.route.params.pipe(takeUntilDestroyed()).subscribe((params) => {
      if (!params['id']) {
        this.router.navigate(['/campaigns']);
      } else {
        this.campaignId.set(params['id']);
      }
    });

    this.campaignName.set(
      this.router.currentNavigation()?.extras.state?.['campaignName'],
    );
  }

  canDeactivate(): boolean | Observable<boolean> {
    if (this.submitted || !this.isFormDirty()) {
      return true;
    }

    const shouldClose$ = new Subject<boolean>();

    this.confirmationService.confirm({
      message: 'Do you want to discard unsaved changes and leave form?',
      header: 'Confirm',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: { label: 'Discard', severity: 'danger' },
      accept: () => {
        shouldClose$.next(true);
        shouldClose$.complete();
      },
      reject: () => {
        shouldClose$.next(false);
        shouldClose$.complete();
      },
    });

    return shouldClose$.asObservable();
  }

  goToCampaign() {
    this.router.navigate(['campaigns', this.campaignId()]);
  }

  saveNewPost(form: Omit<CreatePostRequest, 'campaignId'>) {
    const postData: CreatePostRequest = {
      campaignId: this.campaignId() as string,
      ...form,
    };
    this.postCreateApiService.createPost(postData).subscribe({
      next: () => {
        this.submitted = true;
        this.messageService.add({
          severity: 'success',
          summary: 'Confirmed',
          detail: `New post was created`,
        });
        this.postCreateFormComponent().postForm.reset();
      },
      error: (err) => {
        console.error('Error when creating new post ', err);
        const errorText = handleHttpErrorResponseMessage(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Creating new post failed. ${errorText}`,
        });
      },
    });
  }
}
