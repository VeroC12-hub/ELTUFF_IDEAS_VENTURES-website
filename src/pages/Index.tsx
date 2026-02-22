import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Shield, Truck, FlaskConical, BarChart3, Users, Package } from "lucide-react";
import heroBg from "@/assets/hero-bg.jpg";

const features = [
  { icon: FlaskConical, title: "Premium Formulations", desc: "Lab-tested cosmetic and chemical products with highest quality standards." },
  { icon: Package, title: "Bulk Supply", desc: "Scalable production and supply for businesses of all sizes." },
  { icon: Truck, title: "Fast Delivery", desc: "Reliable logistics ensuring your products arrive on time." },
  { icon: Shield, title: "Quality Assured", desc: "Every batch certified and traceable from production to delivery." },
  { icon: BarChart3, title: "Real-time Analytics", desc: "Track orders, invoices, and inventory through your dashboard." },
  { icon: Users, title: "Dedicated Support", desc: "Expert account managers for personalized business solutions." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" as const }
  }),
};

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border/50">
        <div className="container mx-auto flex items-center justify-between h-16 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-sm">CP</span>
            </div>
            <span className="font-display font-bold text-lg">ChemPro</span>
          </Link>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Features</a>
            <a href="#about" className="text-sm text-muted-foreground hover:text-foreground transition-colors">About</a>
            <a href="#contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Contact</a>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button variant="accent" size="sm" asChild>
              <Link to="/login">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-16 overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-20 mix-blend-overlay" />
        </div>
        <div className="relative container mx-auto px-4 py-24 md:py-36">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="max-w-2xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 mb-6">
              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
              <span className="text-xs text-primary-foreground/80 font-medium">Trusted by 500+ businesses</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-display font-bold text-primary-foreground leading-tight mb-6">
              Premium Cosmetics & Chemical Solutions
            </h1>
            <p className="text-lg text-primary-foreground/70 mb-8 max-w-lg">
              From formulation to delivery — we manufacture and supply high-quality cosmetic and household chemical products at scale.
            </p>
            <div className="flex flex-wrap gap-4">
              <Button variant="accent" size="xl" asChild>
                <Link to="/login">
                  Client Portal <ArrowRight className="ml-1 h-5 w-5" />
                </Link>
              </Button>
              <Button variant="heroOutline" size="xl" asChild>
                <Link to="/login">Staff Login</Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="text-center mb-14"
          >
            <motion.h2 variants={fadeUp} custom={0} className="text-3xl md:text-4xl font-display font-bold mb-4">
              Everything Your Business Needs
            </motion.h2>
            <motion.p variants={fadeUp} custom={1} className="text-muted-foreground max-w-md mx-auto">
              Comprehensive production, supply chain, and business management tools in one platform.
            </motion.p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                custom={i + 2}
                className="group p-6 rounded-xl border border-border bg-card hover:shadow-lg hover:border-accent/30 transition-all duration-300"
              >
                <div className="h-11 w-11 rounded-lg bg-accent/10 text-accent flex items-center justify-center mb-4 group-hover:gradient-accent group-hover:text-accent-foreground transition-all">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-display font-semibold text-lg mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="gradient-primary rounded-2xl p-10 md:p-16 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_30%_50%,hsl(38,92%,50%),transparent_60%)]" />
            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-display font-bold text-primary-foreground mb-4">
                Ready to Scale Your Supply?
              </h2>
              <p className="text-primary-foreground/70 mb-8 max-w-md mx-auto">
                Join hundreds of businesses already using ChemPro for their cosmetic and chemical supply needs.
              </p>
              <Button variant="accent" size="xl" asChild>
                <Link to="/login">Get Started Today <ArrowRight className="ml-1" /></Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="border-t border-border py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg gradient-accent flex items-center justify-center">
              <span className="text-accent-foreground font-bold text-xs">CP</span>
            </div>
            <span className="font-display font-semibold">ChemPro</span>
          </div>
          <p className="text-sm text-muted-foreground">© 2026 ChemPro Industries. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
