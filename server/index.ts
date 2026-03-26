import { startServer } from "./_core/index.js";

async function main() {
  try {
    const { app } = await startServer();
    // Optionally, you can use app here if needed
    console.log("[Entry] Server started successfully from Railway entry point");
  } catch (error) {
    console.error("[Entry] Fatal error starting server:", error?.message || error);
    process.exit(1);
  }
}

main();
