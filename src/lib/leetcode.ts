/**
 * LeetCode public GraphQL helpers.
 *
 * Honest limitation: LeetCode's public API only exposes a user's ~20 most
 * recent ACCEPTED submissions. Full history requires their session cookie,
 * which we will never ask for. So sync is incremental: it imports recent
 * solves each run and accumulates over time.
 */
const ENDPOINT = "https://leetcode.com/graphql";

async function gql<T>(query: string, variables: Record<string, unknown>): Promise<T | null> {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Referer: "https://leetcode.com",
        "User-Agent": "Mozilla/5.0 (compatible; CompanyHub sync)",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return (data?.data as T) ?? null;
  } catch {
    return null;
  }
}

export async function verifyLeetcodeUser(
  username: string
): Promise<{ exists: boolean; solvedCount: number | null }> {
  const data = await gql<{
    matchedUser: {
      username: string;
      submitStatsGlobal?: { acSubmissionNum?: { difficulty: string; count: number }[] };
    } | null;
  }>(
    `query ($username: String!) {
       matchedUser(username: $username) {
         username
         submitStatsGlobal { acSubmissionNum { difficulty count } }
       }
     }`,
    { username }
  );
  if (!data?.matchedUser) return { exists: false, solvedCount: null };
  const all = data.matchedUser.submitStatsGlobal?.acSubmissionNum?.find(
    (d) => d.difficulty === "All"
  );
  return { exists: true, solvedCount: all?.count ?? null };
}

/** The user's public profile summary ("aboutMe") — used for ownership checks. */
export async function fetchProfileSummary(username: string): Promise<string | null> {
  const data = await gql<{
    matchedUser: { profile: { aboutMe: string | null } | null } | null;
  }>(
    `query ($username: String!) {
       matchedUser(username: $username) {
         profile { aboutMe }
       }
     }`,
    { username }
  );
  if (!data?.matchedUser) return null;
  return data.matchedUser.profile?.aboutMe ?? "";
}

export async function recentAcceptedSlugs(username: string): Promise<string[] | null> {
  const data = await gql<{
    recentAcSubmissionList: { titleSlug: string }[] | null;
  }>(
    `query ($username: String!, $limit: Int!) {
       recentAcSubmissionList(username: $username, limit: $limit) { titleSlug }
     }`,
    { username, limit: 20 }
  );
  if (!data?.recentAcSubmissionList) return null;
  return [...new Set(data.recentAcSubmissionList.map((s) => s.titleSlug))];
}
