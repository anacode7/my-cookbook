import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { BookOpen, ShoppingCart, Upload, ChefHat } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LayoutProps {
  children: React.ReactNode
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation()

  const navItems = [
    { href: '/', label: 'Recipe Library', icon: BookOpen },
    { href: '/shopping-list', label: 'Shopping List', icon: ShoppingCart },
    { href: '/import', label: 'Import Recipes', icon: Upload },
  ]

  return (
    <div className="min-h-screen bg-[#FFF8F3] flex flex-col md:flex-row">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col bg-white border-r border-gray-200">
        <div className="p-6 border-b border-gray-200 flex items-center space-x-2">
          <ChefHat className="h-8 w-8 text-orange-500" />
          <h1 className="text-xl font-bold text-gray-800">Cookbook</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                )}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Mobile Header */}
      <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center space-x-2">
          <ChefHat className="h-6 w-6 text-orange-500" />
          <h1 className="text-lg font-bold text-gray-800">Cookbook</h1>
        </div>
        {/* Simple mobile nav could go here, for now just links at bottom or rely on content */}
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="container mx-auto p-4 md:p-8 max-w-7xl">
          {children}
        </div>
      </main>
      
      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around p-2 z-10">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.href
            return (
              <Link
                key={item.href}
                to={item.href}
                className={cn(
                  'flex flex-col items-center p-2 text-xs font-medium',
                  isActive
                    ? 'text-orange-600'
                    : 'text-gray-600'
                )}
              >
                <Icon className="h-5 w-5 mb-1" />
                <span>{item.label}</span>
              </Link>
            )
          })}
      </nav>
    </div>
  )
}
