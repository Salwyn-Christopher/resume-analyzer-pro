import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Briefcase, CheckCircle, XCircle, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import type { ParsedJD } from "@/lib/analysis/types";

interface JdPanelProps {
  jd: ParsedJD | null;
  onAnalyze: (text: string) => void;
  onClear: () => void;
}

export default function JdPanel({ jd, onAnalyze, onClear }: JdPanelProps) {
  const [text, setText] = useState("");
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleSubmit = () => {
    if (text.trim()) {
      onAnalyze(text.trim());
      setShowAnalysis(true);
    }
  };

  const handleClear = () => {
    setText("");
    onClear();
    setShowAnalysis(false);
  };

  return (
    <div className="space-y-6">
      {/* JD Input */}
      {!jd ? (
        <div className="space-y-4">
          <div className="rounded-lg border border-dashed border-muted-foreground/25 p-6 text-center">
            <Briefcase className="mx-auto size-8 text-muted-foreground/50 mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Paste a job description to enable job matching analysis
            </p>
          </div>
          <Textarea
            placeholder={"Paste the job description here...\n\nExample:\n\nSenior Software Engineer\n\nRequired:\n- 5+ years of experience with Python\n- Experience with AWS\n- Strong SQL skills\n\nPreferred:\n- Experience with Kubernetes\n- GraphQL knowledge"}
            className="min-h-[240px] text-sm"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-between items-center">
            {text && (
              <Badge variant="secondary" className="text-xs">
                {text.split(/\s+/).filter(Boolean).length} words
              </Badge>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleClear} disabled={!text}>
                <Trash2 className="mr-1.5 size-3.5" />
                Clear
              </Button>
              <Button size="sm" disabled={!text.trim()} onClick={handleSubmit}>
                <Briefcase className="mr-1.5 size-3.5" />
                Analyze JD
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* JD loaded banner */}
          <div className="flex items-center justify-between rounded-lg border bg-emerald-50/50 dark:bg-emerald-950/30 p-4">
            <div className="flex items-center gap-3">
              <CheckCircle className="size-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <p className="text-sm font-medium">Job Description Analyzed</p>
                <p className="text-xs text-muted-foreground">
                  {jd.title || "Untitled Position"} • {jd.requirements.length} requirements found • {jd.keywords.length} keywords extracted
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              <Trash2 className="mr-1 size-3.5" />
              Remove
            </Button>
          </div>

          {/* JD Analysis */}
          <JdAnalysisView jd={jd} />
        </div>
      )}
    </div>
  );
}

function JdAnalysisView({ jd }: { jd: ParsedJD }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const requiredReqs = jd.requirements.filter(r => r.category === "required");
  const preferredReqs = jd.requirements.filter(r => r.category === "preferred");

  const toggle = (s: string) => setExpandedSection(expandedSection === s ? null : s);

  return (
    <div className="space-y-4">
      {/* Title */}
      {jd.title && (
        <Card>
          <CardContent className="p-4">
            <p className="text-sm font-medium">{jd.title}</p>
          </CardContent>
        </Card>
      )}

      {/* Required Requirements */}
      <Card>
        <button
          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
          onClick={() => toggle("required")}
        >
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Required ({requiredReqs.length})</CardTitle>
          </div>
          {expandedSection === "required" ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {expandedSection === "required" && (
          <CardContent className="pt-0 space-y-2">
            {requiredReqs.map((req, i) => (
              <RequirementRow key={i} req={req} />
            ))}
          </CardContent>
        )}
      </Card>

      {/* Preferred Requirements */}
      <Card>
        <button
          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
          onClick={() => toggle("preferred")}
        >
          <div className="flex items-center gap-2">
            <CardTitle className="text-sm font-medium">Preferred ({preferredReqs.length})</CardTitle>
          </div>
          {expandedSection === "preferred" ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {expandedSection === "preferred" && (
          <CardContent className="pt-0 space-y-2">
            {preferredReqs.map((req, i) => (
              <RequirementRow key={i} req={req} />
            ))}
          </CardContent>
        )}
      </Card>

      {/* Keywords */}
      <Card>
        <button
          className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
          onClick={() => toggle("keywords")}
        >
          <CardTitle className="text-sm font-medium">Keywords ({jd.keywords.length})</CardTitle>
          {expandedSection === "keywords" ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
        {expandedSection === "keywords" && (
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-1.5">
              {jd.keywords.map((kw) => (
                <Badge key={kw} variant="secondary" className="text-xs font-normal">
                  {kw}
                </Badge>
              ))}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}

function RequirementRow({ req }: { req: { text: string; category: string; type: string; importance: number } }) {
  const typeColors: Record<string, string> = {
    skill: "bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300",
    tool: "bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300",
    experience: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    education: "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300",
    certification: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
    soft_skill: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300",
    qualification: "bg-orange-100 text-orange-800 dark:bg-orange-900/50 dark:text-orange-300",
    responsibility: "bg-slate-100 text-slate-800 dark:bg-slate-900/50 dark:text-slate-300",
  };

  return (
    <div className="flex items-start gap-2 text-sm rounded-md border p-2.5">
      <Badge className={cn("text-[10px] font-medium shrink-0", typeColors[req.type] || typeColors.skill)}>
        {req.type.replace("_", " ")}
      </Badge>
      <span className="text-foreground">{req.text}</span>
    </div>
  );
}
