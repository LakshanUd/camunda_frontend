import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';

// 1. Corrected the import name to match the actual component class
import { ManageWorkflowsComponent } from './manage-workflows.component';

describe('ManageWorkflowsComponent', () => {
  let component: ManageWorkflowsComponent;
  let fixture: ComponentFixture<ManageWorkflowsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      // 2. Used the correct class name
      imports: [ManageWorkflowsComponent, HttpClientTestingModule],
      // 3. Provided a mock for the ActivatedRoute so the queryParams subscription doesn't crash
      providers: [
        {
          provide: ActivatedRoute,
          useValue: {
            queryParams: of({ view: 'USER_WORKFLOW' }) 
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ManageWorkflowsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});