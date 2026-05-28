const { Scraper } = require('agent-twitter-client');

async function run() {
  const scraper = new Scraper();

  console.log("Attempting to log in...");

  // 1. Log in dynamically using your X credentials
  await scraper.login(
    "rudolfwill89740", 
    "Wyjojaned"
  );

  // 2. Check if authentication succeeded
  if (await scraper.isLoggedIn()) {
    console.log("Successfully authenticated! Searching for tweets...");

    // 3. Fetch the tweets
    const tweetTimeline = scraper.searchTweets("jj", 20);
    const tweets = [];

    for await (const tweet of tweetTimeline) {
      if (tweet.text) {
        tweets.push(tweet.text);
      }
    }

    console.log(tweets);
  } else {
    console.error("Authentication failed. Check your username/password.");
  }
}

run();
