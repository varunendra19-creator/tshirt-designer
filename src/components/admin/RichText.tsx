"use client";

import { useRef, useEffect } from "react";

/**
 * Minimal WYSIWYG editor for product descriptions — bold / italic / underline /
 * bullet & numbered lists / link. Emits HTML via onChange. The server sanitises
 * it again on save (src/lib/richtext.ts), so this is a UX layer, not the boundary.
 */
type Cmd = { icon: string; title: string; run: (el: HTMLDivElement) => void };

const exec = (cmd: string, value?: string) => document.execCommand(cmd, false, value);

const COMMANDS: Cmd[] = [
  { icon: "B", title: "Bold", run: () => exec("bold") },
  { icon: "I", title: "Italic", run: () => exec("italic") },
  { icon: "U", title: "Underline", run: () => exec("underline") },
  { icon: "• List", title: "Bullet list", run: () => exec("insertUnorderedList") },
  { icon: "1. List", title: "Numbered list", run: () => exec("insertOrderedList") },
  {
    icon: "🔗", title: "Add link",
    run: () => { const url = window.prompt("Link URL (https://…)"); if (url) exec("createLink", url); },
  },
  { icon: "⌫", title: "Clear formatting", run: () => exec("removeFormat") },
];

export function RichText({ value, onChange, placeholder }: { value: string; onChange: (html: string) => void; placeholder?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  // set initial HTML once (uncontrolled thereafter, so the caret doesn't jump)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) ref.current.innerHTML = value || "";
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const emit = () => onChange(ref.current?.innerHTML || "");

  return (
    <div className="rounded-xl border border-black/15 bg-white focus-within:border-[var(--primary)]">
      <div className="flex flex-wrap gap-1 border-b border-black/10 p-1.5">
        {COMMANDS.map((c) => (
          <button
            key={c.title} type="button" title={c.title}
            onMouseDown={(e) => { e.preventDefault(); ref.current?.focus(); c.run(ref.current!); emit(); }}
            className="rounded-md px-2 py-1 text-xs font-bold text-[var(--ink-2)] hover:bg-[var(--paper-2)]"
          >
            {c.icon}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={emit}
        onBlur={emit}
        data-placeholder={placeholder || "Describe the fabric, fit and vibe…"}
        className="rich-editor min-h-[90px] px-3 py-2 text-sm text-[var(--ink)] outline-none [&_a]:text-[var(--primary)] [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
      />
    </div>
  );
}
