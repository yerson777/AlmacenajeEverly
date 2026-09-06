import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CasillerosComponent } from './casilleros.component';

describe('CasillerosComponent', () => {
  let component: CasillerosComponent;
  let fixture: ComponentFixture<CasillerosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CasillerosComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CasillerosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
