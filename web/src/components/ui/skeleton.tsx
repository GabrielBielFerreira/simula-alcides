import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("esqueleto rounded-md bg-creme", className)} {...props} />;
}

export { Skeleton };
