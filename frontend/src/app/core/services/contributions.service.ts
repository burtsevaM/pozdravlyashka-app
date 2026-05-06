import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';
import {
  ContributionSummary,
  CreateContributionRequest,
  UpdateContributionRequest,
  UpdateContributionStatusRequest,
} from '../models/contribution.models';

@Injectable({
  providedIn: 'root',
})
export class ContributionsService {
  private readonly httpClient = inject(HttpClient);

  getContributions(teamId: string, eventId: string) {
    return this.httpClient.get<ContributionSummary>(this.getContributionsUrl(teamId, eventId));
  }

  createContribution(teamId: string, eventId: string, data: CreateContributionRequest) {
    return this.httpClient.post<ContributionSummary>(
      this.getContributionsUrl(teamId, eventId),
      data,
    );
  }

  updateContribution(
    teamId: string,
    eventId: string,
    contributionId: string,
    data: UpdateContributionRequest,
  ) {
    return this.httpClient.patch<ContributionSummary>(
      `${this.getContributionsUrl(teamId, eventId)}/${contributionId}`,
      data,
    );
  }

  updateContributionStatus(
    teamId: string,
    eventId: string,
    contributionId: string,
    data: UpdateContributionStatusRequest,
  ) {
    return this.httpClient.patch<ContributionSummary>(
      `${this.getContributionsUrl(teamId, eventId)}/${contributionId}/status`,
      data,
    );
  }

  deleteContribution(teamId: string, eventId: string, contributionId: string) {
    return this.httpClient.delete<ContributionSummary>(
      `${this.getContributionsUrl(teamId, eventId)}/${contributionId}`,
    );
  }

  private getContributionsUrl(teamId: string, eventId: string): string {
    return `${environment.apiUrl}/teams/${teamId}/events/${eventId}/contributions`;
  }
}
