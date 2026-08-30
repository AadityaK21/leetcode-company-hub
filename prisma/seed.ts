import { PrismaClient, Difficulty } from "@prisma/client";
import bcrypt from "bcryptjs";
import { BLIND_75 } from "../src/data/blind75";
import { strongPassword } from "../src/lib/validations";

const prisma = new PrismaClient();

const ACHIEVEMENTS = [
  { slug: "first-solve", title: "First Blood", description: "Solve your first problem.", icon: "zap", tier: "bronze", xpReward: 25 },
  { slug: "ten-solved", title: "Warmed Up", description: "Solve 10 problems.", icon: "flame", tier: "bronze", xpReward: 50 },
  { slug: "fifty-solved", title: "Grinder", description: "Solve 50 problems.", icon: "dumbbell", tier: "silver", xpReward: 150 },
  { slug: "hundred-solved", title: "Centurion", description: "Solve 100 problems.", icon: "medal", tier: "gold", xpReward: 400 },
  { slug: "first-hard", title: "Boss Fight", description: "Solve your first Hard problem.", icon: "swords", tier: "silver", xpReward: 100 },
  { slug: "week-streak", title: "Momentum", description: "Practice 7 days in a row.", icon: "calendar-check", tier: "silver", xpReward: 150 },
  { slug: "note-taker", title: "Scribe", description: "Write notes on 10 problems.", icon: "notebook-pen", tier: "bronze", xpReward: 50 },
];

const TOPIC_SHEETS = [
  { topicSlug: "dynamic-programming", slug: "dynamic-programming", title: "Dynamic Programming Sheet" },
  { topicSlug: "graph", slug: "graphs", title: "Graphs Sheet" },
  { topicSlug: "tree", slug: "trees", title: "Trees Sheet" },
  { topicSlug: "binary-search", slug: "binary-search", title: "Binary Search Sheet" },
  { topicSlug: "greedy", slug: "greedy", title: "Greedy Sheet" },
  { topicSlug: "sliding-window", slug: "sliding-window", title: "Sliding Window Sheet" },
];

async function main() {
  // --- Admin user ---
  const email = process.env.ADMIN_EMAIL ?? "admin@example.com";
  const password = process.env.ADMIN_PASSWORD ?? "";

  // This seed is meant to be run against production, so a placeholder here
  // becomes a real privileged account with a guessable password. Refuse
  // rather than quietly create one.
  const strong = strongPassword.safeParse(password);
  if (!strong.success) {
    throw new Error(
      `ADMIN_PASSWORD is not strong enough (${strong.error.issues[0].message}). ` +
        "Set a strong value in .env before seeding."
    );
  }
  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      name: "Admin",
      role: "ADMIN",
      emailVerified: new Date(), // seeded admin never needs the verify flow
      passwordHash: await bcrypt.hash(password, 10),
      settings: { create: {} },
    },
    update: { role: "ADMIN", emailVerified: new Date() },
  });
  console.log(`Admin ready: ${email}`);

  // --- Achievements ---
  for (const a of ACHIEVEMENTS) {
    await prisma.achievement.upsert({ where: { slug: a.slug }, create: a, update: a });
  }
  console.log(`Seeded ${ACHIEVEMENTS.length} achievements.`);

  // --- Blind 75 (creates missing questions so the sheet works pre-import) ---
  for (const entry of BLIND_75) {
    await prisma.question.upsert({
      where: { slug: entry.slug },
      create: {
        slug: entry.slug,
        title: entry.title,
        difficulty: entry.difficulty as Difficulty,
        leetcodeUrl: `https://leetcode.com/problems/${entry.slug}`,
        isPremium: entry.isPremium ?? false,
      },
      update: { isPremium: entry.isPremium ?? false },
    });
  }
  const blind75 = await prisma.studySheet.upsert({
    where: { slug: "blind-75" },
    create: {
      slug: "blind-75",
      title: "Blind 75",
      description: "The classic 75 questions covering every core pattern asked in interviews.",
    },
    update: {},
  });
  const b75Questions = await prisma.question.findMany({
    where: { slug: { in: BLIND_75.map((e) => e.slug) } },
    select: { id: true, slug: true },
  });
  const idBySlug = new Map(b75Questions.map((q) => [q.slug, q.id] as const));
  await prisma.studySheetQuestion.createMany({
    data: BLIND_75.flatMap((e, i) => {
      const questionId = idBySlug.get(e.slug);
      return questionId
        ? [{ sheetId: blind75.id, questionId, section: e.section, order: i }]
        : [];
    }),
    skipDuplicates: true,
  });
  console.log("Blind 75 sheet ready.");

  // --- Topic sheets from imported data (skipped when topics are absent) ---
  for (const sheet of TOPIC_SHEETS) {
    const topic = await prisma.topic.findUnique({ where: { slug: sheet.topicSlug } });
    if (!topic) continue;
    const questions = await prisma.question.findMany({
      where: { topics: { some: { topicId: topic.id } } },
      orderBy: { companies: { _count: "desc" } },
      take: 30,
      select: { id: true },
    });
    if (questions.length === 0) continue;
    const created = await prisma.studySheet.upsert({
      where: { slug: sheet.slug },
      create: {
        slug: sheet.slug,
        title: sheet.title,
        description: `The 30 most frequently asked ${sheet.title.replace(" Sheet", "")} problems across all companies.`,
      },
      update: {},
    });
    await prisma.studySheetQuestion.deleteMany({ where: { sheetId: created.id } });
    await prisma.studySheetQuestion.createMany({
      data: questions.map((q, i) => ({ sheetId: created.id, questionId: q.id, order: i })),
      skipDuplicates: true,
    });
    console.log(`Sheet ready: ${sheet.title}`);
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
