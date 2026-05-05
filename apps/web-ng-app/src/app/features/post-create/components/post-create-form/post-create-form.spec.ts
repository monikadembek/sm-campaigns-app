import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PostCreateForm } from './post-create-form';

describe('PostCreateForm', () => {
  let component: PostCreateForm;
  let fixture: ComponentFixture<PostCreateForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PostCreateForm],
    }).compileComponents();

    fixture = TestBed.createComponent(PostCreateForm);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial form state', () => {
    it('should initialize with default platform FACEBOOK', () => {
      expect(component.postForm.get('platform')?.value).toBe('FACEBOOK');
    });

    it('should initialize with default postType TEXT', () => {
      expect(component.postForm.get('postType')?.value).toBe('TEXT');
    });

    it('should initialize with default status DRAFT', () => {
      expect(component.postForm.get('status')?.value).toBe('DRAFT');
    });

    it('should initialize content as empty string', () => {
      expect(component.postForm.get('content')?.value).toBe('');
    });

    it('should initialize hashtags as empty string', () => {
      expect(component.postForm.get('hashtags')?.value).toBe('');
    });

    it('should initialize publishDate as null', () => {
      expect(component.postForm.get('publishDate')?.value).toBeNull();
    });

    it('should initialize scheduledAt as null', () => {
      expect(component.postForm.get('scheduledAt')?.value).toBeNull();
    });

    it('should be invalid when content is empty', () => {
      expect(component.postForm.valid).toBe(false);
    });
  });

  describe('select options', () => {
    it('should expose all 7 platform type options', () => {
      expect(component.platformTypeSelectOptions.length).toBe(7);
      const values = component.platformTypeSelectOptions.map((o) => o.value);
      expect(values).toEqual([
        'INSTAGRAM', 'FACEBOOK', 'TWITTER', 'LINKEDIN', 'TIKTOK', 'YOUTUBE', 'PINTEREST',
      ]);
    });

    it('should expose all 4 post status options', () => {
      expect(component.postStatusSelectOptions.length).toBe(4);
      const values = component.postStatusSelectOptions.map((o) => o.value);
      expect(values).toEqual(['DRAFT', 'SCHEDULED', 'PUBLISHED', 'FAILED']);
    });

    it('should expose all 8 post type options', () => {
      expect(component.postTypeSelectOptions.length).toBe(8);
      const values = component.postTypeSelectOptions.map((o) => o.value);
      expect(values).toEqual([
        'TEXT', 'IMAGE', 'VIDEO', 'CAROUSEL', 'REEL', 'STORY', 'LINK', 'POLL',
      ]);
    });
  });

  describe('form validation', () => {
    it('should be valid when all required fields are filled', () => {
      component.postForm.patchValue({ content: 'Hello world' });
      expect(component.postForm.valid).toBe(true);
    });

    it('content should be invalid when empty', () => {
      const content = component.postForm.get('content');
      content?.setValue('');
      expect(content?.hasError('required')).toBe(true);
    });

    it('content should be invalid when longer than 5000 characters', () => {
      const content = component.postForm.get('content');
      content?.setValue('a'.repeat(5001));
      expect(content?.hasError('maxlength')).toBe(true);
    });

    it('content should be valid at exactly 5000 characters', () => {
      const content = component.postForm.get('content');
      content?.setValue('a'.repeat(5000));
      expect(content?.valid).toBe(true);
    });

    it('platform should be invalid when cleared', () => {
      component.postForm.get('platform')?.setValue(null as never);
      expect(component.postForm.get('platform')?.hasError('required')).toBe(true);
    });

    it('postType should be invalid when cleared', () => {
      component.postForm.get('postType')?.setValue(null as never);
      expect(component.postForm.get('postType')?.hasError('required')).toBe(true);
    });

    it('status should be invalid when cleared', () => {
      component.postForm.get('status')?.setValue(null as never);
      expect(component.postForm.get('status')?.hasError('required')).toBe(true);
    });
  });

  describe('getters', () => {
    it('content getter should return the content control', () => {
      expect(component.content).toBe(component.postForm.get('content'));
    });

    it('platform getter should return the platform control', () => {
      expect(component.platform).toBe(component.postForm.get('platform'));
    });

    it('postType getter should return the postType control', () => {
      expect(component.postType).toBe(component.postForm.get('postType'));
    });

    it('status getter should return the status control', () => {
      expect(component.status).toBe(component.postForm.get('status'));
    });
  });

  describe('submitPost()', () => {
    it('should not emit formSubmit when form is invalid', () => {
      const emitSpy = vi.fn();
      component.formSubmit.subscribe(emitSpy);

      component.submitPost();

      expect(emitSpy).not.toHaveBeenCalled();
    });

    it('should emit formSubmit with correct data when form is valid', () => {
      const emitSpy = vi.fn();
      component.formSubmit.subscribe(emitSpy);

      component.postForm.patchValue({
        platform: 'INSTAGRAM',
        postType: 'IMAGE',
        content: 'Test content',
        hashtags: '#test #angular',
        status: 'SCHEDULED',
      });

      component.submitPost();

      expect(emitSpy).toHaveBeenCalledWith({
        platform: 'INSTAGRAM',
        postType: 'IMAGE',
        content: 'Test content',
        hashtags: ['#test', '#angular'],
        publishDate: null,
        scheduledAt: null,
        status: 'SCHEDULED',
      });
    });

    it('should split hashtags by space into an array', () => {
      const emitSpy = vi.fn();
      component.formSubmit.subscribe(emitSpy);

      component.postForm.patchValue({ content: 'Post', hashtags: 'a b c' });
      component.submitPost();

      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ hashtags: ['a', 'b', 'c'] }));
    });

    it('should emit empty hashtags array when hashtags field is empty', () => {
      const emitSpy = vi.fn();
      component.formSubmit.subscribe(emitSpy);

      component.postForm.patchValue({ content: 'Post', hashtags: '' });
      component.submitPost();

      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ hashtags: [] }));
    });

    it('should convert publishDate Date to ISO string', () => {
      const emitSpy = vi.fn();
      component.formSubmit.subscribe(emitSpy);

      const date = new Date('2026-06-01T10:00:00.000Z');
      component.postForm.patchValue({ content: 'Post', publishDate: date });
      component.submitPost();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ publishDate: date.toISOString() }),
      );
    });

    it('should convert scheduledAt Date to ISO string', () => {
      const emitSpy = vi.fn();
      component.formSubmit.subscribe(emitSpy);

      const date = new Date('2026-07-15T08:30:00.000Z');
      component.postForm.patchValue({ content: 'Post', scheduledAt: date });
      component.submitPost();

      expect(emitSpy).toHaveBeenCalledWith(
        expect.objectContaining({ scheduledAt: date.toISOString() }),
      );
    });

    it('should emit null for publishDate when not set', () => {
      const emitSpy = vi.fn();
      component.formSubmit.subscribe(emitSpy);

      component.postForm.patchValue({ content: 'Post' });
      component.submitPost();

      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ publishDate: null }));
    });

    it('should emit null for scheduledAt when not set', () => {
      const emitSpy = vi.fn();
      component.formSubmit.subscribe(emitSpy);

      component.postForm.patchValue({ content: 'Post' });
      component.submitPost();

      expect(emitSpy).toHaveBeenCalledWith(expect.objectContaining({ scheduledAt: null }));
    });
  });

  describe('goToCampaign()', () => {
    it('should emit goBack event', () => {
      const emitSpy = vi.fn();
      component.goBack.subscribe(emitSpy);

      component.goToCampaign();

      expect(emitSpy).toHaveBeenCalled();
    });
  });
});
