import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BulkGeneratorComponent } from '../bulk-generator/bulk-generator.component';
import { ImpexApiService, ImpexPayload } from '../../services/impex-api.service';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { HostListener } from '@angular/core';
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
  showScrollButton: boolean = false;
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
  isDragging: boolean = false;
  activeWorkspaceMode: 'single' | 'bulk' | 'bulk-generator' = 'bulk';
  selectedLanguage: string = 'DE';
  languagesList: string[] = ['DE', 'ES', 'FR', 'IT', 'UKR'];
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
    // Call your existing service logic
    this.apiService.uploadBulkSpreadsheet(file).subscribe({
      next: (res: any) => {
        this.bannerGridData = [...(res.gridData || [])].map(item => ({
          ...item,
          selected: true // Default to true as you requested
        }));
        this.cdr.detectChanges();
      }
    });
  }

  async generateSingleImpex() {
    // 1. Create a clean map with lowercase tags
    const cleanContentMap: { [key: string]: string } = {};

    Object.keys(this.contentMap).forEach(lang => {
      const rawContent = this.contentMap[lang];
      // Apply the transformation here
      cleanContentMap[lang] = this.lowercaseHtmlTags(rawContent);
    });

    // 2. Pass the clean map to the builderbuildSingleImpex
    this.outputResult = this.buildSingleImpex(this.uid, this.contentMap);
    this.cdr.detectChanges();
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
  private sanitizeSpecialChars(str: string): string {
    return str
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
  }
  private sanitizeHtmlAttributes(html: string): string {
    // 1. Standardize tags and attributes BEFORE any quote doubling
    // This regex looks for key="value" or key='value' or key=value
    return html.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName, attrPart) => {
      const tag = tagName.toLowerCase();
      if (!attrPart.trim()) return `<${tag}>`;

      // Regex captures: 1=key, 2/3/4=value
      const attrRegex = /([a-zA-Z0-9-_]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
      const attrs: string[] = [];
      let attrMatch;

      while ((attrMatch = attrRegex.exec(attrPart)) !== null) {
        const key = attrMatch[1].toLowerCase();
        const value = attrMatch[2] || attrMatch[3] || attrMatch[4] || "";

        // Reconstruct: key="value"
        attrs.push(`${key}="${value}"`);
      }

      return `<${tag}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>`;
    });
  }

  public buildSingleImpex(uid: string, contentMap: { [key: string]: string }): string {
    const localeMap: { [key: string]: string } = {
      'en': 'en', 'de': 'de_DE', 'es': 'es_ES',
      'fr': 'fr_FR', 'it': 'it_IT', 'uk': 'en_UK'
    };
    const payloadSize = new TextEncoder().encode(this.contentMap['en']).length;
    console.log("Payload Size (bytes):", payloadSize);

    const macros = [
      "$contentCatalog=omegaengineeringContentCatalog",
      "$contentCatalogName=Omega Engineering Content Catalog",
      "$productCatalog=omegaengineeringProductCatalog",
      "$productCatalogName=Omega Engineering Content Catalog",
      "$contentCV=catalogVersion(CatalogVersion.catalog(Catalog.id[default=$contentCatalog]),CatalogVersion.version[default=Staged])[default=$contentCatalog:Staged]",
      "$productCV=catalogVersion(catalog(id[default=$productCatalog]),version[default='Staged'])[unique=true,default=$productCatalog:Staged]",
      "$lang=en", ""
    ];

    let output = [...macros];

    Object.entries(contentMap).forEach(([lang, content]) => {
      const locale = localeMap[lang] || lang;

      // 1. Normalize tags (lowercase)
      let processed = this.lowercaseHtmlTags(content);
      processed = this.sanitizeHtmlAttributes(this.sanitizeSpecialChars(processed));
      const finalContent = processed.replace(/"/g, '""');

      const langHeader = (lang === 'en') ? '$lang' : locale;

      output.push(`INSERT_UPDATE CMSParagraphComponent;uid[unique=true];content[lang=${langHeader}]`);
      output.push(`;${uid};"${finalContent}"`);
      output.push("");
    });

    return output.join('\n').trim();
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

  private lowercaseHtmlTags(html: string): string {
    return html.replace(/<(\/?)([a-zA-Z0-9]+)([^>]*)>/g, (match, slash, tag, attrs) => {
      return `<${slash}${tag.toLowerCase()}${attrs.toLowerCase()}>`;
    });
  }
  processImpex() {

    // 1. Create a deep copy of contentMap and lowercase all HTML tags/attributes
    const sanitizedContentMap = Object.keys(this.contentMap).reduce((acc, lang) => {
      let content = this.contentMap[lang] || '';

      // Use a regex to target tags (<...>) and lowercase them
      // This targets the tag name and the attribute keys
      content = content.replace(/<([a-zA-Z0-9]+)([^>]*)>/g, (match, tagName, attrPart) => {
        return `<${tagName.toLowerCase()}${attrPart.toLowerCase()}>`;
      });

      acc[lang] = content;
      return acc;
    }, {} as { [key: string]: string });

    // 2. Use the sanitized map in the payload
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