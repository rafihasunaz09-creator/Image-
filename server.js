const express = require('express');
const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/imagine', async (req, res) => {
  const prompt = req.query.prompt || "beautiful cyberpunk cat";
  const style = (req.query.style || "none").toLowerCase();

  const styles = {
    realistic: "realistic photo, photorealistic, ultra detailed, 8k, sharp focus",
    anime: "anime style, detailed anime art, vibrant colors, studio ghibli",
    cartoon: "cartoon style, disney pixar style, vibrant, cute",
    cyberpunk: "cyberpunk, neon lights, futuristic city, blade runner style",
    oilpainting: "oil painting, masterpiece, artistic, renaissance",
    pixel: "pixel art, 8bit, retro game style",
    "3d": "3d render, octane render, cinematic lighting, unreal engine",
    none: ""
  };

  const styleText = styles[style] || "";
  const finalPrompt = styleText ? `${prompt}, ${styleText}` : prompt;

  try {
    const browser = await chromium.launch({ 
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();
    await page.goto('https://perchance.org/ai-text-to-image-generator', { waitUntil: 'networkidle' });

    await page.fill('textarea, input[type="text"]', finalPrompt);
    await page.click('button:has-text("Generate"), button:has-text("Create")');

    await page.waitForSelector('img[src*="perchance.org"]', { timeout: 65000 });

    const imageUrl = await page.evaluate(() => {
      const img = document.querySelector('img[src*="perchance.org"]');
      return img ? img.src : null;
    });

    await browser.close();

    res.json({
      success: true,
      imageUrl: imageUrl,
      prompt: finalPrompt,
      style: style
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      error: "Generation failed",
      message: "Server busy or timeout. Try again."
    });
  }
});

// Keep-alive route (Render free tier-এর জন্য)
app.get('/', (req, res) => res.send('✅ Perchance AI API is running on Render!'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
