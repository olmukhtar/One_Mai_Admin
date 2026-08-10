import { useNavigate } from "react-router-dom";
import { ShieldAlert, ArrowLeft, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
      <div className="w-full max-w-md relative">
        {/* Glow Spheres */}
        <div className="absolute -top-12 -left-12 h-64 w-64 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute -bottom-12 -right-12 h-64 w-64 rounded-full bg-brand/10 blur-3xl" />

        <Card className="border border-border/80 shadow-xl rounded-2xl bg-card/75 backdrop-blur-md overflow-hidden relative z-10">
          <CardContent className="pt-8 pb-6 px-6 text-center space-y-5">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 border border-rose-500/20 dark:border-rose-500/30 flex items-center justify-center flex-shrink-0 animate-bounce">
              <ShieldAlert className="h-8 w-8 text-rose-600 dark:text-rose-500" />
            </div>

            <div className="space-y-2">
              <h1 className="text-4xl font-extrabold tracking-tight text-foreground">403</h1>
              <h2 className="text-lg font-bold text-foreground">Access Forbidden</h2>
              <p className="text-xs text-muted-foreground leading-relaxed max-w-xs mx-auto">
                You do not have the required administrative permissions to access this page. Please contact your system administrator if you think this is a mistake.
              </p>
            </div>

            <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(-1)}
                className="rounded-xl text-xs font-semibold h-10 gap-1.5"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Go Back
              </Button>
              <Button
                size="sm"
                onClick={() => navigate("/dashboard")}
                className="rounded-xl text-xs font-semibold h-10 gap-1.5 bg-brand hover:bg-brand-hover text-white shadow-md shadow-brand/20 transition-all duration-200"
              >
                <LayoutDashboard className="h-3.5 w-3.5" /> Go to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
