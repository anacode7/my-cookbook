import React, { createContext, useContext, useState, useEffect } from 'react'

interface SelectedRecipe {
  id: string;
  servings: number;
}

interface ShoppingListContextType {
  selectedRecipes: SelectedRecipe[]
  addRecipe: (id: string, servings: number) => void
  removeRecipe: (id: string) => void
  clearList: () => void
  isInList: (id: string) => boolean
}

const ShoppingListContext = createContext<ShoppingListContextType | undefined>(undefined)

export function ShoppingListProvider({ children }: { children: React.ReactNode }) {
  const [selectedRecipes, setSelectedRecipes] = useState<SelectedRecipe[]>(() => {
    const saved = localStorage.getItem('shopping_list_v2')
    return saved ? JSON.parse(saved) : []
  })

  useEffect(() => {
    localStorage.setItem('shopping_list_v2', JSON.stringify(selectedRecipes))
  }, [selectedRecipes])

  const addRecipe = (id: string, servings: number) => {
    setSelectedRecipes((prev) => {
      // If exists, update servings
      const exists = prev.find(r => r.id === id);
      if (exists) {
        return prev.map(r => r.id === id ? { ...r, servings } : r);
      }
      return [...prev, { id, servings }];
    })
  }

  const removeRecipe = (id: string) => {
    setSelectedRecipes((prev) => prev.filter((r) => r.id !== id))
  }

  const clearList = () => setSelectedRecipes([])

  const isInList = (id: string) => selectedRecipes.some(r => r.id === id)

  return (
    <ShoppingListContext.Provider value={{ selectedRecipes, addRecipe, removeRecipe, clearList, isInList }}>
      {children}
    </ShoppingListContext.Provider>
  )
}

export const useShoppingList = () => {
  const context = useContext(ShoppingListContext)
  if (!context) throw new Error('useShoppingList must be used within ShoppingListProvider')
  return context
}
