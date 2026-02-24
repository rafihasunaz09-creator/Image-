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
    
    console.log("🌐 Navigating to Perchance...");
    await page.goto('https://perchance.org/ai-text-to-image-generator', { 
      waitUntil: 'domcontentloaded', 
      timeout: 90000 
    });

    await page.waitForTimeout(12000);

    console.log("🔍 Injecting prompt...");
    const injected = await page.evaluate((text) => {
      const ta = document.querySelector('textarea#input') || document.querySelector('textarea');
      if (!ta) return false;
      ta.value = text;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }, finalPrompt);

    if (!injected) throw new Error("Prompt injection failed");

    console.log("✅ Prompt injected");

    await page.waitForTimeout(5000);

    console.log("🔘 Clicking Generate button...");

    // Better button click with fallback
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const generateBtn = buttons.find(btn => {
        const text = btn.textContent.toLowerCase();
        return text.includes('generate') || text.includes('create') || text.includes('make');
      });

      if (generateBtn) {
        generateBtn.scrollIntoView({ block: 'center' });
        generateBtn.click();
        return true;
      }
      return false;
    });

    if (!clicked) throw new Error("Generate button not found");

    console.log("⏳ Waiting for image generation...");

    await page.waitForSelector('img[src*="perchance.org"], img[src*="cdn"]', { 
      timeout: 150000 
    });

    const imageUrl = await page.evaluate(() => {
      const img = document.querySelector('img[src*="perchance.org"], img[src*="cdn"]');
      return img ? img.src : null;
    });

    await browser.close();

    if (!imageUrl) throw new Error("No image URL found");

    return { success: true, imageUrl, prompt: finalPrompt };

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error("❌ Generation error:", error.message);
    throw error;
  }
}

app.get('/imagine', async (req, res) => {
  const prompt = req.query.prompt;
  const style = req.query.style || "none";

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Prompt is required" });
  }

  console.log(`🎨 Generating: ${prompt} | Style: ${style}`);

  try {
    const result = await generateImage(prompt, style);
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Generation failed",
      message: "Try again in 30 seconds"
    });
  }
});

app.get('/', (req, res) => res.send('✅ Perchance API v5 (Fixed Button Click)'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
