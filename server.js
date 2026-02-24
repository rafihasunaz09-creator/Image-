const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const app = express();
const PORT = process.env.PORT || 3000;

async function generateImage(prompt, style = "none", retryCount = 0) {
  const maxRetries = 2;
  
  const styles = {
    realistic: "realistic photo, photorealistic, ultra detailed, 8k",
    anime: "anime style, detailed anime art, vibrant colors",
    cartoon: "cartoon style, disney pixar style",
    cyberpunk: "cyberpunk, neon lights, futuristic, blade runner",
    none: ""
  };

  const styleText = styles[style.toLowerCase()] || "";
  const finalPrompt = styleText ? `${prompt}, ${styleText}` : prompt;

  try {
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.goto('https://perchance.org/ai-text-to-image-generator', { 
      waitUntil: 'networkidle', 
      timeout: 45000 
    });

    // আরও নির্ভরযোগ্য selectors
    await page.waitForSelector('textarea, input[type="text"], [contenteditable="true"]', { timeout: 15000 });
    await page.fill('textarea, input[type="text"], [contenteditable="true"]', finalPrompt);

    // Generate button (যেকোনো Generate বাটন)
    await page.waitForSelector('button', { timeout: 10000 });
    const buttons = await page.$$('button');
    for (const btn of buttons) {
      const text = await btn.textContent();
      if (text && (text.includes("Generate") || text.includes("Create"))) {
        await btn.click();
        break;
      }
    }

    // Image আসার জন্য লম্বা wait
    await page.waitForSelector('img[src*="perchance.org"], img[src*="cdn"]', { 
      timeout: 120000 
    });

    const imageUrl = await page.evaluate(() => {
      const img = document.querySelector('img[src*="perchance.org"], img[src*="cdn"]');
      return img ? img.src : null;
    });

    await browser.close();

    if (!imageUrl) throw new Error("No image URL found");

    return { success: true, imageUrl, prompt: finalPrompt };

  } catch (error) {
    await browser?.close().catch(() => {});
    
    if (retryCount < maxRetries) {
      console.log(`Retry \( {retryCount + 1}/ \){maxRetries}...`);
      return generateImage(prompt, style, retryCount + 1);
    }

    throw error;
  }
}

app.get('/imagine', async (req, res) => {
  const prompt = req.query.prompt;
  const style = req.query.style || "none";

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Prompt is required" });
  }

  console.log(`Generating: ${prompt} | Style: ${style}`);

  try {
    const result = await generateImage(prompt, style);
    res.json(result);
  } catch (error) {
    console.error("Generation error:", error.message);
    res.status(500).json({
      success: false,
      error: "Generation failed",
      message: "Server busy or timeout. Try again in 20-30 seconds."
    });
  }
});

app.get('/', (req, res) => res.send('✅ Perchance AI API is running on Render!'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
