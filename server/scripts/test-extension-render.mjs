import { createToolHtmlRenderer } from "../../node_modules/@earendil-works/pi-coding-agent/dist/core/export-html/tool-renderer.js";
import { getThemeByName } from "../../node_modules/@earendil-works/pi-coding-agent/dist/modes/interactive/theme/theme.js";
import { formatToolResult } from "/Users/laurent/.pi/agent/npm/node_modules/openlore/dist/pi/extension.js";
import { Markdown } from "@earendil-works/pi-tui";
import { getMarkdownTheme } from "@earendil-works/pi-coding-agent";

const sampleDetails = {
  nextSteps: ["get_subgraph on relevantFunction", "read spec domain model"],
  relevantFunctions: [{ name: "foo", file: "bar.ts", score: 0.9 }],
};

const theme = getThemeByName("dark");
const toolDef = {
  name: "openlore_orient",
  renderResult(result) {
    const summary = formatToolResult(result.details ?? {}, "orient");
    return new Markdown(summary, 1, 0, getMarkdownTheme());
  },
};

const renderer = createToolHtmlRenderer({
  getToolDefinition: (name) => (name === "openlore_orient" ? toolDef : undefined),
  theme,
  cwd: process.cwd(),
  width: 100,
});

const content = [{ type: "text", text: JSON.stringify(sampleDetails, null, 2) }];
const out = renderer.renderResult("tc1", "openlore_orient", content, sampleDetails, false);
console.log("renderResult:", out ? "OK" : "undefined");
if (out) {
  console.log("expanded length:", out.expanded.length);
  console.log("expanded preview:\n", out.expanded.slice(0, 500));
}
