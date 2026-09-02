// ============================================================
// ATS Resume Analyzer – ATS Health Analysis Engine
// Programmatic + heuristic analysis for ATS compatibility
// ============================================================

import type {
  ParsedResume,
  ATSHealthScore,
  ATSIssue,
  SectionAnalysis,
  BulletAnalysis,
  WeakPart,
  Strength,
  Severity,
} from "./types";

// ---- Public API ----

export function analyzeATSHealth(resume: ParsedResume): ATSHealthScore {
  const issues: ATSIssue[] = [];

  // Run all checks
  const structureScore = analyzeStructure(resume, issues);
  const atsReadabilityScore = analyzeATSReadability(resume, issues);
  const contactQualityScore = analyzeContactQuality(resume, issues);
  const sectionOrgScore = analyzeSectionOrganization(resume, issues);
  const contentQualityScore = analyzeContentQuality(resume, issues);
  const formattingScore = analyzeFormatting(resume, issues);

  const sectionAnalyses = analyzeSections(resume);
  const bulletAnalyses = analyzeBullets(resume);
  const strengths = identifyStrengths(resume);
  const weakParts = identifyWeakParts(resume, issues);

  // Weighted overall score
  const weights = {
    structure: 0.18,
    atsReadability: 0.22,
    contactQuality: 0.10,
    sectionOrganization: 0.18,
    contentQuality: 0.22,
    formatting: 0.10,
  };

  const overall = Math.round(
    structureScore * weights.structure +
    atsReadabilityScore * weights.atsReadability +
    contactQualityScore * weights.contactQuality +
    sectionOrgScore * weights.sectionOrganization +
    contentQualityScore * weights.contentQuality +
    formattingScore * weights.formatting
  );

  return {
    overall: clamp(overall),
    breakdown: {
      structure: clamp(structureScore),
      atsReadability: clamp(atsReadabilityScore),
      contactQuality: clamp(contactQualityScore),
      sectionOrganization: clamp(sectionOrgScore),
      contentQuality: clamp(contentQualityScore),
      formatting: clamp(formattingScore),
    },
    issues,
    sectionAnalyses,
    bulletAnalyses,
    strengths,
    weakParts,
  };
}

// ---- Structure Analysis ----

function analyzeStructure(resume: ParsedResume, issues: ATSIssue[]): number {
  let score = 100;

  // Check for essential sections
  const hasContact = resume.contact.email || resume.contact.phone;
  const hasSummary = resume.detectedSections.includes("summary");
  const hasExperience = resume.detectedSections.includes("experience") || resume.detectedSections.includes("internship");
  const hasProjects = resume.detectedSections.includes("projects");
  const hasSkills = resume.detectedSections.includes("skills");
  const hasEducation = resume.detectedSections.includes("education");

  if (!hasContact) {
    score -= 25;
    addIssue(issues, "structure", "high", "Missing Contact Information",
      "No email or phone number found. ATS systems and recruiters need at least one contact method.",
      "Add your email address and phone number at the top of your resume.");
  }

  if (!hasSummary && !hasExperience && !hasProjects) {
    score -= 10;
    addIssue(issues, "structure", "low", "No Summary or Objective",
      "A brief professional summary helps ATS systems understand your career focus.",
      "Add a 2-4 line professional summary or objective statement.");
  }

  if (!hasExperience && !hasProjects) {
    score -= 15;
    addIssue(issues, "structure", "medium", "No Experience or Projects Section",
      "ATS systems look for experience or project sections to match job requirements.",
      "Add an experience or projects section with relevant content.");
  }

  if (!hasSkills) {
    score -= 15;
    addIssue(issues, "structure", "medium", "No Skills Section",
      "A dedicated skills section is critical for ATS keyword matching.",
      "Add a skills section listing your technical and relevant skills.");
  }

  if (!hasEducation) {
    score -= 10;
    addIssue(issues, "structure", "medium", "No Education Section",
      "Most ATS systems expect an education section.",
      "Add your educational background including degree, institution, and graduation date.");
  }

  // Check word count (too short or too long)
  if (resume.wordCount < 150) {
    score -= 20;
    addIssue(issues, "structure", "high", "Resume Too Short",
      `Your resume has only ${resume.wordCount} words. This may appear incomplete to ATS systems and recruiters.`,
      "Expand your experience, projects, and skills sections with more detail.");
  } else if (resume.wordCount < 250) {
    score -= 10;
    addIssue(issues, "structure", "medium", "Resume May Be Too Short",
      `Your resume has ${resume.wordCount} words. Consider adding more detail to key sections.`,
      "Add more bullet points to your experience and project sections.");
  }

  if (resume.wordCount > 1200) {
    score -= 10;
    addIssue(issues, "structure", "low", "Resume May Be Too Long",
      `Your resume has ${resume.wordCount} words. ATS systems process all content but recruiters may skip long resumes.`,
      "Consider condensing less relevant content or focusing on the most impactful items.");
  }

  // Check section count
  if (resume.sections.length < 3) {
    score -= 10;
    addIssue(issues, "structure", "medium", "Too Few Sections",
      "A well-structured resume typically has 4+ sections. Fewer sections may confuse ATS parsing.",
      "Add clearly labeled sections for skills, experience, and education.");
  }

  return clamp(score);
}

// ---- ATS Readability ----

function analyzeATSReadability(resume: ParsedResume, issues: ATSIssue[]): number {
  let score = 100;

  // Check for LaTeX (potential formatting issues)
  if (resume.isLatex) {
    score -= 5;
    addIssue(issues, "ats", "low", "LaTeX Source Detected",
      "LaTeX resumes can have ATS parsing issues if they use complex formatting, tables, or columns.",
      "If possible, also provide a plain text or PDF version for ATS submission.");
  }

  // Check for unusual section headings
  const unusualHeadings = resume.sections.filter(s =>
    !["summary","experience","internship","education","skills","projects",
      "certifications","achievements","publications","volunteer","leadership",
      "languages","coursework","opensource"].includes(s.id)
  );

  if (unusualHeadings.length > 0) {
    score -= 5 * unusualHeadings.length;
    for (const h of unusualHeadings) {
      addIssue(issues, "ats", "medium", `Unusual Section Heading: "${h.rawTitle}"`,
        `ATS systems may not recognize this section heading. This can cause content to be miscategorized.`,
        `Consider using a standard heading like "Experience", "Skills", or "Projects".`);
    }
  }

  // Check reading order (contact should be first)
  if (resume.sections.length > 0) {
    const firstSection = resume.sections[0];
    if (!["summary", "experience", "skills", "education"].includes(firstSection.id) &&
        resume.contact.email && resume.contact.name) {
      // This is fine - contact is above sections
    }
  }

  // Check for excessively long lines (tables/columns indicator)
  const longLines = resume.rawText.split("\n").filter(l => l.length > 200);
  if (longLines.length > 2) {
    score -= 10;
    addIssue(issues, "ats", "medium", "Potential Multi-Column Layout Detected",
      "Very long lines may indicate tabular formatting that ATS systems cannot parse correctly.",
      "Use a single-column layout with standard line breaks.");
  }

  // Check for special characters that may confuse ATS
  const specialChars = resume.rawText.match(/[^\w\s,.\-()\/:@#&+=%!?'";:<>\[\]{}|\\~`^*_\n\r\t]/g) || [];
  if (specialChars.length > 10) {
    score -= 5;
    addIssue(issues, "ats", "low", "Special Characters Detected",
      `Found ${specialChars.length} unusual characters that may not be parseable by all ATS systems.`,
      "Replace special symbols with standard text equivalents.");
  }

  return clamp(score);
}

// ---- Contact Quality ----

function analyzeContactQuality(resume: ParsedResume, issues: ATSIssue[]): number {
  let score = 0;

  if (resume.contact.name) score += 20;
  else {
    addIssue(issues, "contact", "medium", "Missing Name",
      "Your name was not detected at the top of the resume.",
      "Ensure your name appears clearly at the beginning of the document.");
  }

  if (resume.contact.email) score += 25;
  else {
    addIssue(issues, "contact", "high", "Missing Email",
      "No email address detected. This is a critical contact method.",
      "Add a professional email address at the top of your resume.");
  }

  if (resume.contact.phone) score += 20;
  else {
    addIssue(issues, "contact", "medium", "Missing Phone Number",
      "No phone number detected.",
      "Add a phone number with country code.");
  }

  if (resume.contact.location) score += 15;
  else {
    addIssue(issues, "contact", "low", "Missing Location",
      "No location was detected. While not always required, it helps recruiters.",
      "Add your city and state/country.");
  }

  if (resume.contact.linkedin) score += 10;
  if (resume.contact.github) score += 5;
  if (resume.contact.website || resume.contact.portfolio) score += 5;

  return clamp(score);
}

// ---- Section Organization ----

function analyzeSectionOrganization(resume: ParsedResume, issues: ATSIssue[]): number {
  let score = 100;

  // Optimal order: Contact > Summary > Experience > Projects > Skills > Education > Others
  const idealOrder = ["summary", "experience", "internship", "projects", "skills", "education",
    "certifications", "achievements", "publications", "volunteer", "leadership",
    "languages", "coursework", "opensource"];

  const sectionOrder = resume.sections.map(s => s.id);

  // Check if experience comes before skills (common best practice)
  const expIndex = sectionOrder.indexOf("experience");
  const skillsIndex = sectionOrder.indexOf("skills");
  if (expIndex >= 0 && skillsIndex >= 0 && expIndex > skillsIndex) {
    score -= 5;
    addIssue(issues, "organization", "low", "Experience Listed After Skills",
      "ATS systems and recruiters typically prefer to see experience before skills.",
      "Consider moving the experience section above the skills section.");
  }

  // Check for duplicate sections
  const sectionCounts = new Map<string, number>();
  for (const id of sectionOrder) {
    sectionCounts.set(id, (sectionCounts.get(id) || 0) + 1);
  }
  for (const [id, count] of sectionCounts) {
    if (count > 1) {
      score -= 5;
      addIssue(issues, "organization", "medium", `Duplicate Section: ${id}`,
        `Found ${count} sections with the heading "${id}".`,
        `Merge duplicate sections into one.`);
    }
  }

  // Check for empty sections
  for (const section of resume.sections) {
    if (!section.content || section.content.trim().length < 10) {
      score -= 10;
      addIssue(issues, "organization", "medium", `Empty Section: ${section.title}`,
        `The "${section.title}" section appears to be empty or nearly empty.`,
        `Either add content to this section or remove it.`);
    }
  }

  return clamp(score);
}

// ---- Content Quality ----

function analyzeContentQuality(resume: ParsedResume, issues: ATSIssue[]): number {
  let score = 100;

  // Check for vague language
  const vagueWords = ["responsible for", "helped with", "assisted in", "worked on", "various", "multiple", "several", "some", "many"];
  let vagueCount = 0;
  for (const section of resume.sections) {
    for (const word of vagueWords) {
      if (section.content.toLowerCase().includes(word)) {
        vagueCount++;
      }
    }
  }

  if (vagueCount > 3) {
    score -= 15;
    addIssue(issues, "content", "medium", "Vague Language Detected",
      `Found ${vagueCount} instances of vague language like "responsible for", "helped with", etc.`,
      "Replace vague phrases with specific action verbs and concrete accomplishments.");
  }

  // Check for action verbs at start of bullets
  let bulletsWithoutActionVerbs = 0;
  let totalBullets = 0;

  for (const section of resume.sections) {
    for (const item of section.items) {
      for (const bullet of item.bullets) {
        totalBullets++;
        const firstWord = bullet.split(/\s+/)[0].toLowerCase();
        const actionVerbs = [
          "developed","implemented","built","created","designed","managed","led","improved",
          "increased","decreased","reduced","optimized","automated","configured","deployed",
          "architected","established","launched","migrated","refactored","tested","debugged",
          "analyzed","evaluated","identified","resolved","delivered","collaborated","mentored",
          "coordinated","spearheaded","initiated","pioneered","streamlined","consolidated",
          "engineered","produced","facilitated","integrated","orchestrated","maintained",
          "supervised","trained","presented","authored","contributed","researched",
        ];
        if (!actionVerbs.includes(firstWord)) {
          bulletsWithoutActionVerbs++;
        }
      }
    }
  }

  if (totalBullets > 0) {
    const noVerbRatio = bulletsWithoutActionVerbs / totalBullets;
    if (noVerbRatio > 0.5) {
      score -= 15;
      addIssue(issues, "content", "medium", "Bullets Missing Action Verbs",
        `${bulletsWithoutActionVerbs} of ${totalBullets} bullets don't start with an action verb.`,
        "Start each bullet point with a strong action verb (e.g., Developed, Implemented, Led).");
    } else if (noVerbRatio > 0.3) {
      score -= 5;
      addIssue(issues, "content", "low", "Some Bullets Missing Action Verbs",
        `${bulletsWithoutActionVerbs} of ${totalBullets} bullets could start with stronger action verbs.`,
        "Review and start key bullets with action verbs.");
    }
  }

  // Check for quantified achievements
  let quantifiedBullets = 0;
  for (const section of resume.sections) {
    for (const item of section.items) {
      for (const bullet of item.bullets) {
        if (/\d+%|\d+x|\$\d+|reduced|increased|improved|grew|saved|generated/i.test(bullet)) {
          quantifiedBullets++;
        }
      }
    }
  }

  if (totalBullets > 3 && quantifiedBullets === 0) {
    score -= 10;
    addIssue(issues, "content", "medium", "No Quantified Achievements",
      "None of your bullet points contain quantified results (numbers, percentages, metrics).",
      "Add specific metrics to demonstrate impact (e.g., 'reduced load time by 40%').");
  }

  // Check for repetition
  const allText = resume.sections.map(s => s.content).join(" ").toLowerCase();
  const words = allText.split(/\s+/);
  const wordFreq = new Map<string, number>();
  for (const word of words) {
    if (word.length > 4 && !STOP_WORDS.has(word)) {
      wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
    }
  }

  const repeatedWords = [...wordFreq.entries()].filter(([w, c]) => c > Math.max(5, words.length * 0.01));
  if (repeatedWords.length > 3) {
    score -= 5;
    addIssue(issues, "content", "low", "Word Repetition",
      `Several words appear excessively: ${repeatedWords.slice(0, 5).map(([w, c]) => `"${w}" (${c}x)`).join(", ")}.`,
      "Use synonyms to vary language.");
  }

  return clamp(score);
}

// ---- Formatting Analysis ----

function analyzeFormatting(resume: ParsedResume, issues: ATSIssue[]): number {
  let score = 100;

  // Check date consistency
  const datePatterns: string[] = [];
  for (const section of resume.sections) {
    for (const item of section.items) {
      if (item.dateRange) {
        const hasMonth = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(item.dateRange);
        const hasYear = /\d{4}/.test(item.dateRange);
        const hasDash = /[-–—to]+/i.test(item.dateRange);
        datePatterns.push(`${hasMonth ? "M" : ""}${hasYear ? "Y" : ""}${hasDash ? "D" : ""}`);
      }
    }
  }

  const uniquePatterns = [...new Set(datePatterns)];
  if (uniquePatterns.length > 2) {
    score -= 10;
    addIssue(issues, "formatting", "low", "Inconsistent Date Formats",
      `Found ${uniquePatterns.length} different date formats. Consistency looks professional.`,
      "Standardize all dates to one format (e.g., 'MMM YYYY – MMM YYYY').");
  }

  // Check for tabs/extra whitespace
  if (resume.rawText.includes("\t")) {
    score -= 3;
    addIssue(issues, "formatting", "low", "Tab Characters Detected",
      "Tabs may not be preserved in all ATS systems.",
      "Use spaces instead of tabs for consistent formatting.");
  }

  // Check for ALL CAPS section headers (often looks odd)
  const capsHeaders = resume.sections.filter(s => s.rawTitle === s.rawTitle.toUpperCase() && s.rawTitle.length > 3);
  if (capsHeaders.length > 0 && capsHeaders.length === resume.sections.length) {
    score -= 3;
    addIssue(issues, "formatting", "low", "ALL CAPS Section Headers",
      "All section headers are in ALL CAPS. While common, some ATS parsers may struggle.",
      "Use Title Case for section headers.");
  }

  return clamp(score);
}

// ---- Section-Level Analysis ----

function analyzeSections(resume: ParsedResume): SectionAnalysis[] {
  return resume.sections.map(section => {
    let quality = 70;
    let clarity = 70;
    let atsReadability = 80;
    const problems: string[] = [];
    const recommendations: string[] = [];

    // Section-specific checks
    switch (section.id) {
      case "summary": {
        const wordCount = section.content.split(/\s+/).length;
        if (wordCount < 15) {
          quality -= 20;
          problems.push("Summary is too short to be meaningful");
          recommendations.push("Expand to 3-4 sentences highlighting key qualifications and career focus");
        } else if (wordCount > 80) {
          quality -= 10;
          problems.push("Summary is too long; may lose reader attention");
          recommendations.push("Condense to 3-4 impactful sentences");
        }

        // Check for first person
        if (/\b(I|my|me)\b/i.test(section.content) && !/\blinkedin/i.test(section.content)) {
          clarity -= 10;
          problems.push("Uses first person (I, my, me) which is non-standard for resumes");
          recommendations.push("Remove first-person pronouns; use implied first person");
        }

        // Check for generic summary
        const genericPhrases = ["looking for", "seeking a position", "hard-working", "team player", "detail-oriented", "passionate about"];
        const hasGeneric = genericPhrases.some(p => section.content.toLowerCase().includes(p));
        if (hasGeneric) {
          quality -= 15;
          problems.push("Contains generic clichés that don't differentiate you");
          recommendations.push("Replace generic phrases with specific skills and achievements");
        }
        break;
      }

      case "skills": {
        // Check if skills are listed in a parseable way
        const lines = section.content.split("\n");
        const hasColons = lines.filter(l => l.includes(":")).length > 1;
        const hasCommas = section.content.includes(",");

        if (!hasColons && !hasCommas && lines.length > 3) {
          atsReadability -= 15;
          problems.push("Skills section structure may be hard for ATS to parse");
          recommendations.push("Use clear category labels or comma-separated lists");
        }

        if (section.content.split(/[,\n]/).filter(s => s.trim()).length < 5) {
          quality -= 10;
          problems.push("Very few skills listed");
          recommendations.push("Add more relevant technical and soft skills");
        }
        break;
      }

      case "experience":
      case "internship": {
        if (section.items.length === 0) {
          quality -= 30;
          problems.push("No experience items could be parsed");
          recommendations.push("Format entries with title, company, dates, and bullet points");
        } else {
          const avgBullets = section.items.reduce((sum, item) => sum + item.bullets.length, 0) / section.items.length;
          if (avgBullets < 2) {
            quality -= 15;
            problems.push("Experience entries have too few bullet points");
            recommendations.push("Add 3-5 bullet points per role highlighting achievements");
          }

          // Check for responsibilities vs achievements
          const responsibilityBullets = section.items.flatMap(i => i.bullets).filter(b =>
            /^(responsible|duties|tasks)/i.test(b)
          );
          if (responsibilityBullets.length > 2) {
            quality -= 10;
            problems.push("Some bullets describe responsibilities rather than achievements");
            recommendations.push("Reframe responsibilities as achievements with quantified results");
          }
        }
        break;
      }

      case "projects": {
        if (section.items.length === 0 && section.content.length < 50) {
          quality -= 10;
          problems.push("Projects section has minimal content");
          recommendations.push("Add project descriptions with technologies used and impact");
        }
        break;
      }

      case "education": {
        // Basic check
        if (!section.content.match(/\b(?:university|college|institute|school)\b/i)) {
          problems.push("Institution name may not be clearly identified");
          recommendations.push("Include full institution name");
        }
        break;
      }
    }

    // General quality check
    if (section.content.length < 20 && !["languages", "coursework"].includes(section.id)) {
      quality -= 20;
      problems.push("Section has very little content");
      recommendations.push("Add more detailed information to this section");
    }

    return {
      sectionId: section.id,
      sectionTitle: section.title,
      quality: clamp(quality),
      clarity: clamp(clarity),
      atsReadability: clamp(atsReadability),
      problems,
      recommendations,
    };
  });
}

// ---- Bullet Analysis ----

function analyzeBullets(resume: ParsedResume): BulletAnalysis[] {
  const analyses: BulletAnalysis[] = [];

  const actionVerbs = new Set([
    "developed","implemented","built","created","designed","managed","led","improved",
    "increased","decreased","reduced","optimized","automated","configured","deployed",
    "architected","established","launched","migrated","refactored","tested","debugged",
    "analyzed","evaluated","identified","resolved","delivered","collaborated","mentored",
    "coordinated","spearheaded","initiated","pioneered","streamlined","consolidated",
    "engineered","produced","facilitated","integrated","orchestrated","maintained",
    "supervised","trained","presented","authored","contributed","researched",
    "managed","oversaw","directed","initiated","operated","utilized","leveraged",
    "formulated","orchestrated","spearheaded","catalyzed","accelerated","amplified",
  ]);

  for (const section of resume.sections) {
    for (const item of section.items) {
      for (const bullet of item.bullets) {
        const firstWord = bullet.split(/\s+/)[0]?.toLowerCase() || "";
        const hasActionVerb = actionVerbs.has(firstWord);
        const hasNumber = /\d+%|\d+x|\$\d+|\d+\s*(?:users?|customers?|team members?|people|hours|days|weeks|months)/i.test(bullet);
        const hasTech = /\b(?:using|with|via|through|leveraging|utilizing)\s+[\w\s,\/]+/i.test(bullet);

        // Build improved version
        let improved = bullet;
        const changes: string[] = [];

        if (!hasActionVerb && firstWord) {
          // Try to suggest an action verb replacement
          const verbMap: Record<string, string> = {
            "responsible": "managed",
            "helped": "assisted",
            "worked": "contributed",
            "used": "utilized",
            "made": "created",
            "did": "executed",
            "was": "served as",
            "had": "maintained",
          };
          if (verbMap[firstWord]) {
            improved = verbMap[firstWord] + bullet.slice(firstWord.length);
            changes.push(`Replaced "${firstWord}" with action verb "${verbMap[firstWord]}"`);
          }
        }

        const specificity = (hasActionVerb ? 25 : 0) + (hasNumber ? 35 : 0) + (hasTech ? 25 : 0) + (bullet.length > 30 ? 15 : 5);
        const quality = Math.min(100, specificity + (changes.length > 0 ? 10 : 0));

        analyses.push({
          original: bullet,
          improved,
          actionVerb: hasActionVerb,
          hasWhat: bullet.length > 20,
          hasHow: hasTech,
          hasImpact: hasNumber,
          specificity: Math.min(100, specificity),
          quality,
          changes,
        });
      }
    }
  }

  return analyses;
}

// ---- Strengths & Weaknesses ----

function identifyStrengths(resume: ParsedResume): Strength[] {
  const strengths: Strength[] = [];

  if (resume.contact.email && resume.contact.phone) {
    strengths.push({ area: "Contact Information", detail: "Complete contact information with email and phone" });
  }
  if (resume.contact.linkedin) {
    strengths.push({ area: "Professional Links", detail: "LinkedIn profile included" });
  }
  if (resume.contact.github) {
    strengths.push({ area: "Professional Links", detail: "GitHub profile included" });
  }

  const totalBullets = resume.sections.flatMap(s => s.items.flatMap(i => i.bullets)).length;
  if (totalBullets > 10) {
    strengths.push({ area: "Content Depth", detail: `Comprehensive content with ${totalBullets} bullet points across sections` });
  }

  const quantifiedBullets = resume.sections.flatMap(s => s.items.flatMap(i => i.bullets)).filter(b =>
    /\d+%|\d+x|\$\d+|reduced|increased|improved/i.test(b)
  ).length;
  if (quantifiedBullets > 2) {
    strengths.push({ area: "Quantified Achievements", detail: `${quantifiedBullets} bullet points include quantified results` });
  }

  if (resume.allSkills.length > 10) {
    strengths.push({ area: "Skills Coverage", detail: `Identified ${resume.allSkills.length} technical skills` });
  }

  if (resume.detectedSections.includes("experience") || resume.detectedSections.includes("internship")) {
    strengths.push({ area: "Experience Section", detail: "Work experience/internships section is present" });
  }

  if (resume.detectedSections.includes("projects")) {
    strengths.push({ area: "Projects", detail: "Projects section demonstrates practical experience" });
  }

  if (resume.detectedSections.includes("education")) {
    strengths.push({ area: "Education", detail: "Education section is present" });
  }

  return strengths;
}

function identifyWeakParts(resume: ParsedResume, issues: ATSIssue[]): WeakPart[] {
  const weakParts: WeakPart[] = [];

  // Based on issues, create weak part entries
  for (const issue of issues.filter(i => i.severity === "high")) {
    weakParts.push({
      id: issue.id,
      area: issue.category,
      issue: issue.title,
      whyItMatters: issue.description,
      howToFix: issue.fix,
      severity: issue.severity,
    });
  }

  for (const issue of issues.filter(i => i.severity === "medium").slice(0, 5)) {
    weakParts.push({
      id: issue.id,
      area: issue.category,
      issue: issue.title,
      whyItMatters: issue.description,
      howToFix: issue.fix,
      severity: issue.severity,
    });
  }

  // Check for vague summary
  const summarySection = resume.sections.find(s => s.id === "summary");
  if (summarySection) {
    const genericWords = ["passionate", "hard-working", "team player", "detail-oriented", "self-motivated", "results-driven"];
    const hasGeneric = genericWords.some(w => summarySection.content.toLowerCase().includes(w));
    if (hasGeneric) {
      weakParts.push({
        id: "generic-summary",
        area: "summary",
        issue: "Generic summary with clichés",
        whyItMatters: "Generic phrases don't differentiate you from other candidates and waste valuable resume space.",
        howToFix: "Replace generic adjectives with specific skills, achievements, and career focus areas.",
        severity: "medium",
      });
    }
  }

  return weakParts;
}

// ---- Helpers ----

function addIssue(issues: ATSIssue[], category: string, severity: Severity, title: string, description: string, fix: string) {
  issues.push({
    id: `${category}-${issues.length}`,
    category,
    severity,
    title,
    description,
    fix,
  });
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","as","is","was","are","were","been","be","have","has","had","do",
  "does","did","will","would","could","should","may","might","can","shall",
  "this","that","these","those","it","its","their","his","her","my","your",
  "our","we","they","you","he","she","i","me","us","them",
  "not","no","nor","so","if","then","than","too","very","using","used",
  "work","worked","working","also","including","within","various","related",
]);
