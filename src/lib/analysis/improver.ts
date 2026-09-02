// ============================================================
// ATS Resume Analyzer – Resume Improvement Engine
// Rewrites/resumes without inventing facts
// ============================================================

import type {
  ParsedResume,
  ParsedJD,
  ImprovedResume,
  ChangeRecord,
  ResumeSection,
  ResumeItem,
} from "./types";

// ---- Public API ----

export function improveResume(
  resume: ParsedResume,
  jd: ParsedJD | null,
  mode: "improve" | "tailor" = "improve"
): ImprovedResume {
  const changes: ChangeRecord[] = [];
  const newSections = resume.sections.map(section =>
    improveSection(section, jd, mode, changes)
  );

  const newResume: ParsedResume = {
    ...resume,
    sections: newSections,
  };

  // Reconstruct text
  const text = reconstructResumeText(newResume);

  return {
    text,
    sections: newSections,
    changes,
    atsScore: 0, // Will be recalculated by the analyzer
    jobMatchScore: null,
  };
}

// ---- Section Improvement ----

function improveSection(
  section: ResumeSection,
  jd: ParsedJD | null,
  mode: "improve" | "tailor",
  changes: ChangeRecord[]
): ResumeSection {
  const newSection = { ...section };

  switch (section.id) {
    case "summary":
      newSection.content = improveSummary(section.content, jd, mode, changes);
      break;
    case "experience":
    case "internship":
      newSection.items = section.items.map(item =>
        improveExperienceItem(item, jd, mode, changes) as ResumeItem
      );
      newSection.content = section.content; // keep raw
      break;
    case "projects":
      newSection.items = section.items.map(item =>
        improveProjectItem(item, jd, mode, changes) as ResumeItem
      );
      newSection.content = section.content;
      break;
    case "skills":
      newSection.content = improveSkills(section.content, jd, mode, changes);
      break;
    default:
      break;
  }

  return newSection;
}

// ---- Summary Improvement ----

function improveSummary(
  content: string,
  jd: ParsedJD | null,
  mode: "improve" | "tailor",
  changes: ChangeRecord[]
): string {
  let improved = content;

  // Remove first-person pronouns
  if (/\b(I|my)\b/.test(improved)) {
    const original = improved;
    improved = improved
      .replace(/\bI am\b/g, "Results-driven professional")
      .replace(/\bI have\b/g, "Experienced professional")
      .replace(/\bI\b/g, "")
      .replace(/\bmy\b/g, "")
      .replace(/\s{2,}/g, " ")
      .trim();
    if (original !== improved) {
      changes.push({
        section: "summary",
        field: "first person",
        original: original.slice(0, 100),
        improved: improved.slice(0, 100),
        reason: "Removed first-person pronouns for professional tone",
      });
    }
  }

  // Remove generic clichés
  const clicheMap: Record<string, string> = {
    "passionate about": "experienced in",
    "hard-working": "dedicated",
    "team player": "collaborative professional",
    "detail-oriented": "meticulous",
    "self-motivated": "proactive",
    "results-driven": "outcome-focused",
    "looking for": "seeking",
    "seeking a position": "bringing expertise to",
    "seeking an opportunity": "applying experience in",
  };

  for (const [cliche, replacement] of Object.entries(clicheMap)) {
    if (improved.toLowerCase().includes(cliche)) {
      const original = improved;
      improved = improved.replace(new RegExp(cliche, "gi"), replacement);
      if (original !== improved) {
        changes.push({
          section: "summary",
          field: "cliché",
          original: cliche,
          improved: replacement,
          reason: `Replaced generic cliché "${cliche}" with more specific language`,
        });
      }
    }
  }

  // For tailoring mode, add JD-relevant keywords naturally
  if (mode === "tailor" && jd) {
    // Only add if they have the skill in their resume
    const summaryLower = improved.toLowerCase();
    const topKeywords = jd.requiredSkills.slice(0, 3);
    const missingKeywords = topKeywords.filter(kw => !summaryLower.includes(kw.toLowerCase()));

    // Don't add to summary - that would be keyword stuffing
    // Instead, note what could be highlighted
    if (missingKeywords.length > 0) {
      changes.push({
        section: "summary",
        field: "keywords",
        original: "N/A",
        improved: `Consider highlighting: ${missingKeywords.slice(0, 2).join(", ")}`,
        reason: "These required skills are not mentioned in your summary",
      });
    }
  }

  return improved;
}

// ---- Experience Improvement ----

function improveExperienceItem(
  item: ResumeItem,
  jd: ParsedJD | null,
  mode: "improve" | "tailor",
  changes: ChangeRecord[]
): typeof item {
  const newItem = { ...item };
  const newBullets: string[] = [];

  for (const bullet of item.bullets) {
    let improved = bullet;
    const bulletChanges: string[] = [];

    // 1. Replace weak action verbs
    const verbReplacements: Record<string, string> = {
      "responsible for": "managed",
      "helped with": "supported",
      "assisted in": "contributed to",
      "worked on": "developed",
      "was a part of": "participated in",
      "did": "executed",
      "made": "created",
      "used": "leveraged",
      "had to": "managed",
    };

    for (const [weak, strong] of Object.entries(verbReplacements)) {
      const regex = new RegExp(`^${weak}\\b`, "i");
      if (regex.test(improved)) {
        improved = improved.replace(regex, strong);
        bulletChanges.push(`Replaced "${weak}" → "${strong}"`);
      }
    }

    // 2. Improve specificity (add "using" tech if not present)
    if (item.technologies.length > 0 && !/\b(?:using|with|via|leveraging|utilizing)\b/i.test(improved) && improved.length < 100) {
      // Only if it makes sense contextually
      if (improved.length > 20) {
        // Don't force this - it can sound unnatural
      }
    }

    // 3. Improve clarity - remove unnecessary words
    improved = improved.replace(/\bvarious different\b/gi, "various");
    improved = improved.replace(/\bvery\s+(?:good|great|important)\b/gi, "");
    improved = improved.replace(/\bin order to\b/gi, "to");
    improved = improved.replace(/\bthe fact that\b/gi, "");
    improved = improved.replace(/\bdue to the fact that\b/gi, "because");
    improved = improved.replace(/\bat this point in time\b/gi, "currently");
    improved = improved.replace(/\bfor the purpose of\b/gi, "to");
    improved = improved.replace(/\bin the event that\b/gi, "if");
    improved = improved.replace(/\bprior to\b/gi, "before");
    improved = improved.replace(/\bsubsequent to\b/gi, "after");
    improved = improved.replace(/\s{2,}/g, " ").trim();

    if (improved !== bullet) {
      changes.push({
        section: "experience",
        field: "bullet",
        original: bullet,
        improved,
        reason: bulletChanges.join("; ") || "Improved wording and clarity",
      });
    }

    newBullets.push(improved);
  }

  newItem.bullets = newBullets;
  return newItem as typeof item;
}

// ---- Project Improvement ----

function improveProjectItem(
  item: ResumeItem,
  jd: ParsedJD | null,
  mode: "improve" | "tailor",
  changes: ChangeRecord[]
): typeof item {
  return improveExperienceItem(item, jd, mode, changes);
}

// ---- Skills Improvement ----

function improveSkills(
  content: string,
  jd: ParsedJD | null,
  mode: "improve" | "tailor",
  changes: ChangeRecord[]
): string {
  if (!jd || mode !== "tailor") return content;

  const lower = content.toLowerCase();

  // Check if required skills from JD are present
  const missingRequired = jd.requiredSkills.filter(skill => !lower.includes(skill.toLowerCase()));
  const missingPreferred = jd.preferredSkills.filter(skill => !lower.includes(skill.toLowerCase()));

  if (missingRequired.length > 0) {
    changes.push({
      section: "skills",
      field: "required skills",
      original: "N/A",
      improved: `Missing from skills section: ${missingRequired.slice(0, 3).join(", ")}`,
      reason: "These required skills from the JD are not in your skills section",
    });
  }

  if (missingPreferred.length > 0) {
    changes.push({
      section: "skills",
      field: "preferred skills",
      original: "N/A",
      improved: `Could add if applicable: ${missingPreferred.slice(0, 3).join(", ")}`,
      reason: "These preferred skills from the JD could strengthen your application",
    });
  }

  return content;
}

// ---- Reconstruct Resume Text ----

function reconstructResumeText(resume: ParsedResume): string {
  const lines: string[] = [];

  // Contact info
  if (resume.contact.name) lines.push(resume.contact.name);
  const contactParts: string[] = [];
  if (resume.contact.email) contactParts.push(resume.contact.email);
  if (resume.contact.phone) contactParts.push(resume.contact.phone);
  if (resume.contact.linkedin) contactParts.push(resume.contact.linkedin);
  if (resume.contact.github) contactParts.push(resume.contact.github);
  if (resume.contact.location) contactParts.push(resume.contact.location);
  if (contactParts.length > 0) lines.push(contactParts.join(" | "));
  lines.push("");

  // Sections
  for (const section of resume.sections) {
    lines.push(section.rawTitle.toUpperCase() || section.title.toUpperCase());
    lines.push("─".repeat(40));
    lines.push("");

    if (section.items.length > 0) {
      for (const item of section.items) {
        const header = [item.title, item.subtitle, item.dateRange].filter(Boolean).join(" | ");
        lines.push(header);
        for (const bullet of item.bullets) {
          lines.push(`  • ${bullet}`);
        }
        if (item.technologies.length > 0) {
          lines.push(`  Technologies: ${item.technologies.join(", ")}`);
        }
        lines.push("");
      }
    } else {
      lines.push(section.content);
      lines.push("");
    }
  }

  return lines.join("\n");
}
