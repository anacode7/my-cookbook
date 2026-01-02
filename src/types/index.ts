export type Category = 'soup' | 'side' | 'main' | 'dessert'

export interface User {
  id: string
  email: string
  name: string
  created_at: string
}

export interface Recipe {
  id: string
  user_id: string
  title: string
  category: Category
  servings: number
  rating?: number
  cooked: boolean
  cooked_date?: string
  notes?: string
  image_url?: string
  created_at: string
  updated_at: string
  ingredients?: Ingredient[]
  steps?: CookingStep[]
}

export interface Ingredient {
  id: string
  recipe_id: string
  name: string
  amount: number
  unit: string
  order_index: number
}

export interface CookingStep {
  id: string
  recipe_id: string
  step_number: number
  instruction: string
}

export interface ShoppingListItem {
  name: string
  amount: number
  unit: string
  recipes: string[]
}
