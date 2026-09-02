import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, AlertTriangle, FileText, User, Mail, Phone, MapPin, Github, Linkedin, Globe, Layers } from "lucide-react";
import type { ParsedResume } from "@/lib/analysis/types";

interface ParsingPanelProps {
  resume: ParsedResume;
}

export default function ParsingPanel({ resume }: ParsingPanelProps) {
  const sectionCount = resume.sections.length;
  const itemCounts = resume.sections.map(s => ({
    title: s.title,
    count: s.items.length,
    bullets: s.items.reduce((sum, i) => sum + i.bullets.length, 0),
  }));

  return (
    <div className="space-y-6">
      {/* Parse Status */}
      <Alert className="border-emerald-200 bg-emerald-50/50 dark:border-emerald-900 dark:bg-emerald-950/30">
        <CheckCircle className="size-4 text-emerald-600 dark:text-emerald-400" />
        <AlertTitle className="text-emerald-800 dark:text-emerald-300">Parsed Successfully</AlertTitle>
        <AlertDescription className="text-emerald-700 dark:text-emerald-400">
          Resume content extracted and analyzed. {resume.wordCount} words across {sectionCount} sections.
        </AlertDescription>
      </Alert>

      {/* File Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="size-4" />
            File Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <InfoRow label="File Type" value={resume.fileType} />
            <InfoRow label="Word Count" value={String(resume.wordCount)} />
            <InfoRow label="Line Count" value={String(resume.lineCount)} />
            <InfoRow label="Format" value={resume.isLatex ? "LaTeX Source" : "Plain Text"} />
          </div>
        </CardContent>
      </Card>

      {/* Contact Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <User className="size-4" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <ContactRow icon={<User className="size-3.5" />} label="Name" value={resume.contact.name} />
            <ContactRow icon={<Mail className="size-3.5" />} label="Email" value={resume.contact.email} />
            <ContactRow icon={<Phone className="size-3.5" />} label="Phone" value={resume.contact.phone} />
            <ContactRow icon={<MapPin className="size-3.5" />} label="Location" value={resume.contact.location} />
            <ContactRow icon={<Linkedin className="size-3.5" />} label="LinkedIn" value={resume.contact.linkedin} />
            <ContactRow icon={<Github className="size-3.5" />} label="GitHub" value={resume.contact.github} />
            {(resume.contact.website || resume.contact.portfolio) && (
              <ContactRow icon={<Globe className="size-3.5" />} label="Website" value={resume.contact.website || resume.contact.portfolio} />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detected Sections */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Layers className="size-4" />
            Detected Sections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {itemCounts.map((s) => (
              <div key={s.title} className="flex items-center justify-between text-sm">
                <span className="font-medium">{s.title}</span>
                <div className="flex gap-2">
                  {s.count > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {s.count} {s.count === 1 ? "entry" : "entries"}
                    </Badge>
                  )}
                  {s.bullets > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {s.bullets} {s.bullets === 1 ? "bullet" : "bullets"}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
          {resume.allSkills.length > 0 && (
            <div className="mt-4 pt-3 border-t">
              <p className="text-xs font-medium text-muted-foreground mb-2">Extracted Skills ({resume.allSkills.length})</p>
              <div className="flex flex-wrap gap-1">
                {resume.allSkills.slice(0, 30).map((skill) => (
                  <Badge key={skill} variant="outline" className="text-xs font-normal">
                    {skill}
                  </Badge>
                ))}
                {resume.allSkills.length > 30 && (
                  <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                    +{resume.allSkills.length - 30} more
                  </Badge>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Warnings */}
      {resume.parsingWarnings.length > 0 && (
        <Alert>
          <AlertTriangle className="size-4" />
          <AlertTitle>Parsing Notes</AlertTitle>
          <AlertDescription>
            <ul className="mt-1 list-disc list-inside space-y-1">
              {resume.parsingWarnings.map((w, i) => (
                <li key={i} className="text-sm">{w}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <span className="ml-2 font-medium">{value}</span>
    </div>
  );
}

function ContactRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-muted-foreground w-16">{label}:</span>
      {value ? (
        <span className="font-medium">{value}</span>
      ) : (
        <span className="text-muted-foreground/50 italic">Not detected</span>
      )}
    </div>
  );
}
