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
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
