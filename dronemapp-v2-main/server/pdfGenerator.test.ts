/**
 * PDF Generator Tests
 * Tests the PDF generation functionality with various HTML inputs
 */

import { describe, it, expect } from "vitest";
import { generatePdfFromHtml } from "./pdfGenerator";

describe("PDF Generator", () => {
  it("should generate PDF from simple HTML", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Test Report</h1>
          <p>This is a test PDF report.</p>
        </body>
      </html>
    `;

    const pdfBuffer = await generatePdfFromHtml(html);
    
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Check PDF header
    const header = pdfBuffer.toString("utf8", 0, 5);
    expect(header).toBe("%PDF-");
  }, 30000); // 30 second timeout

  it("should generate PDF with embedded data URL image", async () => {
    // Small 1x1 red pixel PNG as base64
    const redPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            img { width: 100px; height: 100px; }
          </style>
        </head>
        <body>
          <h1>Test Report with Image</h1>
          <img src="${redPixel}" alt="Test Image" />
          <p>Image loaded successfully.</p>
        </body>
      </html>
    `;

    const pdfBuffer = await generatePdfFromHtml(html);
    
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Check PDF header
    const header = pdfBuffer.toString("utf8", 0, 5);
    expect(header).toBe("%PDF-");
  }, 30000);

  it("should handle large HTML with multiple images", async () => {
    // Small 1x1 red pixel PNG as base64
    const redPixel = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";
    
    // Generate HTML with 10 images
    const images = Array.from({ length: 10 }, (_, i) => 
      `<img src="${redPixel}" alt="Image ${i + 1}" style="width: 200px; height: 150px; margin: 10px;" />`
    ).join("\n");
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            h1 { color: #333; }
          </style>
        </head>
        <body>
          <h1>Test Report with Multiple Images</h1>
          <p>This report contains multiple images:</p>
          ${images}
          <p>All images loaded successfully.</p>
        </body>
      </html>
    `;

    const pdfBuffer = await generatePdfFromHtml(html);
    
    expect(pdfBuffer).toBeInstanceOf(Buffer);
    expect(pdfBuffer.length).toBeGreaterThan(0);
    
    // Check PDF header
    const header = pdfBuffer.toString("utf8", 0, 5);
    expect(header).toBe("%PDF-");
  }, 60000); // 60 second timeout for larger test
});
