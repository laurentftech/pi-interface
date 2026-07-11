/** One rendered diff row. */
export interface DiffLine {
  type: "same" | "add" | "del";
  text: string;
}

/**
 * Line diff for tool-card before/after views. Trims the common prefix/suffix
 * (which handles most agent edits outright), then runs an LCS on what's left;
 * beyond the size cap it degrades to "all removed / all added" rather than
 * burning O(n²) on a huge file.
 */
export function diffLines(oldText: string, newText: string): DiffLine[] {
  const a = oldText.split("\n");
  const b = newText.split("\n");

  let start = 0;
  while (start < a.length && start < b.length && a[start] === b[start]) start++;
  let endA = a.length;
  let endB = b.length;
  while (endA > start && endB > start && a[endA - 1] === b[endB - 1]) {
    endA--;
    endB--;
  }

  const midA = a.slice(start, endA);
  const midB = b.slice(start, endB);
  const lines: DiffLine[] = a.slice(0, start).map((text) => ({ type: "same" as const, text }));

  const CAP = 300;
  if (midA.length * midB.length > CAP * CAP) {
    lines.push(...midA.map((text) => ({ type: "del" as const, text })));
    lines.push(...midB.map((text) => ({ type: "add" as const, text })));
  } else {
    // LCS table over the trimmed middle
    const m = midA.length;
    const n = midB.length;
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
      for (let j = n - 1; j >= 0; j--) {
        dp[i][j] = midA[i] === midB[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < m && j < n) {
      if (midA[i] === midB[j]) {
        lines.push({ type: "same", text: midA[i] });
        i++;
        j++;
      } else if (dp[i + 1][j] >= dp[i][j + 1]) {
        lines.push({ type: "del", text: midA[i] });
        i++;
      } else {
        lines.push({ type: "add", text: midB[j] });
        j++;
      }
    }
    while (i < m) lines.push({ type: "del", text: midA[i++] });
    while (j < n) lines.push({ type: "add", text: midB[j++] });
  }

  lines.push(...a.slice(endA).map((text) => ({ type: "same" as const, text })));
  return lines;
}

/**
 * Collapse long unchanged runs to a separator, keeping `context` lines around
 * changes (unified-diff style). Returns null rows where a "⋯" separator belongs.
 */
export function withContext(lines: DiffLine[], context = 2): (DiffLine | null)[] {
  const keep = new Array<boolean>(lines.length).fill(false);
  lines.forEach((line, i) => {
    if (line.type === "same") return;
    for (let k = Math.max(0, i - context); k <= Math.min(lines.length - 1, i + context); k++) keep[k] = true;
  });
  const out: (DiffLine | null)[] = [];
  let skipping = false;
  lines.forEach((line, i) => {
    if (keep[i]) {
      out.push(line);
      skipping = false;
    } else if (!skipping) {
      out.push(null);
      skipping = true;
    }
  });
  return out;
}
