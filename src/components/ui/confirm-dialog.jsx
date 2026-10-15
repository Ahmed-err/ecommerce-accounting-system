"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useT } from "@/context/LanguageContext";

/**
 * In-app replacement for window.confirm (which shows an English browser box on the Arabic
 * screen). `const [confirm, confirmDialog] = useConfirm();` then render `{confirmDialog}` and
 * `if (!(await confirm({ title, body, action, danger }))) return;`.
 */
export function useConfirm() {
  const t = useT();
  const [opts, setOpts] = useState(null);
  const resolver = useRef(null);

  const confirm = useCallback(
    (o) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setOpts(typeof o === "string" ? { title: o } : o);
      }),
    []
  );

  const close = (answer) => {
    resolver.current?.(answer);
    resolver.current = null;
    setOpts(null);
  };

  const dialog = (
    <Dialog open={!!opts} onOpenChange={(open) => !open && close(false)}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{opts?.title}</DialogTitle>
          {opts?.body && <DialogDescription className="whitespace-pre-line">{opts.body}</DialogDescription>}
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => close(false)}>
            {t.cancel}
          </Button>
          <Button type="button" variant={opts?.danger ? "destructive" : "default"} onClick={() => close(true)}>
            {opts?.action || t.confirm || "OK"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return [confirm, dialog];
}
