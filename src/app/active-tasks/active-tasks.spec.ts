import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ActiveTasks } from './active-tasks';

describe('ActiveTasks', () => {
  let component: ActiveTasks;
  let fixture: ComponentFixture<ActiveTasks>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ActiveTasks],
    }).compileComponents();

    fixture = TestBed.createComponent(ActiveTasks);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
