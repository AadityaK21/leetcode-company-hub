/**
 * Enriches existing questions with real topic tags from LeetCode's public
 * GraphQL API. The company-wise CSV source (Schema C, 2026 layout) ships no
 * topic column, so questions import with empty topics — this backfills them.
 *
 * Usage: npm run db:enrich-topics
 */
import { PrismaClient } from "@prisma/client";
import { enrichTopics } from "./lib/leetcode-topics";

const prisma = new PrismaClient();

async function main() {
  const summary = await enrichTopics(prisma, (msg) => {
    // Overwrite the line for progress-style messages, newline otherwise.
    if (msg.startsWith("  ")) process.stdout.write(`\r${msg}`);
    else process.stdout.write(`\n${msg}\n`);
  });
  console.log(
    `\nEnrichment complete: ${summary.matched} questions tagged, ` +
      `${summary.topics} topics, ${summary.links} links written.`
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
