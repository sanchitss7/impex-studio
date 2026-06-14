import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BulkGeneratorComponent } from '../bulk-generator/bulk-generator.component';
import { ImpexApiService, ImpexPayload } from '../../services/impex-api.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { NgZone } from '@angular/core';
import { firstValueFrom } from 'rxjs';

interface BannerRow {
  component_Id: string;
  content: string;
  description: string;
  selected?: boolean;
}

@Component({
  selector: 'app-impex-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive, BulkGeneratorComponent],
  templateUrl: './impex-workspace.component.html',
  styleUrls: ['./impex-workspace.component.css']
})
export class ImpexWorkspaceComponent {

  headerConfig: string = 'INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=$lang]';
  uid: string = 'HomepageWelcomeParagraph';
  outputResult: string = '';

  languages: string[] = ['en', 'de', 'es', 'fr', 'it', 'uk'];
  contentMap: { [key: string]: string } = {
    en: '<DIV CLASS="hero">Welcome</DIV>',
    de: '<DIV CLASS="hero">Willkommen</DIV>',
    es: '<DIV CLASS="hero">Bienvenido</DIV>',
    fr: '<DIV CLASS="hero">Bienvenue</DIV>',
    it: '<DIV CLASS="hero">Benvenuto</DIV>',
    uk: '<DIV CLASS="hero">Welcome</DIV>'
  };

  activeWorkspaceMode: 'single' | 'bulk' | 'bulk-generator' = 'bulk';
  selectedLanguage: string = 'DE';
  languagesList: string[] = ['DE', 'ES', 'FR', 'IT', 'UKR'];
  bannerGridData: BannerRow[] = [];
  masterCheckboxState: boolean = false;
  backendConnectionStatus: string = 'Connected to Backend: http://localhost:3000';

  showModal: boolean = false;
  manualImpexContent: string = '';
  textWrapEnabled: boolean = true;
  // validationErrors: { message: string, line: number, char: number }[] = [];
  isImpExValid: boolean = false;
  lastGeneratedFileLog: string = 'No files generated yet';

  constructor(private apiService: ImpexApiService, private cdr: ChangeDetectorRef, private http: HttpClient, private zone: NgZone) { }

  async generateAndOpenModal() {
  try {
    // Transform the grid data into a format the backend can process
    // We assume the component_Id is the UID you want
    const payload = { 
      headerConfig: this.headerConfig, 
      uid: this.uid, // You have this property defined in your class
      contentMap: this.bannerGridData.reduce((acc, row) => {
        // Here we map your grid rows to a simple key-value structure
        acc[row.component_Id] = row.content; 
        return acc;
      }, {} as { [key: string]: string })
    };

    const response = await firstValueFrom(
      this.http.post<{ content: string }>('http://localhost:3000/api/generate-impex', payload)
    );
    this.manualImpexContent = response.content;
    this.showModal = true;
    this.cdr.detectChanges();
  } catch (err) {
    console.error("Critical error in generation:", err);
  }
}

  private downloadFile(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  auditImpExContent() {
    const lines = this.manualImpexContent.split('\n');
    const unescapedRegex = /(?<!")"(?!")/g; // Matches single " but ignores ""
    let issuesFound = 0;

    console.log("--- Starting ImpEx Integrity Audit ---");

    lines.forEach((line, index) => {
      if (!line.includes(';')) return;

      // Only check the content portion after the last semicolon
      const content = line.substring(line.lastIndexOf(';') + 1);

      if (unescapedRegex.test(content)) {
        console.warn(`Line ${index + 1}: Found potential unescaped double quote.`);
        issuesFound++;
      }
    });

    if (issuesFound === 0) console.log("Audit Passed: No unescaped quotes found.");
    else console.log(`Audit Complete: ${issuesFound} issues identified.`);
  }

  translateSelectedRows() {
    const selectedRows = this.bannerGridData.filter(row => row.selected);
    if (selectedRows.length === 0) return alert('Select rows.');
    selectedRows.forEach(row => {
      if (row.content) {
        this.apiService.autoTranslate(row.content, this.selectedLanguage).subscribe(res => {
          if (res.translatedText) row.content = res.translatedText;
        });
      }
    });
  }

  get contentMapKeys() { return Object.keys(this.contentMap); }

  updateTranslation(lang: string, value: string) { this.contentMap[lang] = value; }

  resetSingleComponentForm() {
    this.uid = '';
    this.contentMap = { en: '', de: '', es: '', fr: '', it: '', uk: '' };
  }

  autoPopulateTranslations() {
    const englishSource = this.contentMap['en'];
    if (!englishSource) {
      alert('Please provide English base content in the "en" field first!');
      return;
    }

    // Loop through defined languages
    this.languages.forEach(lang => {
      if (lang === 'en') return;

      // Note: If your backend expects uppercase (DE, ES), ensure we convert it.
      // Your list uses lowercase ['en', 'de', ...], so we pass the key directly.
      this.apiService.autoTranslate(englishSource, lang).subscribe({
        next: (res: any) => {
          if (res && res.translatedText) {
            // CRITICAL: Create a new object reference to trigger Angular change detection
            this.contentMap = {
              ...this.contentMap,
              [lang]: res.translatedText
            };
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error(`Translation failed for ${lang}:`, err);
        }
      });
    });
  }
  processImpex() {
    const payload: ImpexPayload = {
      headerConfig: this.headerConfig,
      uid: this.uid,
      contentMap: this.contentMap
    };

    this.apiService.generateImpex(payload).subscribe({
      next: (res: any) => {
        this.outputResult = res.impexData || 'No content generated.';
      },
      error: (err) => {
        console.error("Generation Error:", err);
        this.outputResult = 'Error: Check backend logs for details.';
      }
    });
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.outputResult);
    alert('Copied to clipboard!');
  }

  downloadImpexFile() {
    if (this.outputResult) {
      this.downloadFile(this.outputResult, `import_${new Date().getTime()}.impex`);
    }
  }

  fixImpExSyntax() {
    const lines = this.manualImpexContent.split('\n');

    this.manualImpexContent = lines.map(line => {
      const trimmed = line.trim();

      // SKIP: Macros, Headers, Empty lines, or the INSERT_UPDATE definition line
      if (!trimmed ||
        trimmed.startsWith('$') ||
        trimmed.startsWith('INSERT_UPDATE') ||
        trimmed.startsWith('#')) {
        return line;
      }

      if (!line.includes(';')) return line;

      // Isolate the content part after the last semicolon
      const lastSemicolonIndex = line.lastIndexOf(';');
      const prefix = line.substring(0, lastSemicolonIndex + 1);
      let content = line.substring(lastSemicolonIndex + 1).trim();

      // Remove outer wrappers if present
      const isWrapped = content.startsWith('"') && content.endsWith('"');
      if (isWrapped) content = content.substring(1, content.length - 1);

      content = content
        .replace(/""/g, '@@@')
        .replace(/"/g, '""')
        .replace(/@@@/g, '""');

      // Return the line with the cleaned content wrapped back in quotes
      return `${prefix}"${content}"`;
    }).join('\n');

    console.log("Fix Applied: Data rows processed, headers/macros ignored.");
  }

  autoFixImpex() {
    this.zone.run(() => { // 3. Wrap in NgZone to force change detection
      const lines = this.manualImpexContent.split('\n');
      const fixedLines = lines.map(line => {
        if (!line.trim() || line.startsWith('#') || line.startsWith('$') || line.startsWith('INSERT_UPDATE')) return line;
        const lastSemicolonIndex = line.lastIndexOf(';');
        if (lastSemicolonIndex === -1) return line;

        const prefix = line.substring(0, lastSemicolonIndex + 1);
        let content = line.substring(lastSemicolonIndex + 1).trim();

        if (content.startsWith('"') && content.endsWith('"')) {
          let inner = content.substring(1, content.length - 1);
          return prefix + '"' + inner.replace(/(?<!")"(?!")/g, '""') + '"';
        }
        return line;
      });

      this.manualImpexContent = fixedLines.join('\n');
      console.log(this.manualImpexContent);
      console.log(JSON.stringify(this.manualImpexContent.substring(0, 100)));
      // 4. Force immediate DOM update
      this.cdr.detectChanges();
      // this.validateContent();
    });
  }


  //   validateContent() {
  //   const errors: { message: string, line: number, char: number }[] = [];
  //   const lines = this.manualImpexContent.split('\n');

  //   lines.forEach((line, index) => {
  //     // 1. Skip non-data lines
  //     if (!line.trim() || line.startsWith('#') || line.startsWith('$') || line.startsWith('INSERT_UPDATE')) return;

  //     const lastSemicolonIndex = line.lastIndexOf(';');
  //     if (lastSemicolonIndex === -1) return;

  //     // Get everything after the last semicolon
  //     let rawCell = line.substring(lastSemicolonIndex + 1).trim();

  //     // 2. Extract the content by removing the outer wrapping quotes
  //     // We only strip the first and last quote if they exist
  //     let content = rawCell;
  //     if (content.startsWith('"') && content.endsWith('"')) {
  //       content = content.substring(1, content.length - 1);
  //     }

  //     // 3. Unescape internal quotes (replace "" with ") for the HTML parser
  //     // This allows the DOMParser to see the real HTML attributes
  //     content = content.replace(/""/g, '"');

  //     // 4. Check for unescaped quotes (the ones that would break ImpEx)
  //     const quoteRegex = /(?<!")"(?!")/g;
  //     let match;
  //     while ((match = quoteRegex.exec(content)) !== null) {
  //       errors.push({ 
  //         message: `Line ${index + 1}: Unescaped quote found inside HTML.`, 
  //         line: index + 1, 
  //         char: match.index 
  //       });
  //     }

  //     // 5. Validate HTML structure
  //     const parser = new DOMParser();
  //     const doc = parser.parseFromString(content, 'text/html');
  //     if (doc.getElementsByTagName('parsererror').length > 0) {
  //       errors.push({ 
  //         message: `Line ${index + 1}: Broken HTML (check for unclosed tags like <div> or <table>).`, 
  //         line: index + 1, 
  //         char: 0 
  //       });
  //     }
  //   });

  //   this.validationErrors = errors;
  //   this.isImpExValid = errors.length === 0;
  //   this.cdr.detectChanges();
  // }
  downloadManualImpex() {
    if (!this.manualImpexContent) {
      alert('No content available to download.');
      return;
    }

    const blob = new Blob([this.manualImpexContent], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');

    const timestamp = new Date().getTime();
    a.href = url;
    a.download = `Import_${timestamp}.impex`;

    // Trigger download
    a.click();

    // Clean up
    window.URL.revokeObjectURL(url);
  }

  jumpToError(line: number, char: number) {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
    if (!textarea) return;
    const lines = this.manualImpexContent.split('\n');
    let position = 0;
    for (let i = 0; i < line - 1; i++) {
      position += lines[i].length + 1;
    }
    position += (char - 1);
    textarea.focus();
    textarea.setSelectionRange(position, position + 1);
  }

  downloadFinalFile() {
    const blob = new Blob([this.manualImpexContent], { type: 'text/plain;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Validated_Import_${new Date().getTime()}.impex`;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  hasSelectedRows(): boolean { return this.bannerGridData.some(row => row.selected); }

  deleteRow(index: number) {
    if (confirm("Are you sure?")) {
      this.bannerGridData.splice(index, 1);
      this.checkRowParity();
    }
  }

  onFileSelected(event: any): void {
    const file: File = event.target.files[0];
    if (!file) return;
    this.apiService.uploadBulkSpreadsheet(file).subscribe({
      next: (res: any) => {
        this.bannerGridData = (res.gridData || []).map((item: any) => ({
          component_Id: item.component_Id || 'N/A',
          content: item.content || 'No content',
          description: item.description || 'No Description',
          selected: false
        }));
        this.cdr.detectChanges();
      }
    });
  }

  toggleAllRows() { this.bannerGridData.forEach(row => row.selected = this.masterCheckboxState); }
  checkRowParity() { this.masterCheckboxState = this.bannerGridData.every(row => row.selected); }
}