import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImpexApiService } from '../../services/impex-api.service';

interface BannerRow {
  component_Id: string;
  content: string;
  selected?: boolean;
  translations: { [lang: string]: any };
}

@Component({
  selector: 'app-bulk-generator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bulk-generator.component.html',
  styleUrls: ['./bulk-generator.component.css']
})
export class BulkGeneratorComponent {
  gridData: any[] = [];
  selectedLanguage: string = 'DE';
  bannerGridData: BannerRow[] = [];

  constructor(private apiService: ImpexApiService) { }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.apiService.uploadBulkSpreadsheet(file).subscribe({
        next: (res: any) => {
          this.gridData = res.gridData || [];
        },
        error: (err: any) => { console.error("Upload failed", err); }
      });
    }
  }

  generateAndDownload() {
    const header = `INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${this.selectedLanguage.toLowerCase()}]`;
    
    const rows = this.bannerGridData
      .filter((row: BannerRow) => row.selected)
      .map((row: BannerRow) => `;${row.component_Id};"${row.content.replace(/"/g, '""')}"`)
      .join('\n');

    const finalImpex = `${header}\n${rows}`;
    const blob = new Blob([finalImpex], { type: 'text/plain;charset=utf-8' });
    
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `import_${this.selectedLanguage}.impex`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
  
  translateAll(targetLang: string): void {
    this.bannerGridData.forEach((row: BannerRow) => {
      // FIX: Cast response to 'any' to satisfy TypeScript's strict signature
      this.apiService.autoTranslate(row.translations['EN'], targetLang).subscribe({
        next: (res: any) => { 
          row.translations[targetLang] = res;
        },
        error: (err: any) => console.error('Translation failed', err)
      });
    });
  }
}