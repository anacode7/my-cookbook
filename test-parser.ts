
import { parseRecipes } from './src/lib/recipeParser';

const testText1 = `
Title: Cauliflower Cheese
Image: https://files.mob-cdn.co.uk/recipes/2024/10/Ultimate-Cauliflower-Cheese.jpg
Ingredients:
1 Cauliflower
2¾ oz Salted Butter
2.75 oz Plain Flour
14 fl oz Whole Milk
14 fl oz Double Cream
3.5 oz Mature Cheddar Cheese
2 tsp English Mustard
0.25 Nutmeg
`;

const testText2 = `
Title: Weird Formats
https://example.com/image.jpg
Ingredients:
Cauliflower 1
Salted Butter 2.75 oz
Nutmeg 0.25
`;

console.log("--- Test 1 ---");
console.log(JSON.stringify(parseRecipes(testText1), null, 2));

console.log("\n--- Test 2 ---");
console.log(JSON.stringify(parseRecipes(testText2), null, 2));
