import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Trash2, ShoppingCart, ChefHat, Copy, Check } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useShoppingList } from '@/context/ShoppingListContext'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Ingredient, Recipe } from '@/types'

interface AggregatedIngredient {
  name: string
  amount: number
  unit: string
  recipes: string[]
}

export function ShoppingList() {
  const { selectedRecipes: contextRecipes, removeRecipe, clearList } = useShoppingList()
  const [loading, setLoading] = useState(true)
  const [recipes, setRecipes] = useState<Recipe[]>([])
  const [ingredients, setIngredients] = useState<Ingredient[]>([])
  const [copied, setCopied] = useState(false)

  const selectedRecipeIds = contextRecipes.map(r => r.id)

  useEffect(() => {
    if (selectedRecipeIds.length > 0) {
      fetchData()
    } else {
      setLoading(false)
      setRecipes([])
      setIngredients([])
    }
  }, [contextRecipes])

  async function fetchData() {
    try {
      setLoading(true)
      
      // Fetch selected recipes
      const { data: recipeData } = await supabase
        .from('recipes')
        .select('id, title, servings')
        .in('id', selectedRecipeIds)
        
      if (recipeData) setRecipes(recipeData as Recipe[])

      // Fetch ingredients for these recipes
      const { data: ingData } = await supabase
        .from('ingredients')
        .select('*')
        .in('recipe_id', selectedRecipeIds)
        
      if (ingData) setIngredients(ingData)

    } catch (error) {
      console.error('Error fetching shopping list:', error)
    } finally {
      setLoading(false)
    }
  }

  const aggregatedIngredients: AggregatedIngredient[] = ingredients.reduce((acc, curr) => {
    // Calculate Scaling Factor
    const recipeMeta = recipes.find(r => r.id === curr.recipe_id)
    const selectedMeta = contextRecipes.find(r => r.id === curr.recipe_id)
    
    let amount = curr.amount
    
    if (recipeMeta && selectedMeta && recipeMeta.servings > 0) {
        // Scale amount: (original_amount / original_servings) * selected_servings
        amount = (curr.amount / recipeMeta.servings) * selectedMeta.servings
    }

    // Normalize name (lowercase, trim)
    const name = curr.name.toLowerCase().trim()
    const existing = acc.find(i => i.name === name && i.unit === curr.unit)
    
    if (existing) {
        existing.amount += amount
        const recipeTitle = recipeMeta?.title
        if (recipeTitle && !existing.recipes.includes(recipeTitle)) {
            existing.recipes.push(recipeTitle)
        }
    } else {
        const recipeTitle = recipeMeta?.title
        acc.push({
            name,
            amount,
            unit: curr.unit,
            recipes: recipeTitle ? [recipeTitle] : []
        })
    }
    return acc
  }, [] as AggregatedIngredient[])

  // Sort alphabetically
  aggregatedIngredients.sort((a, b) => a.name.localeCompare(b.name))

  const handleCopy = () => {
      const text = aggregatedIngredients
        .map(i => `- ${i.amount > 0 ? i.amount.toFixed(2) : ''} ${i.unit} ${i.name}`)
        .join('\n')
      navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return <div className="p-8 text-center">Loading list...</div>

  if (selectedRecipeIds.length === 0) {
      return (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-4">
              <div className="bg-orange-100 p-4 rounded-full">
                <ShoppingCart className="h-8 w-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Your shopping list is empty</h2>
              <p className="text-gray-500 max-w-md">
                  Go to the recipe library and click "Add to List" on recipes you want to cook.
              </p>
              <Link to="/">
                  <Button>Browse Recipes</Button>
              </Link>
          </div>
      )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800">Shopping List</h2>
            <p className="text-gray-500 text-sm mt-1">
                Ingredients for {recipes.length} recipes: {recipes.map(r => r.title).join(', ')}
            </p>
        </div>
        <div className="flex gap-2">
            <Button variant="outline" onClick={handleCopy}>
                {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                {copied ? 'Copied' : 'Copy List'}
            </Button>
            <Button variant="ghost" onClick={clearList} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                <Trash2 className="mr-2 h-4 w-4" /> Clear
            </Button>
        </div>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>Ingredients ({aggregatedIngredients.length})</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="grid md:grid-cols-2 gap-x-12 gap-y-4">
                  {aggregatedIngredients.map((ing, idx) => (
                      <div key={idx} className="flex justify-between items-baseline border-b border-gray-100 pb-2">
                          <span className="capitalize text-gray-800">{ing.name}</span>
                          <span className="font-mono text-sm text-gray-600 font-medium">
                             {ing.amount > 0 && ing.amount.toFixed(ing.amount % 1 === 0 ? 0 : 1)} {ing.unit}
                          </span>
                      </div>
                  ))}
              </div>
          </CardContent>
      </Card>
      
      <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-700 flex gap-2">
          <ChefHat className="h-5 w-5 flex-shrink-0" />
          <p>
              Note: This list combines ingredients by name and unit. Always check your pantry before shopping!
          </p>
      </div>
    </div>
  )
}
