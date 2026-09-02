import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Shield, AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp,
  CheckCircle, XCircle, MinusCircle,
} from "lucide-react";
import type { ATSHealthScore, ATSIssue, WeakPart, Strength, Severity } from "@/lib/analysis/types";

interface AtsHealthPanelProps {
  score: ATSHealthScore;
  resumeName: string;
}

export default function AtsHealthPanel({ score, resumeName }: AtsHealthPanelProps) {
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);

  const scoreColor = getScoreColor(score.overall);
  const scoreLabel = getScoreLabel(score.overall);
  const highIssues = score.issues.filter(i => i.severity === "high");
  const medIssues = score.issues.filter(i => i.severity === "medium");
  const lowIssues = score.issues.filter(i => i.severity === "low");

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
            <Shield className="size-5 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">ATS Health Score</span>
          </div>
          <div className={cn("text-6xl font-bold tracking-tight", scoreColor)}>
            {score.overall}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{scoreLabel}</p>
        </div>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <ScoreMini label="Structure" value={score.breakdown.structure} />
            <ScoreMini label="ATS Readability" value={score.breakdown.atsReadability} />
            <ScoreMini label="Contact Quality" value={score.breakdown.contactQuality} />
            <ScoreMini label="Section Organization" value={score.breakdown.sectionOrganization} />
            <ScoreMini label="Content Quality" value={score.breakdown.contentQuality} />
            <ScoreMini label="Formatting" value={score.breakdown.formatting} />
          </div>
        </CardContent>
      </Card>

      {/* Issue Summary */}
      <div className="grid grid-cols-3 gap-3">
        <IssueCountCard count={highIssues.length} label="High" severity="high" icon={<AlertCircle className="size-4" />} />
        <IssueCountCard count={medIssues.length} label="Medium" severity="medium" icon={<AlertTriangle className="size-4" />} />
        <IssueCountCard count={lowIssues.length} label="Low" severity="low" icon={<Info className="size-4" />} />
      </div>

      {/* Issues List */}
      {score.issues.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Issues to Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {score.issues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                expanded={expandedIssue === issue.id}
                onToggle={() => setExpandedIssue(expandedIssue === issue.id ? null : issue.id)}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Strengths */}
      {score.strengths.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <CheckCircle className="size-4 text-emerald-500" />
              Strengths
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

      {/* Weak Parts */}
      {score.weakParts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <XCircle className="size-4 text-amber-500" />
              Weak Areas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {score.weakParts.map((wp) => (
              <WeakPartCard key={wp.id} weakPart={wp} />
            ))}
          </CardContent>
        </Card>
      )}

      {/* Section Analyses */}
      {score.sectionAnalyses.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Section-Level Analysis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {score.sectionAnalyses.map((sa) => (
              <SectionAnalysisRow key={sa.sectionId} analysis={sa} />
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ---- Sub-components ----

function ScoreMini({ label, value }: { label: string; value: number }) {
  const color = getScoreColor(value);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className={cn("font-semibold", color)}>{value}</span>
      </div>
      <Progress value={value} className="h-1.5" />
    </div>
  );
}

function IssueCountCard({ count, label, severity, icon }: { count: number; label: string; severity: Severity; icon: React.ReactNode }) {
  return (
    <div className={cn(
      "rounded-lg border p-3 text-center",
      severity === "high" && "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/30",
      severity === "medium" && "border-amber-200 bg-amber-50/50 dark:border-amber-900 dark:bg-amber-950/30",
      severity === "low" && "border-blue-200 bg-blue-50/50 dark:border-blue-900 dark:bg-blue-950/30",
    )}>
      <div className={cn(
        "inline-flex items-center gap-1 text-sm font-bold",
        severity === "high" && "text-red-700 dark:text-red-400",
        severity === "medium" && "text-amber-700 dark:text-amber-400",
        severity === "low" && "text-blue-700 dark:text-blue-400",
      )}>
        {icon}
        {count}
      </div>
      <p className="text-xs text-muted-foreground mt-0.5">{label} Priority</p>
    </div>
  );
}

function IssueRow({ issue, expanded, onToggle }: { issue: ATSIssue; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          {issue.severity === "high" && <AlertCircle className="size-3.5 text-red-500 shrink-0" />}
          {issue.severity === "medium" && <AlertTriangle className="size-3.5 text-amber-500 shrink-0" />}
          {issue.severity === "low" && <Info className="size-3.5 text-blue-500 shrink-0" />}
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] font-medium",
              issue.severity === "high" && "border-red-300 text-red-700 dark:text-red-400",
              issue.severity === "medium" && "border-amber-300 text-amber-700 dark:text-amber-400",
              issue.severity === "low" && "border-blue-300 text-blue-700 dark:text-blue-400",
            )}
          >
            {issue.severity.toUpperCase()}
          </Badge>
          <span className="text-sm font-medium">{issue.title}</span>
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-2 text-sm">
          <p className="text-muted-foreground">{issue.description}</p>
          <div className="flex items-start gap-2">
            <span className="font-medium text-foreground shrink-0">Fix:</span>
            <span className="text-foreground">{issue.fix}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function WeakPartCard({ weakPart }: { weakPart: WeakPart }) {
  return (
    <div className="rounded-lg border p-3 space-y-2">
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={cn(
            "text-[10px] font-medium",
            weakPart.severity === "high" && "border-red-300 text-red-700 dark:text-red-400",
            weakPart.severity === "medium" && "border-amber-300 text-amber-700 dark:text-amber-400",
            weakPart.severity === "low" && "border-blue-300 text-blue-700 dark:text-blue-400",
          )}
        >
          {weakPart.severity.toUpperCase()}
        </Badge>
        <span className="text-sm font-medium">{weakPart.issue}</span>
      </div>
      <p className="text-xs text-muted-foreground">{weakPart.whyItMatters}</p>
      <p className="text-xs"><span className="font-medium">How to fix:</span> {weakPart.howToFix}</p>
    </div>
  );
}

function SectionAnalysisRow({ analysis }: { analysis: { sectionTitle: string; quality: number; clarity: number; atsReadability: number; problems: string[]; recommendations: string[] } }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium">{analysis.sectionTitle}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              Quality: {analysis.quality}
            </Badge>
            {analysis.problems.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {analysis.problems.length} {analysis.problems.length === 1 ? "issue" : "issues"}
              </Badge>
            )}
          </div>
        </div>
        {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
      </button>
      {expanded && (
        <div className="border-t bg-muted/20 px-4 py-3 space-y-3 text-sm">
          <div className="grid grid-cols-3 gap-3">
            <ScoreMini label="Quality" value={analysis.quality} />
            <ScoreMini label="Clarity" value={analysis.clarity} />
            <ScoreMini label="ATS Readability" value={analysis.atsReadability} />
          </div>
          {analysis.problems.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Problems</p>
              <ul className="space-y-1">
                {analysis.problems.map((p, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <MinusCircle className="size-3 mt-0.5 text-amber-500 shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {analysis.recommendations.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Recommendations</p>
              <ul className="space-y-1">
                {analysis.recommendations.map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <CheckCircle className="size-3 mt-0.5 text-emerald-500 shrink-0" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---- Helpers ----

function getScoreColor(score: number): string {
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent — Your resume is highly ATS-friendly";
  if (score >= 80) return "Good — Strong ATS compatibility with minor improvements possible";
  if (score >= 70) return "Fair — Several improvements recommended for better ATS performance";
  if (score >= 60) return "Needs Work — Significant issues that may affect ATS parsing";
  return "Poor — Major improvements needed for ATS compatibility";
}
