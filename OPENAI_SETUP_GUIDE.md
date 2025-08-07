# OpenAI API Setup Guide

## Issue Identified
The AI feedback and voice functionality are not working because the OpenAI API key in your `.env` file is invalid. The key you're using has a `sk-proj-` prefix, which indicates it's a project key rather than a standard API key.

## How to Fix

### 1. Get a Valid OpenAI API Key

1. Go to [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)
2. Log in to your OpenAI account
3. Click on "Create new secret key"
4. Give your key a name (e.g., "Form App")
5. Copy the generated key (it should start with `sk-` followed by a long string)

### 2. Update Your .env File

1. Open the `.env` file in your project root
2. Replace the current API key with your new key:
   ```
   VITE_OPENAI_API_KEY=sk-your-new-key-here
   ```
3. Save the file

### 3. Restart Your Development Server

1. Stop your current development server (Ctrl+C in the terminal)
2. Start it again with:
   ```
   npm run dev
   ```

## Verifying It Works

1. Open your application in the browser
2. Check the browser console (F12 > Console tab)
3. You should see:
   - "OpenAI client initialized successfully"
   - A green status dot in the UI
4. Try using the voice feedback feature

## Troubleshooting

### If You Still Have Issues:

1. **Check API Key Format**: Make sure your key starts with `sk-` and not `sk-proj-`
2. **Check Account Credits**: Ensure your OpenAI account has available credits
3. **Check Browser Console**: Look for specific error messages
4. **Try the Test Script**: Run `node test-openai-connection.js` to test your connection

### Common Errors:

- **401 Unauthorized**: Your API key is invalid or expired
- **429 Too Many Requests**: You've exceeded your rate limit or have insufficient credits
- **500/503 Server Errors**: OpenAI service might be experiencing issues

## Privacy Note

Your API key grants access to your OpenAI account and associated billing. Never commit it to public repositories or share it with others.