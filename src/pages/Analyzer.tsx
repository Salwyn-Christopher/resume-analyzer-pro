import { useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FileText, Shield, Briefcase, Target, Search, Sparkles,
  ArrowRight, Download, ChevronRight, RotateCcw, Zap,
  AlertCircle, CheckCircle,
} from "lucide-react";

import ResumeInput from "@/components/ats/ResumeInput";
import ParsingPanel from "@/components/ats/ParsingPanel";
import AtsHealthPanel from "@/components/ats/AtsHealthPanel";
import JdPanel from "@/components/ats/JdPanel";
import JobMatchPanel from "@/components/ats/JobMatchPanel";
import ImprovePanel from "@/components/ats/ImprovePanel";
import ComparePanel from "@/components/ats/ComparePanel";

import { parseResumeText } from "@/lib/analysis/parser";
import { analyzeATSHealth } from "@/lib/analysis/ats-analyzer";
import { analyzeJD } from "@/lib/analysis/jd-analyzer";
import { matchResumeToJD } from "@/lib/analysis/matcher";
import { improveResume } from "@/lib/analysis/improver";

import type {
  ParsedResume,
  ParsedJD,
  ATSHealthScore,
  JobMatchScore,
  ImprovedResume,
} from "@/lib/analysis/types";

type TabId =
  | "input"
  | "parsed"
  | "ats"
  | "jd"
  | "match"
  | "improve"
  | "compare"
  | "export";

const TABS: Array<{ id: TabId; label: string; icon: React.ReactNode; requires: string[] }> = [
  { id: "input", label: "New Analysis", icon: <Zap className="size-4" />, requires: [] },
  { id: "parsed", label: "Resume", icon: <FileText className="size-4" />, requires: ["resume"] },
  { id: "ats", label: "ATS Health", icon: <Shield className="size-4" />, requires: ["ats"] },
  { id: "jd", label: "Job Description", icon: <Briefcase className="size-4" />, requires: ["resume"] },
  { id: "match", label: "Job Match", icon: <Target className="size-4" />, requires: ["match"] },
  { id: "improve", label: "Improve", icon: <Sparkles className="size-4" />, requires: ["resume"] },
  { id: "compare", label: "Compare", icon: <ArrowRight className="size-4" />, requires: ["improved"] },
  { id: "export", label: "Export", icon: <Download className="size-4" />, requires: ["resume"] },
];

export default function Analyzer() {
  const [activeTab, setActiveTab] = useState<TabId>("input");
  const [resume, setResume] = useState<ParsedResume | null>(null);
  const [jd, setJd] = useState<ParsedJD | null>(null);
  const [atsHealth, setAtsHealth] = useState<ATSHealthScore | null>(null);
  const [jobMatch, setJobMatch] = useState<JobMatchScore | null>(null);
  const [improvedResume, setImprovedResume] = useState<ImprovedResume | null>(null);
  const [recheckedAts, setRecheckedAts] = useState<ATSHealthScore | null>(null);
  const [recheckedMatch, setRecheckedMatch] = useState<JobMatchScore | null>(null);
  const [currentText, setCurrentText] = useState("");
  const [fileName, setFileName] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Track what's available
  const available = {
    resume: !!resume,
    ats: !!atsHealth,
    jd: !!jd,
    match: !!jobMatch,
    improved: !!improvedResume,
  };

  // ---- Handlers ----

  const handleResumeLoaded = useCallback((text: string, name: string) => {
    setIsAnalyzing(true);
    setFileName(name);
    setCurrentText(text);

    // Parse
    const fileType = name.split(".").pop()?.toLowerCase() || "txt";
    const parsed = parseResumeText(text, fileType);
    setResume(parsed);

    // Analyze ATS health
    const health = analyzeATSHealth(parsed);
    setAtsHealth(health);

    // Reset dependent state
    setJobMatch(null);
    setImprovedResume(null);
    setRecheckedAts(null);
    setRecheckedMatch(null);

    setIsAnalyzing(false);
    setActiveTab("parsed");
  }, []);

  const handleJdAnalyze = useCallback((text: string) => {
    setIsAnalyzing(true);
    const parsed = analyzeJD(text);
    setJd(parsed);

    // Auto-match if resume is available
    if (resume) {
      const match = matchResumeToJD(resume, parsed);
      setJobMatch(match);
    }

    setIsAnalyzing(false);
    setActiveTab("jd");
  }, [resume]);

  const handleJdClear = useCallback(() => {
    setJd(null);
    setJobMatch(null);
  }, []);

  const handleImprove = useCallback((mode: "improve" | "tailor") => {
    if (!resume) return;
    setIsAnalyzing(true);

    const improved = improveResume(resume, jd, mode);
    setImprovedResume(improved);

    // Recheck the improved resume
    const reParsed = parseResumeText(improved.text, resume.fileType);
    const reAts = analyzeATSHealth(reParsed);
    setRecheckedAts(reAts);

    if (jd) {
      const reMatch = matchResumeToJD(reParsed, jd);
      setRecheckedMatch(reMatch);
    }

    setIsAnalyzing(false);
    setActiveTab("improve");
  }, [resume, jd]);

  const handleRecheck = useCallback((text: string) => {
    if (!resume) return;
    setIsAnalyzing(true);

    const reParsed = parseResumeText(text, resume.fileType);
    const reAts = analyzeATSHealth(reParsed);
    setRecheckedAts(reAts);

    if (jd) {
      const reMatch = matchResumeToJD(reParsed, jd);
      setRecheckedMatch(reMatch);
    }

    // Update the current resume with re-parsed version
    setResume(reParsed);
    setCurrentText(text);

    setIsAnalyzing(false);
    setActiveTab("compare");
  }, [resume, jd]);

  const handleEdit = useCallback((text: string) => {
    setCurrentText(text);
  }, []);

  const handleNewAnalysis = useCallback(() => {
    setResume(null);
    setJd(null);
    setAtsHealth(null);
    setJobMatch(null);
    setImprovedResume(null);
    setRecheckedAts(null);
    setRecheckedMatch(null);
    setCurrentText("");
    setFileName("");
    setActiveTab("input");
  }, []);

  const canNavigateTo = (tabId: TabId): boolean => {
    const tab = TABS.find(t => t.id === tabId);
    if (!tab) return false;
    if (tab.requires.length === 0) return true;
    return tab.requires.every(r => available[r as keyof typeof available]);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="size-4 text-primary" />
            </div>
            <div>
              <h1 className="text-sm font-semibold tracking-tight">ATS Resume Analyzer</h1>
              {fileName && (
                <p className="text-[10px] text-muted-foreground">{fileName}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {resume && (
              <Button variant="ghost" size="sm" onClick={handleNewAnalysis} className="gap-1.5 text-xs">
                <RotateCcw className="size-3.5" />
                New
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Sidebar Navigation */}
          <nav className="lg:w-56 shrink-0">
            <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {TABS.map((tab) => {
                const enabled = canNavigateTo(tab.id);
                const isCurrent = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors",
                      isCurrent
                        ? "bg-primary/10 text-primary"
                        : enabled
                          ? "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                          : "text-muted-foreground/40 cursor-not-allowed",
                    )}
                    onClick={() => enabled && setActiveTab(tab.id)}
                    disabled={!enabled}
                  >
                    {tab.icon}
                    {tab.label}
                    {isCurrent && <ChevronRight className="size-3 ml-auto hidden lg:block" />}
                    {enabled && !isCurrent && tab.requires.length > 0 && (
                      <CheckCircle className="size-3 ml-auto text-emerald-500 hidden lg:block" />
                    )}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Main Content */}
          <main className="flex-1 min-w-0">
            {/* Loading Overlay */}
            {isAnalyzing && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm">
                <Card className="p-6">
                  <div className="flex items-center gap-3">
                    <div className="size-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                    <span className="text-sm font-medium">Analyzing...</span>
                  </div>
                </Card>
              </div>
            )}

            {/* Tab Content */}
            {activeTab === "input" && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">Upload or Paste Your Resume</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Get a comprehensive ATS compatibility analysis, job matching, and improvement recommendations.
                  </p>
                </div>
                <ResumeInput onResumeLoaded={handleResumeLoaded} />
              </div>
            )}

            {activeTab === "parsed" && resume && (
              <div className="space-y-6">
                <SectionHeader
                  title="Resume Parsed"
                  subtitle="Extracted data from your resume"
                  action={{ label: "View ATS Health", onClick: () => setActiveTab("ats") }}
                />
                <ParsingPanel resume={resume} />
              </div>
            )}

            {activeTab === "ats" && atsHealth && resume && (
              <div className="space-y-6">
                <SectionHeader
                  title="ATS Health Analysis"
                  subtitle="How well your resume performs with ATS systems"
                  action={jd ? { label: "View Job Match", onClick: () => setActiveTab("match") } : undefined}
                />
                <AtsHealthPanel score={atsHealth} resumeName={fileName} />
              </div>
            )}

            {activeTab === "jd" && (
              <div className="space-y-6">
                <SectionHeader
                  title="Job Description"
                  subtitle="Analyze how well your resume matches a specific job"
                  action={jobMatch ? { label: "View Job Match", onClick: () => setActiveTab("match") } : undefined}
                />
                <JdPanel jd={jd} onAnalyze={handleJdAnalyze} onClear={handleJdClear} />
              </div>
            )}

            {activeTab === "match" && jobMatch && jd && (
              <div className="space-y-6">
                <SectionHeader
                  title="Job Match Analysis"
                  subtitle="How well your resume aligns with this job description"
                  action={{ label: "Improve Resume", onClick: () => setActiveTab("improve") }}
                />
                <JobMatchPanel score={jobMatch} jobTitle={jd.title} />
              </div>
            )}

            {activeTab === "improve" && resume && (
              <div className="space-y-6">
                <SectionHeader
                  title="Improve & Tailor"
                  subtitle="Enhance your resume without inventing information"
                  action={improvedResume ? { label: "Compare Versions", onClick: () => setActiveTab("compare") } : undefined}
                />
                <ImprovePanel
                  resume={resume}
                  jd={jd}
                  improvedResume={improvedResume}
                  onImprove={handleImprove}
                  onRecheck={handleRecheck}
                  onEdit={handleEdit}
                />
              </div>
            )}

            {activeTab === "compare" && resume && (
              <div className="space-y-6">
                <SectionHeader
                  title="Before & After"
                  subtitle="Compare your original and improved resume"
                  action={{ label: "Export", onClick: () => setActiveTab("export") }}
                />
                <ComparePanel
                  resume={resume}
                  originalAts={atsHealth}
                  improvedResume={improvedResume}
                  recheckedAts={recheckedAts}
                  recheckedMatch={recheckedMatch}
                  originalMatch={jobMatch}
                />
              </div>
            )}

            {activeTab === "export" && resume && (
              <div className="space-y-6">
                <SectionHeader title="Export Resume" subtitle="Download or copy your final resume" />
                <ComparePanel
                  resume={resume}
                  originalAts={atsHealth}
                  improvedResume={improvedResume}
                  recheckedAts={recheckedAts}
                  recheckedMatch={recheckedMatch}
                  originalMatch={jobMatch}
                />
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
      </div>
      {action && (
        <Button variant="outline" size="sm" onClick={action.onClick} className="gap-1.5 shrink-0">
          {action.label}
          <ChevronRight className="size-3.5" />
        </Button>
      )}
    </div>
  );
}
