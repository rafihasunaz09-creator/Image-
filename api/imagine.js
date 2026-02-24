const { chromium } = require('playwright-extra');
const stealth = require('stealth-plugin-puppeteer-extra')();
chromium.use(stealth);

module.exports = async (req, res) => {
  if (req.method !== "GET") return res.status(405).json({ error: "GET only" });

  const prompt = req.query.prompt || "beautiful cat";
  const style = req.query.style || "none";

  const styles = {
    realistic: "realistic photo, photorealistic, ultra detailed",
    anime: "anime style, detailed anime art",
    cartoon: "cartoon style, disney pixar",
    cyberpunk: "cyberpunk neon futuristic",
    none: ""
  };

  const styleText = styles[style.toLowerCase()] || "";
  const finalPrompt = styleText ? `${prompt}, ${styleText}` : prompt;

  try {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    await page.goto('https://perchance.org/ai-text-to-image-generator', { waitUntil: 'networkidle' });
    await page.fill('textarea, input[type="text"]', finalPrompt);
    await page.click('button:has-text("Generate")');

    await page.waitForSelector('img[src*="perchance.org"]', { timeout: 60000 });
    
    const imageUrl = await page.evaluate(() => {
      const img = document.querySelector('img[src*="perchance.org"]');
      return img ? img.src : null;
    });

    await browser.close();

    res.json({ success: true, imageUrl, prompt: finalPrompt });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Generation failed", message: error.message });
  }
};
