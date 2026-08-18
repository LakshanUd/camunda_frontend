import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CommandCenter } from './command-center';

describe('CommandCenter', () => {
  let component: CommandCenter;
  let fixture: ComponentFixture<CommandCenter>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CommandCenter],
    }).compileComponents();

    fixture = TestBed.createComponent(CommandCenter);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
