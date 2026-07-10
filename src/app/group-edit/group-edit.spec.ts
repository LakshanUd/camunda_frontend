import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GroupEdit } from './group-edit';

describe('GroupEdit', () => {
  let component: GroupEdit;
  let fixture: ComponentFixture<GroupEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GroupEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
