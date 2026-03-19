import puppeteer from "puppeteer-core";
import { existsSync } from "fs";
import * as path from "path";

/**
 * Generate a PDF from HTML content using Puppeteer
 * Works in both development (system Chrome) and production (@sparticuz/chromium)
 * @param html - The HTML content to convert to PDF
 * @returns Buffer containing the PDF data
 */
export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  console.log("[PDF Generator] Starting PDF generation, HTML size:", (html.length / 1024).toFixed(2), "KB");
  
  let executablePath: string | undefined = undefined;
  let args: string[] = [
    "--no-sandbox",
    "--disable-setuid-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--disable-software-rasterizer",
    "--disable-extensions",
  ];
  
  // Try to find system Chromium first (for development)
  const systemChromiumPaths = [
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
  ];
  
  for (const chromePath of systemChromiumPaths) {
    if (existsSync(chromePath)) {
      executablePath = chromePath;
      console.log("[PDF Generator] Using system Chromium:", chromePath);
      break;
    }
  }
  
  // If no system Chromium found, use @sparticuz/chromium for production
  if (!executablePath) {
    try {
      console.log("[PDF Generator] No system Chromium found, loading @sparticuz/chromium...");
      const chromium = await import("@sparticuz/chromium");
      
      // Note: setGraphicsMode may not be available in all versions of @sparticuz/chromium
      // The LD_LIBRARY_PATH fix is the critical piece for serverless environments
      
      executablePath = await chromium.default.executablePath();
      args = chromium.default.args;
      
      // CRITICAL FIX: Set LD_LIBRARY_PATH so Chromium can find shared libraries
      // This is required for serverless environments where libnspr4.so and libnss3.so
      // are extracted to /tmp but Chromium can't find them without this path
      const execDir = path.dirname(executablePath);
      process.env.LD_LIBRARY_PATH = execDir;
      console.log("[PDF Generator] Set LD_LIBRARY_PATH to:", execDir);
      
      console.log("[PDF Generator] Using @sparticuz/chromium for production, path:", executablePath);
    } catch (error) {
      console.error("[PDF Generator] Failed to load @sparticuz/chromium:", error);
      throw new Error("No Chromium executable found. Please ensure @sparticuz/chromium is installed.");
    }
  }
  
  let browser;
  try {
    console.log("[PDF Generator] Launching browser with args:", args.slice(0, 3).join(", "), "...");
    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args,
    });
    console.log("[PDF Generator] Browser launched successfully");
  } catch (error) {
    console.error("[PDF Generator] Failed to launch browser:", error);
    throw new Error(`Failed to launch browser: ${error instanceof Error ? error.message : String(error)}`);
  }

  try {
    const page = await browser.newPage();
    
    // Increase timeout for large reports with many images
    page.setDefaultTimeout(180000); // 3 minutes
    
    console.log("[PDF Generator] Setting page content...");

    // Set content and wait for images to load
    // For data URLs, we don't need networkidle since there are no external requests
    await page.setContent(html, {
      waitUntil: ["load", "domcontentloaded"],
      timeout: 180000,
    });
    
    console.log("[PDF Generator] Content loaded, waiting for images...");

    // Wait for all images to load (data URLs should load instantly)
    await page.evaluate(() => {
      return Promise.all(
        Array.from(document.images)
          .filter(img => !img.complete)
          .map(img => new Promise(resolve => {
            img.onload = img.onerror = resolve;
          }))
      );
    });
    
    console.log("[PDF Generator] Images loaded, generating PDF...");

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "Letter",
      printBackground: true,
      margin: {
        top: "0.5in",
        right: "0.5in",
        bottom: "0.5in",
        left: "0.5in",
      },
      timeout: 180000,
    });
    
    console.log("[PDF Generator] PDF generated successfully, size:", (pdfBuffer.length / 1024).toFixed(2), "KB");

    return Buffer.from(pdfBuffer);
  } catch (error) {
    console.error("[PDF Generator] Error during PDF generation:", error);
    throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    await browser.close();
    console.log("[PDF Generator] Browser closed");
  }
}
