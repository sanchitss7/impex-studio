/// <reference types="jasmine" />

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImpexWorkspaceComponent } from './impex-workspace.component';

describe('ImpexWorkspaceComponent', () => {
  let component: ImpexWorkspaceComponent;
  let fixture: ComponentFixture<ImpexWorkspaceComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ImpexWorkspaceComponent]
    });
    fixture = TestBed.createComponent(ImpexWorkspaceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
