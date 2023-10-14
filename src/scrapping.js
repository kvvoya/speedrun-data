import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import axios from "axios";
import excel from 'excel4node';

const apiUrl = 'https://speedrun.com/api/v1';

const apiOptions = {
   headers: {
      'User-Agent': 'speedrun-data/1.3.0'
   },
};

class Category {
   constructor(categoryName, runs, wrTime, cost) {
      this.categoryName = categoryName;
      this.runs = runs;
      this.wrTime = wrTime;
      this.cost = cost;
      // this.link = link;
   }
}

function isEmpty(arr) {
   return Array.isArray(arr) && (arr.length == 0 || arr.every(isEmpty));
}

export async function getCategories(gameName) {
   try {
      const categoryObjects = [];

      const gamesResponse = await axios.get(`${apiUrl}/games?name=${gameName}`, apiOptions);
      const gamesData = gamesResponse.data.data;

      if (gamesData.length === 0) {
         console.error(chalk.red(`There is no such game like ${gameName}`));
         return;
      }

      const officialGameName = gamesData[0].names.international;

      const gameID = gamesData[0].id;
      console.log('gameID:', gameID)

      await processAnalysis(gameID, officialGameName, categoryObjects);

      console.log(chalk.cyan('Full game runs analyzed! Going through ILs...'));

      const levelsResponse = await axios.get(`${apiUrl}/games/${gameID}/levels`, apiOptions);
      const levelsData = levelsResponse.data.data;

      for (const level of levelsData) {
         await processAnalysis(gameID, officialGameName, categoryObjects, { id: level.id, name: level.name });
      }

      console.log(chalk.cyan('Done! :)'));
      createExcelSheet(categoryObjects);
      return categoryObjects;

   } catch (err) {
      console.error('Error:', err);
   }
}

async function processAnalysis(gameID, officialGameName, categoryObjects, level = null) {
   const categoriesResponse = await axios.get(!level ? `${apiUrl}/games/${gameID}/categories` : `${apiUrl}/levels/${level.id}/categories`, apiOptions);
   const categoriesResponseData = categoriesResponse.data.data;

   for (const category of categoriesResponseData) {
      const toRequest = [];

      if ((category.type === 'per-game' && !level) || (category.type === 'per-level' && level)) {
         const recordsResponse = await axios.get(!level ?
            `${apiUrl}/leaderboards/${gameID}/category/${category.id}` :
            `${apiUrl}/leaderboards/${gameID}/level/${level.id}/${category.id}`,
            apiOptions);
         const recordsData = recordsResponse.data.data;

         const variablesResponse = await axios.get(`${apiUrl}/categories/${category.id}/variables`, apiOptions);
         const variablesData = variablesResponse.data.data;

         const filteredSubcategories = variablesData.filter(subcategory => {
            // console.log('subcategory:', subcategory);
            if (subcategory['is-subcategory']) {
               if (!level) {
                  return true;
               } else {
                  if (subcategory.scope.type === 'single-level') {
                     return subcategory.scope.level === level.id;
                  } else {
                     return true;
                  }
               }
            }
            return false;
         });
         // console.log('Filtered:', filteredSubcategories);

         const subcategoryCombinations = generateCombinations(filteredSubcategories);
         // console.log('Subcategories:', subcategoryCombinations);

         if (!isEmpty(subcategoryCombinations)) {

            for (const combination of subcategoryCombinations) {
               const varNames = [];
               const queries = [];

               Object.entries(combination).forEach(([varID, valID]) => {
                  // console.log('varID:', varID);
                  if (varID.endsWith('_name')) {
                     varNames.push(valID);
                  } else {
                     queries.push(`var-${varID}=${valID}`);
                  }
               });

               const queryParameters = queries.join('&');

               if (!queryParameters) continue;

               const apiUrlWithQuery = !level ?
                  `${apiUrl}/leaderboards/${gameID}/category/${category.id}?${queryParameters}` :
                  `${apiUrl}/leaderboards/${gameID}/level/${level.id}/${category.id}?${queryParameters}`;
               const toRequestObjectData = { apiUrlWithQuery, valueNames: varNames.join(' / ') };
               if (!toRequest.includes(apiUrlWithQuery)) toRequest.push(toRequestObjectData);
            }
         } else {
            const newCategoryObject = createANewCategoryObject(recordsData, category, !level ? officialGameName : `${officialGameName} : ${level.name}`);
            categoryObjects.push(newCategoryObject);
         }

      }

      // console.log('toRequest:', toRequest);
      for (const { apiUrlWithQuery, valueNames } of toRequest) {
         const requestResponse = await axios.get(apiUrlWithQuery, apiOptions);
         const requestResponseData = requestResponse.data.data;

         const newSubcategoryObject = createANewCategoryObject(requestResponseData, category, !level ? officialGameName : `${officialGameName} : ${level.name}`, valueNames);
         categoryObjects.push(newSubcategoryObject);
      }
   }
}

function createANewCategoryObject(recordsData, category, gameName, variables = "") {
   const runAmount = recordsData.runs.length;
   let cost = 1;

   if (runAmount >= 15) {
      const slowRunPlace = Math.floor(runAmount * 0.9) - 1;
      const fastRunPlace = Math.floor(runAmount * 0.1) - 1;

      const slowRun = recordsData.runs[slowRunPlace];
      const fastRun = recordsData.runs[fastRunPlace];

      cost = slowRun.run.times.primary_t / fastRun.run.times.primary_t;
      if (cost < 1) {
         cost = 1 / cost;
      }
   }

   const categoryName = `${gameName} - ${category.name} - ${variables}`
   const runTime = (runAmount !== 0) ? recordsData.runs[0].run.times.primary_t : 0

   const categoryObject = new Category(categoryName, recordsData.runs.length, runTime, cost);
   console.log(chalk.magenta(`Category analyzed: ${categoryName}`));
   return categoryObject;
}

function generateCombinations(subcategories) {
   if (subcategories.length === 0) {
      return [[]];
   }

   const variableCombinations = [];

   const [currentSubcategory, ...remainingSubcategories] = subcategories;
   const currentSubcategoryValues = Object.entries(currentSubcategory.values.values);

   for (const [valueID, valueData] of currentSubcategoryValues) {
      const combinationsForRemaining = generateCombinations(remainingSubcategories);

      for (const combination of combinationsForRemaining) {
         const combinationWithCurrent = { ...combination, [currentSubcategory.id]: valueID, [`${currentSubcategory.id}_name`]: valueData.label };
         variableCombinations.push(combinationWithCurrent);
      }
   }

   // console.log('variableCombinations:', variableCombinations);
   return variableCombinations;
}

export function createExcelSheet(categories, merge = false) {
   const wb = new excel.Workbook();
   const ws = wb.addWorksheet('Categories');

   const headerStyle = wb.createStyle({
      alignment: {
         horizontal: 'center'
      },
      font: {
         bold: true
      }
   });;

   const headers = ['Name', 'Runs', 'WR Time', 'TUC'];

   for (let i = 0; i < headers.length; i++) {
      ws.cell(1, i + 1).string(headers[i]).style(headerStyle);
   }

   for (let i = 0; i < categories.length; i++) {
      const currentCategory = categories[i];
      const costShortened = currentCategory.cost.toFixed(3);
      const costFloat = parseFloat(costShortened);
      ws.cell(i + 2, 1).string(currentCategory.categoryName);
      ws.cell(i + 2, 2).number(currentCategory.runs);
      ws.cell(i + 2, 3).number(currentCategory.wrTime);
      ws.cell(i + 2, 4).number(costFloat);
   }

   ws.column(1).setWidth(25);

   const outputFolder = 'output';
   if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder);
   }

   const desiredFileName = merge ? 'MERGE.xlsx' : 'speedrun_data.xlsx';
   const outputPath = path.join(outputFolder, desiredFileName);

   let excelFileName = outputPath;
   let counter = 1;

   while (fs.existsSync(excelFileName)) {
      const fileExtension = path.extname(desiredFileName);
      const fileName = path.basename(desiredFileName, fileExtension);
      const newFileName = `${fileName}_${counter}${fileExtension}`;
      excelFileName = path.join(outputFolder, newFileName);
      counter++;
   }

   console.log(chalk.green(`Data saved in ${excelFileName}`));
   wb.write(excelFileName, (err, stats) => {
      if (err) {
         console.error('Error!', err);
      }
   });
}