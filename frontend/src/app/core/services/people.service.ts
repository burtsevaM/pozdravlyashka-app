import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  CreatePersonRequest,
  Person,
  UpcomingBirthday,
  UpdatePersonRequest,
} from '../models/person.models';

@Injectable({
  providedIn: 'root',
})
export class PeopleService {
  private readonly httpClient = inject(HttpClient);

  getPeople(teamId: string, includeArchived = false) {
    const params = includeArchived
      ? new HttpParams().set('includeArchived', 'true')
      : undefined;

    return this.httpClient.get<Person[]>(this.getPeopleUrl(teamId), { params });
  }

  getPerson(teamId: string, personId: string) {
    return this.httpClient.get<Person>(`${this.getPeopleUrl(teamId)}/${personId}`);
  }

  createPerson(teamId: string, data: CreatePersonRequest) {
    return this.httpClient.post<Person>(this.getPeopleUrl(teamId), data);
  }

  updatePerson(teamId: string, personId: string, data: UpdatePersonRequest) {
    return this.httpClient.patch<Person>(`${this.getPeopleUrl(teamId)}/${personId}`, data);
  }

  archivePerson(teamId: string, personId: string) {
    return this.httpClient.patch<Person>(
      `${this.getPeopleUrl(teamId)}/${personId}/archive`,
      {},
    );
  }

  getUpcomingBirthdays(teamId: string, days = 30) {
    const params = new HttpParams().set('days', String(days));
    return this.httpClient.get<UpcomingBirthday[]>(
      `${this.getPeopleUrl(teamId)}/upcoming-birthdays`,
      { params },
    );
  }

  private getPeopleUrl(teamId: string): string {
    return `${environment.apiUrl}/teams/${teamId}/people`;
  }
}
