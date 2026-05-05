import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, NO_ERRORS_SCHEMA } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { of, throwError } from 'rxjs';
import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { PostCreate } from './post-create';
import { PostCreateApi } from './services/post-create-api';
import { PostCreateForm } from './components/post-create-form/post-create-form';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CreatePostRequest } from '@sm-campaigns-app/datatypes';

const mockFormData: Omit<CreatePostRequest, 'campaignId'> = {
  platform: 'INSTAGRAM',
  postType: 'IMAGE',
  content: 'Test content',
  hashtags: ['#test'],
  publishDate: null,
  scheduledAt: null,
  status: 'DRAFT',
};

@Component({ selector: 'p-confirm-dialog', template: '' })
class ConfirmDialogStub {}

describe('PostCreate', () => {
  let component: PostCreate;
  let fixture: ComponentFixture<PostCreate>;

  const mockRouter = {
    navigate: vi.fn(),
    currentNavigation: vi.fn().mockReturnValue({
      extras: { state: { campaignName: 'Test Campaign' } },
    }),
  };

  const mockPostCreateApi = {
    createPost: vi.fn(),
  };

  const mockMessageService = {
    add: vi.fn(),
  };

  const mockConfirmationService = {
    confirm: vi.fn(),
  };

  async function createComponent(routeParams: Record<string, string> = { id: 'campaign-123' }) {
    const mockActivatedRoute = { params: of(routeParams) };

    await TestBed.configureTestingModule({
      imports: [PostCreate],
      providers: [
        provideHttpClient(),
        { provide: ActivatedRoute, useValue: mockActivatedRoute },
        { provide: Router, useValue: mockRouter },
        { provide: PostCreateApi, useValue: mockPostCreateApi },
        { provide: MessageService, useValue: mockMessageService },
        { provide: ConfirmationService, useValue: mockConfirmationService },
      ],
    })
      .overrideComponent(PostCreate, {
        remove: { imports: [ConfirmDialogModule] },
        add: { imports: [ConfirmDialogStub] },
      })
      .overrideComponent(PostCreateForm, {
        set: { template: '<div></div>', schemas: [NO_ERRORS_SCHEMA] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(PostCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    await createComponent();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initialization', () => {
    it('should set campaignId from route params', () => {
      expect(component.campaignId()).toBe('campaign-123');
    });

    it('should set campaignName from router navigation state', () => {
      expect(component.campaignName()).toBe('Test Campaign');
    });

    it('should navigate to /campaigns when route has no id', async () => {
      await TestBed.resetTestingModule();
      await createComponent({});
      expect(mockRouter.navigate).toHaveBeenCalledWith(['/campaigns']);
    });
  });

  describe('goToCampaign()', () => {
    it('should navigate to the campaign route with the current campaignId', () => {
      component.goToCampaign();
      expect(mockRouter.navigate).toHaveBeenCalledWith(['campaigns', 'campaign-123']);
    });
  });

  describe('saveNewPost()', () => {
    it('should call createPost with combined campaignId and form data', () => {
      mockPostCreateApi.createPost.mockReturnValue(of({}));

      component.saveNewPost(mockFormData);

      expect(mockPostCreateApi.createPost).toHaveBeenCalledWith({
        campaignId: 'campaign-123',
        ...mockFormData,
      });
    });

    it('should show success message after post is created', () => {
      mockPostCreateApi.createPost.mockReturnValue(of({}));

      component.saveNewPost(mockFormData);

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'success',
        summary: 'Confirmed',
        detail: 'New post was created',
      });
    });

    it('should reset the form after successful post creation', () => {
      mockPostCreateApi.createPost.mockReturnValue(of({}));
      const formComponent = component.postCreateFormComponent();
      const resetSpy = vi.spyOn(formComponent.postForm, 'reset');

      component.saveNewPost(mockFormData);

      expect(resetSpy).toHaveBeenCalled();
    });

    it('should show error message when createPost fails with 400', () => {
      const error = new HttpErrorResponse({ status: 400, statusText: 'Bad Request' });
      mockPostCreateApi.createPost.mockReturnValue(throwError(() => error));

      component.saveNewPost(mockFormData);

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Creating new post failed. Invalid request. Please check your input.',
      });
    });

    it('should show error message when createPost fails with 500', () => {
      const error = new HttpErrorResponse({ status: 500, statusText: 'Internal Server Error' });
      mockPostCreateApi.createPost.mockReturnValue(throwError(() => error));

      component.saveNewPost(mockFormData);

      expect(mockMessageService.add).toHaveBeenCalledWith({
        severity: 'error',
        summary: 'Error',
        detail: 'Creating new post failed. Server error occured. Our team has been notified.',
      });
    });
  });

  describe('canDeactivate()', () => {
    it('should return true when form is not dirty', () => {
      const result = component.canDeactivate();
      expect(result).toBe(true);
    });

    it('should return true after successful submission even if form was dirty', () => {
      mockPostCreateApi.createPost.mockReturnValue(of({}));
      const formComponent = component.postCreateFormComponent();
      formComponent.postForm.markAsDirty();

      component.saveNewPost(mockFormData);
      const result = component.canDeactivate();

      expect(result).toBe(true);
    });

    it('should open confirm dialog when form is dirty and not submitted', () => {
      const formComponent = component.postCreateFormComponent();
      formComponent.postForm.markAsDirty();

      component.canDeactivate();

      expect(mockConfirmationService.confirm).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Do you want to discard unsaved changes and leave form?',
          header: 'Confirm',
        }),
      );
    });

    it('should emit true when user accepts the confirm dialog', () => {
      const formComponent = component.postCreateFormComponent();
      formComponent.postForm.markAsDirty();

      let capturedAccept: (() => void) | undefined;
      mockConfirmationService.confirm.mockImplementation(
        ({ accept }: { accept: () => void }) => { capturedAccept = accept; },
      );

      const result$ = component.canDeactivate() as ReturnType<typeof of>;
      let canLeave: boolean | undefined;
      result$.subscribe((v: boolean) => (canLeave = v));

      capturedAccept?.();
      expect(canLeave).toBe(true);
    });

    it('should emit false when user rejects the confirm dialog', () => {
      const formComponent = component.postCreateFormComponent();
      formComponent.postForm.markAsDirty();

      let capturedReject: (() => void) | undefined;
      mockConfirmationService.confirm.mockImplementation(
        ({ reject }: { reject: () => void }) => { capturedReject = reject; },
      );

      const result$ = component.canDeactivate() as ReturnType<typeof of>;
      let canLeave: boolean | undefined;
      result$.subscribe((v: boolean) => (canLeave = v));

      capturedReject?.();
      expect(canLeave).toBe(false);
    });
  });
});
