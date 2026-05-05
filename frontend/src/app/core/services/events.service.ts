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
import {
  CreateGiftIdeaRequest,
  GiftIdea,
  SelectedGiftRequest,
  UpdateGiftIdeaRequest,
} from '../models/gift-idea.models';

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

  getGiftIdeas(teamId: string, eventId: string) {
    return this.httpClient.get<GiftIdea[]>(this.getGiftIdeasUrl(teamId, eventId));
  }

  createGiftIdea(teamId: string, eventId: string, data: CreateGiftIdeaRequest) {
    return this.httpClient.post<GiftIdea[]>(this.getGiftIdeasUrl(teamId, eventId), data);
  }

  updateGiftIdea(
    teamId: string,
    eventId: string,
    ideaId: string,
    data: UpdateGiftIdeaRequest,
  ) {
    return this.httpClient.patch<GiftIdea[]>(
      `${this.getGiftIdeasUrl(teamId, eventId)}/${ideaId}`,
      data,
    );
  }

  deleteGiftIdea(teamId: string, eventId: string, ideaId: string) {
    return this.httpClient.delete<GiftIdea[]>(
      `${this.getGiftIdeasUrl(teamId, eventId)}/${ideaId}`,
    );
  }

  voteForGiftIdea(teamId: string, eventId: string, ideaId: string) {
    return this.httpClient.post<GiftIdea[]>(
      `${this.getGiftIdeasUrl(teamId, eventId)}/${ideaId}/vote`,
      {},
    );
  }

  removeVote(teamId: string, eventId: string) {
    return this.httpClient.delete<GiftIdea[]>(`${this.getEventsUrl(teamId)}/${eventId}/vote`);
  }

  selectFinalGift(teamId: string, eventId: string, giftIdeaId: string) {
    const data: SelectedGiftRequest = { giftIdeaId };
    return this.httpClient.patch<CelebrationEvent>(
      `${this.getEventsUrl(teamId)}/${eventId}/selected-gift`,
      data,
    );
  }

  clearFinalGift(teamId: string, eventId: string) {
    return this.httpClient.delete<CelebrationEvent>(
      `${this.getEventsUrl(teamId)}/${eventId}/selected-gift`,
    );
  }

  private getEventsUrl(teamId: string): string {
    return `${environment.apiUrl}/teams/${teamId}/events`;
  }

  private getGiftIdeasUrl(teamId: string, eventId: string): string {
    return `${this.getEventsUrl(teamId)}/${eventId}/gift-ideas`;
  }
}
