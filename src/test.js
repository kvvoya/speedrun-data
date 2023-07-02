import puppeteer from "puppeteer";
import chalk from "chalk";

async function testtest() {
   const browser = await puppeteer.launch({headless: 'old'});
   const page = await browser.newPage();

   await goToLink('https://www.speedrun.com/hollowknight?h=Any-1.4.3.2_NMG&x=02q8o4p2-yn2p3085.21gyy061', page);
   await goToLink('https://www.speedrun.com/hollowknight?h=Any-No_Main_Menu_Storage&x=02q8o4p2-yn2p3085.jq6vg6j1', page);
   await goToLink('https://www.speedrun.com/hollowknight?h=Any-No_Major_Glitches&x=02q8o4p2-yn2p3085.81w7r6vq', page);
   await goToLink('https://www.speedrun.com/hollowknight?h=All_Skills-1.4.3.2_NMG&x=n2y577zk-38dopp1l.4lxogy4l', page);

}

async function createCategoryObject(page, link) {

   await page.waitForTimeout(100);

   const runsElement = await page.$('div.flex.px-4.py-3 .text-sm.text-on-panel');
   const runsAmount = await page.$$eval('a .inline-flex.flex-nowrap.justify-start.items-end.gap-1', elements => elements.length);
   const wrTimeElement = await page.$('#game-leaderboard tbody tr td:nth-child(3) a span');

   let runs = 0;
   let wrTime = 0;

   if (runsElement && runsAmount === 200) {
      const runsText = await page.evaluate(element => element.textContent, runsElement);
      console.log('Runs text:', runsText);
      const runsMatch = runsText.match(/(\d+)\s*runs/);
      runs = runsMatch ? parseInt(runsMatch[1], 10) : 0;
   } else if (runsAmount) {
      runs = runsAmount ? parseInt(runsAmount, 10) : 0;
   }

   if (wrTimeElement) {
      const wrTimeText = await page.evaluate(element => element.textContent, wrTimeElement);
      console.log('WR text:', wrTimeText);
      const wrTimeMatch = wrTimeText.match(/(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?\s*(?:(\d+)\s*s)?\s*(?:(\d+)\s*ms)?/);
      const wrHours = wrTimeMatch ? parseInt(wrTimeMatch[1], 10) || 0 : 0;
      const wrMinutes = wrTimeMatch ? parseInt(wrTimeMatch[2], 10) || 0 : 0;
      const wrSeconds = wrTimeMatch ? parseInt(wrTimeMatch[3], 10) || 0 : 0;
      const wrMiliseconds = wrTimeMatch ? parseInt(wrTimeMatch[4], 10) || 0 : 0;
      wrTime = wrHours * 3600000 + wrMinutes * 60000 + wrSeconds * 1000 + wrMiliseconds;
   }

   console.log(chalk.magenta(`Created an object. Link: ${link}. Runs: ${runs}. WR Time: ${wrTime}`))
}

await testtest();

async function goToLink(link, page) {
   await page.goto(link);
   await createCategoryObject(page, '');
}