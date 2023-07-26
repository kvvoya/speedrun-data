import puppeteer from "puppeteer";

const main = async () => {
   const webpage = 'https://www.speedrun.com/mcce';

   const browserOptions = {
      headless: 'old'
   };
   const browser = await puppeteer.launch(browserOptions);
   const page = await browser.newPage();

   await page.goto(webpage);

   const leaderboardElement = await page.$$eval('button div.text-sm.font-medium', (divs) => {
      return divs.map((div) => div.textContent);
   });
   if (leaderboardElement[0] !== 'Leaderboards') {
      console.log(chalk.red('INVALID LINK (MUST BE A GAME LEADERBOARD):', link));
      await browser.close();
      return;
   }

   const links = await page.$$eval('a', elements => elements.map(el => el.href));
   const filteredLinks = Array.from(new Set(links.filter(link =>
      link.includes('?h') &&
      !link.includes('&page=') &&
      !link.includes('&rules=') &&
      !link.includes('#') &&
      !link.includes('/runs/new')
   )));
   // const levelLinks = filterToLevelLinks(links);
   const dropdownElements = await page.$$('.x-input-dropdown-button[id]');
   await dropdownElements[1].click();

   await page.evaluate(() => {
      const dropdownOptionsElement = document.querySelector('.x-input-dropdown-options.x-custom-scrollbar');
      dropdownOptionsElement.removeAttribute('style');
   });

   const refetchedLinks = await page.$$eval('a', elements => elements.map(el => el.href));

   const levelLinks = refetchedLinks.filter(link => !links.includes(link));

   console.log(levelLinks);
}

main();