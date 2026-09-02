import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  ArrowRight, Copy, Check, Download, FileText, Code, Columns2,
} from "lucide-react";
import type { ParsedResume, ATSHealthScore, JobMatchScore, ImprovedResume } from "@/lib/analysis/types";

interface ComparePanelProps {
  resume: ParsedResume;
  originalAts: ATSHealthScore | null;
  improvedResume: ImprovedResume | null;
  recheckedAts: ATSHealthScore | null;
  recheckedMatch: JobMatchScore | null;
  originalMatch: JobMatchScore | null;
}

export default function ComparePanel({
  resume, originalAts, improvedResume, recheckedAts, recheckedMatch, originalMatch,
}: ComparePanelProps) {
  const [copied, setCopied] = useState(false);
  const [exportFormat, setExportFormat] = useState<"text" | "markdown" | "latex">("text");

  const handleCopy = async () => {
    const text = improvedResume?.text || resume.rawText;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = improvedResume?.text || resume.rawText;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportFormat === "markdown" ? "resume.md" : exportFormat === "latex" ? "resume.tex" : "resume.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Score Comparison */}
      {(originalAts || recheckedAts) && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Columns2 className="size-4" />
              Score Comparison
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-6">
              {/* ATS Score */}
              <div className="space-y-3">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">ATS Health Score</p>
                <div className="flex items-end gap-3">
                  <div className="text-center">
                    <p className="text-3xl font-bold">{originalAts?.overall ?? "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Original</p>
                  </div>
                  {recheckedAts && (
                    <>
                      <ArrowRight className="size-4 text-muted-foreground mb-1" />
                      <div className="text-center">
                        <p className={cn("text-3xl font-bold", recheckedAts.overall > (originalAts?.overall ?? 0) ? "text-emerald-600" : recheckedAts.overall < (originalAts?.overall ?? 0) ? "text-red-600" : "")}>
                          {recheckedAts.overall}
                        </p>
                        <p className="text-[10px] text-muted-foreground">Improved</p>
                      </div>
                      {originalAts && (
                        <Badge
                          variant={recheckedAts.overall > originalAts.overall ? "default" : recheckedAts.overall < originalAts.overall ? "destructive" : "secondary"}
                          className="text-xs mb-1"
                        >
                          {recheckedAts.overall > originalAts.overall ? "+" : ""}{recheckedAts.overall - originalAts.overall}
                        </Badge>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Job Match Score */}
              {(originalMatch || recheckedMatch) && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Job Match Score</p>
                  <div className="flex items-end gap-3">
                    <div className="text-center">
                      <p className="text-3xl font-bold">{originalMatch?.overall ?? "—"}</p>
                      <p className="text-[10px] text-muted-foreground">Original</p>
                    </div>
                    {recheckedMatch && (
                      <>
                        <ArrowRight className="size-4 text-muted-foreground mb-1" />
                        <div className="text-center">
                          <p className={cn("text-3xl font-bold", recheckedMatch.overall > (originalMatch?.overall ?? 0) ? "text-emerald-600" : recheckedMatch.overall < (originalMatch?.overall ?? 0) ? "text-red-600" : "")}>
                            {recheckedMatch.overall}
                          </p>
                          <p className="text-[10px] text-muted-foreground">Improved</p>
                        </div>
                        {originalMatch && (
                          <Badge
                            variant={recheckedMatch.overall > originalMatch.overall ? "default" : recheckedMatch.overall < originalMatch.overall ? "destructive" : "secondary"}
                            className="text-xs mb-1"
                          >
                            {recheckedMatch.overall > originalMatch.overall ? "+" : ""}{recheckedMatch.overall - originalMatch.overall}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* What Changed */}
      {improvedResume && improvedResume.changes.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">What Changed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Requirements Improved</p>
                {improvedResume.changes.filter(c => c.section === "experience" || c.section === "projects").length > 0 ? (
                  <ul className="space-y-1">
                    {improvedResume.changes.filter(c => c.section === "experience" || c.section === "projects").slice(0, 5).map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <Check className="size-3 mt-0.5 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">{c.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No changes to experience/project bullets</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Keywords & Skills</p>
                {improvedResume.changes.filter(c => c.section === "skills" || c.section === "summary").length > 0 ? (
                  <ul className="space-y-1">
                    {improvedResume.changes.filter(c => c.section === "skills" || c.section === "summary").slice(0, 5).map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5 text-xs">
                        <Check className="size-3 mt-0.5 text-emerald-500 shrink-0" />
                        <span className="text-muted-foreground">{c.reason}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground italic">No changes to skills/summary</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Download className="size-4" />
            Export Resume
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied!" : "Copy to Clipboard"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
              <Download className="size-3.5" />
              Download .txt
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {improvedResume
              ? "Exporting the improved version. You can also copy and paste into your preferred resume editor."
              : "Exporting the original parsed resume text."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
