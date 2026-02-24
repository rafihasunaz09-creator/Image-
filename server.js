const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const app = express();
const PORT = process.env.PORT || 3000;

async function generateImage(prompt, style = "none") {
  let browser = null;

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
    browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });

    const page = await browser.newPage();
    await page.goto('https://perchance.org/ai-text-to-image-generator', { waitUntil: 'domcontentloaded', timeout: 60000 });

    await page.waitForTimeout(8000); // সাইট লোড হতে সময় দাও

    await page.fill('textarea, input[type="text"]', finalPrompt);

    await page.click('button:has-text("Generate"), button:has-text("Create")');

    await page.waitForSelector('img[src*="perchance.org"], img[src*="cdn"]', { timeout: 120000 });

    const imageUrl = await page.evaluate(() => {
      const img = document.querySelector('img[src*="perchance.org"], img[src*="cdn"]');
      return img ? img.src : null;
    });

    await browser.close();

    return { success: true, imageUrl, prompt: finalPrompt };

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
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
      message: "Try again in 30 seconds (server busy)"
    });
  }
});

app.get('/', (req, res) => res.send('✅ Perchance Playwright API is running!'));

app.listen(PORT, () => {
  console.log(`🚀 Playwright API running on port ${PORT}`);
});
