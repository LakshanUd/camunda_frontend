import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TaskDispatcherComponent } from './task-dispatcher.component';

describe('TaskDispatcherComponent', () => {
  let component: TaskDispatcherComponent;
  let fixture: ComponentFixture<TaskDispatcherComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TaskDispatcherComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TaskDispatcherComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
