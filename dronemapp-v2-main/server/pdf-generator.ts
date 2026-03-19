import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(html: string): Promise<Buffer> {
  let browser;
  try {
    console.log('[PDF] Starting PDF generation...');
    // Launch browser
    console.log('[PDF] Launching Puppeteer browser...');
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    const page = await browser.newPage();
    
    // Set longer timeout for map loading (90 seconds)
    page.setDefaultNavigationTimeout(90000);
    page.setDefaultTimeout(90000);
    
    // Set content with longer timeout for map tiles to load
    // Use networkidle0 instead of networkidle2 to avoid waiting for all network requests
    // (networkidle0 = page load complete, networkidle2 = max 2 concurrent connections)
    console.log('[PDF] Setting page content with 90s timeout for map loading...');
    try {
      await page.setContent(html, { waitUntil: 'networkidle0', timeout: 90000 } as any);
    } catch (error) {
      // If networkidle0 times out, continue anyway - the page is likely ready
      console.log('[PDF] Page load timeout reached, continuing with PDF generation...');
    }
    
    // Wait for map to fully render (give it extra time for Google Maps tiles)
    console.log('[PDF] Waiting 3 seconds for map tiles to fully render...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Generate PDF with extended timeout
    console.log('[PDF] Generating PDF...');
    const pdfBuffer = await page.pdf({
      format: 'Letter',
      margin: {
        top: '0.3in',
        right: '0.4in',
        bottom: '0.3in',
        left: '0.4in',
      },
      printBackground: true,
      timeout: 90000,
    });
    
    console.log('[PDF] PDF generated successfully, size:', pdfBuffer.length, 'bytes');
    if (pdfBuffer.length === 0) {
      throw new Error('Generated PDF is empty');
    }
    // Convert Uint8Array to Buffer for proper binary handling in Express
    return Buffer.from(pdfBuffer);
  } catch (error: any) {
    console.error('[PDF] Error during PDF generation:', error?.message || error);
    // Don't re-throw - return empty PDF or handle gracefully
    throw new Error(`PDF generation failed: ${error?.message || 'Unknown error'}`);
  } finally {
    if (browser) {
      console.log('[PDF] Closing browser...');
      try {
        await browser.close();
      } catch (e) {
        console.error('[PDF] Error closing browser:', e);
      }
    }
  }
}
