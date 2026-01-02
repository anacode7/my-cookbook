import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { ShoppingListProvider } from './context/ShoppingListContext'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ShoppingListProvider>
        <App />
      </ShoppingListProvider>
    </BrowserRouter>
  </StrictMode>,
)
