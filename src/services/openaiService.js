import OpenAI from 'openai';

// Initialize the OpenAI client
// Using environment variable for API key
let openai = null;

/**
 * Initialize the OpenAI client with the API key from environment variable
 * @returns {boolean} - Whether initialization was successful
 */
export const initOpenAI = () => {
  try {
    // Get API key from environment variable
    // Note: In Vite, environment variables must be prefixed with VITE_
    // and accessed through import.meta.env
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    
    console.log('Environment variables available:', Object.keys(import.meta.env));
    console.log('API Key found:', apiKey ? 'Yes (length: ' + apiKey.length + ')' : 'No');
    
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
    
    openai = new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true // Only for demo purposes
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
    return true; // Return true to allow the app to function in mock mode
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
      model: "gpt-4",
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

/**
 * Get pose correction feedback from GPT-4
 * @param {Object} exercise - The current exercise data
 * @param {string} currentPhase - The current exercise phase
 * @param {Object} poseData - The detected pose data
 * @param {boolean} isCorrect - Whether the pose is correct according to basic validation
 * @param {string} currentFeedback - The current feedback message
 * @returns {Promise<string>} - The feedback message from GPT-4
 */
export const getPoseFeedback = async (exercise, currentPhase, poseData, isCorrect, currentFeedback) => {
  if (!openai) {
    console.error('OpenAI client not initialized');
    return 'OpenAI client not initialized. Please provide an API key.';
  }
  
  // Log the exercise data to debug
  console.log('Exercise data in getPoseFeedback:', exercise);

  try {
    // Check if we're using the mock client
    const isMockClient = typeof openai.chat.completions.create === 'function' && 
                         openai.chat.completions.create.toString().includes('mock');
    
    if (isMockClient) {
      console.log('Using mock OpenAI client for pose feedback');
      return 'AI feedback unavailable. Please provide a valid OpenAI API key for real-time form analysis.';
    }
    
    // Format the pose data for GPT-4
    const keypoints = poseData.keypoints.map(kp => ({
      name: kp.name,
      position: { x: kp.x, y: kp.y },
      score: kp.score
    }));

    // Create a prompt for GPT-4
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are a professional fitness trainer providing real-time feedback on exercise form. 
          Be concise, specific, and encouraging. Focus on the most important correction needed.
          Limit your response to 1-2 short sentences that can be spoken aloud.
          The exercise being performed is ${exercise.name}.`
        },
        {
          role: "user",
          content: JSON.stringify({
            exercise: exercise,
            currentPhase: currentPhase,
            keypoints: keypoints,
            isCorrectForm: isCorrect,
            currentFeedback: currentFeedback
          })
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Error getting feedback from OpenAI:', error);
    return 'Unable to get AI feedback at this time.';
  }
};