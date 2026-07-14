/**
 * Shared helper: pull real topic tags from LeetCode's public GraphQL API and
 * link them to questions already in the database.
 *
 * Used by both `scripts/enrich-topics.ts` (standalone) and the tail end of
 * `scripts/import-data.ts` (so every sync stays tagged).
 */
import type { PrismaClient } from "@prisma/client";

const GRAPHQL = process.env.LEETCODE_GRAPHQL ?? "https://leetcode.com/graphql";
const PAGE_SIZE = 100;
const PAGE_DELAY_MS = 350;
const FALLBACK_DELAY_MS = 250;
const MAX_FALLBACKS = 400;

export interface Tag {
  name: string;
  slug: string;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** POST a GraphQL query with light retry/backoff on transient failures. */
async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(GRAPHQL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: "https://leetcode.com/problemset/all/",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122 Safari/537.36",
        },
        body: JSON.stringify({ query, variables }),
      });
      if (res.status === 429) {
        await sleep(2000 * (attempt + 1));
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`);
      const json = (await res.json()) as { data?: T; errors?: unknown };
      if (json.errors) throw new Error(`GraphQL errors: ${JSON.stringify(json.errors)}`);
      if (!json.data) throw new Error("GraphQL response had no data");
      return json.data;
    } catch (err) {
      lastErr = err;
      await sleep(1000 * (attempt + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}

const LIST_QUERY = `
  query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
    problemsetQuestionList: questionList(
      categorySlug: $categorySlug
      limit: $limit
      skip: $skip
      filters: $filters
    ) {
      total: totalNum
      questions: data {
        titleSlug
        topicTags { name slug }
      }
    }
  }`;

const SINGLE_QUERY = `
  query questionData($titleSlug: String!) {
    question(titleSlug: $titleSlug) {
      titleSlug
      topicTags { name slug }
    }
  }`;

type ListResponse = {
  problemsetQuestionList: {
    total: number;
    questions: { titleSlug: string; topicTags: Tag[] }[];
  };
};

type SingleResponse = {
  question: { titleSlug: string; topicTags: Tag[] } | null;
};

type Logger = (msg: string) => void;

/** Page through the whole problem set, returning slug -> tags. */
async function fetchBulkTagMap(log: Logger): Promise<Map<string, Tag[]>> {
  const map = new Map<string, Tag[]>();
  let skip = 0;
  let total = Infinity;

  while (skip < total) {
    const data = await gql<ListResponse>(LIST_QUERY, {
      categorySlug: "",
      skip,
      limit: PAGE_SIZE,
      filters: {},
    });
    const page = data.problemsetQuestionList;
    total = page.total ?? 0;
    for (const q of page.questions) {
      map.set(q.titleSlug.toLowerCase(), q.topicTags ?? []);
    }
    skip += PAGE_SIZE;
    log(`  bulk: ${Math.min(skip, total)}/${total} problems`);
    if (page.questions.length === 0) break;
    await sleep(PAGE_DELAY_MS);
  }
  return map;
}

/**
 * Backfill topic tags for every question already in the DB.
 * Returns a small summary for logging by the caller.
 */
export async function enrichTopics(
  prisma: PrismaClient,
  log: Logger = () => {}
): Promise<{ topics: number; matched: number; links: number }> {
  log(`Fetching topic tags from ${GRAPHQL} …`);
  const tagMap = await fetchBulkTagMap(log);
  log(`Bulk map covers ${tagMap.size} problems.`);

  const dbQuestions = await prisma.question.findMany({ select: { id: true, slug: true } });
  log(`Questions in DB: ${dbQuestions.length}.`);

  // Fallback per-slug lookups for anything the bulk list missed.
  const missing = dbQuestions.filter((q) => !tagMap.has(q.slug.toLowerCase()));
  if (missing.length > 0) {
    const toLookup = missing.slice(0, MAX_FALLBACKS);
    log(`${missing.length} not in bulk list; looking up ${toLookup.length} individually…`);
    for (const q of toLookup) {
      try {
        const data = await gql<SingleResponse>(SINGLE_QUERY, { titleSlug: q.slug });
        if (data.question?.topicTags?.length) {
          tagMap.set(q.slug.toLowerCase(), data.question.topicTags);
        }
      } catch {
        /* skip individual failures */
      }
      await sleep(FALLBACK_DELAY_MS);
    }
  }

  // --- Upsert topics ---
  const tagBySlug = new Map<string, Tag>();
  for (const tags of tagMap.values()) {
    for (const t of tags) tagBySlug.set(t.slug, { name: t.name, slug: t.slug });
  }
  await prisma.topic.createMany({
    data: [...tagBySlug.values()].map((t) => ({ name: t.name, slug: t.slug })),
    skipDuplicates: true,
  });
  const topicIdBySlug = new Map(
    (await prisma.topic.findMany()).map((t) => [t.slug, t.id] as const)
  );

  // --- Rebuild question <-> topic links ---
  const links: { questionId: string; topicId: string }[] = [];
  let matched = 0;
  for (const q of dbQuestions) {
    const tags = tagMap.get(q.slug.toLowerCase());
    if (!tags || tags.length === 0) continue;
    matched++;
    for (const t of tags) {
      const tid = topicIdBySlug.get(t.slug) ?? topicIdBySlug.get(slugify(t.name));
      if (tid) links.push({ questionId: q.id, topicId: tid });
    }
  }
  for (const batch of chunk(links, 1000)) {
    await prisma.questionTopic.createMany({ data: batch, skipDuplicates: true });
  }

  return { topics: topicIdBySlug.size, matched, links: links.length };
}
