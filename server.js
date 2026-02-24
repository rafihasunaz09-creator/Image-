const express = require('express');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

const USER_KEY = "33835d1db14c9fa53abe785e983c2b3564356ed6004c5f4d6314adf430d94d59";

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

app.get('/imagine', async (req, res) => {
  const prompt = req.query.prompt;
  let style = (req.query.style || "none").toLowerCase();

  if (!prompt) {
    return res.status(400).json({ success: false, error: "Prompt is required" });
  }

  const styleText = styles[style] || "";
  const finalPrompt = styleText ? `${prompt}, ${styleText}` : prompt;

  console.log(`Generating: ${prompt} | Style: ${style}`);

  try {
    const payload = {
      prompt: finalPrompt,
      negativePrompt: "",
      seed: -1,
      resolution: "768x768",
      guidanceScale: 7,
      channel: "ai-text-to-image-generator",
      subChannel: "public",
      userKey: USER_KEY,
      adAccessCode: "",
      requestId: Math.random().toString()
    };

    const response = await axios.post(
      "https://image-generation.perchance.org/api/generate",
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
          "Origin": "https://perchance.org",
          "Referer": "https://perchance.org/ai-text-to-image-generator"
        }
      }
    );

    const imageUrl = response.data;   // Perchance সরাসরি image URL return করে

    res.json({
      success: true,
      imageUrl: imageUrl,
      prompt: finalPrompt,
      style: style
    });

  } catch (error) {
    console.error("Error:", error.message);
    res.status(500).json({
      success: false,
      error: "Generation failed",
      message: "Try again in 10 seconds."
    });
  }
});

app.get('/', (req, res) => res.send('✅ Perchance Fast API is running!'));

app.listen(PORT, () => {
  console.log(`🚀 Fast API running on port ${PORT}`);
});
