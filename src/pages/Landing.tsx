import { motion } from "framer-motion";
import { useNavigate } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield, FileText, Target, Sparkles, ArrowRight, Check,
  Search, BarChart3, GitCompare, Download, Briefcase, Zap,
} from "lucide-react";

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 },
};

const features = [
  {
    icon: <Shield className="size-5" />,
    title: "ATS Health Score",
    description: "Get a 0-100 score on how well your resume performs with Applicant Tracking Systems. See exactly what's hurting and how to fix it.",
  },
  {
    icon: <Target className="size-5" />,
    title: "Job Match Analysis",
    description: "Compare your resume against any job description. See which requirements you meet, which are missing, and get evidence-backed matches.",
  },
  {
    icon: <Search className="size-5" />,
    title: "Evidence Traceability",
    description: "Every match is backed by actual resume evidence. See exactly where and how your resume demonstrates each required skill.",
  },
  {
    icon: <Sparkles className="size-5" />,
    title: "Smart Improvement",
    description: "Improve your resume without inventing anything. Better wording, stronger bullets, clearer structure — all based on your actual experience.",
  },
  {
    icon: <GitCompare className="size-5" />,
    title: "Before & After",
    description: "See exactly what changed, why it changed, and verify that your scores genuinely improved with the new version.",
  },
  {
    icon: <BarChart3 className="size-5" />,
    title: "Skill Gap Analysis",
    description: "Identify critical, important, and optional skill gaps. Know exactly what to address before applying to any position.",
  },
];

const steps = [
  { num: "1", label: "Upload", desc: "Upload your PDF resume or paste text" },
  { num: "2", label: "Analyze", desc: "Get instant ATS health scoring" },
  { num: "3", label: "Match", desc: "Compare against a job description" },
  { num: "4", label: "Improve", desc: "Enhance without inventing facts" },
  { num: "5", label: "Export", desc: "Download your optimized resume" },
];

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
              <Shield className="size-4 text-primary" />
            </div>
            <span className="text-sm font-semibold tracking-tight">ATS Analyzer</span>
          </div>
          <Button size="sm" onClick={() => navigate("/dashboard")} className="gap-1.5">
            Start Analyzing
            <ArrowRight className="size-3.5" />
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.03] to-transparent" />
        <div className="mx-auto max-w-4xl px-4 py-20 sm:py-28 text-center relative">
          <motion.div {...fadeInUp}>
            <Badge variant="secondary" className="mb-6 text-xs">
              <Zap className="size-3 mr-1" />
              Real analysis, not mock data
            </Badge>
          </motion.div>

          <motion.h1
            className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            Know exactly how your
            <br />
            <span className="bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">
              resume performs
            </span>
          </motion.h1>

          <motion.p
            className="mt-5 text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
          >
            Real ATS compatibility scoring. Real job matching with evidence traceability.
            Real improvements — without ever inventing qualifications.
          </motion.p>

          <motion.div
            className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35 }}
          >
            <Button size="lg" onClick={() => navigate("/dashboard")} className="gap-2 px-6">
              <FileText className="size-4" />
              Analyze My Resume
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/auth")} className="gap-2 px-6">
              Sign In
            </Button>
          </motion.div>

          <motion.div
            className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.5 }}
          >
            <span className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-500" /> PDF, TXT, Markdown, LaTeX</span>
            <span className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-500" /> No fake scores</span>
            <span className="flex items-center gap-1.5"><Check className="size-3.5 text-emerald-500" /> Evidence-based</span>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold tracking-tight">How It Works</h2>
            <p className="text-muted-foreground mt-2">Five steps from upload to optimized resume</p>
          </motion.div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className="text-center"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="mx-auto flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-sm mb-3">
                  {step.num}
                </div>
                <p className="text-sm font-medium">{step.label}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t">
        <div className="mx-auto max-w-5xl px-4 py-16">
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-bold tracking-tight">What You Get</h2>
            <p className="text-muted-foreground mt-2">Every feature is real, every score is evidence-based</p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
              >
                <Card className="h-full border-border/70">
                  <CardContent className="p-5">
                    <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      {feature.icon}
                    </div>
                    <h3 className="text-sm font-semibold mb-1.5">{feature.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t bg-muted/20">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h2 className="text-2xl font-bold tracking-tight">Ready to optimize your resume?</h2>
          <p className="text-muted-foreground mt-2 mb-6">
            Get real ATS scoring, job matching, and improvement recommendations.
          </p>
          <Button size="lg" onClick={() => navigate("/dashboard")} className="gap-2 px-8">
            <FileText className="size-4" />
            Start Free Analysis
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <Shield className="size-3.5" />
            <span>ATS Resume Analyzer</span>
          </div>
          <span>Estimated ATS-style scores. Not affiliated with any ATS vendor.</span>
        </div>
      </footer>
    </div>
  );
}
