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
        line.match(/^###\s*Cooking Time:/i)
      ) {
        // Append time to notes as there is no DB field
        const timeVal = line
          .replace(/^(Time:|Cooking Time:|###\s*Cooking Time:)\s*/i, "")
          .trim();
        recipe.notes += `Cooking Time: ${timeVal}\n`;
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

      const parts = clean.match(/^([\d./?]+)\s*([a-zA-Z]+)?\s+(.+)/);

      if (parts) {
        let amountVal = parseFloat(parts[1].replace(/\?/, ".5")) || 0;

        recipe.ingredients?.push({
          id: crypto.randomUUID(),
          recipe_id: "",
          name: parts[3].trim(),
          amount: amountVal,
          unit: parts[2] || "",
          order_index: recipe.ingredients.length,
        });
      } else {
        // Fallback for no amount
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
