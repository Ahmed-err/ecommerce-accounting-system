import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({
  className,
  type,
  id: providedId,
  numeric = false,
  ...props
}) {
  const generatedId = React.useId();
  const id = providedId ?? generatedId;

  return (
    <InputPrimitive
      id={id}
      type={type}
      data-slot="input"
      dir={numeric ? "ltr" : props.dir}
      inputMode={numeric ? "numeric" : props.inputMode}
      className={cn(
        "h-11 w-full min-w-0 rounded-lg border border-input bg-card px-3 text-base text-foreground transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        numeric && "tabular-nums text-end",
        className
      )}
      {...props} />
  );
}

export { Input }
