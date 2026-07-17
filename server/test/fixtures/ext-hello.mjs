export default (pi) => {
  pi.registerCommand("ext-hello", {
    description: "Say hello from extension",
    handler: async (args, ctx) => {
      pi.sendMessage({ display: true, content: [{ type: "text", text: "Hello from external .mjs extension!" }] });
    },
  });
};
