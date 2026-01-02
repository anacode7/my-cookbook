
// Mock types
const Category = { MAIN: 'main' };

function parseRecipes(text) {
  // Normalize newlines
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  let chunks = normalized.split(/\n={3,}\n/);

  if (chunks.length < 2) {
    if ((normalized.match(/^Title:/gm) || []).length > 1) {
      chunks = normalized.split(/(?=^Title:)/m);
    } else {
      chunks = [normalized];
    }
  }

  const recipes = [];
  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const recipe = parseSingleRecipe(chunk);
    if (recipe.title || recipe.ingredients.length > 0) { // Relaxed check for test
      recipes.push(recipe);
    }
  }
  return recipes;
}

function parseSingleRecipe(text) {
  const lines = text.split("\n");
  const recipe = {
    title: "",
    category: "main",
    servings: 4,
    rating: 0,
    cooked: false,
    notes: "",
    ingredients: [],
    steps: [],
    image_url: "",
    cooking_time: ""
  };

  let section = "meta";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.match(/^Ingredients:?/i) || line.match(/^####\s*Ingredients:?/i)) {
      section = "ingredients";
      continue;
    }
    if (line.match(/^Steps:?/i) || line.match(/^Method:?/i)) {
      section = "steps";
      continue;
    }

    if (section === "meta") {
        if (line.startsWith("Title:")) {
            recipe.title = line.replace("Title:", "").trim();
        } else if (line.startsWith("http")) {
            if (!recipe.image_url) recipe.image_url = line.trim();
        } else if (line.startsWith("Time:") || line.startsWith("Cooking Time:") || line.startsWith("Prep time:") || line.startsWith("Total time:")) {
             recipe.cooking_time = line.replace(/^(Time:|Cooking Time:|Prep time:|Total time:)\s*/i, "").trim();
        } else if (!recipe.title && !line.includes(":")) {
            recipe.title = line;
        }
    } else if (section === "ingredients") {
        const clean = line.replace(/^[-*•]\s*/, "");
        if (!clean) continue;

        // NEW LOGIC TO TEST
        const startMatch = clean.match(/^([\d\s./?¼½¾⅓⅔⅛]+)\s*([a-zA-Z.]+(?:\s+[a-zA-Z.]+)?)\s+(.*)/);
        const endMatch = clean.match(/^(.*)\s+([\d./?¼½¾⅓⅔⅛]+)\s*([a-zA-Z.]+(?:\s+[a-zA-Z.]+)?)$/);

        if (startMatch) {
            let amountStr = startMatch[1].trim();
            let unitStr = startMatch[2] || "";
            let nameStr = startMatch[3];
            
             const knownUnits = ["fl oz", "floz", "fl.oz", "oz", "lb", "lbs", "cup", "cups", "tbsp", "tsp", "g", "kg", "ml", "l", "liter", "pint", "quart", "gal"];
             
             if (unitStr.includes(" ")) {
                 const combined = unitStr + " " + nameStr;
                 let bestUnit = "";
                 let bestName = combined;
                 
                 if (combined.toLowerCase().startsWith("fl oz")) {
                     bestUnit = "fl oz";
                     bestName = combined.substring(5).trim();
                 } else {
                     const firstWord = combined.split(" ")[0];
                     const normalizedFirst = firstWord.toLowerCase().replace(".","");
                     if (knownUnits.includes(normalizedFirst)) {
                         bestUnit = firstWord;
                         bestName = combined.substring(firstWord.length).trim();
                     } else {
                         const parts = unitStr.split(" ");
                         const p0 = parts[0].toLowerCase().replace(".","");
                         if (knownUnits.includes(p0)) {
                             bestUnit = parts[0];
                             bestName = combined.substring(parts[0].length).trim();
                         } else {
                             bestUnit = unitStr;
                             bestName = nameStr;
                         }
                     }
                 }
                 unitStr = bestUnit;
                 nameStr = bestName;
             }

             // Fraction conversion
             amountStr = amountStr.replace(/¼/g, '.25').replace(/¾/g, '.75'); // Simplified for test
             
             let amountVal = parseFloat(amountStr) || 0;
             recipe.ingredients.push({ name: nameStr, amount: amountVal, unit: unitStr });
        } else if (endMatch) {
             let nameStr = endMatch[1];
             let amountStr = endMatch[2];
             let unitStr = endMatch[3] || "";
             
             let amountVal = parseFloat(amountStr) || 0;
             recipe.ingredients.push({ name: nameStr, amount: amountVal, unit: unitStr });
        } else {
            recipe.ingredients.push({ name: clean, amount: 0, unit: "" });
        }
    }
  }
  return recipe;
}

// TEST CASES
const input = `
Ultimate Cauliflower Cheese
https://files.mob-cdn.co.uk/recipes/2024/10/Ultimate-Cauliflower-Cheese.jpg
Cooking Time: 45 mins
Ingredients:
1 Cauliflower
2¾ oz Salted Butter
2.75 oz Plain Flour
14 fl oz Whole Milk
14 fl oz Double Cream
3.5 oz Mature Cheddar Cheese
2 tsp English Mustard
0.25 Nutmeg
0.25 oz Fresh Chive
`;

const result = parseRecipes(input);
console.log(JSON.stringify(result, null, 2));
