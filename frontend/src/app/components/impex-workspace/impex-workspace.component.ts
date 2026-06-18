import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ImpexApiService } from '../../services/impex-api.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HostListener } from '@angular/core';
import { NgZone } from '@angular/core';
import { forkJoin, firstValueFrom, catchError, of, map } from 'rxjs';
import { ImpexPayload } from '../../services/impex-api.service';

interface BannerRow {
  originalContent: string;
  component_Id: string;
  content: string;
  description: string;
  selected?: boolean;
  outputResult: string;
}

@Component({
  selector: 'app-impex-workspace',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterLinkActive],
  templateUrl: './impex-workspace.component.html',
  styleUrls: ['./impex-workspace.component.css']
})
export class ImpexWorkspaceComponent {
  showScrollButton: boolean = false;
  headerConfig: string = 'INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=$lang]';
  uid: string = 'HomepageWelcomeParagraph';
  outputResult: string = '';
  private deepLMap: Record<string, string> = {
    'en': 'EN-US',
    'en_gb': 'EN-GB',
    'de': 'DE',
    'fr': 'FR',
    'es': 'ES',
    'it': 'IT'
  };
  languages: string[] = ['en', 'de', 'es', 'fr', 'it', 'en_GB'];
  contentMap: { [key: string]: string } = {
    en: '<DIV CLASS="hero">Welcome "6-1100394-1"</DIV>',
    de: '<DIV CLASS="hero">Willkommen "6-1100394-1"</DIV>',
    es: '<DIV CLASS="hero">Bienvenido "6-1100394-1"</DIV>',
    fr: '<DIV CLASS="hero">Bienvenue "6-1100394-1"</DIV>',
    it: '<DIV CLASS="hero">Benvenuto "6-1100394-1"</DIV>',
    en_GB: '<DIV CLASS="hero">Welcome "6-1100394-1"</DIV>'
  };
  isDragging: boolean = false;
  activeWorkspaceMode: 'single' | 'bulk' = 'bulk';
  selectedLanguage: string = 'DE';
  languagesList: string[] = ['DE', 'ES', 'FR', 'IT', 'EN_GB'];
  bannerGridData: BannerRow[] = [];
  masterCheckboxState: boolean = true;
  backendConnectionStatus: string = 'Connected to Backend: http://localhost:3000';

  showModal: boolean = false;
  manualImpexContent: string = '';
  textWrapEnabled: boolean = true;
  // validationErrors: { message: string, line: number, char: number }[] = [];
  isImpExValid: boolean = false;
  lastGeneratedFileLog: string = 'No files generated yet';

  constructor(private apiService: ImpexApiService, private cdr: ChangeDetectorRef, private http: HttpClient, private zone: NgZone) { }

  // ... imports remain the same
  async generateAndOpenModal() {
    try {
      // 1. Map the selection to DeepL-supported language codes
      // Use the deepLMap defined as a class property
      const targetLang = this.deepLMap[this.selectedLanguage.toLowerCase()] || 'EN-GB';

      console.log(`DEBUG: Translating to DeepL code: ${targetLang}`);

      // 2. Prepare translation requests
      const translationObservables = this.bannerGridData.map(row => {
        const textToTranslate = row.originalContent || row.content;
        const idRegex = /"\d+-\d+-\d+"/g;

        // Mask ID so DeepL doesn't try to translate/break the format
        const match = textToTranslate.match(idRegex);
        const maskedText = textToTranslate.replace(idRegex, '###ID###');

        return this.http.post('http://localhost:3000/api/translate', {
          text: maskedText,
          target_lang: targetLang
        }).pipe(
          map((res: any) => {
            const translated = res.translatedText || maskedText;
            // Unmask ID back into the translated string
            const finalContent = match ? translated.replace('###ID###', match[0]) : translated;
            return { ...row, content: finalContent };
          }),
          catchError(err => {
            console.error(`Translation failed for ${row.component_Id}:`, err);
            return of({ ...row });
          })
        );
      });

      // 3. Execute all translations
      const translatedRows = await firstValueFrom(forkJoin(translationObservables));

      // 4. Prepare payload for ImpEx generation
      // We send translatedRows directly so the backend can iterate over the full content set
      const payload = {
        uid: this.uid,
        contentMap: translatedRows.reduce((acc, row) => {
          // Mapping the component_Id as the key for language
          acc[this.selectedLanguage.toLowerCase()] = row.content;
          return acc;
        }, {} as { [key: string]: string }),
        selectedLanguage: this.selectedLanguage
      };

      // 5. Generate ImpEx
      const response: any = await firstValueFrom(
        this.http.post('http://localhost:3000/api/generate-impex', payload)
      );

      this.manualImpexContent = response.impexData || response.content;
      this.showModal = true;
      this.cdr.detectChanges();

    } catch (err) {
      console.error("Critical Generation Error:", err);
      alert("An error occurred during ImpEx generation. Check console for details.");
    }
  }

  private decodeHtmlEntities(str: string): string {
    if (!str) return '';
    return str
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>');
  }

  onLanguageChange(event: any) {
    this.selectedLanguage = event.target.value;
    console.log("DEBUG: Language changed to:", this.selectedLanguage);
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;
  }

  onFileDropped(event: DragEvent) {
    event.preventDefault();
    this.isDragging = false;

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.handleFile(files[0]); // Reuse your file processing logic
    }
  }
  @HostListener('window:scroll', [])
  onWindowScroll() {
    // Show button after scrolling down 300px
    this.showScrollButton = window.pageYOffset > 300;
  }

  scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  handleFile(file: File) {
    // Show a loading state if you have one
    console.log("Uploading file...");

    this.apiService.uploadBulkSpreadsheet(file).subscribe({
      next: (res: any) => {
        if (res && res.gridData) {
          this.bannerGridData = [...res.gridData].map(item => ({
            ...item,
            selected: true
          }));
          console.log("File uploaded and grid updated successfully.");
        } else {
          console.warn("Upload successful, but no grid data returned.");
          this.bannerGridData = [];
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        // 1. Log the full error to the console for debugging
        console.error("Upload Error:", err);

        // 2. Provide user feedback
        const errorMessage = err.error?.message || "Failed to upload file. Please check your connection or file format.";
        alert(errorMessage);

        // 3. (Optional) Reset your UI state or trigger a specific error view
        this.cdr.detectChanges();
      }
    });
  }

  async generateSingleImpex() {
    // 1. Create a clean map
    const cleanContentMap: { [key: string]: string } = {};

    Object.keys(this.contentMap).forEach(lang => {
      const rawContent = this.contentMap[lang] || "";
      cleanContentMap[lang] = this.sanitizeContent(this.contentMap[lang] || "");
    });

    // 2. Pass the clean map using the correct service variable
    const payload = {
      uid: this.uid,
      contentMap: cleanContentMap,
      headerConfig: this.headerConfig,
      selectedLanguage: 'en'
    };

    // Use 'this.apiService' (as defined in your constructor)
    this.apiService.buildUnifiedImpex(payload).subscribe({
      next: (res: any) => {
        // Ensure this matches the key returned by your server
        this.outputResult = res.impexData || res.content;
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Generation failed:", err)
    });
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
        // Ensure 'this.selectedLanguage' matches your languagesList ['DE', 'ES', etc.]
        this.apiService.autoTranslate(row.content, this.selectedLanguage).subscribe({
          next: (res: any) => {
            if (res.translatedText) {
              row.content = res.translatedText;
              this.cdr.detectChanges();
            }
          },
          error: (err) => console.error("Translation failed:", err)
        });
      }
    });
  }
  private sanitizeContent(str: string): string {
    if (!str) return '';

    // 1. Decode entities and apply character sanitization
    let val = this.decodeHtmlEntities(String(str))
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/[\u2019\u2018\u201A\u201B]/g, "'")
      .replace(/[«»]/g, '"')
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
      .replace(/[\u00A1]/g, '!')
      .replace(/[\u00B0]/g, '°')
      .replace(/[\u00A0]/g, ' ')
      .replace(/[\uFFFD]/g, '')
      .replace(/[\u00D0]/g, 'Đ')
      .replace(/[\u00D1]/g, 'Ñ')
      .replace(/[\u00D5]/g, 'Õ')
      .replace(/[\u017D]/g, 'Ž')
      .replace(/[\u2039]/g, '<')
      .replace(/[\u203A]/g, '>');

    // 2. Sanitize HTML Attributes and Tags
    val = val.replace(/<\/?([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName, attrPart) => {
      const tag = tagName.toLowerCase();
      const isClosing = match.startsWith('</');

      // Handle closing tags
      if (isClosing) {
        return `</${tag}>`;
      }

      // Handle opening tags with no attributes
      if (!attrPart || !attrPart.trim()) {
        return `<${tag}>`;
      }

      // Handle attributes
      const attrRegex = /([a-zA-Z0-9-_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
      const attrs = [];
      let attrMatch;

      while ((attrMatch = attrRegex.exec(attrPart)) !== null) {
        const key = attrMatch[1].toLowerCase();
        const value = attrMatch[2] || attrMatch[3] || attrMatch[4] || "";
        attrs.push(`${key}="${value}"`);
      }

      return `<${tag}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>`;
    });

    return val;
  }
  get contentMapKeys() { return Object.keys(this.contentMap); }

  updateTranslation(lang: string, value: string) { this.contentMap[lang] = value; }

  resetSingleComponentForm() {
    this.uid = '';
    this.contentMap = { en: '', de: '', es: '', fr: '', it: '', en_GB: '' };
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

  private lowercaseHtmlTags(html: string): string {
    return html.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (match, slash, tag, attrs) => {
      return `<${slash}${tag.toLowerCase()}${attrs.toLowerCase()}>`;
    });
  }
  processImpex() {
    // Ensure contentMap is the object: { 'en': '...', 'en_gb': '...', ... }
    const payload = {
      uid: this.uid,
      contentMap: this.contentMap
    };

    this.apiService.generateImpex(payload as any).subscribe({
      next: (res: any) => {
        this.outputResult = res.impexData;
        this.showModal = true; // Open modal after generating
        this.cdr.detectChanges();
      },
      error: (err) => console.error("Error:", err)
    });
  }

  async copyBulkClipboard(text: string): Promise<void> {
    try {
      if (!text) {
        alert("No content to copy!");
        return;
      }
      await navigator.clipboard.writeText(text);
      alert('ImpEx content copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy content. Check console for errors.');
    }
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
        // Create a fresh copy to trigger Angular change detection
        this.bannerGridData = [...res.gridData.map((item: any) => ({
          component_Id: item.component_Id || 'N/A',
          content: item.content || 'No content',
          description: item.description || 'No Description',
          selected: true
        }))];

        console.log("UI Grid Data now contains:", this.bannerGridData);
        this.cdr.detectChanges(); // Force update
      }
    });
  }

  toggleAllRows() { this.bannerGridData.forEach(row => row.selected = this.masterCheckboxState); }
  checkRowParity() { this.masterCheckboxState = this.bannerGridData.every(row => row.selected); }
}