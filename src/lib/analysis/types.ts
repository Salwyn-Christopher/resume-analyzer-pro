// ============================================================
// ATS Resume Analyzer – Core Types
// ============================================================

/** Contact info extracted from a resume */
export interface ContactInfo {
  name: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  portfolio: string;
}

/** A single parsed resume section */
export interface ResumeSection {
  id: string;
  title: string;
  rawTitle: string;
  content: string;
  items: ResumeItem[];
  order: number;
}

/** A bullet / item within a section (experience, project, etc.) */
export interface ResumeItem {
  title: string;
  subtitle: string;        // company, school, etc.
  dateRange: string;
  startDate: string;
  endDate: string;
  bullets: string[];
  technologies: string[];
  raw: string;
}

/** Parsed resume structure */
export interface ParsedResume {
  rawText: string;
  contact: ContactInfo;
  sections: ResumeSection[];
  allSkills: string[];
  fileType: string;
  wordCount: number;
  lineCount: number;
  isLatex: boolean;
  parsingWarnings: string[];
  detectedSections: string[];
}

// ---- JD types ----

export interface JDRequirement {
  text: string;
  category: "required" | "preferred";
  type: "skill" | "qualification" | "education" | "experience" | "tool" | "soft_skill" | "certification" | "responsibility";
  importance: number; // 0-1
}

export interface ParsedJD {
  rawText: string;
  title: string;
  requirements: JDRequirement[];
  keywords: string[];
  requiredSkills: string[];
  preferredSkills: string[];
  educationRequirements: string[];
  experienceRequirements: string[];
  tools: string[];
  responsibilities: string[];
}

// ---- Analysis types ----

export type Severity = "high" | "medium" | "low";
export type MatchLevel = "strong" | "match" | "partial" | "related" | "weak" | "missing";
export type GapLevel = "critical" | "important" | "optional";

export interface ATSIssue {
  id: string;
  category: string;
  severity: Severity;
  title: string;
  description: string;
  fix: string;
  section?: string;
}

export interface SectionAnalysis {
  sectionId: string;
  sectionTitle: string;
  quality: number; // 0-100
  clarity: number;
  atsReadability: number;
  problems: string[];
  recommendations: string[];
}

export interface BulletAnalysis {
  original: string;
  improved: string;
  actionVerb: boolean;
  hasWhat: boolean;
  hasHow: boolean;
  hasImpact: boolean;
  specificity: number;
  quality: number;
  changes: string[];
}

export interface RequirementMatch {
  requirement: string;
  category: "required" | "preferred";
  matchLevel: MatchLevel;
  evidence: string[];
  evidenceStrength: number; // 0-1
  explanation: string;
  suggestion: string;
}

export interface KeywordMatch {
  keyword: string;
  found: boolean;
  exactMatch: boolean;
  relatedTerms: string[];
  context: string;
}

export interface SkillGap {
  skill: string;
  level: GapLevel;
  category: "required" | "preferred";
  reason: string;
  partialCoverage: string;
  suggestion: string;
}

export interface WeakPart {
  id: string;
  area: string;
  issue: string;
  whyItMatters: string;
  howToFix: string;
  severity: Severity;
}

export interface Strength {
  area: string;
  detail: string;
}

export interface ATSHealthScore {
  overall: number; // 0-100
  breakdown: {
    structure: number;
    atsReadability: number;
    contactQuality: number;
    sectionOrganization: number;
    contentQuality: number;
    formatting: number;
  };
  issues: ATSIssue[];
  sectionAnalyses: SectionAnalysis[];
  bulletAnalyses: BulletAnalysis[];
  strengths: Strength[];
  weakParts: WeakPart[];
}

export interface JobMatchScore {
  overall: number; // 0-100
  requiredMatch: number;
  preferredMatch: number;
  requirementMatches: RequirementMatch[];
  keywordMatches: KeywordMatch[];
  skillGaps: SkillGap[];
  strengths: Strength[];
  weakParts: WeakPart[];
}

export interface ChangeRecord {
  section: string;
  field: string;
  original: string;
  improved: string;
  reason: string;
}

export interface ImprovedResume {
  text: string;
  sections: ResumeSection[];
  changes: ChangeRecord[];
  atsScore: number;
  jobMatchScore: number | null;
}

export interface AnalysisState {
  resume: ParsedResume | null;
  jd: ParsedJD | null;
  atsHealth: ATSHealthScore | null;
  jobMatch: JobMatchScore | null;
  improvedResume: ImprovedResume | null;
  tailoredResume: ImprovedResume | null;
  currentResumeText: string;
  activeTab: string;
  isAnalyzing: boolean;
  analysisStep: string;
}

// Default empty state
export function createEmptyAnalysisState(): AnalysisState {
  return {
    resume: null,
    jd: null,
    atsHealth: null,
    jobMatch: null,
    improvedResume: null,
    tailoredResume: null,
    currentResumeText: "",
    activeTab: "input",
    isAnalyzing: false,
    analysisStep: "",
  };
}
