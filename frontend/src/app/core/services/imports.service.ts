import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  CommitImportRequest,
  CommitImportResponse,
  ImportPreviewResponse,
  ImportPreviewRow,
} from '../models/import.models';

@Injectable({
  providedIn: 'root',
})
export class ImportsService {
  private readonly httpClient = inject(HttpClient);

  previewPeopleImport(teamId: string, file: File) {
    const formData = new FormData();
    formData.append('file', file);

    return this.httpClient.post<ImportPreviewResponse>(
      `${this.getImportsUrl(teamId)}/preview`,
      formData,
    );
  }

  commitPeopleImport(teamId: string, rows: ImportPreviewRow[]) {
    const request: CommitImportRequest = {
      rows: rows
        .filter((row) => row.valid && row.person)
        .map((row) => ({
          rowNumber: row.rowNumber,
          person: row.person!,
          giftHistory: row.giftHistory,
        })),
    };

    return this.httpClient.post<CommitImportResponse>(
      `${this.getImportsUrl(teamId)}/commit`,
      request,
    );
  }

  downloadPeopleImportTemplate(teamId: string) {
    return this.httpClient.get(`${this.getImportsUrl(teamId)}/template`, {
      responseType: 'blob',
    });
  }

  private getImportsUrl(teamId: string): string {
    return `${environment.apiUrl}/teams/${teamId}/imports/people`;
  }
}
