import React, { useEffect, useState, useRef } from 'react';

const VoiceFeedback = ({ feedback, enabled = true, formError = false, repComplete = false }) => {
  const [lastSpokenFeedback, setLastSpokenFeedback] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [errorPersistenceTime, setErrorPersistenceTime] = useState(0);
  const [speechQueue, setSpeechQueue] = useState([]);
  
  // Use refs for values that shouldn't trigger re-renders
  const speakTimeoutRef = useRef(null);
  const lastSpeakTimeRef = useRef(Date.now());
  const errorTimerRef = useRef(null);
  
  // Log component props and state for debugging
  console.log('VoiceFeedback component:', { 
    feedback, 
    enabled, 
    speaking, 
    lastSpokenFeedback,
    formError,
    repComplete,
    errorPersistenceTime
  });

  // Function to speak text using Web Speech API
  const speakText = async (text) => {
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      return false;
    }
    
    try {
      // Cancel any ongoing speech
      if (speaking) {
        window.speechSynthesis.cancel();
      }
      
      return new Promise((resolve, reject) => {
        // Create a new speech synthesis utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set voice properties
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Get available voices and set a good English voice if available
        let voices = window.speechSynthesis.getVoices();
        
        // If voices array is empty, try to get voices again after a small delay
        if (voices.length === 0) {
          setTimeout(() => {
            voices = window.speechSynthesis.getVoices();
            setVoice();
          }, 100);
        } else {
          setVoice();
        }
        
        function setVoice() {
          console.log('Available voices:', voices.map(v => v.name));
          
          // Try to find a good English voice
          const englishVoice = voices.find(voice => 
            voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
          );
          
          if (englishVoice) {
            utterance.voice = englishVoice;
            console.log('Using voice:', englishVoice.name);
          }
        }
        
        // Add event handlers
        utterance.onstart = () => {
          console.log('Speech started successfully');
          setSpeaking(true);
        };
        
        utterance.onend = () => {
          console.log('Speech ended');
          setSpeaking(false);
          resolve(true);
        };
        
        utterance.onerror = (event) => {
          console.error('Speech error:', event.error);
          setSpeaking(false);
          reject(event.error);
        };
        
        // Speak the utterance
        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      console.error('Error speaking feedback:', error);
      return false;
    }
  };
  
  // Process the speech queue
  useEffect(() => {
    const processSpeechQueue = async () => {
      if (speechQueue.length > 0 && !speaking) {
        const nextSpeech = speechQueue[0];
        try {
          await speakText(nextSpeech);
          // Remove the spoken item from queue
          setSpeechQueue(prev => prev.slice(1));
        } catch (error) {
          console.error('Error in speech queue processing:', error);
          // Remove the failed item from queue
          setSpeechQueue(prev => prev.slice(1));
        }
      }
    };
    
    processSpeechQueue();
  }, [speechQueue, speaking]);

  // Handle form errors - only speak when error persists for more than 1 second
  useEffect(() => {
    if (formError && enabled) {
      // Start or continue tracking error persistence
      if (errorTimerRef.current) {
        clearInterval(errorTimerRef.current);
      }
      
      errorTimerRef.current = setInterval(() => {
        setErrorPersistenceTime(prev => prev + 100);
      }, 100);
    } else {
      // Reset error persistence timer
      if (errorTimerRef.current) {
        clearInterval(errorTimerRef.current);
        errorTimerRef.current = null;
      }
      setErrorPersistenceTime(0);
    }
    
    return () => {
      if (errorTimerRef.current) {
        clearInterval(errorTimerRef.current);
      }
    };
  }, [formError, enabled]);
  
  // Add feedback to speech queue when appropriate
  useEffect(() => {
    if (!enabled || !feedback || feedback === lastSpokenFeedback) {
      return;
    }
    
    const now = Date.now();
    const timeSinceLastSpeak = now - lastSpeakTimeRef.current;
    
    // Determine if we should speak based on different conditions
    let shouldSpeak = false;
    
    // Speak immediately for rep completions
    if (repComplete) {
      shouldSpeak = true;
      console.log('Speaking for rep completion');
    }
    // Speak for form errors that persist for more than 1 second
    else if (formError && errorPersistenceTime >= 1000) {
      shouldSpeak = true;
      console.log('Speaking for persistent form error');
    }
    // Otherwise, use a standard debounce of 5 seconds
    else if (timeSinceLastSpeak > 5000) {
      shouldSpeak = true;
      console.log('Speaking after debounce period');
    }
    
    if (shouldSpeak) {
      // Clear any pending speak timeout
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
        speakTimeoutRef.current = null;
      }
      
      // Add to speech queue
      setSpeechQueue(prev => [...prev, feedback]);
      setLastSpokenFeedback(feedback);
      lastSpeakTimeRef.current = now;
    }
  }, [feedback, enabled, lastSpokenFeedback, repComplete, formError, errorPersistenceTime]);
  
  // Cleanup function
  useEffect(() => {
    return () => {
      if (speaking) {
        window.speechSynthesis.cancel();
      }
      
      if (speakTimeoutRef.current) {
        clearTimeout(speakTimeoutRef.current);
      }
      
      if (errorTimerRef.current) {
        clearInterval(errorTimerRef.current);
      }
    };
  }, [speaking]);

  return (
    <div className="voice-feedback" style={{ display: 'none' }}>
      {/* Hidden component - just handles speech */}
    </div>
  );
};

export default VoiceFeedback;