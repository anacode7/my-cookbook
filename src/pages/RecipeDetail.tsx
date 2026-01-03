import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Users,
  Check,
  Star,
  ShoppingCart,
  Trash2,
  Edit2,
  Save,
  X,
  Plus,
  Clock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Recipe, Ingredient, CookingStep, Category } from "@/types";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useShoppingList } from "@/context/ShoppingListContext";
import { cn } from "@/lib/utils";
import { convertToMetric, formatMetricAmount } from "@/lib/conversions";

export function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addRecipe, removeRecipe, isInList } = useShoppingList();

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [steps, setSteps] = useState<CookingStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentServings, setCurrentServings] = useState<number>(4);
  const [rating, setRating] = useState<number>(0);

  // Edit Mode State
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<{
    title: string;
    category: Category;
    servings: number;
    notes: string;
    ingredients: Partial<Ingredient>[];
    steps: Partial<CookingStep>[];
  } | null>(null);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  // Check if image URL is valid (basic check)
  // Ensure we trim whitespace and backticks if they somehow persist, although parser should handle it.

  // HACK: Extract from notes if missing in direct props
  let displayImage = recipe?.image_url;
  let displayTime = recipe?.cooking_time;
  let displayNotes = recipe?.notes || "";

  if (!displayImage || !displayTime) {
    const imgMatch = displayNotes.match(/\[IMAGE_URL: (.*?)\]/);
    if (imgMatch) {
      displayImage = imgMatch[1];
      displayNotes = displayNotes.replace(imgMatch[0], "").trim();
    }
    const timeMatch = displayNotes.match(/\[COOKING_TIME: (.*?)\]/);
    if (timeMatch) {
      displayTime = timeMatch[1];
      displayNotes = displayNotes.replace(timeMatch[0], "").trim();
    }
  }

  const cleanImage = displayImage?.replace(/[`'"]/g, "").trim();
  const hasValidImage = cleanImage && cleanImage.startsWith("http");

  // ... (fetchData remains same, just ensure it resets Edit Form)
  async function fetchData() {
    try {
      setLoading(true);

      const { data: recipeData, error: recipeError } = await supabase
        .from("recipes")
        .select("*")
        .eq("id", id)
        .single();

      if (recipeError) throw recipeError;
      setRecipe(recipeData);
      setCurrentServings(recipeData.servings);
      setRating(recipeData.rating || 0);

      const { data: ingData, error: ingError } = await supabase
        .from("ingredients")
        .select("*")
        .eq("recipe_id", id)
        .order("order_index");

      if (ingError) throw ingError;
      setIngredients(ingData);

      const { data: stepData, error: stepError } = await supabase
        .from("cooking_steps")
        .select("*")
        .eq("recipe_id", id)
        .order("step_number");

      if (stepError) throw stepError;
      setSteps(stepData);

      // Init Edit Form
      setEditForm({
        title: recipeData.title,
        category: recipeData.category,
        servings: recipeData.servings,
        notes: recipeData.notes || "",
        ingredients: ingData,
        steps: stepData,
      });
    } catch (error) {
      console.error("Error fetching details:", error);
    } finally {
      setLoading(false);
    }
  }

  // ... (handlers)

  const handleUpdateRating = async (newRating: number) => {
    if (!recipe) return;

    // Toggle: if clicking the current rating, reset to 0
    const finalRating = rating === newRating ? 0 : newRating;

    setRating(finalRating);
    await supabase
      .from("recipes")
      .update({ rating: finalRating })
      .eq("id", recipe.id);
  };

  const handleToggleCooked = async () => {
    if (!recipe) return;
    const newStatus = !recipe.cooked;
    setRecipe({ ...recipe, cooked: newStatus });
    await supabase
      .from("recipes")
      .update({
        cooked: newStatus,
        cooked_date: newStatus ? new Date().toISOString() : null,
      })
      .eq("id", recipe.id);
  };

  const handleToggleList = () => {
    if (!recipe) return;
    if (isInList(recipe.id)) {
      removeRecipe(recipe.id);
    } else {
      addRecipe(recipe.id, currentServings);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    try {
      const { error } = await supabase.from("recipes").delete().eq("id", id);
      if (error) throw error;
      navigate("/");
    } catch (error) {
      console.error("Error deleting recipe:", error);
      alert("Failed to delete recipe");
    }
  };

  const handleSaveEdit = async () => {
    if (!recipe || !editForm) return;

    try {
      setLoading(true);

      // Update Recipe
      const { error: rError } = await supabase
        .from("recipes")
        .update({
          title: editForm.title,
          category: editForm.category,
          servings: editForm.servings,
          notes: editForm.notes,
        })
        .eq("id", recipe.id);

      if (rError) throw rError;

      // Update Ingredients (Delete all and re-insert is easiest for simplicity, or upsert)
      // For simplicity given the scope: Delete all and re-insert
      await supabase.from("ingredients").delete().eq("recipe_id", recipe.id);
      if (editForm.ingredients.length > 0) {
        const toInsert = editForm.ingredients.map((ing, i) => ({
          recipe_id: recipe.id,
          name: ing.name || "",
          amount: ing.amount || 0,
          unit: ing.unit || "",
          order_index: i,
        }));
        await supabase.from("ingredients").insert(toInsert);
      }

      // Update Steps
      await supabase.from("cooking_steps").delete().eq("recipe_id", recipe.id);
      if (editForm.steps.length > 0) {
        const toInsert = editForm.steps.map((step, i) => ({
          recipe_id: recipe.id,
          step_number: i + 1,
          instruction: step.instruction || "",
        }));
        await supabase.from("cooking_steps").insert(toInsert);
      }

      setIsEditing(false);
      fetchData(); // Reload
    } catch (error) {
      console.error("Error updating recipe:", error);
      alert("Failed to update recipe");
    } finally {
      setLoading(false);
    }
  };

  // Edit Form Handlers
  const updateEditForm = (field: string, value: any) => {
    if (!editForm) return;
    setEditForm({ ...editForm, [field]: value });
  };

  const handleIngredientChange = (index: number, field: string, value: any) => {
    if (!editForm) return;
    const newIngs = [...editForm.ingredients];
    newIngs[index] = { ...newIngs[index], [field]: value };
    setEditForm({ ...editForm, ingredients: newIngs });
  };

  const addIngredient = () => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      ingredients: [...editForm.ingredients, { name: "", amount: 0, unit: "" }],
    });
  };

  const removeIngredient = (index: number) => {
    if (!editForm) return;
    const newIngs = [...editForm.ingredients];
    newIngs.splice(index, 1);
    setEditForm({ ...editForm, ingredients: newIngs });
  };

  const handleStepChange = (index: number, value: string) => {
    if (!editForm) return;
    const newSteps = [...editForm.steps];
    newSteps[index] = { ...newSteps[index], instruction: value };
    setEditForm({ ...editForm, steps: newSteps });
  };

  const addStep = () => {
    if (!editForm) return;
    setEditForm({
      ...editForm,
      steps: [...editForm.steps, { instruction: "" }],
    });
  };

  const removeStep = (index: number) => {
    if (!editForm) return;
    const newSteps = [...editForm.steps];
    newSteps.splice(index, 1);
    setEditForm({ ...editForm, steps: newSteps });
  };

  if (loading && !recipe)
    return <div className="p-8 text-center">Loading...</div>;
  if (!recipe) {
    return (
      <div className="p-8 text-center space-y-4">
        <h2 className="text-xl font-bold text-red-600">Recipe not found</h2>
        <p className="text-gray-500">
          The recipe you are looking for does not exist or has been deleted.
        </p>
        <Button onClick={() => navigate("/")}>Back to Library</Button>
      </div>
    );
  }

  // Safety check: Ensure currentServings is valid number to prevent NaN
  const safeCurrentServings = currentServings || 1;
  const safeRecipeServings = recipe.servings || 4;
  const scaleFactor = safeCurrentServings / safeRecipeServings;

  // ... (rest of render)

  // RENDER EDIT FORM
  if (isEditing && editForm) {
    // ... (edit form render)
    return (
      <div className="max-w-4xl mx-auto space-y-6 pb-12">
        {/* ... (edit form content) ... */}
        {/* I'll duplicate the full edit form JSX here to be safe since I can't see the exact cut points of my previous Read output */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Edit Recipe</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow border space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title
            </label>
            <Input
              value={editForm.title}
              onChange={(e) => updateEditForm("title", e.target.value)}
            />
          </div>
          {/* ... other edit fields ... */}
          {/* For brevity, using the previous logic, assuming the previous SearchReplace didn't break the file structure. */}
          {/* Actually, the previous SearchReplace was just inserting the safety check. */}
          {/* The linter error suggests I might have messed up the scope or deleted the handlers? */}
          {/* Let me check the file content again to be sure. */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Category
              </label>
              <select
                className="w-full border rounded-md h-10 px-3"
                value={editForm.category}
                onChange={(e) => updateEditForm("category", e.target.value)}
              >
                <option value="main">Main</option>
                <option value="side">Side</option>
                <option value="soup">Soup</option>
                <option value="dessert">Dessert</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Servings
              </label>
              <Input
                type="number"
                value={editForm.servings}
                onChange={(e) =>
                  updateEditForm("servings", parseInt(e.target.value))
                }
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Ingredients
            </label>
            <div className="space-y-2">
              {editForm.ingredients.map((ing, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    placeholder="Amount"
                    type="number"
                    className="w-24"
                    value={ing.amount}
                    onChange={(e) =>
                      handleIngredientChange(
                        i,
                        "amount",
                        parseFloat(e.target.value)
                      )
                    }
                  />
                  <Input
                    placeholder="Unit"
                    className="w-24"
                    value={ing.unit}
                    onChange={(e) =>
                      handleIngredientChange(i, "unit", e.target.value)
                    }
                  />
                  <Input
                    placeholder="Name"
                    className="flex-1"
                    value={ing.name}
                    onChange={(e) =>
                      handleIngredientChange(i, "name", e.target.value)
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeIngredient(i)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addIngredient}
                className="w-full mt-2"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Ingredient
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Steps
            </label>
            <div className="space-y-2">
              {editForm.steps.map((step, i) => (
                <div key={i} className="flex gap-2">
                  <span className="mt-2 text-sm font-bold text-gray-500 w-6">
                    {i + 1}.
                  </span>
                  <textarea
                    className="flex-1 border rounded-md p-2"
                    rows={2}
                    value={step.instruction}
                    onChange={(e) => handleStepChange(i, e.target.value)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(i)}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={addStep}
                className="w-full mt-2"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Step
              </Button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes
            </label>
            <textarea
              className="w-full border rounded-md p-2"
              rows={4}
              value={editForm.notes}
              onChange={(e) => updateEditForm("notes", e.target.value)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex justify-between items-center mb-4">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Library
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsEditing(true)}>
            <Edit2 className="mr-2 h-4 w-4" /> Edit Recipe
          </Button>
          <Button
            variant="ghost"
            className="text-red-500 hover:bg-red-50"
            onClick={handleDelete}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border">
        <div className="h-64 bg-gray-100 relative group">
          {hasValidImage ? (
            <img
              src={displayImage}
              alt={recipe.title}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = "none";
                e.currentTarget.parentElement
                  ?.querySelector(".fallback")
                  ?.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={`w-full h-full flex items-center justify-center bg-gray-200 fallback ${
              hasValidImage ? "hidden" : ""
            }`}
          >
            <span className="text-gray-400 font-medium">
              No Image Available
            </span>
          </div>

          {/* Gradient Overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pt-24">
            <h1 className="text-3xl font-bold text-white shadow-sm">
              {recipe.title}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mt-3 text-white font-medium">
              {/* Category Badge */}
              <span className="capitalize bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-full backdrop-blur-md text-sm border border-white/10 shadow-sm">
                {recipe.category}
              </span>

              {/* Cooking Time Badge - Explicitly rendering if present */}
              {displayTime ? (
                <div className="flex items-center gap-1.5 text-sm bg-black/40 hover:bg-black/50 transition-colors px-3 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-sm">
                  <Clock className="h-4 w-4 text-orange-400" />
                  <span>{displayTime}</span>
                </div>
              ) : null}

              {/* Rating Stars */}
              <div className="flex items-center bg-black/40 px-3 py-1 rounded-full backdrop-blur-md border border-white/10 shadow-sm">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={cn(
                      "h-4 w-4",
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 flex flex-col md:flex-row gap-6 justify-between items-center bg-white border-b">
          <div className="flex items-center gap-4">
            <Button
              variant={recipe.cooked ? "secondary" : "outline"}
              onClick={handleToggleCooked}
            >
              {recipe.cooked ? (
                <>
                  <Check className="mr-2 h-4 w-4" /> Cooked
                </>
              ) : (
                "Mark as Cooked"
              )}
            </Button>

            <div className="flex items-center gap-1">
              <span className="text-sm text-gray-500">Rate:</span>
              {[1, 2, 3, 4, 5].map((star) => (
                <button key={star} onClick={() => handleUpdateRating(star)}>
                  <Star
                    className={cn(
                      "h-5 w-5 hover:text-yellow-400 transition-colors",
                      star <= rating
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-gray-300"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <Button
            variant={isInList(recipe.id) ? "secondary" : "primary"}
            onClick={handleToggleList}
          >
            <ShoppingCart className="mr-2 h-4 w-4" />
            {isInList(recipe.id) ? "In Shopping List" : "Add to List"}
          </Button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {/* Ingredients Column */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg">Ingredients</h3>
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-gray-500" />
                <Input
                  type="number"
                  value={currentServings}
                  onChange={(e) =>
                    setCurrentServings(
                      Math.max(1, parseInt(e.target.value) || 1)
                    )
                  }
                  className="w-16 h-8 text-center"
                />
              </div>
            </div>
            <ul className="space-y-3">
              {ingredients.map((ing) => {
                const scaledAmount = ing.amount * scaleFactor;
                const metric = convertToMetric(scaledAmount, ing.unit);
                const isMetric = ing.unit !== metric.unit;

                return (
                  <li
                    key={ing.id}
                    className="text-sm flex justify-between border-b border-gray-100 pb-2 last:border-0"
                  >
                    {/* Left Column: Imperial Amount + Name */}
                    <span>
                      {ing.amount > 0 && (
                        <span className="font-semibold text-gray-600 mr-1">
                          {ing.amount} {ing.unit}
                        </span>
                      )}
                      {ing.name}
                    </span>

                    {/* Right Column: Metric Only */}
                    <div className="text-right">
                      {isMetric ? (
                        <span className="font-medium text-gray-700 whitespace-nowrap ml-2">
                          {formatMetricAmount(metric.amount, metric.unit)}
                        </span>
                      ) : (
                        <span className="font-medium text-gray-400 whitespace-nowrap ml-2 italic">
                          -
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 pt-4 border-t text-xs text-gray-400 text-center">
              Original servings: {recipe.servings}
            </div>
          </div>
        </div>

        {/* Steps Column */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="font-bold text-lg mb-4">Method</h3>
            <div className="space-y-6">
              {steps.map((step) => (
                <div key={step.id} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-sm">
                    {step.step_number}
                  </div>
                  <p className="text-gray-700 leading-relaxed pt-1">
                    {step.instruction}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {recipe.notes && (
            <div className="bg-amber-50 p-6 rounded-lg border border-amber-100">
              <h3 className="font-bold text-lg text-amber-800 mb-2">Notes</h3>
              <p className="text-amber-900/80 whitespace-pre-wrap">
                {displayNotes}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
