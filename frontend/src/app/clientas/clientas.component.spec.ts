import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ClientasComponent } from './clientas.component';

describe('ClientasComponent', () => {
  let component: ClientasComponent;
  let fixture: ComponentFixture<ClientasComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ClientasComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ClientasComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
