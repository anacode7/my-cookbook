-- Drop tables if they exist to ensure clean slate
DROP TABLE IF EXISTS cooking_steps CASCADE;
DROP TABLE IF EXISTS ingredients CASCADE;
DROP TABLE IF EXISTS recipes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create tables

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Grant permissions for users
GRANT SELECT ON users TO anon;
GRANT ALL PRIVILEGES ON users TO authenticated;

-- Recipes Table
CREATE TABLE recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('soup', 'side', 'main', 'dessert')),
    servings INTEGER DEFAULT 4,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    cooked BOOLEAN DEFAULT FALSE,
    cooked_date TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_recipes_user_id ON recipes(user_id);
CREATE INDEX idx_recipes_category ON recipes(category);
CREATE INDEX idx_recipes_rating ON recipes(rating);
CREATE INDEX idx_recipes_cooked ON recipes(cooked);

GRANT SELECT ON recipes TO anon;
GRANT ALL PRIVILEGES ON recipes TO authenticated;

-- Ingredients Table
CREATE TABLE ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    order_index INTEGER DEFAULT 0
);

CREATE INDEX idx_ingredients_recipe_id ON ingredients(recipe_id);

GRANT SELECT ON ingredients TO anon;
GRANT ALL PRIVILEGES ON ingredients TO authenticated;

-- Cooking Steps Table
CREATE TABLE cooking_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    step_number INTEGER NOT NULL,
    instruction TEXT NOT NULL
);

CREATE INDEX idx_steps_recipe_id ON cooking_steps(recipe_id);
CREATE INDEX idx_steps_number ON cooking_steps(step_number);

GRANT SELECT ON cooking_steps TO anon;
GRANT ALL PRIVILEGES ON cooking_steps TO authenticated;

-- Enable Row Level Security (RLS)
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE cooking_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;


-- RLS Policies

-- Recipes Policies
CREATE POLICY "Users can view own recipes" ON recipes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own recipes" ON recipes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own recipes" ON recipes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own recipes" ON recipes
    FOR DELETE USING (auth.uid() = user_id);

-- Ingredients Policies
CREATE POLICY "Users can view ingredients for own recipes" ON ingredients
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE recipes.id = ingredients.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert ingredients for own recipes" ON ingredients
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE recipes.id = ingredients.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );
    
CREATE POLICY "Users can update ingredients for own recipes" ON ingredients
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE recipes.id = ingredients.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete ingredients for own recipes" ON ingredients
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE recipes.id = ingredients.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

-- Cooking Steps Policies
CREATE POLICY "Users can view steps for own recipes" ON cooking_steps
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE recipes.id = cooking_steps.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert steps for own recipes" ON cooking_steps
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE recipes.id = cooking_steps.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update steps for own recipes" ON cooking_steps
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE recipes.id = cooking_steps.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete steps for own recipes" ON cooking_steps
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM recipes 
            WHERE recipes.id = cooking_steps.recipe_id 
            AND recipes.user_id = auth.uid()
        )
    );

-- Users Policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
    FOR INSERT WITH CHECK (auth.uid() = id);
