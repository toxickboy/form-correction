import React, { useEffect, useState } from 'react';

const VoiceFeedback = ({ feedback, enabled = true }) => {
  const [lastSpokenFeedback, setLastSpokenFeedback] = useState('');
  const [cooldown, setCooldown] = useState(false);
  const [speaking, setSpeaking] = useState(false);

  // Log component props and state for debugging
  console.log('VoiceFeedback component:', { 
    feedback, 
    enabled, 
    speaking, 
    lastSpokenFeedback,
    cooldown
  });

  useEffect(() => {
    // Check if speech synthesis is supported
    if (!window.speechSynthesis) {
      console.error('Speech synthesis not supported in this browser');
      return;
    }

    // Only speak if feedback has changed and not in cooldown
    if (
      enabled && 
      feedback && 
      feedback !== lastSpokenFeedback && 
      !cooldown && 
      !speaking
    ) {
      console.log('Attempting to speak feedback:', feedback);
      
      // Cancel any ongoing speech
      if (speaking) {
        window.speechSynthesis.cancel();
      }
      
      try {
        // Create a new speech synthesis utterance
        const utterance = new SpeechSynthesisUtterance(feedback);
        
        // Set voice properties
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        
        // Get available voices and set a good English voice if available
        const voices = window.speechSynthesis.getVoices();
        console.log('Available voices:', voices.map(v => v.name));
        
        // Try to find a good English voice
        const englishVoice = voices.find(voice => 
          voice.lang.includes('en') && (voice.name.includes('Google') || voice.name.includes('Microsoft'))
        );
        
        if (englishVoice) {
          utterance.voice = englishVoice;
          console.log('Using voice:', englishVoice.name);
        }
        
        // Add event handlers
        utterance.onstart = () => {
          console.log('Speech started successfully');
          setSpeaking(true);
        };
        
        utterance.onend = () => {
          console.log('Speech ended');
          setSpeaking(false);
        };
        
        utterance.onerror = (event) => {
          console.error('Speech error:', event.error);
          setSpeaking(false);
        };
        
        // Speak the utterance
        window.speechSynthesis.speak(utterance);
        setLastSpokenFeedback(feedback);
        
        // Set cooldown to prevent too frequent speech
        setCooldown(true);
        setTimeout(() => setCooldown(false), 3000); // 3 second cooldown
      } catch (error) {
        console.error('Error speaking feedback:', error);
      }
    }
    
    // Cleanup function to cancel speech when component unmounts
    return () => {
      if (speaking) {
        window.speechSynthesis.cancel();
      }
    };
  }, [feedback, enabled, speaking, lastSpokenFeedback, cooldown]);

  return (
    <div className="voice-feedback" style={{ display: 'none' }}>
      {/* Hidden component - just handles speech */}
    </div>
  );
};

export default VoiceFeedback;