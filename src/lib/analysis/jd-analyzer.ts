// ============================================================
// ATS Resume Analyzer – JD Analysis Engine
// Parses job descriptions and extracts requirements
// ============================================================

import type { ParsedJD, JDRequirement } from "./types";

// ---- Public API ----

export function analyzeJD(rawText: string): ParsedJD {
  const lines = rawText.split("\n");

  // Extract job title (first meaningful line)
  let title = "";
  for (const line of lines.slice(0, 5)) {
    const trimmed = line.trim();
    if (trimmed && trimmed.length > 3 && trimmed.length < 120) {
      title = trimmed;
      break;
    }
  }

  // Extract requirements by category
  const requirements = extractRequirements(rawText);
  const keywords = extractJDKeywords(rawText);

  const requiredSkills = requirements
    .filter(r => r.category === "required" && r.type === "skill")
    .map(r => r.text);

  const preferredSkills = requirements
    .filter(r => r.category === "preferred" && r.type === "skill")
    .map(r => r.text);

  const educationRequirements = requirements
    .filter(r => r.type === "education")
    .map(r => r.text);

  const experienceRequirements = requirements
    .filter(r => r.type === "experience")
    .map(r => r.text);

  const tools = requirements
    .filter(r => r.type === "tool")
    .map(r => r.text);

  const responsibilities = requirements
    .filter(r => r.type === "responsibility")
    .map(r => r.text);

  return {
    rawText,
    title,
    requirements,
    keywords,
    requiredSkills,
    preferredSkills,
    educationRequirements,
    experienceRequirements,
    tools,
    responsibilities,
  };
}

// ---- Requirement Extraction ----

function extractRequirements(text: string): JDRequirement[] {
  const requirements: JDRequirement[] = [];
  const lowerText = text.toLowerCase();

  // Check for required vs preferred sections
  const hasRequiredSection = /(?:required|must\s+have|essential|minimum\s+qualifications|requirements?)/i.test(text);
  const hasPreferredSection = /(?:preferred|nice[\s-]to[\s-]have|bonus|desired|plus|advantageous)/i.test(text);

  // Split text into lines and analyze each bullet
  const lines = text.split("\n");
  let currentCategory: "required" | "preferred" = "required";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Detect category shifts
    const lower = trimmed.toLowerCase();
    if (hasPreferredSection && /(?:preferred|nice[\s-]to[\s-]have|bonus|desired|plus|advantageous)/i.test(trimmed)) {
      currentCategory = "preferred";
      continue;
    }
    if (hasRequiredSection && /(?:required|must[\s-]have|essential|minimum|requirements?)/i.test(trimmed) &&
        !trimmed.match(/^[•\-\*\d]/)) {
      currentCategory = "required";
      continue;
    }

    // Only process bullet points or list items
    const isBullet = /^[•\-\*\▪▸>\d+.\)]\s*/.test(trimmed);
    if (!isBullet && trimmed.length > 200) continue; // Skip long paragraphs

    const bulletText = trimmed.replace(/^[•\-\*\▪▸>\d+.\)]\s*/, "").trim();
    if (bulletText.length < 3) continue;

    // Classify the requirement
    const type = classifyRequirement(bulletText);

    // Calculate importance
    const importance = calculateImportance(bulletText, currentCategory, type);

    requirements.push({
      text: bulletText,
      category: currentCategory,
      type,
      importance,
    });
  }

  // Also extract from paragraph-style JDs
  if (requirements.length < 3) {
    const sentenceReqs = extractFromParagraphs(text, currentCategory);
    requirements.push(...sentenceReqs);
  }

  // Deduplicate
  const seen = new Set<string>();
  return requirements.filter(r => {
    const key = r.text.toLowerCase().slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function classifyRequirement(text: string): JDRequirement["type"] {
  const lower = text.toLowerCase();

  // Education
  if (/\b(?:bachelor|master|phd|degree|diploma|bsc|msc|mba|b\.?s\.?|m\.?s\.?|university|college|gpa)\b/i.test(text)) {
    return "education";
  }

  // Experience
  if (/\b(\d+)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)\b/i.test(text) ||
      /\b(?:experience|exp)\s+(?:in|with)\b/i.test(text)) {
    return "experience";
  }

  // Tools (specific products/platforms)
  const toolKeywords = /\b(?:jira|confluence|figma|sketch|aws|azure|gcp|docker|kubernetes|k8s|git|github|gitlab|jenkins|terraform|ansible|datadog|grafana|slack|notion|salesforce|hubspot|google analytics|tableau|power\s*bi)\b/i;
  if (toolKeywords.test(text)) {
    return "tool";
  }

  // Certifications
  if (/\b(?:certification|certified|certificate|license|aws\s+certified|pmp|cissp|comptia|ccna|ccnp)\b/i.test(text)) {
    return "certification";
  }

  // Soft skills
  const softSkillWords = /\b(?:communication|leadership|teamwork|problem[\s-]solving|critical[\s-]thinking|adaptability|creativity|time[\s-]management|interpersonal|collaboration|analytical|organizational|presentation|negotiation|mentoring|stakeholder)\b/i;
  if (softSkillWords.test(text) && !/\b(?:python|java|sql|react|angular|node)\b/i.test(text)) {
    return "soft_skill";
  }

  // Skills (default for technical content)
  return "skill";
}

function calculateImportance(text: string, category: "required" | "preferred", type: JDRequirement["type"]): number {
  let importance = 0.5;

  if (category === "required") importance += 0.2;
  if (type === "skill") importance += 0.1;
  if (type === "experience") importance += 0.1;
  if (type === "education") importance += 0.05;

  // Boost for strongly emphasized requirements
  if (/\b(?:must|essential|required|critical|mandatory)\b/i.test(text)) importance += 0.1;

  return Math.min(1, importance);
}

function extractFromParagraphs(text: string, defaultCategory: "required" | "preferred"): JDRequirement[] {
  const requirements: JDRequirement[] = [];
  const sentences = text.replace(/\n/g, " ").split(/[.!?]+/);

  for (const sentence of sentences) {
    const trimmed = sentence.trim();
    if (trimmed.length < 10 || trimmed.length > 200) continue;

    // Look for sentences that contain skill/requirement language
    if (/\b(?:experience|knowledge|proficient|familiar|skilled|understanding|background)\s+(?:in|with)\b/i.test(trimmed) ||
        /\b(?:looking for|seeking|need|require|ideal candidate)\b/i.test(trimmed)) {

      const type = classifyRequirement(trimmed);
      requirements.push({
        text: trimmed,
        category: defaultCategory,
        type,
        importance: 0.5,
      });
    }
  }

  return requirements;
}

// ---- Keyword Extraction ----

function extractJDKeywords(text: string): string[] {
  const lower = text.toLowerCase();
  const words = lower.split(/[\s,;:.!?()\[\]{}|/\\]+/).filter(w => w.length > 2);

  // Technical keywords to look for
  const techTerms = [
    "python","java","javascript","typescript","react","angular","vue","node",
    "express","django","flask","fastapi","spring","ruby","rails",
    "go","golang","rust","c","c++","c#","php","swift","kotlin","scala","r",
    "sql","nosql","mysql","postgresql","mongodb","redis","elasticsearch",
    "aws","azure","gcp","cloud","docker","kubernetes","terraform","ci/cd",
    "git","github","gitlab","html","css","machine learning","deep learning",
    "data science","analytics","ai","artificial intelligence","nlp",
    "blockchain","devops","agile","scrum","microservices","rest","api","graphql",
    "figma","sketch","photoshop","illustrator","tableau","power bi",
    "nextjs","svelte","tailwind","bootstrap","typescript","graphql","grpc",
    "kafka","airflow","spark","hadoop","snowflake","bigquery","redshift",
    "testing","automation","security","linux","unix","bash",
    "project management","leadership","communication","problem solving",
    "team","collaboration","design","architecture","infrastructure",
  ];

  const found: string[] = [];

  for (const term of techTerms) {
    if (lower.includes(term)) {
      found.push(term);
    }
  }

  // Also extract capitalized multi-word terms
  const multiWordPattern = /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+\b/g;
  const multiWordMatches = text.match(multiWordPattern) || [];
  for (const match of multiWordMatches) {
    if (match.length > 4 && match.length < 40 && !found.includes(match.toLowerCase())) {
      found.push(match.toLowerCase());
    }
  }

  return [...new Set(found)];
}
