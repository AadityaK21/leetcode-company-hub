/**
 * Imports company-wise LeetCode questions from
 * https://github.com/snehasishroy/leetcode-companywise-interview-questions
 *
 * Usage: npm run db:import
 *
 * The repo layout is one folder per company, each holding CSVs bucketed by
 * recency ("1. Thirty Days.csv" … "5. All.csv"). Two CSV schemas exist in the
 * wild and both are handled:
 *   A) DIFFICULTY,Title,Frequency,Acceptance(0–1),Link,"Topic, Topic"
 *   B) ID,Title,Acceptance("55.5%"),Difficulty,Frequency,Link
 */
import AdmZip from "adm-zip";
import { PrismaClient, Difficulty } from "@prisma/client";

const prisma = new PrismaClient();

const REPO = process.env.DATA_REPO ?? "snehasishroy/leetcode-companywise-interview-questions";
const BRANCH = process.env.DATA_BRANCH ?? "master";

type Bucket = "d30" | "m3" | "m6" | "y1" | "all";

interface ParsedQuestion {
  slug: string;
  title: string;
  difficulty: Difficulty;
  acceptance: number | null;
  url: string;
  topics: string[];
}

interface CompanyLink {
  frequency: number;
  buckets: Set<Bucket>;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function titleCase(slug: string): string {
  return slug
    .split("-")
    .map((w) => (w.length <= 2 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

function bucketFromFilename(name: string): Bucket | null {
  // Normalize hyphens/underscores so "three-months.csv" matches "three month".
  const n = name.toLowerCase().replace(/[-_]+/g, " ");
  if (n.startsWith("1") || n.includes("thirty")) return "d30";
  // "more than six months" must be checked BEFORE "six month" (substring clash).
  if (n.startsWith("4") || n.includes("more than") || n.includes("year")) return "y1";
  if (n.startsWith("2") || n.includes("three month")) return "m3";
  if (n.startsWith("3") || n.includes("six month")) return "m6";
  if (n.startsWith("5") || n.includes("all")) return "all";
  return null;
}

/** Minimal CSV line splitter that respects double quotes. */
function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out.map((s) => s.trim());
}

const DIFFS = new Set(["EASY", "MEDIUM", "HARD"]);

function parseRow(cols: string[]): { q: ParsedQuestion; frequency: number } | null {
  if (cols.length < 5) return null;
  let title = "";
  let difficulty = "";
  let acceptance: number | null = null;
  let frequency = 0;
  let url = "";
  let topics: string[] = [];

  if (DIFFS.has(cols[0].toUpperCase())) {
    // Schema A
    difficulty = cols[0].toUpperCase();
    title = cols[1];
    frequency = parseFloat(cols[2]) || 0;
    const acc = parseFloat(cols[3]);
    acceptance = Number.isFinite(acc) ? (acc <= 1 ? acc * 100 : acc) : null;
    url = cols[4];
    topics = (cols[5] ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
  } else if (
    (cols[1] ?? "").includes("problems/") &&
    DIFFS.has((cols[3] ?? "").toUpperCase())
  ) {
    // Schema C (2026 layout): ID,URL,Title,Difficulty,Acceptance %,Frequency %
    url = cols[1];
    title = cols[2];
    difficulty = cols[3].toUpperCase();
    const acc = parseFloat((cols[4] ?? "").replace("%", ""));
    acceptance = Number.isFinite(acc) ? (acc <= 1 ? acc * 100 : acc) : null;
    frequency = parseFloat((cols[5] ?? "").replace("%", "")) || 0;
  } else if (DIFFS.has((cols[3] ?? "").toUpperCase())) {
    // Schema B
    title = cols[1];
    const acc = parseFloat((cols[2] ?? "").replace("%", ""));
    acceptance = Number.isFinite(acc) ? (acc <= 1 ? acc * 100 : acc) : null;
    difficulty = cols[3].toUpperCase();
    frequency = parseFloat(cols[4]) || 0;
    url = cols[5] ?? "";
  } else {
    return null; // header or malformed row
  }

  url = url.replace(/\/$/, "");
  const match = url.match(/problems\/([a-z0-9-]+)/i);
  if (!match || !title) return null;

  if (frequency > 0 && frequency <= 1) frequency *= 100;

  return {
    q: {
      slug: match[1].toLowerCase(),
      title,
      difficulty: difficulty as Difficulty,
      acceptance: acceptance !== null ? Math.round(acceptance * 10) / 10 : null,
      url: `https://leetcode.com/problems/${match[1].toLowerCase()}`,
      topics,
    },
    frequency: Math.min(100, Math.round(frequency * 10) / 10),
  };
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  console.log(`Downloading ${REPO}@${BRANCH}…`);
  const res = await fetch(`https://codeload.github.com/${REPO}/zip/refs/heads/${BRANCH}`);
  if (!res.ok) throw new Error(`Download failed: ${res.status} ${res.statusText}`);
  const zip = new AdmZip(Buffer.from(await res.arrayBuffer()));

  // companySlug -> questionSlug -> link data
  const companies = new Map<string, Map<string, CompanyLink>>();
  const questions = new Map<string, ParsedQuestion>();

  const allCsvs = zip
    .getEntries()
    .filter((e) => !e.isDirectory && e.entryName.toLowerCase().endsWith(".csv"));
  // Newer repo layout keeps company CSVs inside a "companies/" directory
  // (the repo root now holds scraper code). Prefer those if present.
  const underCompanies = allCsvs.filter(
    (e) => e.entryName.split("/")[1]?.toLowerCase() === "companies"
  );
  const csvEntries = underCompanies.length > 0 ? underCompanies : allCsvs;

  for (const entry of csvEntries) {
    const parts = entry.entryName.split("/").slice(1); // drop repo root dir
    if (parts[0]?.toLowerCase() === "companies") parts.shift();

    let companySlug = "";
    let bucket: Bucket | null = null;
    if (parts.length === 2) {
      // company/<bucketed file>.csv
      companySlug = slugify(parts[0]);
      bucket = bucketFromFilename(parts[1]) ?? "all";
    } else if (parts.length === 1) {
      // flat layout: companies/<Company>.csv — treat as the "all" bucket
      companySlug = slugify(parts[0].replace(/\.csv$/i, ""));
      bucket = "all";
    }
    if (!companySlug || !bucket) continue;

    const text = entry.getData().toString("utf8");
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const parsed = parseRow(splitCsvLine(line));
      if (!parsed) continue;

      const existing = questions.get(parsed.q.slug);
      if (!existing) {
        questions.set(parsed.q.slug, parsed.q);
      } else if (existing.topics.length === 0 && parsed.q.topics.length > 0) {
        existing.topics = parsed.q.topics;
      }

      let links = companies.get(companySlug);
      if (!links) {
        links = new Map();
        companies.set(companySlug, links);
      }
      const link = links.get(parsed.q.slug) ?? { frequency: 0, buckets: new Set<Bucket>() };
      link.frequency = Math.max(link.frequency, parsed.frequency);
      link.buckets.add(bucket);
      links.set(parsed.q.slug, link);
    }
  }

  console.log(`Parsed ${companies.size} companies, ${questions.size} unique questions.`);

  // --- Topics ---
  const topicNames = new Set<string>();
  for (const q of questions.values()) q.topics.forEach((t) => topicNames.add(t));
  await prisma.topic.createMany({
    data: [...topicNames].map((name) => ({ name, slug: slugify(name) })),
    skipDuplicates: true,
  });
  const topicIdBySlug = new Map(
    (await prisma.topic.findMany()).map((t) => [t.slug, t.id] as const)
  );

  // --- Questions ---
  const existingQ = new Map(
    (await prisma.question.findMany({ select: { id: true, slug: true } })).map(
      (q) => [q.slug, q.id] as const
    )
  );
  const newQuestions = [...questions.values()].filter((q) => !existingQ.has(q.slug));
  for (const batch of chunk(newQuestions, 500)) {
    await prisma.question.createMany({
      data: batch.map((q) => ({
        slug: q.slug,
        title: q.title,
        difficulty: q.difficulty,
        acceptance: q.acceptance,
        leetcodeUrl: q.url,
      })),
      skipDuplicates: true,
    });
  }
  const questionIdBySlug = new Map(
    (await prisma.question.findMany({ select: { id: true, slug: true } })).map(
      (q) => [q.slug, q.id] as const
    )
  );
  console.log(`Questions in DB: ${questionIdBySlug.size} (${newQuestions.length} new).`);

  // --- Question ↔ Topic links ---
  const topicLinks: { questionId: string; topicId: string }[] = [];
  for (const q of questions.values()) {
    const qid = questionIdBySlug.get(q.slug);
    if (!qid) continue;
    for (const t of q.topics) {
      const tid = topicIdBySlug.get(slugify(t));
      if (tid) topicLinks.push({ questionId: qid, topicId: tid });
    }
  }
  for (const batch of chunk(topicLinks, 1000)) {
    await prisma.questionTopic.createMany({ data: batch, skipDuplicates: true });
  }

  // --- Companies + company↔question links (rebuilt each sync) ---
  const now = new Date();
  let processed = 0;
  for (const [companySlug, links] of companies) {
    const stats = { easy: 0, medium: 0, hard: 0, top: 0 };
    const rows: {
      questionId: string;
      frequency: number;
      inLast30Days: boolean;
      inLast3Months: boolean;
      inLast6Months: boolean;
      inLastYear: boolean;
    }[] = [];

    for (const [qSlug, link] of links) {
      const qid = questionIdBySlug.get(qSlug);
      const q = questions.get(qSlug);
      if (!qid || !q) continue;
      if (q.difficulty === "EASY") stats.easy++;
      else if (q.difficulty === "MEDIUM") stats.medium++;
      else stats.hard++;
      stats.top = Math.max(stats.top, link.frequency);
      rows.push({
        questionId: qid,
        frequency: link.frequency,
        inLast30Days: link.buckets.has("d30"),
        inLast3Months: link.buckets.has("d30") || link.buckets.has("m3"),
        inLast6Months:
          link.buckets.has("d30") || link.buckets.has("m3") || link.buckets.has("m6"),
        inLastYear:
          link.buckets.has("y1") ||
          link.buckets.has("m6") ||
          link.buckets.has("m3") ||
          link.buckets.has("d30"),
      });
    }

    const company = await prisma.company.upsert({
      where: { slug: companySlug },
      create: {
        slug: companySlug,
        name: titleCase(companySlug),
        logoUrl: `https://logo.clearbit.com/${companySlug.replace(/-/g, "")}.com`,
        totalQuestions: rows.length,
        easyCount: stats.easy,
        mediumCount: stats.medium,
        hardCount: stats.hard,
        topFrequency: stats.top,
        lastSyncedAt: now,
      },
      update: {
        totalQuestions: rows.length,
        easyCount: stats.easy,
        mediumCount: stats.medium,
        hardCount: stats.hard,
        topFrequency: stats.top,
        lastSyncedAt: now,
      },
    });

    await prisma.companyQuestion.deleteMany({ where: { companyId: company.id } });
    for (const batch of chunk(rows, 1000)) {
      await prisma.companyQuestion.createMany({
        data: batch.map((r) => ({ ...r, companyId: company.id })),
        skipDuplicates: true,
      });
    }

    processed++;
    if (processed % 50 === 0) console.log(`  …${processed}/${companies.size} companies`);
  }

  console.log("Import complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());