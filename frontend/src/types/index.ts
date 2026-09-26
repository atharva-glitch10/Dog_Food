export type Role = 'ADMIN' | 'ORGANIZER' | 'JUDGE' | 'PARTICIPANT';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  bio?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
}

export interface Track {
  id: string;
  eventId: string;
  name: string;
  description: string;
  colorHex: string;
  _count?: { projects: number };
}

export interface Prize {
  id: string;
  eventId: string;
  trackId?: string | null;
  name: string;
  description: string;
  amount?: string | null;
  rank: number;
  track?: Track | null;
}

export interface RubricCriterion {
  id: string;
  rubricId: string;
  title: string;
  description: string;
  weight: number;
  maxScore: number;
  orderIndex: number;
}

export interface Rubric {
  id: string;
  eventId: string;
  name: string;
  description?: string | null;
  criteria: RubricCriterion[];
}

export interface EventSettings {
  id: string;
  eventId: string;
  minTeamSize: number;
  maxTeamSize: number;
  allowCommunityVoting: boolean;
  votingEligibility: 'PUBLIC' | 'PARTICIPANTS_ONLY' | 'VERIFIED_USERS';
  votesPerUser: number;
  hideResultsUntilPublished: boolean;
  randomizeGallery: boolean;
  assignmentsPerProject: number;
  defaultNormalization: string;
}

export interface Event {
  id: string;
  slug: string;
  name: string;
  tagline?: string | null;
  description: string;
  status: 'DRAFT' | 'REGISTRATION_OPEN' | 'SUBMISSION_OPEN' | 'JUDGING_ACTIVE' | 'RESULTS_PUBLISHED' | 'ARCHIVED';
  registrationStartDate: string;
  registrationEndDate: string;
  submissionStartDate: string;
  submissionDeadline: string;
  judgingStartDate: string;
  judgingDeadline: string;
  resultsPublishedAt?: string | null;
  settings?: EventSettings | null;
  tracks?: Track[];
  prizes?: Prize[];
  rubric?: Rubric | null;
  _count?: {
    teams: number;
    projects: number;
    judges: number;
    votes?: number;
  };
}

export interface TeamMember {
  id: string;
  teamId: string;
  userId: string;
  role: 'LEADER' | 'MEMBER';
  joinedAt: string;
  user: User;
}

export interface Team {
  id: string;
  eventId: string;
  name: string;
  description?: string | null;
  inviteCode: string;
  createdAt: string;
  event?: Event;
  members: TeamMember[];
  project?: Project | null;
  invitations?: any[];
}

export interface Project {
  id: string;
  eventId: string;
  teamId: string;
  trackId?: string | null;
  title: string;
  tagline?: string | null;
  problemStatement: string;
  solutionDescription: string;
  technologies: string[];
  repoUrl?: string | null;
  demoUrl?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  customFields?: Record<string, any>;
  status: 'DRAFT' | 'SUBMITTED' | 'FINALIZED';
  submittedAt?: string | null;
  rawScore?: number | null;
  normalizedScore?: number | null;
  finalRank?: number | null;
  createdAt: string;
  updatedAt: string;
  event?: Event;
  team: Team;
  track?: Track | null;
  _count?: {
    votes?: number;
    evaluations?: number;
    judgeAssignments?: number;
  };
}

export interface EvaluationScore {
  id: string;
  evaluationId: string;
  criterionId: string;
  score: number;
  criterion?: RubricCriterion;
}

export interface Evaluation {
  id: string;
  eventId: string;
  judgeId: string;
  projectId: string;
  isDraft: boolean;
  weightedTotal: number;
  feedback?: string | null;
  createdAt: string;
  scores: EvaluationScore[];
  judge?: { user: User };
  project?: Project;
}
