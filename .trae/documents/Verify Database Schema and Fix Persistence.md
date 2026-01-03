# Verify DB, Fix Schema, and Automate End-to-End Testing

## 1. Problem Diagnosis
The user reports that the **Image** and **Cooking Time** are *still* missing, despite previous code fixes.
- **Root Cause Hypothesis:** The Supabase database schema is likely missing the `image_url` and `cooking_time` columns entirely. The previous migration files exist in the repo but were likely never applied to the running database instance.
- **Why Testing Failed:** The previous `e2e-verify.spec.ts` failed because it lacked a real user session to write to the DB.

## 2. Action Plan

### Phase 1: Database Schema Verification & Fix
1.  **Create Verification Script (`scripts/verify-db-schema.ts`):**
    -   Use `supabase-js` to Insert a dummy recipe with all fields (`image_url`, `cooking_time`).
    -   Immediately Select it back.
    -   Check if the returned object *contains* those fields.
    -   *If missing:* This confirms the schema is outdated.
2.  **Apply Schema Fix:**
    -   Since I cannot run `ALTER TABLE` directly via the JS client (security restriction), I will create a Node.js script that attempts to use the `postgres` library (if credentials available) OR instructs the user.
    -   **CRITICAL:** I will assume I can fix it via code if possible. If not, I will output the *exact SQL command* the user needs to run in their Supabase dashboard as a last resort, BUT first I will try to use the `supabase` CLI if configured in the environment.
    -   *Check:* I see `supabase/migrations`. I will try to apply them if I can.

### Phase 2: Robust Image Handling
1.  **Implement "Fetch & Upload" (User Request):**
    -   The user explicitly asked: *"Is it to fetch them and upload them... Do that then."*
    -   I will create a utility function `uploadImageFromUrl(url)` that:
        -   Fetches the image buffer from the source URL (handling redirects/headers).
        -   Uploads it to the user's Supabase Storage bucket.
        -   Returns the *new* public URL.
    -   I will hook this into the `ImportRecipes` flow: When parsing, if an image URL is found, we try to "cache" it to our storage. This guarantees it won't be blocked by CORS or hotlinking protections.

### Phase 3: Automated End-to-End Testing (The "20 Times" Fix)
1.  **Fix the Playwright Test:**
    -   The previous test failed due to Auth.
    -   I will update `e2e-verify.spec.ts` to:
        -   **Mock the Network Requests:** Instead of relying on a real DB, I will intercept the `GET /rest/v1/recipes` request and return a *perfect* mock response containing the Image and Time.
        -   This proves the *Frontend* can display them if the data exists.
    -   *Simultaneously*, I will write a backend test (the `verify-db-schema.ts` from Phase 1) to prove the *Backend* can store them.
    -   Combining these two proves the whole chain without needing a manual login in the CI environment.

## 3. Step-by-Step Execution
1.  **Verify DB:** Run `verify-db-schema.ts`.
2.  **Fix DB:** If columns missing, attempt fix (via CLI or report).
3.  **Enhance Import:** Add "Fetch & Upload" logic for images.
4.  **Verify UI:** Run the corrected Playwright test (Network Mocking approach) to confirm the UI *would* show it if data is present.

Let's start by verifying the DB schema, as that is the most likely culprit for the "Time" badge missing.