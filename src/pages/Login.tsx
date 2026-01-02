import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ChefHat } from "lucide-react";

export function Login() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (error) {
      console.error("Error logging in:", error);
      alert("Error logging in");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFF8F3] p-4">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full text-center space-y-4">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <ChefHat className="h-8 w-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-800">Check your email</h2>
          <p className="text-gray-600">
            We've sent a magic link to <strong>{email}</strong>. Click it to log
            in.
          </p>
          <Button
            variant="outline"
            onClick={() => setSent(false)}
            className="w-full mt-4"
          >
            Back to Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FFF8F3] p-4">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full space-y-6">
        <div className="text-center">
          <ChefHat className="h-12 w-12 text-orange-500 mx-auto mb-2" />
          <h1 className="text-2xl font-bold text-gray-800">
            Welcome to Cookbook
          </h1>
          <p className="text-gray-500">Sign in to manage your recipes</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="email"
              className="text-sm font-medium text-gray-700"
            >
              Email address
            </label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <Button type="submit" className="w-full" isLoading={loading}>
            Send Magic Link
          </Button>
        </form>

        <p className="text-xs text-center text-gray-400">
          By signing in, you agree to our terms. This is a personal project
          demo.
        </p>
      </div>
    </div>
  );
}
