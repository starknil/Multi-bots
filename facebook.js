const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({
    headless: false
  });

  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
  });

  await context.addCookies([
    {
      name: "c_user",
      value: "61590274027111",
      domain: ".facebook.com",
      path: "/"
    },
    {
      name: "xs",
      value: "1%3AtuTkHo_G4nEftA%3A2%3A1779816998%3A-1%3A-1%3A%3AAcysGsbQKqy-6Ez7pbNqBnQwBeD9CJyf4z6-eCw7BQ",
      domain: ".facebook.com",
      path: "/"
    }
  ]);

  const page = await context.newPage();

  await page.goto(
    "https://mbasic.facebook.com/search/posts/?q=staking",
    {
      waitUntil: "domcontentloaded"
    }
  );

  await page.waitForTimeout(5000);

  const html = await page.content();

  console.log(html);

  await browser.close();
})();