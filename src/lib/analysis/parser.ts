// ============================================================
// ATS Resume Analyzer – Resume Parser
// Extracts structured data from resume text
// ============================================================

import type {
  ParsedResume,
  ContactInfo,
  ResumeSection,
  ResumeItem,
} from "./types";

// ---- Constants ----

const SECTION_PATTERNS: Array<{ pattern: RegExp; id: string; titles: string[] }> = [
  { pattern: /^(SUMMARY|PROFESSIONAL\s+SUMMARY|EXECUTIVE\s+SUMMARY|CAREER\s+SUMMARY|PROFILE|OBJECTIVE|CAREER\s+OBJECTIVE|PROFESSIONAL\s+PROFILE)/i, id: "summary", titles: ["Summary", "Professional Summary", "Profile", "Objective"] },
  { pattern: /^(EXPERIENCE|WORK\s+EXPERIENCE|EMPLOYMENT|EMPLOYMENT\s+HISTORY|PROFESSIONAL\s+EXPERIENCE|WORK\s+HISTORY)/i, id: "experience", titles: ["Experience", "Work Experience", "Employment"] },
  { pattern: /^(INTERNSHIP|INTERNSHIPS|INTERNSHIP\s+EXPERIENCE)/i, id: "internship", titles: ["Internship", "Internships"] },
  { pattern: /^(EDUCATION|ACADEMIC|QUALIFICATIONS|EDUCATIONAL\s+BACKGROUND)/i, id: "education", titles: ["Education", "Academic Background"] },
  { pattern: /^(SKILLS|TECHNICAL\s+SKILLS|TECHNICAL\s+EXPERTISE|CORE\s+COMPETENCIES|COMPETENCIES|TECHNOLOGIES|TECH\s+STACK|TECH\s+STACKS)/i, id: "skills", titles: ["Skills", "Technical Skills", "Core Competencies", "Technologies"] },
  { pattern: /^(PROJECTS?|PERSONAL\s+PROJECTS?|KEY\s+PROJECTS?|NOTABLE\s+PROJECTS?)/i, id: "projects", titles: ["Projects", "Project"] },
  { pattern: /^(CERTIFICATIONS?|CERTIFICATES?|LICENSES?|CREDENTIALS?)/i, id: "certifications", titles: ["Certifications", "Certificates", "Licenses"] },
  { pattern: /^(ACHIEVEMENTS?|ACCOMPLISHMENTS?|AWARDS?|HONORS?|RECOGNITION)/i, id: "achievements", titles: ["Achievements", "Awards", "Honors"] },
  { pattern: /^(PUBLICATIONS?|PAPERS?|RESEARCH)/i, id: "publications", titles: ["Publications", "Research"] },
  { pattern: /^(VOLUNTEER|COMMUNITY\s+SERVICE|EXTRACURRICULAR)/i, id: "volunteer", titles: ["Volunteer", "Community Service"] },
  { pattern: /^(LEADERSHIP|LEADERSHIP\s+EXPERIENCE)/i, id: "leadership", titles: ["Leadership"] },
  { pattern: /^(LANGUAGES?|FOREIGN\s+LANGUAGES?)/i, id: "languages", titles: ["Languages"] },
  { pattern: /^(COURSEWORK|RELEVANT\s+COURSEWORK|COURSES)/i, id: "coursework", titles: ["Coursework"] },
  { pattern: /^(OPEN[\s-]?SOURCE|CONTRIBUTIONS?)/i, id: "opensource", titles: ["Open Source", "Contributions"] },
];

const CONTACT_PATTERNS = {
  email: /[\w.+-]+@[\w.-]+\.\w{2,}/gi,
  phone: /(?:\+?\d{1,3}[\s.-]?)?\(?\d{3,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{3,4}/g,
  linkedin: /(?:linkedin\.com\/in\/[\w%-]+|linkedin\.com\/pub\/[\w%-]+)/gi,
  github: /(?:github\.com\/[\w.-]+)/gi,
  website: /(?:https?:\/\/)?(?:www\.)?[\w-]+\.\w{2,}(?:\/\S*)?/gi,
  location: /^(?:[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}(?:\s*,\s*[A-Z]+)?|[A-Z][a-zA-Z\s]+,\s*[A-Z][a-zA-Z\s]+)/m,
};

// Common tech keywords for extraction
const TECH_KEYWORDS = new Set([
  "python","java","javascript","typescript","react","angular","vue","node","nodejs",
  "express","django","flask","fastapi","spring","springboot","rails","ruby",
  "go","golang","rust","c","c++","c#","php","swift","kotlin","scala","r",
  "sql","nosql","mysql","postgresql","mongodb","redis","elasticsearch","dynamodb",
  "cassandra","oracle","sqlite","firebase","supabase",
  "aws","azure","gcp","google cloud","docker","kubernetes","k8s","terraform",
  "jenkins","ci/cd","github actions","gitlab ci",
  "git","github","gitlab","bitbucket",
  "html","css","sass","scss","tailwind","bootstrap","material ui","mui",
  "graphql","rest","api","grpc","websocket",
  "machine learning","deep learning","nlp","natural language processing",
  "tensorflow","pytorch","keras","scikit-learn","pandas","numpy","matplotlib",
  "data analysis","data science","data engineering",
  "agile","scrum","jira","confluence","figma","sketch",
  "linux","unix","bash","powershell","vim",
  "blockchain","solidity","web3",
  "unity","unreal","blender",
  "excel","tableau","power bi","looker",
  "photoshop","illustrator","indesign",
  "spark","hadoop","hive","airflow","dbt","snowflake","bigquery","redshift",
  "nextjs","next.js","nuxt","svelte","remix","astro",
  "storybook","playwright","cypress","jest","mocha","pytest","junit",
  "microservices","serverless","lambda","cloud functions",
  "nginx","apache","iis",
  "neo4j","couchdb","mariadb","mssql",
  "net","dotnet","asp.net",
  "objective-c","dart","flutter","react native",
  "openai","langchain","llm","gpt","transformers","hugging face",
  "kafka","rabbitmq","sqs","pubsub",
  "prometheus","grafana","datadog","splunk",
]);

const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
  "from","as","is","was","are","were","been","be","have","has","had","do",
  "does","did","will","would","could","should","may","might","can","shall",
  "this","that","these","those","it","its","their","his","her","my","your",
  "our","we","they","you","he","she","i","me","us","them",
  "not","no","nor","so","if","then","than","too","very",
  "about","above","after","before","between","under","during","through",
  "while","where","when","how","what","which","who","whom",
  "all","each","every","both","few","more","most","other","some","such",
  "only","own","same","also","just","even","still","already","yet",
  "into","out","up","down","off","over","again","further","once","here",
  "there","any","much","many","well","back","well","now",
]);

// ---- Public API ----

export function parseResumeText(rawText: string, fileType: string): ParsedResume {
  const warnings: string[] = [];
  const isLatex = detectLatex(rawText);

  // Clean text
  let text = rawText;
  if (isLatex) {
    text = stripLatexCommands(rawText);
    warnings.push("LaTeX source detected. Content was extracted from source; formatting metadata was stripped for analysis.");
  }

  // Extract contact info
  const contact = extractContact(text);

  // Split into sections
  const { sections, remainingText } = extractSections(text);

  // Extract skills from dedicated skills section + from body
  const skillsFromSection = extractSkillsFromSection(sections);
  const skillsFromBody = extractTechnologies(remainingText + "\n" + sections.map(s => s.content).join("\n"));
  const allSkills = [...new Set([...skillsFromSection, ...skillsFromBody])];

  // Detect all present section types
  const detectedSections = sections.map(s => s.id);

  const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
  const lineCount = text.split("\n").length;

  return {
    rawText,
    contact,
    sections,
    allSkills: skillsFromSection,
    fileType,
    wordCount,
    lineCount,
    isLatex,
    parsingWarnings: warnings,
    detectedSections,
  };
}

// ---- Contact Extraction ----

function extractContact(text: string): ContactInfo {
  const lines = text.split("\n").slice(0, 10); // first 10 lines for contact

  const emails = text.match(CONTACT_PATTERNS.email) || [];
  const phones = text.match(CONTACT_PATTERNS.phone) || [];
  const linkedins = text.match(CONTACT_PATTERNS.linkedin) || [];
  const githubs = text.match(CONTACT_PATTERNS.github) || [];

  // Name: first non-empty line that doesn't look like contact info
  let name = "";
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.match(/@|\.com|\.org|\.net|linkedin|github|http|phone|\d{3}[\s.-]\d{3}/i)) continue;
    if (trimmed.split(/\s+/).length > 5) continue;
    if (trimmed.split(/\s+/).length >= 2 && trimmed.split(/\s+/).length <= 4) {
      name = trimmed;
      break;
    }
  }

  // Location: look for City, State pattern
  const locationMatch = text.match(CONTACT_PATTERNS.location);
  let location = "";
  if (locationMatch) {
    // Don't use the first match if it looks like a company location
    for (const m of locationMatch) {
      if (!m.match(/inc|llc|corp|ltd|company/i)) {
        location = m.trim();
        break;
      }
    }
  }

  return {
    name,
    email: emails[0] || "",
    phone: phones[0] || "",
    location,
    linkedin: linkedins[0] || "",
    github: githubs[0] || "",
    website: "",
    portfolio: "",
  };
}

// ---- Section Extraction ----

function extractSections(text: string): { sections: ResumeSection[]; remainingText: string } {
  const lines = text.split("\n");
  const sections: ResumeSection[] = [];
  let currentSectionIndex = -1;
  let order = 0;
  const remainingLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Check if this line is a section header
    const sectionMatch = matchSectionHeader(line);

    if (sectionMatch) {
      currentSectionIndex = sections.length;
      sections.push({
        id: sectionMatch.id,
        title: sectionMatch.titles[0],
        rawTitle: line,
        content: "",
        items: [],
        order: order++,
      });
      continue;
    }

    if (currentSectionIndex >= 0) {
      sections[currentSectionIndex].content += line + "\n";
    } else {
      remainingLines.push(line);
    }
  }

  // Parse items within sections
  for (const section of sections) {
    section.content = section.content.trim();
    if (["experience", "internship", "projects", "education"].includes(section.id)) {
      section.items = parseSectionItems(section.content, section.id);
    }
  }

  return { sections, remainingText: remainingLines.join("\n") };
}

function matchSectionHeader(line: string): { id: string; titles: string[] } | null {
  for (const sp of SECTION_PATTERNS) {
    if (sp.pattern.test(line)) {
      return { id: sp.id, titles: sp.titles };
    }
  }
  return null;
}

function parseSectionItems(content: string, sectionType: string): ResumeItem[] {
  const items: ResumeItem[] = [];
  const lines = content.split("\n");

  let currentItem: ResumeItem | null = null;
  const dateRangeRegex = /(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{4}\s*[-–—to]+\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{4}|(?:Present|Current|Now)|(?:\d{4}\s*[-–—to]+\s*(?:\d{4}|Present|Current|Now))/i;
  const yearRangeRegex = /\b(19|20)\d{2}\s*[-–—to]+\s*((?:19|20)\d{2}|Present|Current|Now)\b/i;
  const bulletRegex = /^[•\-\*\▪▸▹>\d+.\)\s]+/;
  const educationDateRegex = /(?:Expected\s+)?(?:May|Dec|Jun|Aug|Jul)\w*\s*\d{4}/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    if (!trimmed) continue;

    const hasDate = dateRangeRegex.test(trimmed) || yearRangeRegex.test(trimmed) || educationDateRegex.test(trimmed);
    const isBullet = bulletRegex.test(trimmed);
    const hasCommaDate = trimmed.match(/\w+\s+\d{4}\s*[,]\s*(?:Present|Current|\w+\s+\d{4})/i);

    // Check if this looks like a new item header (has a date and is not a bullet)
    if ((hasDate || hasCommaDate) && !isBullet) {
      if (currentItem) items.push(currentItem);

      const dateMatch = trimmed.match(dateRangeRegex) || trimmed.match(yearRangeRegex) || trimmed.match(educationDateRegex) || trimmed.match(/(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w*\s*\d{4}\s*[,]\s*(?:Present|Current|\w+\s+\d{4})/i);
      const dateRange = dateMatch ? dateMatch[0] : "";

      // Split title from date
      const titlePart = dateMatch ? trimmed.substring(0, trimmed.indexOf(dateMatch[0])).trim() : trimmed;
      const parts = titlePart.split(/(?: at | — | \| |, )/);

      currentItem = {
        title: parts[0] || "",
        subtitle: parts.slice(1).join(" ") || "",
        dateRange,
        startDate: "",
        endDate: "",
        bullets: [],
        technologies: [],
        raw: trimmed,
      };
    } else if (isBullet && currentItem) {
      const bullet = trimmed.replace(bulletRegex, "").trim();
      if (bullet) currentItem.bullets.push(bullet);
    } else if (currentItem) {
      currentItem.bullets.push(trimmed);
      currentItem.raw += "\n" + trimmed;
    } else {
      // Create item from non-bullet line
      if (currentItem) items.push(currentItem);
      currentItem = {
        title: trimmed,
        subtitle: "",
        dateRange: "",
        startDate: "",
        endDate: "",
        bullets: [],
        technologies: [],
        raw: trimmed,
      };
    }
  }

  if (currentItem) items.push(currentItem);

  // Extract technologies from items
  for (const item of items) {
    item.technologies = extractTechnologies(item.title + " " + item.subtitle + " " + item.bullets.join(" "));
  }

  return items;
}

// ---- Skills Extraction ----

function extractSkillsFromSection(sections: ResumeSection[]): string[] {
  const skills: string[] = [];

  for (const section of sections) {
    if (section.id === "skills") {
      // Parse skills from the skills section
      const lines = section.content.split("\n");
      for (const line of lines) {
        const parts = line.split(/[:|,;•\-\*]/);
        for (const part of parts) {
          const cleaned = part.trim().replace(/^[\s\-•*]+/, "").trim();
          if (cleaned && cleaned.length > 1 && cleaned.length < 60) {
            // Check if it's a sub-category or individual skill
            if (cleaned.includes(":")) {
              const subSkills = cleaned.split(":");
              for (const s of subSkills.slice(1)) {
                const skillItems = s.split(/[,\/|]/);
                for (const si of skillItems) {
                  const trimmed = si.trim();
                  if (trimmed) skills.push(trimmed);
                }
              }
            } else {
              const skillItems = cleaned.split(/[,\/]/);
              for (const si of skillItems) {
                const trimmed = si.trim();
                if (trimmed) skills.push(trimmed);
              }
            }
          }
        }
      }
    }
  }

  // Deduplicate
  const unique = [...new Set(skills.map(s => s.toLowerCase()))];
  return unique;
}

function extractTechnologies(text: string): string[] {
  const lower = text.toLowerCase();
  const found: string[] = [];
  for (const tech of TECH_KEYWORDS) {
    if (lower.includes(tech)) {
      found.push(tech);
    }
  }
  return [...new Set(found)];
}

// ---- LaTeX Detection & Stripping ----

function detectLatex(text: string): boolean {
  const latexIndicators = [
    /\\documentclass/,
    /\\begin\{document\}/,
    /\\usepackage/,
    /\\section\{/,
    /\\textbf\{/,
    /\\item/,
    /\\resumeSection/,
    /\\href\{/,
    /\\vspace/,
    /\\hfill/,
  ];
  const count = latexIndicators.filter(p => p.test(text)).length;
  return count >= 2;
}

function stripLatexCommands(text: string): string {
  let result = text;

  // Remove comments
  result = result.replace(/%.*$/gm, "");

  // Remove common LaTeX commands but keep content
  const commands = [
    /\\documentclass\{[^}]*\}/g,
    /\\usepackage(\[[^\]]*\])?\{[^}]*\}/g,
    /\\title\{([^}]*)\}/g,
    /\\author\{([^}]*)\}/g,
    /\\date\{[^}]*\}/g,
    /\\begin\{[^}]*\}/g,
    /\\end\{[^}]*\}/g,
    /\\maketitle/g,
    /\\newpage/g,
    /\\vspace\{[^}]*\}/g,
    /\\vspace\*\{[^}]*\}/g,
    /\\hspace\{[^}]*\}/g,
    /\\hfill/g,
    /\\centering/g,
    /\\noindent/g,
    /\\textbf\{([^}]*)\}/g,
    /\\textit\{([^}]*)\}/g,
    /\\underline\{([^}]*)\}/g,
    /\\href\{[^}]*\}\{([^}]*)\}/g,
    /\\url\{([^}]*)\}/g,
    /\\item\[\s*\]/g,
    /\\item\s/g,
    /\\item\b/g,
    /\\resumeSection\{([^}]*)\}/g,
    /\\resumeItem\{([^}]*)\}/g,
    /\\resumeSubheading\{([^}]*)\}\{([^}]*)\}/g,
    /\\resumeSubheading\{([^}]*)\}/g,
    /\\resumeItemListStart/g,
    /\\resumeItemListEnd/g,
    /\\resumeSubItem\{([^}]*)\}/g,
    /\\small\{([^}]*)\}/g,
    /\\large\{([^}]*)\}/g,
    /\\Large\{([^}]*)\}/g,
    /\\scriptsize\{[^}]*\}/g,
    /\\tabular/g,
    /\\multicolumn/g,
    /\\[a-zA-Z]+\*?\{([^}]*)\}/g,
    /~/g,
    /\\\\/g,
  ];

  for (const cmd of commands) {
    result = result.replace(cmd, (_, content) => content || "");
  }

  // Remove remaining backslash commands
  result = result.replace(/\\[a-zA-Z]+/g, "");

  // Clean up braces
  result = result.replace(/\{|\}/g, "");

  // Clean up excessive whitespace
  result = result.replace(/\n{3,}/g, "\n\n");

  return result.trim();
}
