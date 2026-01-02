import { Recipe, Ingredient, CookingStep, Category } from "../types";

export interface ParsedRecipe
  extends Omit<Recipe, "id" | "user_id" | "created_at" | "updated_at"> {
  rawText: string;
}

export function parseRecipes(text: string): ParsedRecipe[] {
  // Normalize newlines
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Split by the separator "===="
  // If the user doesn't use the separator, we'll try to fallback to double newlines if it looks structured,
  // but we strictly prefer the separator.
  let chunks = normalized.split(/\n={3,}\n/);

  if (chunks.length < 2) {
    // Fallback: If no "====" found, try splitting by "Title:" if it appears multiple times
    if ((normalized.match(/^Title:/gm) || []).length > 1) {
      chunks = normalized.split(/(?=^Title:)/m);
    } else {
      // Treat whole text as one recipe
      chunks = [normalized];
    }
  }

  const recipes: ParsedRecipe[] = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;
    const recipe = parseSingleRecipe(chunk);
    if (recipe.title) {
      recipes.push(recipe);
    }
  }

  return recipes;
}

function parseSingleRecipe(text: string): ParsedRecipe {
  const lines = text.split("\n");
  const recipe: ParsedRecipe = {
    title: "",
    category: "main",
    servings: 4,
    rating: 0,
    cooked: false,
    notes: "",
    ingredients: [],
    steps: [],
    rawText: text,
  };

  let section: "meta" | "ingredients" | "steps" | "notes" = "meta";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Detect Section Headers
    if (
      line.match(/^Ingredients:?/i) ||
      line.match(/^####\s*Ingredients:?/i) ||
      line.match(/^###\s*Ingredients:?/i)
    ) {
      section = "ingredients";
      continue;
    }
    if (
      line.match(/^Steps:?/i) ||
      line.match(/^Method:?/i) ||
      line.match(/^####\s*Method:?/i)
    ) {
      section = "steps";
      continue;
    }
    if (line.match(/^Notes:?/i)) {
      section = "notes";
      continue;
    }

    // Parse Content
    if (section === "meta") {
      if (line.startsWith("Title:") || line.startsWith("# Recipe:")) {
        let title = line.replace(/^(Title:|# Recipe:)\s*/i, "").trim();
        // Remove # if present
        title = title.replace(/^#\s*/, "");
        recipe.title = title;
      } else if (line.startsWith("Category:")) {
        const cat = line.substring(9).trim().toLowerCase();
        if (["soup", "side", "main", "dessert"].includes(cat)) {
          recipe.category = cat as Category;
        }
      } else if (line.startsWith("Servings:")) {
        const val = line.substring(9).trim();
        if (val.toLowerCase() === "not specified" || val === "n/a") {
          recipe.servings = 4; // Default
        } else {
          const num = parseInt(val.replace(/\D/g, ""));
          if (!isNaN(num)) recipe.servings = num;
        }
      } else if (line.startsWith("Rating:")) {
        const val = line.substring(7).trim();
        if (val.toLowerCase() === "not specified" || val === "n/a") {
          recipe.rating = 0;
        } else {
          const num = parseInt(val.replace(/\D/g, ""));
          if (!isNaN(num)) recipe.rating = num;
        }
      } else if (line.startsWith("Cooked:")) {
        const val = line.substring(7).trim().toLowerCase();
        if (val === "not specified" || val === "n/a") {
          recipe.cooked = false;
        } else {
          recipe.cooked = val === "yes" || val === "true";
        }
      } else if (
        line.startsWith("Time:") ||
        line.startsWith("Cooking Time:") ||
        line.match(/^###\s*Cooking Time:/i) ||
        line.startsWith("Prep time:") ||
        line.startsWith("Total time:") ||
        line.startsWith("Ready in:")
      ) {
        // Append time to notes as there is no DB field
        const timeVal = line
          .replace(
            /^(Time:|Cooking Time:|###\s*Cooking Time:|Prep time:|Total time:|Ready in:)\s*/i,
            ""
          )
          .trim();
        recipe.cooking_time = timeVal;
      } else if (line.match(/^(Image|Photo):/i)) {
        const url = line.replace(/^(Image:|Photo:)\s*/i, "").trim();
        recipe.image_url = url;
      } else if (line.startsWith("http://") || line.startsWith("https://")) {
        // Assume bare URL is an image if we don't have one yet
        if (!recipe.image_url) {
          recipe.image_url = line.trim();
        }
      } else if (
        !recipe.title &&
        line.length > 0 &&
        !line.includes(":") &&
        !line.startsWith("-")
      ) {
        // Fallback: First line is title if no "Title:" prefix
        // IGNORE lines starting with - (bullets)
        recipe.title = line.replace(/^#\s*/, "");
      }
    } else if (section === "ingredients") {
      // Skip subheaders like "#### For The Salad:"
      if (line.startsWith("#")) {
        continue;
      }

      // "- 1 cup Flour"
      // "1 cup Flour"
      const clean = line.replace(/^[-*•]\s*/, "");

      // If line is empty after cleaning, skip
      if (!clean) continue;

      const parts = clean.match(/^([\d./?¼½¾⅓⅔⅛]+)\s*([a-zA-Z.]+)?\s+(.+)/);
      // Regex above expects: [Number/Fraction] [Space] [Unit/Text] [Space] [Name]
      // It fails on "2¾ oz Salted Butter" because it sees "2¾" as number, "oz" as unit.
      // It fails on "Cauliflower 1" because number is at end.
      // It fails on "Nutmeg 0.25" because number is at end.

      // Let's try a more robust approach:
      // 1. Check if line starts with number/fraction
      // Improved regex to capture "fl oz" or two-word units
      const startMatch = clean.match(
        /^([\d\s./?¼½¾⅓⅔⅛]+)\s*([a-zA-Z.]+(?:\s+[a-zA-Z.]+)?)\s+(.*)/
      );

      // 2. Check if line ends with number/fraction (e.g. "Cauliflower 1")
      const endMatch = clean.match(
        /^(.*)\s+([\d./?¼½¾⅓⅔⅛]+)\s*([a-zA-Z.]+(?:\s+[a-zA-Z.]+)?)$/
      );

      if (startMatch) {
        // Case: "2¾ oz Salted Butter" or "14 fl oz Whole Milk"
        let amountStr = startMatch[1].trim();
        let unitStr = startMatch[2] || "";
        let nameStr = startMatch[3];

        // Refine Unit/Name split:
        // Regex `[a-zA-Z.]+(?:\s+[a-zA-Z.]+)?` greedily grabs "oz Whole".
        // We need to check if unitStr contains common unit words.

        const knownUnits = [
          "fl oz",
          "floz",
          "fl.oz",
          "oz",
          "lb",
          "lbs",
          "cup",
          "cups",
          "tbsp",
          "tsp",
          "g",
          "kg",
          "ml",
          "l",
          "liter",
          "pint",
          "quart",
          "gal",
        ];

        // Attempt to split unitStr if it has spaces
        if (unitStr.includes(" ")) {
          const combined = unitStr + " " + nameStr;
          let bestUnit = "";
          let bestName = combined;

          // Check for multi-word units first
          if (combined.toLowerCase().startsWith("fl oz")) {
            bestUnit = "fl oz";
            bestName = combined.substring(5).trim();
          } else if (combined.toLowerCase().startsWith("fl. oz")) {
            bestUnit = "fl. oz";
            bestName = combined.substring(6).trim();
          } else {
            // Check single word units
            const firstWord = combined.split(" ")[0];
            const normalizedFirst = firstWord.toLowerCase().replace(".", "");
            if (
              knownUnits.includes(normalizedFirst) ||
              knownUnits.includes(normalizedFirst.replace(/s$/, ""))
            ) {
              bestUnit = firstWord;
              bestName = combined.substring(firstWord.length).trim();
            } else {
              // If original split was "oz Whole", "oz" is known.
              const parts = unitStr.split(" ");
              const p0 = parts[0].toLowerCase().replace(".", "");
              if (
                knownUnits.includes(p0) ||
                knownUnits.includes(p0.replace(/s$/, ""))
              ) {
                bestUnit = parts[0];
                bestName = combined.substring(parts[0].length).trim();
              } else {
                // Fallback: use what regex caught as unit
                bestUnit = unitStr;
                bestName = nameStr;
              }
            }
          }
          unitStr = bestUnit;
          nameStr = bestName;
        } else if (unitStr) {
          // Single word unit caught.
          // If unit is NOT in known list, check if it should be part of name?
          // E.g. "1 Whole Chicken" -> regex sees Unit="Whole", Name="Chicken"
          const u = unitStr.toLowerCase().replace(".", "").replace(/s$/, "");
          if (!knownUnits.includes(u)) {
            // Maybe it's just a name? "1 Whole Chicken"
            // But keep it as unit if it looks like a container/unit (e.g. "bunch", "clove")?
            // For now, if not strict known unit, append to name?
            // RISK: "1 pinch Salt" -> pinch is not in knownUnits -> Name="pinch Salt"
            // Better to be loose for now.
          }
        }

        // Convert fractions
        amountStr = amountStr
          .replace(/¼/g, ".25")
          .replace(/½/g, ".5")
          .replace(/¾/g, ".75")
          .replace(/⅓/g, ".33")
          .replace(/⅔/g, ".66")
          .replace(/⅛/g, ".125")
          .replace(/\?/g, ".5");

        // Handle mixed numbers "2 3/4" -> 2.75
        let amountVal = 0;
        if (amountStr.includes(" ")) {
          const nums = amountStr.split(" ").map((n) => parseFloat(n));
          if (nums.every((n) => !isNaN(n))) {
            amountVal = nums.reduce((a, b) => a + b, 0);
          } else {
            amountVal = parseFloat(amountStr) || 0;
          }
        } else {
          amountVal = parseFloat(amountStr) || 0;
        }

        recipe.ingredients?.push({
          id: crypto.randomUUID(),
          recipe_id: "",
          name: nameStr.trim(),
          amount: amountVal,
          unit: unitStr,
          order_index: recipe.ingredients.length,
        });
      } else if (endMatch) {
        // Case: "Cauliflower 1" or "Nutmeg 0.25"
        let nameStr = endMatch[1];
        let amountStr = endMatch[2];
        let unitStr = endMatch[3] || "";

        amountStr = amountStr
          .replace(/¼/g, ".25")
          .replace(/½/g, ".5")
          .replace(/¾/g, ".75")
          .replace(/⅓/g, ".33")
          .replace(/⅔/g, ".66")
          .replace(/⅛/g, ".125")
          .replace(/\?/g, ".5");

        let amountVal = parseFloat(amountStr) || 0;

        recipe.ingredients?.push({
          id: crypto.randomUUID(),
          recipe_id: "",
          name: nameStr.trim(),
          amount: amountVal,
          unit: unitStr,
          order_index: recipe.ingredients.length,
        });
      } else {
        // Fallback: No number found at start or end
        recipe.ingredients?.push({
          id: crypto.randomUUID(),
          recipe_id: "",
          name: clean,
          amount: 0,
          unit: "",
          order_index: recipe.ingredients.length,
        });
      }
    } else if (section === "steps") {
      const clean = line.replace(/^\d+\.\s*/, "");
      recipe.steps?.push({
        id: crypto.randomUUID(),
        recipe_id: "",
        step_number: (recipe.steps?.length || 0) + 1,
        instruction: clean,
      });
    } else if (section === "notes") {
      recipe.notes += line + "\n";
    }
  }

  // Auto-categorize if not specified
  if (
    recipe.category === "main" ||
    !["soup", "side", "main", "dessert"].includes(recipe.category)
  ) {
    // Map unknown categories to standard ones or default to 'main'
    const lowerCat = (recipe.category || "").toLowerCase();
    const lowerTitle = recipe.title.toLowerCase();

    if (
      lowerCat.includes("soup") ||
      lowerCat.includes("curry") ||
      lowerTitle.includes("soup")
    )
      recipe.category = "soup";
    else if (
      lowerCat.includes("salad") ||
      lowerCat.includes("side") ||
      lowerTitle.includes("salad")
    )
      recipe.category = "side";
    else if (
      lowerCat.includes("dessert") ||
      lowerCat.includes("cake") ||
      lowerTitle.includes("cake")
    )
      recipe.category = "dessert";
    else recipe.category = "main";
  }

  return recipe;
}
