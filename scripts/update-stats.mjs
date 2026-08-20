#!/usr/bin/env node
/**
 * scripts/update-stats.mjs
 *
 * Fetches public GitHub and LeetCode statistics and writes them into
 * assets/data/stats.json, preserving the existing JSON structure:
 *
 * {
 *   "leetcode": { "solved": 0, "easy": 0, "medium": 0, "hard": 0 },
 *   "github":   { "repositories": 0, "followers": 0 }
 * }
 *
 * Both sources are public, unauthenticated endpoints — no API keys or
 * secrets are required. GitHub and LeetCode are fetched independently:
 * if one fails, its existing values in stats.json are left untouched
 * and only the section that succeeded is updated. If both fail, the
 * file is not modified at all. Errors are logged but never thrown, so
 * a failed run does not break the workflow or corrupt the file.
 *
 * Run with: node scripts/update-stats.mjs
 * Requires Node.js 18+ (for the built-in global fetch).
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATS_PATH = path.resolve(__dirname, '../assets/data/stats.json');

const GITHUB_USERNAME = 'Dinesh-A-Code';
const LEETCODE_USERNAME = 'Dinesh_A_Code';

const DEFAULT_STATS = {
  leetcode: { solved: 0, easy: 0, medium: 0, hard: 0 },
  github: { repositories: 0, followers: 0 },
};

async function readCurrentStats() {
  try {
    const raw = await readFile(STATS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    // Guard against a malformed/partial file by falling back to defaults
    // for anything missing, so the shape written back is always valid.
    return {
      leetcode: { ...DEFAULT_STATS.leetcode, ...(parsed.leetcode || {}) },
      github: { ...DEFAULT_STATS.github, ...(parsed.github || {}) },
    };
  } catch (error) {
    console.warn(`Could not read existing stats.json, using defaults. (${error.message})`);
    return structuredClone(DEFAULT_STATS);
  }
}

async function fetchGitHubStats() {
  const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      // The GitHub REST API rejects unauthenticated requests that omit
      // a User-Agent header, even for public, no-auth endpoints.
      'User-Agent': 'portfolio-stats-updater',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API responded with ${response.status}`);
  }

  const data = await response.json();

  return {
    repositories: typeof data.public_repos === 'number' ? data.public_repos : 0,
    followers: typeof data.followers === 'number' ? data.followers : 0,
  };
}

async function fetchLeetCodeStats() {
  const query = `
    query userProblemsSolved($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
          }
        }
      }
    }
  `;

  const response = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { username: LEETCODE_USERNAME },
    }),
  });

  if (!response.ok) {
    throw new Error(`LeetCode API responded with ${response.status}`);
  }

  const { data, errors } = await response.json();

  if (errors && errors.length) {
    throw new Error(`LeetCode API returned errors: ${errors.map((e) => e.message).join(', ')}`);
  }

  const counts = data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;
  if (!Array.isArray(counts)) {
    throw new Error('Unexpected LeetCode API response shape');
  }

  const byDifficulty = Object.fromEntries(
    counts.map((entry) => [entry.difficulty, entry.count])
  );

  return {
    solved: byDifficulty.All ?? 0,
    easy: byDifficulty.Easy ?? 0,
    medium: byDifficulty.Medium ?? 0,
    hard: byDifficulty.Hard ?? 0,
  };
}

async function main() {
  const stats = await readCurrentStats();
  let changed = false;

  try {
    stats.github = await fetchGitHubStats();
    changed = true;
    console.log('GitHub stats updated:', stats.github);
  } catch (error) {
    console.warn(`Skipping GitHub update, keeping previous values. (${error.message})`);
  }

  try {
    stats.leetcode = await fetchLeetCodeStats();
    changed = true;
    console.log('LeetCode stats updated:', stats.leetcode);
  } catch (error) {
    console.warn(`Skipping LeetCode update, keeping previous values. (${error.message})`);
  }

  if (!changed) {
    console.warn('Both GitHub and LeetCode fetches failed — stats.json left unchanged.');
    return;
  }

  await writeFile(STATS_PATH, `${JSON.stringify(stats, null, 2)}\n`, 'utf8');
  console.log(`Wrote ${STATS_PATH}`);
}

main().catch((error) => {
  // Final safety net: never let this script exit non-zero in a way that
  // could be mistaken for a corrupted stats.json — the file is only ever
  // written after a successful fetch+stringify above.
  console.error('Unexpected error while updating stats:', error);
  process.exitCode = 0;
});
