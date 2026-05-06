import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { EmailStatus } from '../models/settings.models';

@Injectable({
  providedIn: 'root',
})
export class SettingsService {
  private readonly httpClient = inject(HttpClient);

  getEmailStatus() {
    return this.httpClient.get<EmailStatus>(`${environment.apiUrl}/settings/email-status`);
  }
}
