import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";

import { cn } from "@/lib/utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        // Base styles
        "peer inline-flex h-6 w-11 shrink-0 items-center rounded-full border-2 shadow-sm transition-all outline-none",
        // Focus styles
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        // Disabled styles
        "disabled:cursor-not-allowed disabled:opacity-50",
        // Checked state - bright electric blue
        "data-[state=checked]:bg-[#DC143C] data-[state=checked]:border-[#DC143C]",
        // Unchecked state - more visible gray with border
        "data-[state=unchecked]:bg-[#374151] data-[state=unchecked]:border-[#4b5563]",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform",
          // Thumb color - white for both states
          "bg-white",
          // Position
          "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
