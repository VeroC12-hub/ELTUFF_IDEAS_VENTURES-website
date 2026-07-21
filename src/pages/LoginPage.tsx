import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, User, Lock, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/logo.png";

const LoginPage = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { signIn } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    const { error } = await signIn(identifier, password);
    if (error) {
      toast({ title: "Sign in failed", description: error, variant: "destructive" });
      setSubmitting(false);
    }
    // On success, LoginRedirect in App.tsx navigates once the role loads —
    // keep the submitting state until the redirect happens.
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_30%,hsl(38,92%,50%),transparent_50%)]" />
        <div className="relative text-primary-foreground max-w-md">
          <img src={logo} alt="Ani's Pride by Antuff" className="h-24 mb-8 brightness-0 invert" />
          <h1 className="text-4xl font-display font-bold mb-4">Welcome to Eltuff Ideas Ventures</h1>
          <p className="text-primary-foreground/70 text-lg">
            Access your dashboard to manage orders, invoices, inventory, and more — all in one place.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <img src={logo} alt="Ani's Pride" className="h-12 mb-6 lg:hidden" />

          <h2 className="text-2xl font-display font-bold mb-1">Sign In</h2>
          <p className="text-muted-foreground text-sm mb-6">
            Enter your email or phone number and password to access your dashboard
          </p>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="identifier">Email or Phone</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="identifier"
                  type="text"
                  autoComplete="username"
                  placeholder="you@company.com or 024 000 0000"
                  className="pl-10"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="pl-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <Button
              variant="accent"
              size="lg"
              className="w-full"
              type="submit"
              disabled={submitting}
            >
              {submitting ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Please wait...</>
              ) : "Sign In"}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Need an account? Eltuff staff set up your login — please contact the office.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
