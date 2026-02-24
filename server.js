const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const styles = {
  realistic: "realistic photo, photorealistic, ultra detailed, 8k",
  anime: "anime style, detailed anime art, vibrant colors",
  cartoon: "cartoon style, disney pixar style",
  cyberpunk: "cyberpunk, neon lights, futuristic, blade runner",
  none: ""
};

app.get('/imagine', async (req, res) => {
  const prompt = req.query.prompt;
  const style = (req.query.style || "none").toLowerCase();
  const userKey = req.query.userKey;

  if (!prompt) return res.status(400).json({ success: false, error: "Prompt missing" });
  if (!userKey) return res.status(400).json({ success: false, error: "userKey missing (add &userKey=YOUR_NEW_KEY)" });

  const styleText = styles[style] || "";
  const finalPrompt = styleText ? `${prompt}, ${styleText}` : prompt;

  console.log(`[NEW KEY] Generating: ${prompt} | Style: ${style}`);

  try {
    const payload = {
      prompt: finalPrompt,
      negativePrompt: "",
      seed: -1,
      resolution: "768x768",
      guidanceScale: 7,
      channel: "ai-text-to-image-generator",
      subChannel: "public",
      userKey: userKey,
      adAccessCode: "",
      requestId: Math.random().toString()
    };

    const response = await axios.post("https://image-generation.perchance.org/api/generate", payload, {
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        "Origin": "https://perchance.org",
        "Referer": "https://perchance.org/ai-text-to-image-generator"
      }
    });

    const imageUrl = response.data;

    if (imageUrl && imageUrl.status === "invalid_key") {
      return res.status(401).json({ success: false, error: "invalid_key", message: "Key expire হয়েছে। নতুন key দাও।" });
    }

    res.json({ success: true, imageUrl, prompt: finalPrompt, style });

  } catch (error) {
    console.error(error.message);
    res.status(500).json({ success: false, error: "Generation failed", message: "Try again or new key" });
  }
});

app.get('/', (req, res) => res.send('✅ Perchance API Running (Dynamic Key)'));

app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
