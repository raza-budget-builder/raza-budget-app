"use client";

import { useState, useTransition } from "react";
import { downloadCsvImport, revertCsvImport, type CsvImportSummary } from "../import-actions";
import { useToast } from "./ToastProvider";
import { ChevronDownIcon, DownloadIcon, UndoIcon } from "./icons";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function triggerDownload(filename: string, rawText: string) {
  const blob = new Blob([rawText], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "import.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function ImportRow({ csvImport }: { csvImport: CsvImportSummary }) {
  const [confirmingRevert, setConfirmingRevert] = useState(false);
  const [isPending, startTransition] = useTransition();
  const { showToast } = useToast();

  const reverted = csvImport.revertedAt !== null;

  function handleDownload() {
    startTransition(async () => {
      const res = await downloadCsvImport(csvImport.id);
      if ("error" in res) {
        showToast(res.error, "error");
        return;
      }
      triggerDownload(res.filename, res.rawText);
    });
  }

  function handleRevert() {
    startTransition(async () => {
      const res = await revertCsvImport(csvImport.id);
      setConfirmingRevert(false);
      if (res && "error" in res) {
        showToast(res.error, "error");
        return;
      }
      showToast("Import reverted — its transactions were removed");
    });
  }

  return (
    <li className={`flex items-center justify-between gap-4 py-3 text-sm ${reverted ? "opacity-50" : ""}`}>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 truncate font-bold text-foreground">
          <span className="truncate">{csvImport.filename}</span>
          {reverted && (
            <span className="shrink-0 rounded-full border border-card-border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-foreground-muted">
              Reverted
            </span>
          )}
        </p>
        <p className="text-foreground-muted">
          {formatDate(csvImport.importedAt)} · {csvImport.rowCount} row
          {csvImport.rowCount === 1 ? "" : "s"}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <button
          onClick={handleDownload}
          disabled={isPending}
          aria-label="Download CSV"
          title="Download"
          className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground-muted hover:bg-foreground/10 hover:text-foreground disabled:opacity-50"
        >
          <DownloadIcon className="h-4 w-4" />
        </button>
        {!reverted &&
          (!confirmingRevert ? (
            <button
              onClick={() => setConfirmingRevert(true)}
              aria-label="Revert import"
              title="Revert"
              className="flex h-11 w-11 items-center justify-center rounded-xl text-foreground-muted hover:bg-foreground/10 hover:text-attention"
            >
              <UndoIcon className="h-4 w-4" />
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-foreground-muted">Revert?</span>
              <button
                disabled={isPending}
                onClick={handleRevert}
                className="font-bold text-attention hover:text-attention-hover disabled:opacity-50"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmingRevert(false)}
                className="text-foreground-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ))}
      </div>
    </li>
  );
}

export function ImportsSection({ imports }: { imports: CsvImportSummary[] }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <section className="mb-10 rounded-xl border border-card-border bg-card p-6">
      <button
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="-my-2.5 flex w-full items-center justify-between py-2.5"
      >
        <h2 className="font-bold text-foreground">Imports ({imports.length})</h2>
        <ChevronDownIcon
          className="h-4 w-4 shrink-0 text-foreground-muted transition-transform duration-200"
          style={{ transform: expanded ? "rotate(0deg)" : "rotate(-90deg)" }}
        />
      </button>
      {expanded && (
        <div className="mt-4">
          {imports.length === 0 ? (
            <p className="text-sm text-foreground-muted">
              No CSV imports yet — imported files will show up here.
            </p>
          ) : (
            <ul className="divide-y divide-card-border">
              {imports.map((csvImport) => (
                <ImportRow key={csvImport.id} csvImport={csvImport} />
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
