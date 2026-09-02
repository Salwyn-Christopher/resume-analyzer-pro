// ============================================================
// ATS Resume Analyzer – Requirement Matcher
// Compares resume against JD requirements
// ============================================================

import type {
  ParsedResume,
  ParsedJD,
  JobMatchScore,
  RequirementMatch,
  KeywordMatch,
  SkillGap,
  WeakPart,
  Strength,
  MatchLevel,
  GapLevel,
} from "./types";

// ---- Public API ----

export function matchResumeToJD(resume: ParsedResume, jd: ParsedJD): JobMatchScore {
  const requirementMatches = matchRequirements(resume, jd);
  const keywordMatches = matchKeywords(resume, jd);
  const skillGaps = analyzeSkillGaps(resume, jd, requirementMatches);
  const strengths = identifyJobMatchStrengths(resume, jd, requirementMatches);
  const weakParts = identifyJobMatchWeakParts(requirementMatches, skillGaps);

  // Calculate scores
  const requiredReqs = requirementMatches.filter(r => r.category === "required");
  const preferredReqs = requirementMatches.filter(r => r.category === "preferred");

  const requiredScore = calculateCategoryScore(requiredReqs);
  const preferredScore = preferredReqs.length > 0 ? calculateCategoryScore(preferredReqs) : 70;

  // Overall: required counts 70%, preferred counts 30%
  const overall = Math.round(requiredScore * 0.7 + preferredScore * 0.3);

  return {
    overall: clamp(overall),
    requiredMatch: Math.round(requiredScore),
    preferredMatch: Math.round(preferredScore),
    requirementMatches,
    keywordMatches,
    skillGaps,
    strengths,
    weakParts,
  };
}

// ---- Requirement Matching ----

function matchRequirements(resume: ParsedResume, jd: ParsedJD): RequirementMatch[] {
  const resumeText = resume.rawText.toLowerCase();
  const resumeSkills = resume.allSkills.map(s => s.toLowerCase());

  return jd.requirements.map(req => {
    const reqLower = req.text.toLowerCase();
    const result = findRequirementEvidence(req, resumeText, resumeSkills);

    return {
      requirement: req.text,
      category: req.category,
      matchLevel: result.level,
      evidence: result.evidence,
      evidenceStrength: result.strength,
      explanation: result.explanation,
      suggestion: result.suggestion,
    };
  });
}

function findRequirementEvidence(
  req: { text: string; category: string; type: string; importance: number },
  resumeText: string,
  resumeSkills: string[]
): { level: MatchLevel; evidence: string[]; strength: number; explanation: string; suggestion: string } {
  const reqLower = req.text.toLowerCase();

  // Extract key terms from the requirement
  const keyTerms = extractKeyTerms(reqLower);
  const matchedTerms: string[] = [];
  const evidence: string[] = [];

  // Check each key term against resume
  for (const term of keyTerms) {
    if (resumeText.includes(term.toLowerCase())) {
      matchedTerms.push(term);
      // Find the context where it appears
      const context = findContext(resumeText, term);
      if (context) evidence.push(context);
    }
  }

  // Calculate match level
  const matchRatio = keyTerms.length > 0 ? matchedTerms.length / keyTerms.length : 0;

  let level: MatchLevel;
  let strength: number;
  let explanation: string;
  let suggestion: string;

  if (matchRatio >= 0.8) {
    level = "strong";
    strength = 0.9;
    explanation = `Strong match. Found ${matchedTerms.length} of ${keyTerms.length} key terms in your resume.`;
    suggestion = "";
  } else if (matchRatio >= 0.5) {
    level = "match";
    strength = 0.7;
    explanation = `Good match. Found ${matchedTerms.length} of ${keyTerms.length} key terms.`;
    suggestion = `Consider adding more context around: ${keyTerms.filter(t => !matchedTerms.includes(t)).join(", ")}`;
  } else if (matchRatio >= 0.25) {
    level = "partial";
    strength = 0.4;
    explanation = `Partial match. Only found ${matchedTerms.length} of ${keyTerms.length} key terms.`;
    suggestion = `Try to incorporate experience or knowledge related to: ${keyTerms.filter(t => !matchedTerms.includes(t)).slice(0, 3).join(", ")}`;
  } else if (matchRatio > 0) {
    level = "related";
    strength = 0.2;
    explanation = `Weak match. Found limited evidence for this requirement.`;
    suggestion = `If you have experience with ${keyTerms.slice(0, 2).join(" or ")}, add specific examples.`;
  } else {
    level = "missing";
    strength = 0;
    explanation = `No supporting evidence found in your resume.`;
    suggestion = req.type === "skill"
      ? `If you have experience with ${keyTerms.slice(0, 2).join(" or ")}, add it to your skills or projects.`
      : `Review whether you can demonstrate this requirement through your experience or projects.`;
  }

  // Deduplicate evidence
  const uniqueEvidence = [...new Set(evidence)].slice(0, 3);

  return { level, evidence: uniqueEvidence, strength, explanation, suggestion };
}

function extractKeyTerms(text: string): string[] {
  // Remove common words and extract meaningful terms
  const words = text.split(/[\s,;:.\-()/\\]+/).filter(w => w.length > 2);
  const stopWords = new Set([
    "the","and","or","with","for","in","of","to","a","an","is","are","was","were",
    "be","been","being","have","has","had","do","does","did","will","would","could",
    "should","may","might","can","shall","this","that","these","those","it","its",
    "their","his","her","my","your","our","we","they","you","he","she","i","me",
    "not","no","nor","so","if","then","than","too","very","also","such","own",
    "other","some","all","both","each","few","more","most","only","same","just",
    "about","above","after","before","between","under","during","through","while",
    "where","when","how","what","which","who","whom","at","by","from","on","as",
    "experience","knowledge","ability","skills","preferred","required","including",
    "familiar","proficient","understanding","background","working","work","years",
    "year","plus","least","least","good","strong","excellent","ability","abilities",
    "must","should","nice","bonus","plus","etc",
  ]);

  return words
    .filter(w => !stopWords.has(w.toLowerCase()))
    .map(w => w.replace(/[^a-zA-Z0-9+#.]/g, ""))
    .filter(w => w.length > 2);
}

function findContext(text: string, term: string): string | null {
  const lower = text.toLowerCase();
  const termLower = term.toLowerCase();
  const idx = lower.indexOf(termLower);
  if (idx === -1) return null;

  // Extract surrounding context (sentence-level)
  const start = Math.max(0, text.lastIndexOf(".", idx) + 1);
  const end = Math.min(text.length, text.indexOf(".", idx + term.length) + 1 || idx + 100);
  let context = text.slice(start, end).trim();
  if (context.length > 150) context = context.slice(0, 147) + "...";
  return context || null;
}

// ---- Keyword Matching ----

function matchKeywords(resume: ParsedResume, jd: ParsedJD): KeywordMatch[] {
  const resumeText = resume.rawText.toLowerCase();

  return jd.keywords.map(keyword => {
    const kwLower = keyword.toLowerCase();
    const exactMatch = resumeText.includes(kwLower);

    // Check for related terms
    const relatedTerms = findRelatedTerms(kwLower, resumeText);
    const found = exactMatch || relatedTerms.length > 0;

    // Find context
    let context = "";
    if (exactMatch) {
      const ctx = findContext(resume.rawText, keyword);
      if (ctx) context = ctx;
    }

    return {
      keyword,
      found,
      exactMatch,
      relatedTerms,
      context,
    };
  });
}

function findRelatedTerms(term: string, text: string): string[] {
  const synonyms: Record<string, string[]> = {
    "javascript": ["js", "ecmascript", "es6", "es2015"],
    "typescript": ["ts"],
    "python": ["py", "python3", "python2"],
    "react": ["reactjs", "react.js"],
    "angular": ["angularjs"],
    "vue": ["vuejs", "vue.js"],
    "node": ["nodejs", "node.js"],
    "postgresql": ["postgres", "psql"],
    "mongodb": ["mongo"],
    "kubernetes": ["k8s"],
    "machine learning": ["ml", "deep learning"],
    "artificial intelligence": ["ai"],
    "natural language processing": ["nlp"],
    "continuous integration": ["ci", "ci/cd"],
    "continuous delivery": ["cd", "ci/cd"],
    "amazon web services": ["aws"],
    "google cloud platform": ["gcp", "google cloud"],
    "microsoft azure": ["azure"],
    "graphql": ["gql"],
    "elasticsearch": ["elastic"],
    "terraform": ["tf"],
  };

  const related: string[] = [];
  const synonymsForTerm = synonyms[term] || [];

  for (const syn of synonymsForTerm) {
    if (text.includes(syn)) {
      related.push(syn);
    }
  }

  return related;
}

// ---- Skill Gap Analysis ----

function analyzeSkillGaps(
  resume: ParsedResume,
  jd: ParsedJD,
  matches: RequirementMatch[]
): SkillGap[] {
  const gaps: SkillGap[] = [];

  for (const match of matches) {
    if (match.matchLevel === "weak" || match.matchLevel === "missing") {
      const gapLevel: GapLevel =
        match.category === "required"
          ? match.matchLevel === "missing" ? "critical" : "important"
          : "optional";

      gaps.push({
        skill: match.requirement,
        level: gapLevel,
        category: match.category,
        reason: match.category === "required"
          ? "This is a required qualification that is missing or poorly evidenced"
          : "This is a preferred qualification that could strengthen your application",
        partialCoverage: match.evidence.length > 0 ? match.evidence[0] : "",
        suggestion: match.suggestion,
      });
    }
  }

  // Sort: critical first
  gaps.sort((a, b) => {
    const order = { critical: 0, important: 1, optional: 2 };
    return order[a.level] - order[b.level];
  });

  return gaps;
}

// ---- Job Match Strengths & Weak Parts ----

function identifyJobMatchStrengths(
  resume: ParsedResume,
  jd: ParsedJD,
  matches: RequirementMatch[]
): Strength[] {
  const strengths: Strength[] = [];

  const strongMatches = matches.filter(m => m.matchLevel === "strong" || m.matchLevel === "match");
  for (const m of strongMatches.slice(0, 5)) {
    strengths.push({
      area: `Strong Match: ${m.requirement.slice(0, 40)}`,
      detail: m.explanation,
    });
  }

  // Check for relevant projects
  const projectsSection = resume.sections.find(s => s.id === "projects");
  if (projectsSection && projectsSection.items.length > 0) {
    const relevantProjects = projectsSection.items.filter(item => {
      const itemText = (item.title + " " + item.bullets.join(" ")).toLowerCase();
      return jd.keywords.some(kw => itemText.includes(kw.toLowerCase()));
    });
    if (relevantProjects.length > 0) {
      strengths.push({
        area: "Relevant Projects",
        detail: `${relevantProjects.length} project(s) align with the job requirements`,
      });
    }
  }

  // Check for relevant skills
  const matchedKeywords = jd.keywords.filter(kw =>
    resume.allSkills.some(s => s.toLowerCase() === kw.toLowerCase()) ||
    resume.rawText.toLowerCase().includes(kw.toLowerCase())
  );
  if (matchedKeywords.length > 3) {
    strengths.push({
      area: "Skills Alignment",
      detail: `Matched ${matchedKeywords.length} key skills from the job description`,
    });
  }

  return strengths;
}

function identifyJobMatchWeakParts(
  matches: RequirementMatch[],
  gaps: SkillGap[]
): WeakPart[] {
  const weakParts: WeakPart[] = [];

  // Critical gaps
  const criticalGaps = gaps.filter(g => g.level === "critical");
  for (const gap of criticalGaps) {
    weakParts.push({
      id: `gap-${gap.skill.slice(0, 20)}`,
      area: "Skill Gap",
      issue: `Critical gap: ${gap.skill}`,
      whyItMatters: gap.reason,
      howToFix: gap.suggestion,
      severity: "high",
    });
  }

  // Weak evidence
  const weakMatches = matches.filter(m => m.matchLevel === "weak" || m.matchLevel === "partial");
  for (const m of weakMatches.slice(0, 3)) {
    weakParts.push({
      id: `weak-${m.requirement.slice(0, 20)}`,
      area: "Weak Evidence",
      issue: `Weak evidence for: ${m.requirement}`,
      whyItMatters: `This requirement is ${m.category} but has weak evidence in your resume.`,
      howToFix: m.suggestion,
      severity: "medium",
    });
  }

  return weakParts;
}

// ---- Helpers ----

function calculateCategoryScore(matches: RequirementMatch[]): number {
  if (matches.length === 0) return 70;

  let score = 0;
  let totalWeight = 0;

  for (const m of matches) {
    const weight = 1;
    totalWeight += weight;

    switch (m.matchLevel) {
      case "strong": score += 100 * weight; break;
      case "match": score += 75 * weight; break;
      case "partial": score += 40 * weight; break;
      case "related": score += 20 * weight; break;
      case "weak": score += 10 * weight; break;
      case "missing": score += 0 * weight; break;
    }
  }

  return totalWeight > 0 ? Math.round(score / totalWeight) : 50;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}
