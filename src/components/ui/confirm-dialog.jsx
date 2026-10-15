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
 * With `input: "label"` it also asks for text and resolves to that text, or `null` on cancel.
 */
export function useConfirm() {
  const t = useT();
  const [opts, setOpts] = useState(null);
  const [text, setText] = useState("");
  const resolver = useRef(null);

  const confirm = useCallback(
    (o) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setText("");
        setOpts(typeof o === "string" ? { title: o } : o);
      }),
    []
  );

  const close = (answer) => {
    resolver.current?.(opts?.input ? (answer ? text.trim() : null) : answer);
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
        {opts?.input && (
          <label className="grid gap-1.5 text-sm">
            <span className="text-muted-foreground">{opts.input}</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </label>
        )}
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
