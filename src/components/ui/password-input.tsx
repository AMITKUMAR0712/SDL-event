"use client";

import { cn } from "cn";
import { Eye, EyeOff } from "lucide-react";
import * as React from "react";

import { Input } from "@/components/ui/input";

function PasswordInput({ className, ...props }: React.ComponentProps<"input">) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div className="relative">
      <Input type={visible ? "text" : "password"} className={cn("pr-9", className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-0 flex w-9 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      >
        <span className="relative block size-4">
          <Eye
            className={cn(
              "absolute inset-0 size-4 transition-all duration-200 ease-out",
              visible ? "scale-50 opacity-0" : "scale-100 opacity-100",
            )}
            aria-hidden="true"
          />
          <EyeOff
            className={cn(
              "absolute inset-0 size-4 transition-all duration-200 ease-out",
              visible ? "scale-100 opacity-100" : "scale-50 opacity-0",
            )}
            aria-hidden="true"
          />
        </span>
      </button>
    </div>
  );
}

export { PasswordInput };
