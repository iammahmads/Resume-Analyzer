export interface UserProfile {
  _id: string;
  email: string;
  name: string;
  role: "seeker" | "admin";
  createdAt: string;
}

export interface ResumeDocument {
  _id: string;
  userId: string;
  title: string;
  contentText: string;
  createdAt: string;
}

export interface MetricItem {
  name: string;
  score: number;
  assessment: string;
}

export interface CategoryMetrics {
  avgScore: number;
  items: MetricItem[];
}

export interface AllMetrics {
  format: CategoryMetrics;
  experience: CategoryMetrics;
  skills: CategoryMetrics;
  language: CategoryMetrics;
}

export interface KeywordMatchStruct {
  matched: string[];
  missing: string[];
}

export interface InterviewQuestion {
  question: string;
  expectedAnswer: string;
}

export interface HrEvaluationStruct {
  strengths: string[];
  weaknesses: string[];
  suitability: string;
  interviewQuestions: InterviewQuestion[];
}

export interface ResumeAnalysis {
  _id: string;
  userId: string;
  userName: string;
  userEmail: string;
  jobTitle: string;
  jobDescription: string;
  resumeText: string;
  overallScore: number;
  matchingPercentage: number;
  metrics: AllMetrics;
  skillsGap: string[];
  keywordMatches: KeywordMatchStruct;
  coverLetter: string;
  hrEvaluation: HrEvaluationStruct;
  adminFeedback: string;
  createdAt: string;
}
