const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static('public'));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.post('/contact', (req, res) => {
  const { name, email, phone, service, message } = req.body;
  const data = {
    name,
    email,
    phone,
    service: service || 'Not specified',
    message,
    date: new Date().toLocaleString()
  };
  const log = JSON.stringify(data) + '\n';

  fs.appendFile('messages.txt', log, (err) => {
    if (err) {
      console.error('❌ Error saving message:', err);
      return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
    console.log('✅ Message saved:', data);
    res.json({ success: true, message: 'Thank you for your message! We will get back to you within 24 hours.' });
  });
});

// AI Troubleshooting endpoint
app.post('/api/troubleshoot', async (req, res) => {
  const { printerModel, problemDescription } = req.body;
  if (!printerModel || !problemDescription) {
    return res.status(400).json({ error: 'Missing printerModel or problemDescription' });
  }

  const GEMINI_API_KEY = 'AIzaSyCFGS-OveA-LGg2xmtS5F5tuqZb0mnbz5g';
  const prompt = `You are an assistant for a web-based chatbot application.\nThe chatbot takes two user inputs: a printer model and a problem description.\nYour task is to generate a clear, beginner-friendly, step-by-step at-home troubleshooting guide for the issue described.\n\nContext:\nThis is part of a customer support chatbot for basic printer repair.\nUsers are non-technical and should be able to follow instructions easily.\nAssume no access to professional tools or diagnostic software.\n\nInputs:\nprinter_model: "${printerModel}"\nproblem_description: "${problemDescription}"\n\nInstruction:\nGenerate a list of 3–7 troubleshooting steps.\nBe clear, concise, and avoid technical jargon.\nUse formatting like: "Step 1: Check ink level..."\n\nOutput format:\nReturn plain text instructions in a user-friendly tone, formatted step-by-step.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    console.log('Gemini API response:', data); // Log the full response
    if (!response.ok) {
      console.error('Gemini API HTTP error:', response.status, response.statusText);
      return res.status(500).json({ error: 'Gemini API error', details: data });
    }
    // Extract the generated text from Gemini's response
    const aiText = data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts && data.candidates[0].content.parts[0].text
      ? data.candidates[0].content.parts[0].text.trim()
      : null;
    if (!aiText) {
      console.error('No AI text generated. Full response:', data);
      return res.status(500).json({ error: 'No troubleshooting steps generated', details: data });
    }
    res.json({ steps: aiText });
  } catch (err) {
    console.error('Exception during Gemini API call:', err);
    res.status(500).json({ error: 'Failed to get troubleshooting steps.', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('📧 Contact form endpoint: POST /contact');
});
