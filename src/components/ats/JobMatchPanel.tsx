import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Target, CheckCircle, XCircle, AlertTriangle, MinusCircle,
  ChevronDown, ChevronUp, Link, Search, ShieldAlert,
} from "lucide-react";
import type { JobMatchScore, RequirementMatch, KeywordMatch, SkillGap, MatchLevel } from "@/lib/analysis/types";

interface JobMatchPanelProps {
  score: JobMatchScore;
  jobTitle: string;
}

export default function JobMatchPanel({ score, jobTitle }: JobMatchPanelProps) {
  const [activeSection, setActiveSection] = useState<"requirements" | "keywords" | "evidence" | "gaps">("requirements");

  const strongCount = score.requirementMatches.filter(m => m.matchLevel === "strong" || m.matchLevel === "match").length;
  const partialCount = score.requirementMatches.filter(m => m.matchLevel === "partial" || m.matchLevel === "related").length;
  const missingCount = score.requirementMatches.filter(m => m.matchLevel === "weak" || m.matchLevel === "missing").length;

  const matchedKw = score.keywordMatches.filter(k => k.found).length;
  const missingKw = score.keywordMatches.filter(k => !k.found).length;

  return (
    <div className="space-y-6">
      {/* Score Hero */}
      <Card className="overflow-hidden">
        <div className={cn(
          "px-6 py-8 text-center",
          score.overall >= 80 ? "bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/50 dark:to-emerald-900/30" :
          score.overall >= 60 ? "bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/50 dark:to-amber-900/30" :
          "bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-950/50 dark:to-red-900/30"
        )}>
          <div className="inline-flex items-center gap-2 mb-2">
            <Target className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Job Match Score</span>
          </div>
          <div className={cn("text-6xl font-bold tracking-tight", getScoreColor(score.overall))}>
            {score.overall}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{getMatchLabel(score.overall)}</p>
          {jobTitle && (
            <Badge variant="secondary" className="mt-3">{jobTitle}</Badge>
          )}
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">{score.requiredMatch}</p>
              <p className="text-xs text-muted-foreground">Required Match</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{score.preferredMatch}</p>
              <p className="text-xs text-muted-foreground">Preferred Match</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold">{matchedKw}/{score.keywordMatches.length}</p>
              <p className="text-xs text-muted-foreground">Keywords Found</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Badges */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard count={strongCount} label="Strong/Match" color="emerald" icon={<CheckCircle className="size-4" />} />
        <SummaryCard count={partialCount} label="Partial/Related" color="amber" icon={<AlertTriangle className="size-4" />} />
        <SummaryCard count={missingCount} label="Missing/Weak" color="red" icon={<XCircle className="size-4" />} />
      </div>

      {/* Section Tabs */}
      <div className="flex gap-1 rounded-lg bg-muted p-1">
        {[
          { id: "requirements" as const, label: "Requirements", count: score.requirementMatches.length },
          { id: "keywords" as const, label: "Keywords", count: score.keywordMatches.length },
          { id: "evidence" as const, label: "Evidence", count: score.requirementMatches.filter(m => m.evidence.length > 0).length },
          { id: "gaps" as const, label: "Skill Gaps", count: score.skillGaps.length },
        ].map(tab => (
          <button
            key={tab.id}
            className={cn(
              "flex-1 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              activeSection === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            onClick={() => setActiveSection(tab.id)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {/* Requirements Tab */}
      {activeSection === "requirements" && (
        <RequirementsSection matches={score.requirementMatches} />
      )}

      {/* Keywords Tab */}
      {activeSection === "keywords" && (
        <KeywordsSection matches={score.keywordMatches} />
      )}

      {/* Evidence Tab */}
      {activeSection === "evidence" && (
        <EvidenceSection matches={score.requirementMatches} />
      )}

      {/* Skill Gaps Tab */}
      {activeSection === "gaps" && (
        <SkillGapsSection gaps={score.skillGaps} />
      )}

      {/* Strengths */}
      {score.strengths.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              Job Match Strengths
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {score.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="size-3.5 mt-0.5 text-emerald-500 shrink-0" />
                <div>
                  <span className="font-medium">{s.area}</span>
                  <span className="text-muted-foreground ml-1">— {s.detail}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- Sub-sections ----

function RequirementsSection({ matches }: { matches: RequirementMatch[] }) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  // Sort: missing first, then weak, then partial, then match, then strong
  const sortOrder: Record<MatchLevel, number> = { missing: 0, weak: 1, partial: 2, related: 3, match: 4, strong: 5 };
  const sorted = [...matches].sort((a, b) => sortOrder[a.matchLevel] - sortOrder[b.matchLevel]);

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        {sorted.map((match, i) => (
          <RequirementMatchRow
            key={i}
            match={match}
            expanded={expandedIdx === i}
            onToggle={() => setExpandedIdx(expandedIdx === i ? null : i)}
          />
        ))}
      </CardContent>
    </Card>
  );
}

function RequirementMatchRow({ match, expanded, onToggle }: { match: RequirementMatch; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <MatchIcon level={match.matchLevel} />
          <span className="text-xs font-medium text-muted-foreground shrink-0">
            {match.category.toUpperCase()}
          </span>
          <span className="text-sm truncate">{match.requirement}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <MatchBadge level={match.matchLevel} />
          {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-2 text-sm">
          <p className="text-muted-foreground">{match.explanation}</p>
          {match.evidence.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Resume Evidence:</p>
              {match.evidence.map((e, i) => (
                <p key={i} className="text-xs bg-muted/50 rounded p-2 mb-1 italic">"{e}"</p>
              ))}
            </div>
          )}
          {match.suggestion && (
            <p className="text-xs"><span className="font-medium">Suggestion:</span> {match.suggestion}</p>
          )}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Evidence Strength:</span>
            <Progress value={match.evidenceStrength * 100} className="h-1.5 w-24" />
            <span className="text-xs font-medium">{Math.round(match.evidenceStrength * 100)}%</span>
          </div>
        </div>
      )}
    </div>
  );
}

function KeywordsSection({ matches }: { matches: KeywordMatch[] }) {
  const found = matches.filter(k => k.found);
  const missing = matches.filter(k => !k.found);

  return (
    <div className="space-y-4">
      {found.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              Matched Keywords ({found.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {found.map((kw) => (
                <Badge key={kw.keyword} className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0 text-xs">
                  {kw.keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {missing.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="size-4 text-red-500" />
              Missing Keywords ({missing.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-1.5">
              {missing.map((kw) => (
                <Badge key={kw.keyword} variant="outline" className="border-red-200 text-red-700 dark:text-red-400 text-xs">
                  {kw.keyword}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function EvidenceSection({ matches }: { matches: RequirementMatch[] }) {
  const withEvidence = matches.filter(m => m.evidence.length > 0);
  const noEvidence = matches.filter(m => m.evidence.length === 0);

  return (
    <div className="space-y-4">
      {withEvidence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Link className="size-4 text-emerald-500" />
              Evidence Found ({withEvidence.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {withEvidence.map((m, i) => (
              <div key={i} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <MatchBadge level={m.matchLevel} />
                  <span className="text-sm font-medium">{m.requirement}</span>
                </div>
                {m.evidence.map((e, j) => (
                  <div key={j} className="flex items-start gap-2 text-xs bg-muted/50 rounded p-2">
                    <Search className="size-3 mt-0.5 text-muted-foreground shrink-0" />
                    <span className="italic">"{e}"</span>
                  </div>
                ))}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Strength:</span>
                  <Progress value={m.evidenceStrength * 100} className="h-1.5 w-20" />
                  <span className="text-xs font-medium">{Math.round(m.evidenceStrength * 100)}%</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {noEvidence.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-500" />
              No Evidence ({noEvidence.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {noEvidence.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-sm p-2 rounded bg-muted/30">
                <MinusCircle className="size-3.5 text-muted-foreground shrink-0" />
                <span className="font-medium">{m.requirement}</span>
                <span className="text-xs text-muted-foreground">— {m.suggestion}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SkillGapsSection({ gaps }: { gaps: SkillGap[] }) {
  const critical = gaps.filter(g => g.level === "critical");
  const important = gaps.filter(g => g.level === "important");
  const optional = gaps.filter(g => g.level === "optional");

  return (
    <div className="space-y-4">
      {critical.length > 0 && (
        <GapGroup title="Critical Gaps" gaps={critical} color="red" />
      )}
      {important.length > 0 && (
        <GapGroup title="Important Gaps" gaps={important} color="amber" />
      )}
      {optional.length > 0 && (
        <GapGroup title="Optional Gaps" gaps={optional} color="blue" />
      )}
      {gaps.length === 0 && (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            No significant skill gaps detected. Your resume aligns well with this job description.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GapGroup({ title, gaps, color }: { title: string; gaps: SkillGap[]; color: "red" | "amber" | "blue" }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={cn("text-sm font-medium", {
          "text-red-700 dark:text-red-400": color === "red",
          "text-amber-700 dark:text-amber-400": color === "amber",
          "text-blue-700 dark:text-blue-400": color === "blue",
        })}>
          {title} ({gaps.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {gaps.map((gap, i) => (
          <div key={i} className="rounded-lg border p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">{gap.skill}</span>
              <Badge variant="outline" className="text-[10px]">{gap.category}</Badge>
            </div>
            <p className="text-xs text-muted-foreground">{gap.reason}</p>
            {gap.partialCoverage && (
              <p className="text-xs"><span className="font-medium">Partial coverage:</span> {gap.partialCoverage}</p>
            )}
            {gap.suggestion && (
              <p className="text-xs"><span className="font-medium">Suggestion:</span> {gap.suggestion}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

// ---- Shared components ----

function MatchIcon({ level }: { level: MatchLevel }) {
  switch (level) {
    case "strong": return <CheckCircle className="size-4 text-emerald-500 shrink-0" />;
    case "match": return <CheckCircle className="size-4 text-green-500 shrink-0" />;
    case "partial": return <AlertTriangle className="size-4 text-amber-500 shrink-0" />;
    case "related": return <AlertTriangle className="size-4 text-orange-500 shrink-0" />;
    case "weak": return <MinusCircle className="size-4 text-red-400 shrink-0" />;
    case "missing": return <XCircle className="size-4 text-red-500 shrink-0" />;
  }
}

function MatchBadge({ level }: { level: MatchLevel }) {
  const colors: Record<MatchLevel, string> = {
    strong: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300 border-0",
    match: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 border-0",
    partial: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 border-0",
    related: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300 border-0",
    weak: "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300 border-0",
    missing: "bg-red-200 text-red-900 dark:bg-red-900/70 dark:text-red-200 border-0",
  };
  return (
    <Badge className={cn("text-[10px] font-medium capitalize", colors[level])}>
      {level}
    </Badge>
  );
}

function SummaryCard({ count, label, color, icon }: { count: number; label: string; color: string; icon: React.ReactNode }) {
  return (
    <div className={cn(
      "rounded-lg border p-3 text-center",
      color === "emerald" && "border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30",
      color === "amber" && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30",
      color === "red" && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30",
    )}>
      <div className={cn("inline-flex items-center gap-1 text-sm font-bold", {
        "text-emerald-700 dark:text-emerald-400": color === "emerald",
        "text-amber-700 dark:text-amber-400": color === "amber",
        "text-red-700 dark:text-red-400": color === "red",
      })}>
        {icon} {count}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getMatchLabel(score: number): string {
  if (score >= 85) return "Excellent match — Strong alignment with job requirements";
  if (score >= 70) return "Good match — Meets most requirements with some gaps";
  if (score >= 55) return "Moderate match — Key gaps exist that should be addressed";
  if (score >= 40) return "Limited match — Significant gaps between resume and requirements";
  return "Weak match — Major gaps; consider if this role is the right fit";
}
