export interface Session {
  id: string;
  userId: string;
  refreshToken: string | null;
  lastActivityAt: Date | null;
  lastRefreshAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
