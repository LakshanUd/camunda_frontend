import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TenantCreate } from './tenant-create';

describe('TenantCreate', () => {
  let component: TenantCreate;
  let fixture: ComponentFixture<TenantCreate>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TenantCreate],
    }).compileComponents();

    fixture = TestBed.createComponent(TenantCreate);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
