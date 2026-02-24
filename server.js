const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const app = express();
const PORT = process.env.PORT || 3000;

async function generateImage(prompt, style = "none", retryCount = 0) {
  const maxRetries = 2;
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
    
    await page.goto('https://perchance.org/ai-text-to-image-generator', { 
      waitUntil: 'networkidle', 
      timeout: 45000 
    });

    await page.waitForSelector('textarea, input[type="text"]', { timeout: 15000 });
    await page.fill('textarea, input[type="text"]', finalPrompt);

    // Generate button click
    await page.click('button:has-text("Generate"), button:has-text("Create")');

    await page.waitForSelector('img[src*="perchance.org"], img[src*="cdn"]', { 
      timeout: 120000 
    });

    const imageUrl = await page.evaluate(() => {
      const img = document.querySelector('img[src*="perchance.org"], img[src*="cdn"]');
      return img ? img.src : null;
    });

    await browser.close();

    if (!imageUrl) throw new Error("No image found");

    return { success: true, imageUrl, prompt: finalPrompt, style };

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    
    if (retryCount < maxRetries) {
      console.log(`🔄 Retry \( {retryCount + 1}/ \){maxRetries} for prompt: ${prompt}`);
      return generateImage(prompt, style, retryCount + 1);
    }

    console.error("Generation error:", error.message);
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
