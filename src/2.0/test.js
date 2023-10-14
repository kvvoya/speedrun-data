import axios from "axios";

const apiUrl = 'https://speedrun.com/api/v1';

const apiOptions = {
   headers: {
      'User-Agent': 'speedrun-data/1.3.0'
   },
};

class Category {
   constructor(categoryName, runs, wrTime, cost, link) {
      this.categoryName = categoryName;
      this.runs = runs;
      this.wrTime = wrTime;
      this.cost = cost;
      this.link = link;
   }
}

async function getCategories(gameName) {
   try {
      const categoryObjects = [];

      const gamesResponse = await axios.get(`${apiUrl}/games?name=${gameName}`, apiOptions);
      const gamesData = gamesResponse.data.data;
      const officialGameName = gamesData.names.international;
      const toRequest = [];

      const gameID = gamesData[0].id;
      console.log('gameID:', gameID)

      const categoriesResponse = await axios.get(`${apiUrl}/games/${gameID}/categories`, apiOptions);
      const categoriesResponseData = categoriesResponse.data.data;

      for (const category of categoriesResponseData) {

         if (category.type === 'per-game') {
            const recordsResponse = await axios.get(`${apiUrl}/leaderboards/${gameID}/category/${category.id}`, apiOptions);
            const recordsData = recordsResponse.data.data;

            const newCategoryObject = createANewCategoryObject(recordsData, category, officialGameName);
            categoryObjects.push(newCategoryObject);

            const variablesResponse = await axios.get(`${apiUrl}/categories/${category.id}/variables`, apiOptions);
            const variablesData = variablesResponse.data.data;

            const filteredSubcategories = variablesData.filter(subcategory => subcategory['is-subcategory']);
            console.log('Filtered:', filteredSubcategories);

            const subcategoryCombinations = generateCombinations(filteredSubcategories);

            if (subcategoryCombinations.length > 0) {
               console.log('Subcategories:', subcategoryCombinations);

               for (const combination of subcategoryCombinations) {
                  const queryParameters = Object.entries(combination)
                     .map(([varID, valID]) => `var-${varID}=${valID}`)
                     .join('&');

                  if (!queryParameters) continue;

                  const apiUrlWithQuery = `${apiUrl}/leaderboards/${gameID}/category/${category.id}?${queryParameters}`;
                  if (!toRequest.includes(apiUrlWithQuery)) toRequest.push(apiUrlWithQuery);
               }
            }

         }

         console.log('toRequest:', toRequest);
         for (const request of toRequest) {
            const requestResponse = await axios.get(request, apiOptions);
            const requestResponseData = requestResponse.data.data;

            const newSubcategoryObject = createANewCategoryObject(requestResponseData, category, officialGameName);
            categoryObjects.push(newSubcategoryObject);
         }
      }

      console.log('Total category objects ^w^\n\n', categoryObjects);

   } catch (err) {
      console.error('Error:', err);
   }
}

function createANewCategoryObject(recordsData, category, gameName) {
   const runAmount = recordsData.runs.length;
   let cost = 0;

   if (runAmount >= 15) {
      const slowRunPlace = Math.floor(runAmount * 0.9) - 1;
      const fastRunPlace = Math.floor(runAmount * 0.1) - 1;

      const slowRun = recordsData.runs[slowRunPlace];
      const fastRun = recordsData.runs[fastRunPlace];

      cost = slowRun.run.times.primary_t / fastRun.run.times.primary_t;
   }

   const categoryName = `${gameName} - ${category.name}`

   const categoryObject = new Category(category.name, recordsData.runs.length, recordsData.runs[0].run.times.primary_t, cost, category.weblink);
   console.log(categoryObject);
   return categoryObject;
}

function generateCombinations(subcategories) {
   if (subcategories.length === 0) {
      return [[]];
   }

   const variableCombinations = [];

   const [currentSubcategory, ...remainingSubcategories] = subcategories;
   const currentSubcategoryValues = Object.keys(currentSubcategory.values.values);
   const currentSubcategoryData = Object.values(currentSubcategory.values.values)

   for (const value of currentSubcategoryValues) {
      const combinationsForRemaining = generateCombinations(remainingSubcategories);

      for (const combination of combinationsForRemaining) {
         const combinationWithCurrent = { ...combination, [currentSubcategory.id]: value };
         variableCombinations.push(combinationWithCurrent);
      }
   }

   return variableCombinations;
}

getCategories('portal')