import { Search } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { COMMAND_SECTION_LABELS } from "../domain/commandPalette/commandResultTypes";
import { highlightMatch } from "../domain/commandPalette/highlightMatch";
import type { CommandResult } from "../domain/commandPalette/commandResultTypes";
import { useCommandPaletteSearch } from "../hooks/useCommandPaletteSearch";
import {
  executeCommandPaletteTarget,
  type CommandPaletteActionHandlers,
} from "../platform/commandPaletteActions";
import "./command-palette.css";

export interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  handlers: CommandPaletteActionHandlers;
  searchInput: Omit<
    import("../hooks/useCommandPaletteSearch").UseCommandPaletteSearchInput,
    "open" | "query"
  >;
}


export function CommandPalette({
  open,
  onClose,
  handlers,
  searchInput,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const { results, remoteHint } = useCommandPaletteSearch({
    ...searchInput,
    open,
    query,
  });

  const flatResults = results;

  useEffect(() => {
    if (open) {
      returnFocusRef.current = document.activeElement as HTMLElement | null;
      setQuery("");
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else {
      returnFocusRef.current?.focus?.();
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, results.length]);

  const activate = useCallback(
    (result: CommandResult) => {
      executeCommandPaletteTarget(result, handlers);
      onClose();
    },
    [handlers, onClose],
  );

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) =>
        flatResults.length ? (index + 1) % flatResults.length : 0,
      );
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) =>
        flatResults.length
          ? (index - 1 + flatResults.length) % flatResults.length
          : 0,
      );
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const result = flatResults[activeIndex];
      if (result) activate(result);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  };

  const displayRows = useMemo(() => {
    let section = "";
    return flatResults.map((result) => {
      const showHeader = result.section !== section;
      section = result.section;
      return { result, showHeader };
    });
  }, [flatResults]);

  if (!open) return null;

  return createPortal(
    <div
      className="command-palette-backdrop"
      data-testid="command-palette-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Quick find"
        data-testid="command-palette"
        onKeyDown={onKeyDown}
      >
        <div className="command-palette__input-wrap">
          <Search size={16} strokeWidth={1.75} aria-hidden />
          <input
            ref={inputRef}
            className="command-palette__input"
            placeholder="Search people, Jira, Confluence, commands…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Quick find"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        {remoteHint ? (
          <p className="command-palette__hint" role="status">{remoteHint}</p>
        ) : null}
        <div className="command-palette__list" role="listbox">
          {flatResults.length === 0 ? (
            <p className="command-palette__empty">No matches</p>
          ) : (
            displayRows.map(({ result, showHeader }, index) => {
              const active = index === activeIndex;
              return (
                <div key={result.id}>
                  {showHeader ? (
                    <p className="command-palette__section-label">
                      {COMMAND_SECTION_LABELS[result.section] ??
                        result.section}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={
                      active
                        ? "command-palette__option is-active"
                        : "command-palette__option"
                    }
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => activate(result)}
                  >
                    <span className="command-palette__title">
                      {highlightMatch(result.title, query)}
                    </span>
                    {result.subtitle ? (
                      <span className="command-palette__subtitle">
                        {highlightMatch(result.subtitle, query)}
                      </span>
                    ) : null}
                    {result.meta ? (
                      <span className="command-palette__meta-row">
                        <span />
                        <span>{result.meta}</span>
                      </span>
                    ) : null}
                  </button>
                </div>
              );
            })
          )}
        </div>
        <div className="command-palette__footer">
          ↑↓ navigate · ↵ open · esc close
        </div>
      </div>
    </div>,
    document.body,
  );
}
