import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  CelebrationEvent,
  CreateEventRequest,
  EventFilters,
  UpdateEventRequest,
  UpdateEventStatusRequest,
} from '../models/event.models';

@Injectable({
  providedIn: 'root',
})
export class EventsService {
  private readonly httpClient = inject(HttpClient);

  getEvents(teamId: string, filters: EventFilters = {}) {
    let params = new HttpParams();

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (filters.personId) {
      params = params.set('personId', filters.personId);
    }

    return this.httpClient.get<CelebrationEvent[]>(this.getEventsUrl(teamId), { params });
  }

  getEvent(teamId: string, eventId: string) {
    return this.httpClient.get<CelebrationEvent>(`${this.getEventsUrl(teamId)}/${eventId}`);
  }

  createEvent(teamId: string, data: CreateEventRequest) {
    return this.httpClient.post<CelebrationEvent>(this.getEventsUrl(teamId), data);
  }

  updateEvent(teamId: string, eventId: string, data: UpdateEventRequest) {
    return this.httpClient.patch<CelebrationEvent>(
      `${this.getEventsUrl(teamId)}/${eventId}`,
      data,
    );
  }

  updateEventStatus(teamId: string, eventId: string, data: UpdateEventStatusRequest) {
    return this.httpClient.patch<CelebrationEvent>(
      `${this.getEventsUrl(teamId)}/${eventId}/status`,
      data,
    );
  }

  private getEventsUrl(teamId: string): string {
    return `${environment.apiUrl}/teams/${teamId}/events`;
  }
}
