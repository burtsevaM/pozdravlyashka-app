import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  CreateGiftHistoryRequest,
  GiftHistory,
  UpdateGiftHistoryRequest,
} from '../models/gift-history.models';

@Injectable({
  providedIn: 'root',
})
export class GiftHistoryService {
  private readonly httpClient = inject(HttpClient);

  getGiftHistory(teamId: string, personId: string) {
    return this.httpClient.get<GiftHistory[]>(this.getGiftHistoryUrl(teamId, personId));
  }

  createGiftHistory(teamId: string, personId: string, data: CreateGiftHistoryRequest) {
    return this.httpClient.post<GiftHistory>(this.getGiftHistoryUrl(teamId, personId), data);
  }

  updateGiftHistory(
    teamId: string,
    personId: string,
    giftHistoryId: string,
    data: UpdateGiftHistoryRequest,
  ) {
    return this.httpClient.patch<GiftHistory>(
      `${this.getGiftHistoryUrl(teamId, personId)}/${giftHistoryId}`,
      data,
    );
  }

  deleteGiftHistory(teamId: string, personId: string, giftHistoryId: string) {
    return this.httpClient.delete<void>(
      `${this.getGiftHistoryUrl(teamId, personId)}/${giftHistoryId}`,
    );
  }

  private getGiftHistoryUrl(teamId: string, personId: string): string {
    return `${environment.apiUrl}/teams/${teamId}/people/${personId}/gift-history`;
  }
}
