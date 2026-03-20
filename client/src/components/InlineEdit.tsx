import { useState, useRef, useEffect, useCallback, createElement, type KeyboardEvent, type CSSProperties, type ReactNode } from "react";
import { useSiteContent } from "@/contexts/SiteContentContext";
import { Pencil, RotateCcw } from "lucide-react";

interface InlineEditProps {
  /** Unique key for this content element (e.g. "home.hero.badge") */
  contentKey: string;
  /** Default text shown when no override exists */
  defaultValue: string;
  /** HTML tag to render. Defaults to "span" */
  as?: string;
  /** Additional className for the wrapper */
  className?: string;
  /** Additional inline styles */
  style?: CSSProperties;
  /** Whether to use a textarea (multi-line) instead of input */
  multiline?: boolean;
  /** Children to render instead of plain text (for complex content).
   *  If provided, the component renders children in read mode and switches to input in edit mode.
   *  The edited value still saves to the content key. */
  children?: ReactNode;
}

/**
 * InlineEdit — click-to-edit text element.
 *
 * - Single click activates an editable input/textarea in place.
 * - Saves on blur or Enter (Shift+Enter for newline in textarea).
 * - Only admin users see the edit affordance; others see plain text.
 * - Shows a "Reset to Default" button when text has been overridden.
 * - Persists via SiteContentContext → tRPC → database.
 */
export function InlineEdit({
  contentKey,
  defaultValue,
  as: Tag = "span",
  className = "",
  style,
  multiline = false,
  children,
}: InlineEditProps) {
  const { get, set, reset, hasOverride, canEdit } = useSiteContent();
  const currentValue = get(contentKey, defaultValue);
  const isOverridden = hasOverride(contentKey);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(currentValue);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const resetRef = useRef<HTMLDivElement>(null);

  // Sync draft when external value changes while not editing
  useEffect(() => {
    if (!editing) {
      setDraft(currentValue);
    }
  }, [currentValue, editing]);

  // Auto-focus when entering edit mode
  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      // Select all text
      if (inputRef.current instanceof HTMLInputElement) {
        inputRef.current.select();
      } else {
        // For textarea, move cursor to end
        const len = inputRef.current.value.length;
        inputRef.current.setSelectionRange(len, len);
      }
    }
  }, [editing]);

  // Close reset confirm when clicking outside
  useEffect(() => {
    if (!showResetConfirm) return;
    const handleClick = (e: MouseEvent) => {
      if (resetRef.current && !resetRef.current.contains(e.target as Node)) {
        setShowResetConfirm(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showResetConfirm]);

  const save = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== currentValue) {
      set(contentKey, trimmed);
    }
    setEditing(false);
  }, [draft, currentValue, set, contentKey]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Enter" && (!multiline || !e.shiftKey)) {
        e.preventDefault();
        save();
      }
      if (e.key === "Escape") {
        setDraft(currentValue);
        setEditing(false);
      }
    },
    [save, multiline, currentValue]
  );

  const startEditing = useCallback(() => {
    if (!canEdit) return;
    setDraft(currentValue);
    setEditing(true);
  }, [canEdit, currentValue]);

  const handleReset = useCallback(() => {
    reset(contentKey);
    setShowResetConfirm(false);
    setDraft(defaultValue);
  }, [reset, contentKey, defaultValue]);

  // Non-admin: just render the text
  if (!canEdit) {
    if (children) {
      return <>{children}</>;
    }
    return createElement(Tag, { className, style }, currentValue);
  }

  // Admin in edit mode
  if (editing) {
    const inputClassName = `inline-edit-input bg-transparent border-b-2 border-electric/60 outline-none w-full text-inherit font-inherit leading-inherit ${className}`;

    if (multiline) {
      return (
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={handleKeyDown}
          className={`${inputClassName} resize-none min-h-[2em]`}
          style={{ ...style, background: "rgba(59, 130, 246, 0.08)" }}
          rows={Math.max(2, draft.split("\n").length)}
        />
      );
    }

    return (
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        type="text"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={save}
        onKeyDown={handleKeyDown}
        className={inputClassName}
        style={{ ...style, background: "rgba(59, 130, 246, 0.08)" }}
      />
    );
  }

  // Admin in read mode — show text with subtle edit affordance + reset button
  return createElement(
    Tag,
    {
      className: `inline-edit-wrapper group/ie cursor-pointer relative ${className}`,
      style,
      onClick: startEditing,
      title: "Click to edit",
    },
    children || currentValue,
    // Pencil icon
    createElement(Pencil, {
      className: "inline-edit-icon h-3 w-3 ml-1 opacity-0 group-hover/ie:opacity-60 transition-opacity duration-200 inline-block align-middle text-electric",
    }),
    // Reset to Default button (only shown when overridden)
    isOverridden
      ? createElement(
          "span",
          {
            className: "inline-edit-reset inline-block align-middle ml-1 relative",
            title: "Reset to default",
            onClick: (e: React.MouseEvent) => {
              e.stopPropagation();
              setShowResetConfirm(true);
            },
          },
          createElement(RotateCcw, {
            className: "h-3 w-3 opacity-0 group-hover/ie:opacity-60 transition-opacity duration-200 text-amber-400 hover:text-amber-300 cursor-pointer",
          }),
          showResetConfirm
            ? createElement(
                "div",
                {
                  ref: resetRef,
                  className: "absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-card/95 backdrop-blur-xl border border-white/[0.15] rounded-lg shadow-2xl p-3 min-w-[180px] animate-in fade-in slide-in-from-bottom-2 duration-200",
                  onClick: (e: React.MouseEvent) => e.stopPropagation(),
                },
                createElement(
                  "p",
                  { className: "text-xs text-muted-foreground mb-2 text-center" },
                  "Reset to default?"
                ),
                createElement(
                  "p",
                  { className: "text-[10px] text-muted-foreground/70 mb-2 text-center truncate max-w-[160px]" },
                  `"${defaultValue}"`
                ),
                createElement(
                  "div",
                  { className: "flex gap-2" },
                  createElement(
                    "button",
                    {
                      type: "button",
                      className: "flex-1 text-xs font-medium py-1.5 rounded bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors",
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        handleReset();
                      },
                    },
                    "Reset"
                  ),
                  createElement(
                    "button",
                    {
                      type: "button",
                      className: "flex-1 text-xs font-medium py-1.5 rounded text-muted-foreground hover:bg-white/[0.06] transition-colors",
                      onClick: (e: React.MouseEvent) => {
                        e.stopPropagation();
                        setShowResetConfirm(false);
                      },
                    },
                    "Cancel"
                  )
                )
              )
            : null
        )
      : null
  );
}

/**
 * Shorthand hook for reading a site content value without rendering an editable element.
 * Useful when you need the value in JS logic (e.g., for aria-labels or conditional rendering).
 */
export function useSiteContentValue(contentKey: string, defaultValue: string): string {
  const { get } = useSiteContent();
  return get(contentKey, defaultValue);
}
