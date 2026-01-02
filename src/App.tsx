import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { Layout } from "@/components/Layout";
import { Login } from "@/pages/Login";
import { RecipeLibrary } from "@/pages/RecipeLibrary";
import { RecipeDetail } from "@/pages/RecipeDetail";
import { ShoppingList } from "@/pages/ShoppingList";
import { ImportRecipes } from "@/pages/ImportRecipes";

function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F3]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<RecipeLibrary />} />
        <Route path="/recipe/:id" element={<RecipeDetail />} />
        <Route path="/shopping-list" element={<ShoppingList />} />
        <Route path="/import" element={<ImportRecipes />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}

export default App;
