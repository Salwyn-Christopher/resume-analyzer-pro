import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Sparkles, ArrowRight, Copy, Check, Edit3, RefreshCw,
  ChevronDown, ChevronUp, FileText, Eye,
} from "lucide-react";
import type { ImprovedResume, ChangeRecord, ParsedResume, ParsedJD } from "@/lib/analysis/types";

interface ImprovePanelProps {
  resume: ParsedResume;
  jd: ParsedJD | null;
  improvedResume: ImprovedResume | null;
  onImprove: (mode: "improve" | "tailor") => void;
  onRecheck: (text: string) => void;
  onEdit: (text: string) => void;
}

export default function ImprovePanel({ resume, jd, improvedResume, onImprove, onRecheck, onEdit }: ImprovePanelProps) {
  const [activeTab, setActiveTab] = useState<"changes" | "preview" | "edit">("changes");
  const [editText, setEditText] = useState(improvedResume?.text || "");
  const [copied, setCopied] = useState(false);
  const [expandedChange, setExpandedChange] = useState<number | null>(null);

  const handleCopy = async () => {
    const textToCopy = improvedResume?.text || "";
    await navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecheck = () => {
    onRecheck(editText || improvedResume?.text || resume.rawText);
  };

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => onImprove("improve")} className="gap-2">
          <Sparkles className="size-4" />
          Improve Resume
        </Button>
        {jd && (
          <Button onClick={() => onImprove("tailor")} variant="secondary" className="gap-2">
            <ArrowRight className="size-4" />
            Tailor to Job
          </Button>
        )}
      </div>

      {/* Results */}
      {improvedResume && (
        <div className="space-y-6">
          {/* Change Summary */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{improvedResume.changes.length}</p>
                  <p className="text-xs text-muted-foreground">Changes Made</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{improvedResume.atsScore || "—"}</p>
                  <p className="text-xs text-muted-foreground">New ATS Score</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-blue-600">{improvedResume.jobMatchScore || "—"}</p>
                  <p className="text-xs text-muted-foreground">New Job Match</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tab Navigation */}
          <div className="flex gap-1 rounded-lg bg-muted p-1">
            {[
              { id: "changes" as const, label: "Changes", icon: <ArrowRight className="size-3.5" /> },
              { id: "preview" as const, label: "Preview", icon: <Eye className="size-3.5" /> },
              { id: "edit" as const, label: "Edit & Recheck", icon: <Edit3 className="size-3.5" /> },
            ].map(tab => (
              <button
                key={tab.id}
                className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  activeTab === tab.id
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Changes Tab */}
          {activeTab === "changes" && improvedResume.changes.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">
                  Changes Made ({improvedResume.changes.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {improvedResume.changes.map((change, i) => (
                  <ChangeCard
                    key={i}
                    change={change}
                    index={i}
                    expanded={expandedChange === i}
                    onToggle={() => setExpandedChange(expandedChange === i ? null : i)}
                  />
                ))}
              </CardContent>
            </Card>
          )}

          {activeTab === "changes" && improvedResume.changes.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                No changes were needed. Your resume is already well-optimized.
              </CardContent>
            </Card>
          )}

          {/* Preview Tab */}
          {activeTab === "preview" && (
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-end mb-3">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                    {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                    {copied ? "Copied!" : "Copy Text"}
                  </Button>
                </div>
                <div className="whitespace-pre-wrap font-mono text-sm bg-muted/30 rounded-lg p-4 max-h-[500px] overflow-auto border">
                  {improvedResume.text}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Edit & Recheck Tab */}
          {activeTab === "edit" && (
            <Card>
              <CardContent className="p-4 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Edit the improved resume below, then recheck to see how your changes affect the scores.
                </p>
                <Textarea
                  className="min-h-[300px] font-mono text-sm"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
                <div className="flex gap-2">
                  <Button onClick={handleRecheck} className="gap-2">
                    <RefreshCw className="size-4" />
                    Recheck Edited Resume
                  </Button>
                  <Button variant="outline" onClick={() => setEditText(improvedResume.text)}>
                    Reset to Improved
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Empty State */}
      {!improvedResume && (
        <Card>
          <CardContent className="p-8 text-center">
            <Sparkles className="mx-auto size-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground">
              Click "Improve Resume" to get AI-powered suggestions for improving your resume content and structure.
            </p>
            {jd && (
              <p className="text-xs text-muted-foreground mt-2">
                Or click "Tailor to Job" to optimize your resume for the specific job description.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function ChangeCard({ change, index, expanded, onToggle }: { change: ChangeRecord; index: number; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="rounded-lg border overflow-hidden">
      <button
        className="flex w-full items-center justify-between p-3 text-left hover:bg-muted/50 transition-colors"
        onClick={onToggle}
      >
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="text-[10px] shrink-0">
            {change.section}
          </Badge>
          <span className="text-sm truncate">{change.field}</span>
        </div>
        {expanded ? <ChevronUp className="size-4 shrink-0" /> : <ChevronDown className="size-4 shrink-0" />}
      </button>
      {expanded && (
        <div className="border-t bg-muted/20 p-3 space-y-2 text-sm">
          <div className="grid grid-cols-1 gap-2">
            <div className="rounded bg-red-50/50 dark:bg-red-950/20 p-2">
              <p className="text-[10px] font-medium text-red-600 dark:text-red-400 mb-1">ORIGINAL</p>
              <p className="text-xs">{change.original || "—"}</p>
            </div>
            <div className="rounded bg-emerald-50/50 dark:bg-emerald-950/20 p-2">
              <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 mb-1">IMPROVED</p>
              <p className="text-xs">{change.improved || "—"}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            <span className="font-medium">Why:</span> {change.reason}
          </p>
        </div>
      )}
    </div>
  );
}
