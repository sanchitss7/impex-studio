import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HostListener } from '@angular/core';
import { NgZone } from '@angular/core';
import { forkJoin, firstValueFrom, map } from 'rxjs';
import { ImpexApiService } from 'src/app/services/impex-api.service';

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
  impexData: string = '';
  htmlPreview: string = '';
  showScrollButton: boolean = false;
  headerConfig: string = 'INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content2[lang=$lang]';
  uid: string = 'HomepageWelcomeParagraph';
  outputResult: string = '';
  private deepLMap: Record<string, string> = {
    'EN': 'EN',
    'DE': 'DE',
    'FR': 'FR',
    'ES': 'ES',
    'IT': 'IT',
    'JA': 'JA', // Japanese
    'KO': 'KO'  // Korean
  };

  languages: string[] = ['EN', 'DE', 'ES', 'FR', 'IT', 'JA', 'KO'];
  contentMap: { [key: string]: string } = {
    EN: '<DIV CLASS="hero">Welcome "6-1100394-1"</DIV>',
    DE: '',
    ES: '',
    FR: '',
    IT: '',
    JA: '',
    KO: '',
  };
  isDragging: boolean = false;
  activeWorkspaceMode: 'single' | 'bulk' = 'bulk';
  selectedLanguage: string = 'DE';
  languagesList: string[] = ['DE', 'ES', 'FR', 'IT', 'JA', 'KO'];
  bannerGridData: BannerRow[] = [];
  masterCheckboxState: boolean = true;
  backendConnectionStatus: string = 'Connected to Backend: http://localhost:3000';
  isLoading: boolean = false;
  showModal: boolean = false;
  manualImpexContent: string = '';
  textWrapEnabled: boolean = true;
  // validationErrors: { message: string, line: number, char: number }[] = [];
  isImpExValid: boolean = false;
  lastGeneratedFileLog: string = 'No files generated yet';
  progressPercentage: number = 0;
  constructor(private apiService: ImpexApiService, private cdr: ChangeDetectorRef, private http: HttpClient, private zone: NgZone) { }

  ngOnInit() {
    this.http.get('http://localhost:3000/api/test').subscribe(
      data => console.log("Success:", data),
      err => console.error("Connection Failed:", err)
    );
  }

  // ... imports remain the same
  async generateAndOpenModal() {
    this.isLoading = true;
    this.progressPercentage = 0; // Initialize
    this.cdr.detectChanges();

    try {
      const totalItems = this.bannerGridData.length;
      let completedItems = 0;

      // 1. Prepare translation observables with progress tracking
      const translationObservables = this.bannerGridData.map(row => {
        // const idRegex = /"\d+-\d+-\d+"/g;
        const idRegex = /["'«»“”„‟"' ]\d+-\d+-\d+["'«»“”„‟"' ]/g;
        const match = (row.originalContent || row.content).match(idRegex);
        const maskedText = (row.originalContent || row.content).replace(idRegex, '###ID###');

        return this.http.post('http://localhost:3000/api/translate', {
          text: row.content,
          target_lang: this.selectedLanguage
        }).pipe(
          map((res: any) => {
            // Progress Calculation
            completedItems++;
            this.progressPercentage = Math.round((completedItems / totalItems) * 100);
            this.cdr.detectChanges(); // Update UI for each item
            let translated = res.translatedText || maskedText;
            // if(this.progressPercentage == 100){
            //   this.progressPercentage = 0;
            // }
            translated = translated.replace(/[«»“”„‟" ]*###ID###[«»“”„‟" ]*/g, '###ID###');
            const cleanId = match?.[0]?.replace(/[^\d-]/g, '') || '';
            const finalContent = match ? translated.replace('###ID###', ' "' + cleanId + '"') : translated;

            return { ...row, content: finalContent };
          })
        );
      });

      // 2. Execute translations
      const translatedRows = await firstValueFrom(forkJoin(translationObservables));

      // 3. Finalize
      const sanitizedRows = translatedRows.map(row => ({
        uid: row.component_Id,
        lang: this.selectedLanguage.toLowerCase(),
        content: this.sanitizeContent(row.content)
      }));

      const payload = {
        uid: this.uid,
        headerConfig: this.headerConfig,
        rows: sanitizedRows,
        contentMap: {},
        selectedLanguage: this.selectedLanguage
      };

      const response: any = await firstValueFrom(
        this.http.post('http://localhost:3000/api/generate-impex', payload)
      );

      this.manualImpexContent = response.impexData;
      this.htmlPreview = response.htmlContent;
      this.showModal = true;

      this.impexData = response.impexData;
      this.htmlPreview = response.htmlContent;
      this.cdr.detectChanges();


    } catch (err) {
      console.error("Critical Generation Error:", err);
    } finally {
      this.isLoading = false;
      this.progressPercentage = 0;
      this.cdr.detectChanges();
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

  exportHtml() {

    const content = this.outputResult;

    if (!content) {
      alert("No content available to export.");
      return;
    }

    // 2. Create a Blob from the content
    const blob = new Blob([content], { type: 'text/html' });

    // 3. Create a download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `translation_${this.selectedLanguage}.html`;

    // 4. Trigger download and cleanup
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
      selectedLanguage: 'EN'
    };

    // Use 'this.apiService' (as defined in your constructor)
    this.apiService.buildUnifiedImpex(payload).subscribe({
      next: (res: any) => {
        this.impexData = res.impexData;
        this.outputResult = res.impexData; // Sync for the <pre> block
        this.htmlPreview = res.htmlContent || ''; // Store the HTML
        this.cdr.detectChanges();
        console.log("DEBUG: htmlPreview length is now:", this.htmlPreview.length);
      }
    });

    // this.apiService.buildUnifiedImpex(payload).subscribe({
    //   next: (res: any) => {
    //     console.log("Full Backend Response:", res); // ADD THIS
    //     this.impexData = res.impexData;
    //     this.htmlPreview = res.htmlContent;
    //     this.cdr.detectChanges();
    //   },
    //   error: (err) => console.error("Generation Error:", err)
    // });

  }

  private getTargetLang(lang: string): string {
    // Use the map, fallback to input, force uppercase, ensure hyphen
    const code = (this.deepLMap[lang] || lang).toUpperCase();
    return code.replace('_', '-');
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

  async translateSelectedRows() {
    const selectedRows = this.bannerGridData.filter(row => row.selected);
    if (selectedRows.length === 0) return alert('Select rows.');

    const targetLang = this.getTargetLang(this.selectedLanguage);

    const observables = selectedRows.map(row =>
      this.apiService.autoTranslate(row.content, targetLang).pipe(
        map(res => ({ ...row, content: res.translatedText || row.content }))
      )
    );

    const updated = await firstValueFrom(forkJoin(observables));

    // Update state immutably
    this.bannerGridData = this.bannerGridData.map(row =>
      updated.find(u => u.component_Id === row.component_Id) || row
    );
    this.cdr.detectChanges();
  }

  private sanitizeContent(str: string): string {
    if (!str) return '';

    // 1. Decode entities and apply character sanitization
    let val = this.decodeHtmlEntities(String(str))
      .replace(/\0/g, '')
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
      .replace(/[\u2019\u2018\u201A\u201B]/g, "'")
      .replace(/[\u2010\u2011\u2012\u2013\u2014\u2015]/g, '-')
      .replace(/[\u00A1]/g, '!')
      .replace(/[\u00B0]/g, '°')
      .replace(/[\u00A0]/g, ' ')
      .replace(/[\uFFFD]/g, '')
      .replace(/[\u00D0]/g, 'Đ')
      .replace(/[\u00D1]/g, 'Ñ')
      .replace(/[\u00D5]/g, 'Õ')
      .replace(/[\u017D]/g, 'Ž')
      .replace(/[«»“”„‟]/g, '"')
      .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
      .replace(/[\u2039]/g, '<')
      .replace(/[\u203A]/g, '>');

    // 2. Sanitize HTML Tags and Attributes
    val = val.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (match, slash, tagName, attrPart) => {
      const tag = tagName.toLowerCase();

      // Handle closing tags
      if (slash) return `</${tag}>`;

      // Handle opening tags
      if (!attrPart || !attrPart.trim()) return `<${tag}>`;

      // Normalize attributes: key="value"
      const attrRegex = /([a-zA-Z0-9-_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
      const attrs = [];
      let attrMatch;

      while ((attrMatch = attrRegex.exec(attrPart)) !== null) {
        const key = attrMatch[1].toLowerCase();
        // Get the value, strip any existing surrounding quotes
        const value = (attrMatch[2] || attrMatch[3] || attrMatch[4] || "").replace(/^["']|["']$/g, '');
        attrs.push(`${key}="${value}"`);
      }

      return `<${tag}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>`;
    });

    val = val.replace(/"/g, '""');

    return val;
  }
  get contentMapKeys() { return Object.keys(this.contentMap); }

  updateTranslation(lang: string, value: string) { this.contentMap[lang] = value; }

  resetSingleComponentForm() {
    this.uid = '';
    this.contentMap = { en: '', de: '', es: '', fr: '', it: '', ja: '', ko: '' };
  }

  autoPopulateTranslations() {
    const englishSource = this.contentMap['EN'];
    if (!englishSource) {
      alert('Please provide English base content in the "en" field first!');
      return;
    }

    // Loop through defined languages
    this.languages.forEach(lang => {
      if (lang === 'en') return;
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
    const cleanContentMap: { [key: string]: string } = {};

    Object.keys(this.contentMap).forEach(lang => {
      let text = this.contentMap[lang] || "";

      // 1. Strip existing quote messes around ID
      text = text.replace(/[«»“”„‟" ]*###ID###[«»“”„‟" ]*/g, '###ID###');
      const idMatch = text.match(/\d+-\d+-\d+/);
      const cleanId = idMatch ? idMatch[0] : '';

      // 2. Inject ID as ""ID""
      text = text.replace('###ID###', '"' + cleanId + '"');

      // 3. Sanitize (This now handles tag lowercasing AND quote escaping)
      cleanContentMap[lang] = this.sanitizeContent(text);
    });

    const payload = {
      uid: this.uid,
      contentMap: cleanContentMap,
      selectedLanguage: this.selectedLanguage
    };

    this.apiService.generateImpex(payload as any).subscribe({
      next: (res: any) => {
        this.outputResult = res.impexData || res.content;
        this.showModal = true;
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

  downloadHtml() {
    if (!this.htmlPreview) {
      alert("No HTML preview available.");
      return;
    }

    // Create a dynamic filename based on the active mode
    const mode = this.activeWorkspaceMode; // 'bulk' or 'single'
    const filename = `${mode}_preview_${new Date().getTime()}.html`;

    const blob = new Blob([this.htmlPreview], { type: 'text/html' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  private triggerDownload(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
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

    // Ensure your service matches the route in server.js
    this.apiService.uploadBulkSpreadsheet(file).subscribe({
      next: (res: any) => {
        if (res && res.gridData) {
          this.bannerGridData = [...res.gridData].map((item: any) => ({
            component_Id: item.component_Id || 'N/A',
            content: item.content || 'No content',
            // ADD THESE MISSING REQUIRED PROPERTIES:
            originalContent: item.content || '',
            description: item.description || 'No Description',
            outputResult: '', // Initialize as empty
            selected: true
          }));
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error("Upload Error:", err);
        alert("Failed to upload file. Check console.");
      }
    });
  }

  toggleAllRows() { this.bannerGridData.forEach(row => row.selected = this.masterCheckboxState); }
  checkRowParity() { this.masterCheckboxState = this.bannerGridData.every(row => row.selected); }
}