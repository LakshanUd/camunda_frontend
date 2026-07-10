import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantEdit } from './tenant-edit';

describe('TenantEdit', () => {
  let component: TenantEdit;
  let fixture: ComponentFixture<TenantEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantEdit],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantEdit);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
