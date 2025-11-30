import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  variant?: "success" | "warning" | "destructive" | "secondary";
}

export function StatusBadge({ status, variant = "secondary" }: StatusBadgeProps) {
  const getVariantFromStatus = (status: string) => {
    const lowercaseStatus = status.toLowerCase();
    
    if (lowercaseStatus.includes("verified") || 
        lowercaseStatus.includes("active") || 
        lowercaseStatus.includes("completed") ||
        lowercaseStatus.includes("successful")) {
      return "success";
    }
    
    if (lowercaseStatus.includes("pending")) {
      return "warning";
    }
    
    if (lowercaseStatus.includes("failed") || 
        lowercaseStatus.includes("rejected")) {
      return "destructive";
    }
    
    return "secondary";
  };

  const actualVariant = variant === "secondary" ? getVariantFromStatus(status) : variant;

  const variantClasses = {
    success: "bg-success/10 text-success hover:bg-success/20 border-success/20",
    warning: "bg-warning/10 text-warning hover:bg-warning/20 border-warning/20",
    destructive: "bg-destructive/10 text-destructive hover:bg-destructive/20 border-destructive/20",
    secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        "font-medium",
        variantClasses[actualVariant]
      )}
    >
      {status}
    </Badge>
  );
}