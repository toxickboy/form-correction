import OpenAI from 'openai';

// Initialize the OpenAI client
let openai = null;

// OpenAI configuration
const OPENAI_MODEL = 'gpt-3.5-turbo';

// Debounce control for API requests
let lastRequestTime = 0;
const REQUEST_DEBOUNCE_MS = 10000; // 10 seconds between requests

// Store form issues for compact prompting
let formIssuesHistory = [];

/**
 * Initialize the OpenAI client with standard configuration
 * @returns {boolean} - Whether initialization was successful
 */
export const initOpenAI = () => {
  try {
    // Get API key from environment variable
    // Note: In Vite, environment variables must be prefixed with VITE_
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    if (!apiKey || apiKey === 'your_openai_api_key_here') {
      console.warn('OpenAI API key not found or using placeholder value. Using mock mode.');
      // Create a mock OpenAI client for demo purposes
      openai = {
        chat: {
          completions: {
            create: async () => ({
              choices: [{ message: { content: 'This is a mock AI response. Please add a valid OpenAI API key to enable real AI feedback.' } }]
            })
          }
        }
      };
      return true; // Return true to allow the app to function in mock mode
    }
  
    // Initialize standard OpenAI client
    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Only for development purposes
    });
    
    console.log('OpenAI client initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing OpenAI client:', error);
    // Create a mock OpenAI client as fallback
    openai = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: 'Error connecting to OpenAI. Using mock response.' } }]
          })
        }
      }
    };
    return false;
  }
};

/**
 * Check if we should make a new request based on debounce time
 * @returns {boolean} - Whether a new request is allowed
 */
const shouldMakeRequest = () => {
  const now = Date.now();
  if (now - lastRequestTime < REQUEST_DEBOUNCE_MS) {
    console.log(`Request debounced. Last request was ${(now - lastRequestTime) / 1000}s ago`);
    return false;
  }
  lastRequestTime = now;
  return true;
};

/**
 * Track form issues for compact prompting
 * @param {string} issue - The form issue to track
 */
const trackFormIssue = (issue) => {
  // Only keep unique issues
  if (!formIssuesHistory.includes(issue)) {
    formIssuesHistory.push(issue);
    // Keep only the last 3 issues
    if (formIssuesHistory.length > 3) {
      formIssuesHistory.shift();
    }
  }
};

/**
 * Reset form issues history
 */
export const resetFormIssuesHistory = () => {
  formIssuesHistory = [];
};

/**
 * Get AI feedback on exercise form
 * @param {Object} exerciseData - Exercise data
 * @param {string} phase - Current exercise phase
 * @param {Object} pose - Detected pose data
 * @param {boolean} isCorrect - Whether the form is correct
 * @param {string} currentFeedback - Current feedback message
 * @returns {Promise<string>} - AI feedback
 */
export const getPoseFeedback = async (exerciseData, phase, pose, isCorrect, currentFeedback) => {
  if (!openai) {
    console.warn('OpenAI client not initialized. Initializing now...');
    const success = initOpenAI();
    if (!success) {
      return 'AI feedback unavailable. Please check your API key.';
    }
  }
  
  // Track form issues if form is incorrect
  if (!isCorrect && currentFeedback) {
    trackFormIssue(currentFeedback);
  }
  
  // Check if we should make a request based on debounce time
  if (!shouldMakeRequest()) {
    return 'Analyzing your form...';
  }
  
  try {
    console.log('Preparing compact prompt for OpenAI');
    
    // Create a compact prompt with only essential information
    const compactData = {
      exercise: exerciseData.name,
      exercise_id: exerciseData.exercise_id,
      rep_phase: phase,
      form_issues: formIssuesHistory,
      is_correct_form: isCorrect
    };
    
    console.log('Sending compact data to OpenAI:', compactData);
    
    // Different prompts based on workout phase
    let systemPrompt;
    if (phase === 'up' || phase === 'down') {
      // Short tips during active workout
      systemPrompt = `You are a professional fitness coach providing real-time feedback. 
      Keep responses under 15 words, focused on form correction or encouragement. 
      Be direct and motivational.`;
    } else {
      // More detailed feedback during transitions
      systemPrompt = `You are a professional fitness coach providing exercise guidance. 
      Keep responses under 30 words, focused on proper technique and form. 
      Be encouraging but precise about form corrections.`;
    }
    
    console.log('Making API call to OpenAI with:', {
      model: OPENAI_MODEL
    });
    
    try {
      const response = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: JSON.stringify(compactData) }
        ],
        max_tokens: 50,
        temperature: 0.7,
      });
      
      console.log('API call successful, response:', response);
      const feedback = response.choices[0].message.content.trim();
      console.log('Received AI feedback:', feedback);
      return feedback;
    } catch (apiError) {
      console.error('API call failed with error:', apiError);
      return 'AI feedback temporarily unavailable. Keep going!';
    }
  } catch (error) {
    console.error('Error getting AI feedback:', error);
    return 'AI feedback temporarily unavailable. Keep going!';
  }
};

/**
 * Test the OpenAI connection with a simple message
 * @param {string} message - The test message to send
 * @returns {Promise<string>} - The response from OpenAI
 */
export const testOpenAIConnection = async (message) => {
  if (!openai) {
    throw new Error('OpenAI client not initialized. Please initialize first.');
  }

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant for a fitness application. Keep responses brief and friendly."
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error testing OpenAI connection:', error);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
};

// Second implementation of getPoseFeedback removed to fix duplicate function declaration