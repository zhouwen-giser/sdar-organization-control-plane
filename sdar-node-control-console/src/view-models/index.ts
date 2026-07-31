export interface StatusViewModel {
  value: string;
  label: string;
  tone: 'neutral' | 'info' | 'success' | 'warning' | 'danger';
  explanation: string;
}

export interface ResourceSummaryViewModel {
  id: string;
  name: string;
  summary: string;
  revision?: number | string;
  updatedAt: string;
  status: StatusViewModel;
  tags: string[];
  fields: Record<string, unknown>;
}

export interface ConvergenceViewModel {
  desiredRevision?: number;
  observedRevision?: number;
  state: 'converged' | 'progressing' | 'blocked' | 'unknown';
  explanation: string;
}
