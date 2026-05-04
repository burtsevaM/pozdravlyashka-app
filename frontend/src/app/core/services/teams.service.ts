import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import { CreateTeamRequest, TeamWithRole } from '../models/team.models';

@Injectable({
  providedIn: 'root',
})
export class TeamsService {
  private readonly httpClient = inject(HttpClient);

  createTeam(name: string) {
    const request: CreateTeamRequest = { name };
    return this.httpClient.post<TeamWithRole>(`${environment.apiUrl}/teams`, request);
  }

  getMyTeams() {
    return this.httpClient.get<TeamWithRole[]>(`${environment.apiUrl}/teams`);
  }

  getTeam(teamId: string) {
    return this.httpClient.get<TeamWithRole>(`${environment.apiUrl}/teams/${teamId}`);
  }
}
