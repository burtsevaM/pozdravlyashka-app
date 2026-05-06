import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CreateDelegationRequest, Delegation } from '../models/delegation.models';
import { CelebrationEvent } from '../models/event.models';

export type TransferOrganizerResponse = {
  event: CelebrationEvent;
  delegation: Delegation;
};

@Injectable({
  providedIn: 'root',
})
export class DelegationsService {
  private readonly httpClient = inject(HttpClient);

  assignDeputy(teamId: string, eventId: string, deputyId: string | null) {
    return this.httpClient.patch<CelebrationEvent>(`${this.getEventUrl(teamId, eventId)}/deputy`, {
      deputyId,
    });
  }

  removeDeputy(teamId: string, eventId: string) {
    return this.httpClient.delete<CelebrationEvent>(`${this.getEventUrl(teamId, eventId)}/deputy`);
  }

  transferOrganizer(teamId: string, eventId: string, data: CreateDelegationRequest) {
    return this.httpClient.post<TransferOrganizerResponse>(
      `${this.getEventUrl(teamId, eventId)}/delegations`,
      data,
    );
  }

  getDelegations(teamId: string, eventId: string) {
    return this.httpClient.get<Delegation[]>(`${this.getEventUrl(teamId, eventId)}/delegations`);
  }

  private getEventUrl(teamId: string, eventId: string): string {
    return `${environment.apiUrl}/teams/${teamId}/events/${eventId}`;
  }
}
