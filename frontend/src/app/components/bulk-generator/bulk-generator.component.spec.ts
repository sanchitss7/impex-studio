import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BulkGeneratorComponent } from './bulk-generator.component';
import { ImpexApiService } from '../../services/impex-api.service';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

describe('BulkGeneratorComponent', () => {
  let component: BulkGeneratorComponent;
  let fixture: ComponentFixture<BulkGeneratorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BulkGeneratorComponent], // Standalone component
      providers: [
        ImpexApiService,
        provideHttpClient(),         // Modern way to provide HttpClient
        provideHttpClientTesting()   // Modern way to provide Http Testing
      ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BulkGeneratorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});