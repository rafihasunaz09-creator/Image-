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
    console.log("🌐 Opening Perchance...");

    await page.goto('https://perchance.org/ai-text-to-image-generator', { 
      waitUntil: 'domcontentloaded', 
      timeout: 90000 
    });

    // Wait for the iframes to fully render
    await page.waitForTimeout(15000);

    console.log("🔍 Scanning frames for the generator...");
    let targetFrame = null;
    
    // Find the frame holding the textarea
    for (const frame of page.frames()) {
      try {
        const hasTextarea = await frame.$('textarea');
        if (hasTextarea) {
          targetFrame = frame;
          break;
        }
      } catch (e) {
        // Ignore errors from dead or cross-origin blocked frames
      }
    }

    if (!targetFrame) {
      throw new Error("Could not find the generator iframe. The site layout might have changed.");
    }

    console.log("🔍 Injecting prompt...");
    await targetFrame.evaluate((text) => {
      const ta = document.querySelector('textarea');
      if (ta) {
        ta.value = text;
        ta.dispatchEvent(new Event('input', { bubbles: true }));
        ta.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, finalPrompt);

    await page.waitForTimeout(5000);

    console.log("🔘 Clicking ✨ generate button...");
    const clicked = await targetFrame.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => 
        b.textContent.toLowerCase().includes('generate')
      );
      if (btn) {
        btn.scrollIntoView({ block: 'center' });
        btn.click();
        return true;
      }
      return false;
    });

    if (!clicked) throw new Error("Generate button not found inside the frame");

    console.log("⏳ Waiting for image (max 3 minutes)...");

    // Strictly check for the actual image URL holding 'downloadTemporaryImage'
    const imageUrlHandle = await targetFrame.waitForFunction(() => {
      const images = document.querySelectorAll('img');
      for (let img of images) {
        if (img.src && img.src.includes('downloadTemporaryImage')) {
          return img.src;
        }
      }
      return null;
    }, undefined, { timeout: 180000, polling: 2000 });

    const finalUrl = await imageUrlHandle.jsonValue();

    await browser.close();

    return { success: true, imageUrl: finalUrl, prompt: finalPrompt };

  } catch (error) {
    if (browser) await browser.close().catch(() => {});
    console.error("❌ Final Error:", error.message);
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
      message: "Site layout changed or request timed out."
    });
  }
});

app.get('/', (req, res) => res.send('✅ Perchance API v9 (Strict Image Target)'));

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
    
