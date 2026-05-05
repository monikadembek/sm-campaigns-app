import {
  ChangeDetectionStrategy,
  Component,
  inject,
  output,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  CreatePostRequest,
  PlatformType,
  PostStatus,
  PostTypeValue,
} from '@sm-campaigns-app/datatypes';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-post-create-form',
  imports: [
    ReactiveFormsModule,
    SelectModule,
    DatePickerModule,
    ButtonModule,
    TextareaModule,
    InputTextModule,
  ],
  templateUrl: './post-create-form.html',
  styleUrl: './post-create-form.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PostCreateForm {
  readonly #fb = inject(FormBuilder);

  formSubmit = output<Omit<CreatePostRequest, 'campaignId'>>();
  goBack = output<void>();

  postStatusSelectOptions: { label: string; value: PostStatus }[] = [
    { label: 'Draft', value: 'DRAFT' },
    { label: 'Scheduled', value: 'SCHEDULED' },
    { label: 'Published', value: 'PUBLISHED' },
    { label: 'Failed', value: 'FAILED' },
  ];

  platformTypeSelectOptions: { label: string; value: PlatformType }[] = [
    { label: 'Instagram', value: 'INSTAGRAM' },
    { label: 'Facebook', value: 'FACEBOOK' },
    { label: 'Twitter', value: 'TWITTER' },
    { label: 'LinkedIn', value: 'LINKEDIN' },
    { label: 'TikTok', value: 'TIKTOK' },
    { label: 'YouTube', value: 'YOUTUBE' },
    { label: 'Pinterest', value: 'PINTEREST' },
  ];

  postTypeSelectOptions: { label: string; value: PostTypeValue }[] = [
    { label: 'Text', value: 'TEXT' },
    { label: 'Image', value: 'IMAGE' },
    { label: 'Video', value: 'VIDEO' },
    { label: 'Carousel', value: 'CAROUSEL' },
    { label: 'Reel', value: 'REEL' },
    { label: 'Story', value: 'STORY' },
    { label: 'Link', value: 'LINK' },
    { label: 'Poll', value: 'POLL' },
  ];

  postForm = this.#fb.nonNullable.group({
    platform: ['FACEBOOK' as PlatformType, Validators.required],
    postType: ['TEXT' as PostTypeValue, Validators.required],
    content: ['', [Validators.required, Validators.maxLength(5000)]],
    hashtags: [''],
    publishDate: this.#fb.control<Date | null>(null),
    scheduledAt: this.#fb.control<Date | null>(null),
    status: ['DRAFT' as PostStatus, Validators.required],
  });

  get content() {
    return this.postForm.get('content');
  }

  get platform() {
    return this.postForm.get('platform');
  }

  get postType() {
    return this.postForm.get('postType');
  }

  get status() {
    return this.postForm.get('status');
  }

  submitPost() {
    if (this.postForm.valid) {
      const formValue = this.postForm.value;
      const hashtags = formValue.hashtags?.split(' ').filter(Boolean) || [];
      const formData: Omit<CreatePostRequest, 'campaignId'> = {
        platform: formValue.platform as PlatformType,
        postType: formValue.postType as PostTypeValue,
        content: formValue.content as string,
        hashtags,
        publishDate: formValue.publishDate?.toISOString() ?? null,
        scheduledAt: formValue.scheduledAt?.toISOString() ?? null,
        status: formValue.status,
      };
      this.formSubmit.emit(formData);
    }
  }

  goToCampaign() {
    this.goBack.emit();
  }
}
