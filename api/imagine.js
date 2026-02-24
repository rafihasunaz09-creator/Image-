const { chromium } = require('playwright-extra');
const stealth = require('puppeteer-extra-plugin-stealth')();

chromium.use(stealth);

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "Only GET allowed" });

  const prompt = req.query.prompt || "beautiful cat";
  const style = (req.query.style || "none").toLowerCase();

  const styles = {
    realistic: "realistic photo, photorealistic, ultra detailed, 8k",
    anime: "anime style, detailed anime art, vibrant colors",
    cartoon: "cartoon style, disney pixar style",
    cyberpunk: "cyberpunk, neon lights, futuristic, blade runner",
    oilpainting: "oil painting, masterpiece, artistic",
    pixel: "pixel art, 8bit, retro game",
    "3d": "3d render, octane render, cinematic",
    none: ""
  };

  const styleText = styles[style] || "";
  const finalPrompt = styleText ? `${prompt}, ${styleText}` : prompt;

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto('https://perchance.org/ai-text-to-image-generator', { waitUntil: 'networkidle' });

    await page.fill('textarea, input[type="text"]', finalPrompt);
    await page.click('button:has-text("Generate"), button:has-text("Create")');

    await page.waitForSelector('img[src*="perchance.org"]', { timeout: 60000 });

    const imageUrl = await page.evaluate(() => {
      const img = document.querySelector('img[src*="perchance.org"]');
      return img ? img.src : null;
    });

    await browser.close();

    res.json({
      success: true,
      imageUrl,
      prompt: finalPrompt
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Generation failed",
      message: "Server busy or timeout. Try again in 30 seconds."
    });
  }
};
