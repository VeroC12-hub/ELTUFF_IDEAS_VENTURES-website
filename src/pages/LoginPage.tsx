import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Lock, User, Building2 } from "lucide-react";

const LoginPage = () => {
  const [loginType, setLoginType] = useState<"client" | "staff">("client");

  return (
    <div className="min-h-screen flex">
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero relative items-center justify-center p-12">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_70%_30%,hsl(38,92%,50%),transparent_50%)]" />
        <div className="relative text-primary-foreground max-w-md">
          <div className="h-12 w-12 rounded-xl gradient-accent flex items-center justify-center mb-8">
            <span className="text-accent-foreground font-bold text-lg">CP</span>
          </div>
          <h1 className="text-4xl font-display font-bold mb-4">Welcome Back</h1>
          <p className="text-primary-foreground/70 text-lg">
            Access your dashboard to manage orders, invoices, inventory, and more.
          </p>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-8">
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>

          <h2 className="text-2xl font-display font-bold mb-1">Sign In</h2>
          <p className="text-muted-foreground text-sm mb-6">Choose your portal and enter your credentials</p>

          <Tabs value={loginType} onValueChange={(v) => setLoginType(v as "client" | "staff")} className="mb-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="client" className="gap-2">
                <User className="h-4 w-4" /> Client
              </TabsTrigger>
              <TabsTrigger value="staff" className="gap-2">
                <Building2 className="h-4 w-4" /> Staff
              </TabsTrigger>
            </TabsList>
          </Tabs>

          <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@company.com" className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input id="password" type="password" placeholder="••••••••" className="pl-10" />
              </div>
            </div>

            <Button
              variant={loginType === "client" ? "accent" : "default"}
              size="lg"
              className="w-full"
              asChild
            >
              <Link to={loginType === "client" ? "/client/dashboard" : "/staff/dashboard"}>
                Sign In to {loginType === "client" ? "Client" : "Staff"} Portal
              </Link>
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            Don't have an account?{" "}
            <Link to="/register" className="text-accent font-medium hover:underline">Contact Sales</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
