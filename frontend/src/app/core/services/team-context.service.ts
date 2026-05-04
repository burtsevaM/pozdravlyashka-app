import { DOCUMENT } from '@angular/common';
import { computed, inject, Injectable, signal } from '@angular/core';
import { tap } from 'rxjs';
import { TeamWithRole } from '../models/team.models';
import { TeamsService } from './teams.service';

const ACTIVE_TEAM_ID_KEY = 'pozdravlyashka_active_team_id';

@Injectable({
  providedIn: 'root',
})
export class TeamContextService {
  private readonly teamsService = inject(TeamsService);
  private readonly storage = inject(DOCUMENT).defaultView?.localStorage ?? null;

  readonly teams = signal<TeamWithRole[]>([]);
  readonly activeTeamId = signal<string | null>(this.readStoredTeamId());
  readonly isLoadingTeams = signal(false);

  readonly activeTeam = computed(() => {
    const activeTeamId = this.activeTeamId();
    return this.teams().find((team) => team.id === activeTeamId) ?? null;
  });

  loadTeams() {
    this.isLoadingTeams.set(true);

    return this.teamsService.getMyTeams().pipe(
      tap({
        next: (teams) => {
          this.teams.set(teams);
          this.reconcileActiveTeam(teams);
          this.isLoadingTeams.set(false);
        },
        error: () => {
          this.isLoadingTeams.set(false);
        },
      }),
    );
  }

  createTeam(name: string) {
    return this.teamsService.createTeam(name).pipe(
      tap((team) => {
        this.teams.update((teams) => [...teams.filter((item) => item.id !== team.id), team]);
        this.setActiveTeam(team.id);
      }),
    );
  }

  setActiveTeam(teamId: string | null): void {
    this.activeTeamId.set(teamId);

    if (teamId) {
      this.storage?.setItem(ACTIVE_TEAM_ID_KEY, teamId);
      return;
    }

    this.storage?.removeItem(ACTIVE_TEAM_ID_KEY);
  }

  private reconcileActiveTeam(teams: TeamWithRole[]): void {
    const activeTeamId = this.activeTeamId();

    if (activeTeamId && teams.some((team) => team.id === activeTeamId)) {
      return;
    }

    this.setActiveTeam(teams[0]?.id ?? null);
  }

  private readStoredTeamId(): string | null {
    return this.storage?.getItem(ACTIVE_TEAM_ID_KEY) ?? null;
  }
}
