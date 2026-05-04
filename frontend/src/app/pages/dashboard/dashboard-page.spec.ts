import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UpcomingBirthday } from '../../core/models/person.models';
import { TeamWithRole } from '../../core/models/team.models';
import { PeopleService } from '../../core/services/people.service';
import { TeamContextService } from '../../core/services/team-context.service';
import { DashboardPage } from './dashboard-page';

class TeamContextServiceStub {
  readonly teams = signal<TeamWithRole[]>([]);
  readonly activeTeamId = signal<string | null>(null);
  readonly activeTeam = computed(() => {
    const activeTeamId = this.activeTeamId();
    return this.teams().find((team) => team.id === activeTeamId) ?? null;
  });

  readonly loadTeams = vi.fn(() => of(this.teams()));
  readonly createTeam = vi.fn((name: string) => {
    const team: TeamWithRole = {
      id: 'team-id',
      name,
      createdById: 'user-id',
      createdAt: '2026-05-05T00:00:00.000Z',
      role: 'OWNER',
    };

    this.teams.set([team]);
    this.activeTeamId.set(team.id);

    return of(team);
  });

  setActiveTeam(teamId: string | null): void {
    this.activeTeamId.set(teamId);
  }
}

class PeopleServiceStub {
  readonly getUpcomingBirthdays = vi.fn(() => of([] as UpcomingBirthday[]));
}

describe('DashboardPage', () => {
  let fixture: ComponentFixture<DashboardPage>;
  let teamContext: TeamContextServiceStub;

  beforeEach(async () => {
    teamContext = new TeamContextServiceStub();

    await TestBed.configureTestingModule({
      imports: [DashboardPage],
      providers: [
        { provide: TeamContextService, useValue: teamContext },
        { provide: PeopleService, useClass: PeopleServiceStub },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardPage);
    fixture.detectChanges();
  });

  it('creates team with trimmed form value', () => {
    const input = fixture.nativeElement.querySelector(
      'input[formControlName="name"]',
    ) as HTMLInputElement;
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    input.value = '  Группа 102-43  ';
    input.dispatchEvent(new Event('input'));
    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(teamContext.createTeam).toHaveBeenCalledWith('Группа 102-43');
    expect(fixture.nativeElement.textContent).toContain('Активный коллектив: Группа 102-43');
    expect(fixture.nativeElement.textContent).toContain('Коллектив создан');
  });

  it('shows validation message for empty team name', () => {
    const form = fixture.nativeElement.querySelector('form') as HTMLFormElement;

    form.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(teamContext.createTeam).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Введите название');
  });
});
