import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ImpexPayload {
  headerConfig: string;
  uid: string;
  contentMap: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class ImpexApiService {
  private readonly apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) { }

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

  // Updated to match backend expectations
  autoTranslate(text: string, lang: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/translate`, {
      text: text,
      lang: lang
    });
  }
}