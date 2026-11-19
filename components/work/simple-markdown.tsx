import * as React from "react";

/** Renders **bold** inside a line as React nodes (no HTML is ever injected). */
function inline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <React.Fragment key={i}>{p}</React.Fragment>
  );
}

function cells(row: string) {
  return row.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
}

/**
 * Minimal, safe markdown for task instructions: headings, bullet lists, tables
 * and paragraphs. Anything else is shown as plain text.
 */
export function SimpleMarkdown({ text, className = "" }: { text: string; className?: string }) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = line.match(/^(#{1,4})\s+(.*)$/);
    if (heading) {
      const level = heading[1].length;
      blocks.push(
        <p
          key={key++}
          className={`font-heading font-bold text-foreground ${level <= 2 ? "text-sm mt-3" : "text-xs mt-2"} first:mt-0`}
        >
          {inline(heading[2])}
        </p>
      );
      i++;
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ""));
        i++;
      }
      blocks.push(
        <ul key={key++} className="list-disc pl-5 space-y-1">
          {items.map((it, j) => (
            <li key={j}>{inline(it)}</li>
          ))}
        </ul>
      );
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        rows.push(lines[i]);
        i++;
      }
      const [head, ...rest] = rows;
      const body = rest.filter((r) => !/^\s*\|?\s*:?-{2,}/.test(r));
      blocks.push(
        <div key={key++} className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                {cells(head).map((c, j) => (
                  <th key={j} className="border-b border-border px-2 py-1.5 font-semibold text-foreground">
                    {inline(c)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, ri) => (
                <tr key={ri} className="border-b border-border/50 last:border-0">
                  {cells(r).map((c, j) => (
                    <td key={j} className="px-2 py-1.5 align-top">
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,4}\s|\s*[-*]\s|\s*\|)/.test(lines[i])) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(
      <p key={key++} className="whitespace-pre-wrap">
        {inline(para.join("\n"))}
      </p>
    );
  }

  return <div className={`space-y-2 ${className}`}>{blocks}</div>;
}
