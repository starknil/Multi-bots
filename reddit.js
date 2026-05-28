const fetch = require("node-fetch");


const subreddits = [
  "CryptoCurrency",
  "CryptoScams",
  "ethereum",
  "defi",
  "ethfinance",
  "NFT",
  "Web3",
  "CryptoSupport"
];

const queries = [
  "cant claim",
  "claim tokens",
  "staking",
  "unstake",
  "migrate tokens",
  "presale",
  "wallet connecting",
  "airdrop",
  "whitelist",
  "refund",
  "scam",
  "bridge",
  "withdraw"
];

const seen = new Set();
const INTERVAL_MS = 15_000;

async function fetchMatches() {
  const subredditFilter = subreddits.map(s => `subreddit:${s}`).join(" OR ");
  const keywordFilter = queries.map(q => `"${q}"`).join(" OR ");
  const query = `(${keywordFilter}) (${subredditFilter})`;

  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=25&t=day`;

  console.log("🔍 Fetching Reddit posts...");

  console.log(url);
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "crypto-monitor/1.0" }
    });

    const json = await res.json();
    return json.data?.children || [];
  } catch (err) {
    console.error("Fetch error:", err.message);
    return [];
  }
}

async function check() {
  const posts = await fetchMatches();

  for (const item of posts) {
    const post = item.data;
    const id = post.id;

    if (seen.has(id)) continue;
    seen.add(id);

    // cap memory
    if (seen.size > 10_000) {
      [...seen].slice(0, 5_000).forEach(id => seen.delete(id));
    }

    console.log("\n🚨 MATCH FOUND");
    console.log("Sub     :", post.subreddit_name_prefixed);
    console.log("Title   :", post.title);
    console.log("URL     :", `https://reddit.com${post.permalink}`);
    console.log("Score   :", post.score);
    console.log("Created :", new Date(post.created_utc * 1000).toISOString());
    console.log("----------------------");
  }
}

async function start() {
  console.log("Starting Reddit monitor...");
  console.log(`Watching: ${subreddits.join(", ")}`);
  console.log(`Keywords: ${queries.join(", ")}\n`);

  await check();
  setInterval(check, INTERVAL_MS);
}

start();
