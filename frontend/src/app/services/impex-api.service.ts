import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ImpexPayload {
  headerConfig: string;
  uid: string;
  contentMap: { [key: string]: string };
  target_lang?: string;
}

// export interface ImpexPayload {
//   uid: string;
//   contentMap: { [key: string]: string };
// }

@Injectable({
  providedIn: 'root'
})
export class ImpexApiService {
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

  buildUnifiedImpex(payload: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/generate-impex`, payload);
  }
  uploadBulkSpreadsheet(file: File): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(`${this.apiUrl}/impex/bulk/upload`, formData);
  }

  generateBulkImpexMatrix(payload: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/impex/bulk/generate-matrix`, payload);
  }

  generateImpex(payload: ImpexPayload): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/impex/generate`, payload);
  }

  autoTranslate(text: string, lang: string): Observable<any> {
    const langMap: { [key: string]: string } = {
      'DE': 'de', 'ES': 'es', 'FR': 'fr', 'IT': 'it'
    };
    // Force the mapping here
    const normalizedLang = langMap[lang.toUpperCase()] || lang.toLowerCase();

    return this.http.post(`${this.apiUrl}/translate`, {
      text: text,
      target_lang: normalizedLang
    });
  }

}