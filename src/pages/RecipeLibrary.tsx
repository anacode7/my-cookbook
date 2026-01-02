import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Star, ChefHat, Clock, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Recipe, Category } from "@/types";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { cn } from "@/lib/utils";

export function RecipeLibrary() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | "all">(
    "all"
  );
  const [minRating, setMinRating] = useState<number>(0);
  const [showCookedOnly, setShowCookedOnly] = useState(false);
  const [showUncookedOnly, setShowUncookedOnly] = useState(false);
  const [sortOrder, setSortOrder] = useState<
    "newest" | "oldest" | "alpha" | "rating"
  >("newest");

  useEffect(() => {
    fetchRecipes();
  }, []);

  async function fetchRecipes() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (error) {
      console.error("Error fetching recipes:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleDeleteAll = async () => {
    if (
      !window.confirm(
        "ARE YOU SURE? This will permanently delete ALL your recipes. This action cannot be undone."
      )
    )
      return;

    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // Delete all recipes for this user
      const { error } = await supabase
        .from("recipes")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;

      // Reload
      fetchRecipes();
    } catch (error) {
      console.error("Error deleting all recipes:", error);
      alert("Failed to delete recipes.");
    } finally {
      setLoading(false);
    }
  };

  const filteredRecipes = recipes
    .filter((recipe) => {
      const matchesSearch = recipe.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesCategory =
        selectedCategory === "all" || recipe.category === selectedCategory;
      const matchesRating = (recipe.rating || 0) >= minRating;
      const matchesCooked = showCookedOnly ? recipe.cooked : true;
      const matchesUncooked = showUncookedOnly ? !recipe.cooked : true;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesRating &&
        matchesCooked &&
        matchesUncooked
      );
    })
    .sort((a, b) => {
      if (sortOrder === "newest")
        return (
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      if (sortOrder === "oldest")
        return (
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );
      if (sortOrder === "alpha") return a.title.localeCompare(b.title);
      if (sortOrder === "rating") return (b.rating || 0) - (a.rating || 0);
      return 0;
    });

  // ... (categories array)
  const categories: { value: Category | "all"; label: string }[] = [
    { value: "all", label: "All" },
    { value: "soup", label: "Soups" },
    { value: "side", label: "Sides" },
    { value: "main", label: "Mains" },
    { value: "dessert", label: "Desserts" },
  ];

  return (
    <div className="space-y-6">
      {/* ... (Header remains same) */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">My Recipes</h2>
          {!loading && (
            <p className="text-sm text-gray-500 mt-1">
              Showing {filteredRecipes.length} of {recipes.length} recipes
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            className="text-red-500 hover:bg-red-50 hover:text-red-600"
            onClick={handleDeleteAll}
          >
            <Trash2 className="mr-2 h-4 w-4" /> Clear Library
          </Button>
          <Link to="/import">
            <Button>Add New Recipe</Button>
          </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-4 bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <select
            className="border rounded-md px-3 h-10 text-sm"
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="alpha">A-Z</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 no-scrollbar">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={selectedCategory === cat.value ? "primary" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat.value)}
                className="whitespace-nowrap"
              >
                {cat.label}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showCookedOnly}
                onChange={() => {
                  setShowCookedOnly(!showCookedOnly);
                  if (!showCookedOnly) setShowUncookedOnly(false);
                }}
                className="rounded text-orange-500 focus:ring-orange-500"
              />
              Cooked Only
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showUncookedOnly}
                onChange={() => {
                  setShowUncookedOnly(!showUncookedOnly);
                  if (!showUncookedOnly) setShowCookedOnly(false);
                }}
                className="rounded text-orange-500 focus:ring-orange-500"
              />
              Uncooked Only
            </label>
          </div>
        </div>

        <div className="flex items-center gap-2 border-t pt-4">
          <span className="text-sm text-gray-500">Min Rating:</span>
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setMinRating(minRating === star ? 0 : star)}
              className="focus:outline-none"
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  star <= minRating
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                )}
              />
            </button>
          ))}
          {minRating > 0 && (
            <button
              onClick={() => setMinRating(0)}
              className="text-xs text-gray-400 hover:text-gray-600 ml-2 underline"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex justify-center p-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : filteredRecipes.length === 0 ? (
        <div className="text-center p-12 bg-white rounded-lg border border-dashed">
          <ChefHat className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <h3 className="text-lg font-medium text-gray-900">
            No recipes found
          </h3>
          <p className="text-gray-500 mt-2">
            Try adjusting your filters or import some recipes.
          </p>
          <Link to="/import" className="mt-4 inline-block">
            <Button variant="outline">Import Recipes</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRecipes.map((recipe) => (
            <Link key={recipe.id} to={`/recipe/${recipe.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer flex flex-col">
                {/* Placeholder Image */}
                <div className="h-48 bg-orange-100 flex items-center justify-center rounded-t-lg relative overflow-hidden">
                  <img
                    src={`https://trae-api-us.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
                      recipe.title + " food dish professional photography"
                    )}&image_size=landscape_4_3`}
                    alt={recipe.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                  {recipe.cooked && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                      Cooked
                    </div>
                  )}
                </div>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg line-clamp-2">
                      {recipe.title}
                    </CardTitle>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className={cn(
                        "text-xs px-2 py-0.5 rounded-full capitalize",
                        recipe.category === "main" &&
                          "bg-blue-100 text-blue-700",
                        recipe.category === "soup" &&
                          "bg-amber-100 text-amber-700",
                        recipe.category === "side" &&
                          "bg-green-100 text-green-700",
                        recipe.category === "dessert" &&
                          "bg-pink-100 text-pink-700"
                      )}
                    >
                      {recipe.category}
                    </span>
                    <div className="flex items-center text-yellow-500">
                      <Star className="h-3 w-3 fill-current" />
                      <span className="text-xs ml-1 font-medium">
                        {recipe.rating || "-"}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex-1">
                  <p className="text-sm text-gray-500 line-clamp-3">
                    {recipe.notes || "No notes available."}
                  </p>
                </CardContent>
                <CardFooter className="text-xs text-gray-400 border-t pt-4 mt-auto">
                  <Clock className="h-3 w-3 mr-1" />
                  <span>
                    Added {new Date(recipe.created_at).toLocaleDateString()}
                  </span>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
