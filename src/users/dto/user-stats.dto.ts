export class UserStatsDto {
  id!: string;
  username!: string;
  elo!: number;
  gamesPlayed!: number;
  wins!: number;
  losses!: number;
  draws!: number;
  winRate!: number;
}
