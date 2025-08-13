import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { calculateAngle, smoothAngle, EXERCISE_THRESHOLDS, repCountingStateMachine, validatePoseForm } from '../utils/poseUtils';
import { getPoseFeedback, resetFormIssuesHistory } from '../services/openaiService';
import VoiceFeedback from './VoiceFeedback';

const PoseDetector = ({ exercise, onBack, isDetecting, isOpenAIEnabled, voiceFeedbackEnabled }) => {
  console.log('PoseDetector rendered with exercise:', exercise);
  console.log('Exercise ID:', exercise?.exercise_id || exercise?.id);
  console.log('Exercise name:', exercise?.name);
  console.log('Detection status:', isDetecting ? 'active' : 'inactive');
  
  // Ensure exercise object has the correct structure
  const exerciseData = useMemo(() => ({
    exercise_id: exercise?.exercise_id || exercise?.id || 'unknown',
    name: exercise?.name || 'Unknown Exercise',
    phases: exercise?.phases || []
  }), [exercise]);

  // Create repStateRef at component level
  const repStateRef = useRef({
    currentState: 'START',
    angleBuffer: [],
    lastAngle: 0,
    repInProgress: false,
    exerciseType: exerciseData.exercise_id,
    lockedArm: null
  });
  
  console.log('Exercise data initialized:', exerciseData);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [detector, setDetector] = useState(null);
  const [repCount, setRepCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for back camera
  const [feedback, setFeedback] = useState({ isCorrect: true, message: 'Get ready...' });
  const [phaseHistory, setPhaseHistory] = useState([]);
  const [isRepComplete, setIsRepComplete] = useState(false);
  const [aiFeedback, setAIFeedback] = useState('');
  const [lastAIRequestTime, setLastAIRequestTime] = useState(0);

  // Initialize the pose detector
  useEffect(() => {
    let isComponentMounted = true;
    
    const initializeDetector = async () => {
      try {
        console.log('Setting up TensorFlow.js backend...');
        await tf.ready();
        await tf.setBackend('webgl');
        console.log('TensorFlow backend initialized:', tf.getBackend());
        
        // Start a new TensorFlow scope to better manage memory
        tf.engine().startScope();
        
        console.log('Initializing pose detector...');
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        };
        
        console.log('Creating detector with config:', detectorConfig);
        const detector = await poseDetection.createDetector(model, detectorConfig);
        console.log('Pose detector created successfully');
        
        // Only update state if component is still mounted
        if (isComponentMounted) {
          setDetector(detector);
          console.log('Pose detector state updated');
        } else {
          // If component unmounted during initialization, clean up the detector
          console.log('Component unmounted during initialization, cleaning up detector');
          // Clean up TensorFlow resources
          tf.engine().endScope();
        }
      } catch (error) {
        console.error('Error initializing pose detector:', error);
      }
    };
    
    console.log('Starting detector initialization...');
    initializeDetector();

    return () => {
      console.log('Cleaning up pose detector on unmount');
      isComponentMounted = false;
      
      // Clean up TensorFlow resources
      try {
        tf.engine().endScope();
        console.log('TensorFlow resources cleaned up');
      } catch (error) {
        console.error('Error cleaning up TensorFlow resources:', error);
      }
    };
  }, []);

  // Run pose detection
  useEffect(() => {
    console.log('Detection effect triggered, detector:', detector ? 'initialized' : 'not initialized', 'isDetecting:', isDetecting);
    
    if (!detector || !isDetecting || !webcamRef.current?.video) {
      console.log('Skipping detection loop - detector, isDetecting, or webcam not ready');
      return; // Only run when detector is initialized and isDetecting is true
    }
    
    // Reset the video stream when camera changes
    const video = webcamRef.current.video;
    if (video.srcObject) {
      const tracks = video.srcObject.getTracks();
      tracks.forEach(track => track.stop());
    }
    
    // Reset rep count when starting detection
    setRepCount(0);
    setCurrentPhase('neutral');
    setPhaseHistory([]);
    setIsRepComplete(false);
    setFeedback({ isCorrect: true, message: 'Get ready to start exercising...' });
    setAIFeedback('');
    resetFormIssuesHistory(); // Reset form issues history for OpenAI
    
    let animationFrameId = null;
    let confidenceThreshold = 0.3; // Higher threshold for better detection reliability
    let isActive = true; // Flag to track if component is still mounted
    let frameCount = 0; // Counter for frames processed
    
    // Function to periodically clean up TensorFlow memory
    const cleanupTensorFlowMemory = () => {
      try {
        // Clean up unused tensors every 100 frames
        tf.tidy(() => {});
        console.log('TensorFlow memory cleaned up, tensors:', tf.memory().numTensors);
      } catch (error) {
        console.error('Error cleaning up TensorFlow memory:', error);
      }
    };
    
    // Reset rep state for new detection session
    repStateRef.current = {
      currentState: 'START',
      angleBuffer: [],
      lastAngle: 0,
      repInProgress: false,
      exerciseType: exerciseData.exercise_id,
      lockedArm: null
    };
    let repState = repStateRef.current;

    const detect = async () => {
      try {
        // Check if component is still active before continuing
        if (!isActive) {
          console.log('Component is no longer active, stopping detection loop');
          return;
        }
        
        if (!detector) {
          console.log('Detector not initialized yet');
          animationFrameId = requestAnimationFrame(detect);
          return;
        }
        
        if (!webcamRef.current) {
          console.log('Webcam reference not available');
          animationFrameId = requestAnimationFrame(detect);
          return;
        }
        
        const video = webcamRef.current.video;
        if (!video || !video.readyState === 4) {
          console.log('Video not ready');
          animationFrameId = requestAnimationFrame(detect);
          return;
        }
        
        const canvas = canvasRef.current;
        if (!canvas) {
          console.log('Canvas reference not available');
          animationFrameId = requestAnimationFrame(detect);
          return;
        }
        
        // Match canvas dimensions to video
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
          canvas.width = videoWidth;
          canvas.height = videoHeight;
          console.log('Canvas dimensions updated to match video:', videoWidth, 'x', videoHeight);
        }
        
        // Detect poses
        console.log('Detecting poses...');
        const poses = await detector.estimatePoses(video);
        console.log('Poses detected:', poses.length);
        
        if (poses.length > 0) {
          const pose = poses[0]; // Use the first detected pose
          
          // Draw the pose on the canvas
          drawPose(pose, canvas);
          
          // Validate the pose for the current exercise
          validatePose(pose, exerciseData);
        }
        
        // Increment frame counter
        frameCount++;
        
        // Periodically clean up TensorFlow memory (every 100 frames)
        if (frameCount % 100 === 0) {
          cleanupTensorFlowMemory();
        }
        
        // Continue the detection loop only if component is still active
        if (isActive) {
          animationFrameId = requestAnimationFrame(detect);
        }
      } catch (error) {
        console.error('Error in pose detection loop:', error);
        // Continue the detection loop only if component is still active
        if (isActive) {
          animationFrameId = requestAnimationFrame(detect);
        }
      }
    };

    const validatePose = (pose, exerciseData) => {
      // Extract keypoints
      const keypoints = {};
      pose.keypoints.forEach(keypoint => {
        keypoints[keypoint.name] = keypoint;
      });
      
      // Determine required keypoints based on exercise type
      let requiredKeypoints = [];
      if (exerciseData.exercise_id === 'pushup1') {
        if (!repState.lockedArm) {
          repState.lockedArm = keypoints.left_elbow.score >= keypoints.right_elbow.score ? 'left' : 'right';
        }
        // For push-ups, we need shoulders, elbows, and wrists
        requiredKeypoints = [
          'left_shoulder', 'right_shoulder',
          'left_elbow', 'right_elbow',
          'left_wrist', 'right_wrist'
        ];
      } else if (exerciseData.exercise_id === 'squat1') {
        // For squats, we need hips, knees, and ankles
        requiredKeypoints = [
          'left_hip', 'right_hip',
          'left_knee', 'right_knee',
          'left_ankle', 'right_ankle'
        ];
      } else if (exerciseData.exercise_id === 'lunge1') {
        // For lunges, we need hips, knees, ankles and feet
        requiredKeypoints = [
          'left_hip', 'right_hip',
          'left_knee', 'right_knee',
          'left_ankle', 'right_ankle',
          'left_foot', 'right_foot'
        ];
      } else {
        // Default for other exercises
        requiredKeypoints = [
          'left_hip', 'right_hip',
          'left_knee', 'right_knee',
          'left_ankle', 'right_ankle'
        ];
      }
      
      // Check if all required keypoints are detected with sufficient confidence
      const missingKeypoints = requiredKeypoints.filter(name => {
        const keypoint = keypoints[name];
        return !keypoint || keypoint.score < confidenceThreshold;
      });
      
      if (missingKeypoints.length > 0) {
        console.log('Missing required keypoints:', missingKeypoints.join(', '));
        setFeedback({
          isCorrect: false,
          message: `Please ensure your ${missingKeypoints.map(k => k.split('_')[1]).join(' and ')} are visible`
        });
        return;
      }
      
      // Calculate primary angle based on exercise type
      let primaryAngle = 0;
      let secondaryAngle = 0;
      let phase = 'neutral';
      let isCorrect = true;
      let feedbackMessage = 'Good form!';
      
      // Calculate angles based on exercise type
      if (exerciseData.exercise_id === 'pushup1') {
        if (!repState.lockedArm) {
          repState.lockedArm = keypoints.left_elbow.score >= keypoints.right_elbow.score ? 'left' : 'right';
        }
        // For push-ups, calculate elbow angles
        const leftElbowAngle = calculateAngle(
          keypoints.left_shoulder,
          keypoints.left_elbow,
          keypoints.left_wrist
        );
        
        const rightElbowAngle = calculateAngle(
          keypoints.right_shoulder,
          keypoints.right_elbow,
          keypoints.right_wrist
        );
        
        // Use the better visible arm or average if both are visible
        if (repState.lockedArm === 'left') {
          primaryAngle = leftElbowAngle;
          console.log('Using left elbow angle:', Math.round(primaryAngle));
        } else if (repState.lockedArm === 'right') {
          primaryAngle = rightElbowAngle;
          console.log('Using right elbow angle:', Math.round(primaryAngle));
        } else {
          primaryAngle = (leftElbowAngle + rightElbowAngle) / 2;
          console.log('Using average elbow angle:', Math.round(primaryAngle));
        }
        
        // Calculate back angle as secondary angle
        secondaryAngle = calculateAngle(
          keypoints.left_shoulder,
          keypoints.left_hip,
          keypoints.left_knee
        );
      } else if (exerciseData.exercise_id === 'squat1') {
        // For squats, calculate knee and hip angles
        const leftKneeAngle = calculateAngle(
          keypoints.left_hip,
          keypoints.left_knee,
          keypoints.left_ankle
        );
        
        const rightKneeAngle = calculateAngle(
          keypoints.right_hip,
          keypoints.right_knee,
          keypoints.right_ankle
        );
        
        // Use the better visible leg or average if both are visible
        if (keypoints.left_knee.score > keypoints.right_knee.score) {
          primaryAngle = leftKneeAngle;
          console.log('Using left knee angle:', Math.round(primaryAngle));
        } else if (keypoints.right_knee.score > keypoints.left_knee.score) {
          primaryAngle = rightKneeAngle;
          console.log('Using right knee angle:', Math.round(primaryAngle));
        } else {
          primaryAngle = (leftKneeAngle + rightKneeAngle) / 2;
          console.log('Using average knee angle:', Math.round(primaryAngle));
        }
        
        // Calculate hip angle as secondary angle
        secondaryAngle = calculateAngle(
          keypoints.left_shoulder,
          keypoints.left_hip,
          keypoints.left_knee
        );
      } else if (exerciseData.exercise_id === 'lunge1') {
        // For lunges, calculate front knee angle
        const leftKneeAngle = calculateAngle(
          keypoints.left_hip,
          keypoints.left_knee,
          keypoints.left_ankle
        );
        
        const rightKneeAngle = calculateAngle(
          keypoints.right_hip,
          keypoints.right_knee,
          keypoints.right_ankle
        );
        
        // Use the better visible leg or average if both are visible
        if (keypoints.left_knee.score > keypoints.right_knee.score) {
          primaryAngle = leftKneeAngle;
          console.log('Using left knee angle for lunge:', Math.round(primaryAngle));
        } else {
          primaryAngle = rightKneeAngle;
          console.log('Using right knee angle for lunge:', Math.round(primaryAngle));
        }
        
        // Calculate back knee angle as secondary angle
        if (keypoints.left_knee.score > keypoints.right_knee.score) {
          secondaryAngle = rightKneeAngle;
        } else {
          secondaryAngle = leftKneeAngle;
        }
      } else {
        // Default to squat-like calculation for other exercises
        const leftKneeAngle = calculateAngle(
          keypoints.left_hip,
          keypoints.left_knee,
          keypoints.left_ankle
        );
        
        const rightKneeAngle = calculateAngle(
          keypoints.right_hip,
          keypoints.right_knee,
          keypoints.right_ankle
        );
        
        primaryAngle = (leftKneeAngle + rightKneeAngle) / 2;
        console.log('Using average knee angle:', Math.round(primaryAngle));
      }
      
      // Apply smoothing to the primary angle
      const smoothedPrimaryAngle = smoothAngle(primaryAngle, repState.angleBuffer, 5);
      
      // Use the state machine to determine phase and count reps
      const { newState, newPhase, repComplete } = repCountingStateMachine(
        repState.currentState,
        smoothedPrimaryAngle,
        pose.score,
        exerciseData.exercise_id
      );
      
      // Update rep state
      repState.currentState = newState;
      phase = newPhase;
      
      // Handle rep completion
      if (repComplete) {
        console.log('Completing rep - state machine transition');
        
        // Increment rep count
        setRepCount(prevCount => {
          const newCount = prevCount + 1;
          console.log('Incrementing rep count from', prevCount, 'to', newCount);
          return newCount;
        });
        
        // Set rep complete flag for UI and voice feedback
        setIsRepComplete(true);
        
        // Reset rep complete flag after 2 seconds
        setTimeout(() => {
          setIsRepComplete(false);
        }, 2000);
      }
      
      // Validate pose form using our utility function
      const validationResult = validatePoseForm(
        { primary: smoothedPrimaryAngle, secondary: secondaryAngle },
        EXERCISE_THRESHOLDS[exerciseData.exercise_id]?.elbow || EXERCISE_THRESHOLDS[exerciseData.exercise_id]?.knee || EXERCISE_THRESHOLDS[exerciseData.exercise_id],
        phase
      );
      
      isCorrect = validationResult.isCorrect;
      feedbackMessage = validationResult.message;
      
      // Add angle information to feedback message for debugging
      if (exerciseData.exercise_id === 'pushup1') {
        if (!repState.lockedArm) {
          repState.lockedArm = keypoints.left_elbow.score >= keypoints.right_elbow.score ? 'left' : 'right';
        }
        feedbackMessage += ` (elbow: ${Math.round(smoothedPrimaryAngle)}°)`;
      } else {
        feedbackMessage += ` (knee: ${Math.round(smoothedPrimaryAngle)}°)`;
      }
      
      // Update phase history for UI display
      setPhaseHistory(prev => {
        const newHistory = [...prev, phase].slice(-5); // Keep last 5 phases
        return newHistory;
      });
      
      // Reset state machine after completing a rep if needed
      if (repComplete) {
        // Reset state machine after completing a rep
        repState.currentState = 'START';
        repState.repInProgress = false;
        
        // Show completion message
        feedbackMessage = 'Great job! Rep completed!';
      }
      
      // Debug information
      if (repState && repState.angleBuffer && repState.angleBuffer.length > 0) {
        console.log(`Current angle: ${Math.round(repState.angleBuffer[repState.angleBuffer.length-1])}°, Phase: ${phase}, Reps: ${repCount}, State: ${repState.currentState}`);
      }

      setCurrentPhase(phase);
      setFeedback({ isCorrect, message: feedbackMessage });
      
      // Get AI feedback if enabled and not too frequent
      if (pose) {
        const now = Date.now();
        // Only request AI feedback every 3 seconds to avoid excessive API calls
        if (now - lastAIRequestTime > 3000) {
          console.log('Triggering AI feedback request');
          setLastAIRequestTime(now);
          getAIFeedback(pose, phase, isCorrect, feedbackMessage);
        }
      } else {
        console.log('No pose data available for AI feedback');
        setAIFeedback('Waiting for pose detection...');
      }
    };

    const drawPose = (pose, canvas) => {
      console.log('Drawing pose on canvas');
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw debug info
      ctx.fillStyle = 'white';
      ctx.font = '16px Arial';
      ctx.fillText(`Phase: ${currentPhase}`, 10, 20);
      ctx.fillText(`Reps: ${repCount}`, 10, 40);

      // Draw keypoints
      pose.keypoints.forEach(keypoint => {
        if (keypoint.score > confidenceThreshold) {
          // Make important joints more visible
          const isImportantJoint = ['left_knee', 'right_knee', 'left_hip', 'right_hip', 'left_ankle', 'right_ankle'].includes(keypoint.name);
          const radius = isImportantJoint ? 8 : 5;
          
          ctx.beginPath();
          ctx.arc(keypoint.x, keypoint.y, radius, 0, 2 * Math.PI);
          
          // Color based on joint importance, form correctness, and phase
          if (isImportantJoint) {
            if (currentPhase === 'down') {
              ctx.fillStyle = feedback.isCorrect ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
            } else if (currentPhase === 'up') {
              ctx.fillStyle = feedback.isCorrect ? 'rgba(0, 0, 255, 0.9)' : 'rgba(255, 0, 0, 0.9)';
            } else if (currentPhase === 'going_down') {
              ctx.fillStyle = feedback.isCorrect ? 'rgba(255, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
            } else if (currentPhase === 'going_up') {
              ctx.fillStyle = feedback.isCorrect ? 'rgba(255, 165, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
            } else {
              ctx.fillStyle = feedback.isCorrect ? '#00cc00' : '#ff3333';
            }
          } else {
            ctx.fillStyle = feedback.isCorrect ? '#33cc33' : '#ff6666';
          }
          
          ctx.fill();
          
          // Add joint labels for important joints
          if (isImportantJoint) {
            ctx.fillStyle = 'white';
            ctx.font = '14px Arial';
            ctx.fillText(keypoint.name.split('_')[1], keypoint.x + 10, keypoint.y);
          }
        }
      });
      
      // Draw skeleton
      if (pose.keypoints3D && pose.keypoints3D.length > 0) {
        // Draw 3D skeleton if available
        // Implementation depends on the specific 3D visualization needs
      } else {
        // Draw 2D skeleton
        const connections = [
          ['nose', 'left_eye'], ['nose', 'right_eye'],
          ['left_eye', 'left_ear'], ['right_eye', 'right_ear'],
          ['nose', 'left_shoulder'], ['nose', 'right_shoulder'],
          ['left_shoulder', 'left_elbow'], ['right_shoulder', 'right_elbow'],
          ['left_elbow', 'left_wrist'], ['right_elbow', 'right_wrist'],
          ['left_shoulder', 'left_hip'], ['right_shoulder', 'right_hip'],
          ['left_hip', 'left_knee'], ['right_hip', 'right_knee'],
          ['left_knee', 'left_ankle'], ['right_knee', 'right_ankle'],
          ['left_shoulder', 'right_shoulder'], ['left_hip', 'right_hip']
        ];
        
        connections.forEach(([p1, p2]) => {
          const point1 = pose.keypoints.find(kp => kp.name === p1);
          const point2 = pose.keypoints.find(kp => kp.name === p2);
          
          if (point1 && point2 && point1.score > confidenceThreshold && point2.score > confidenceThreshold) {
            ctx.beginPath();
            ctx.moveTo(point1.x, point1.y);
            ctx.lineTo(point2.x, point2.y);
            ctx.lineWidth = 2;
            
            // Color based on phase and correctness
            if (currentPhase === 'down') {
              ctx.strokeStyle = feedback.isCorrect ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
            } else if (currentPhase === 'up') {
              ctx.strokeStyle = feedback.isCorrect ? 'rgba(0, 0, 255, 0.9)' : 'rgba(255, 0, 0, 0.9)';
            } else if (currentPhase === 'going_down') {
              ctx.strokeStyle = feedback.isCorrect ? 'rgba(255, 255, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
            } else if (currentPhase === 'going_up') {
              ctx.strokeStyle = feedback.isCorrect ? 'rgba(255, 165, 0, 0.9)' : 'rgba(255, 0, 0, 0.9)';
            } else {
              ctx.strokeStyle = feedback.isCorrect ? '#00cc00' : '#ff3333';
            }
          } else {
            ctx.strokeStyle = feedback.isCorrect ? '#33cc33' : '#ff6666';
          }
          
          ctx.stroke();
        });
      }
      
      console.log('Pose drawing complete');
    };

    console.log('Starting detection loop');
    detect();

    return () => {
      console.log('Cleaning up detection loop');
      isActive = false; // Mark component as inactive
      
      // Cancel any pending animation frame
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      // Release TensorFlow memory
      if (detector) {
        try {
          console.log('Releasing TensorFlow resources');
          // Force garbage collection for TensorFlow resources
          tf.engine().endScope();
          tf.engine().disposeVariables();
        } catch (error) {
          console.error('Error releasing TensorFlow resources:', error);
        }
      }
    };
  }, [
    detector,
    exercise,
    isDetecting,
    isOpenAIEnabled,
    voiceFeedbackEnabled,
    facingMode,
    currentPhase,
    exerciseData,
    feedback.isCorrect,
    getAIFeedback,
    lastAIRequestTime,
    repCount
  ]);

  // Function to get AI feedback from OpenAI
  const getAIFeedback = useCallback(async (pose, phase, isCorrect, currentFeedbackMsg) => {
    try {
      if (!pose || !isOpenAIEnabled) {
        console.log('AI feedback skipped: No pose data available or OpenAI disabled');
        setAIFeedback('Waiting for pose detection...');
        return;
      }
      
      const now = Date.now();
      // Increase debounce time to 10 seconds to reduce API calls
      if (now - lastAIRequestTime < 10000) {
        console.log('Skipping AI feedback request - too soon since last request');
        return; // Limit to once every 10 seconds
      }
      
      // Only make requests when there's a significant event (rep completion or form error)
      const shouldRequestFeedback = isRepComplete || !isCorrect;
      if (!shouldRequestFeedback) {
        console.log('Skipping AI feedback - no significant event detected');
        return;
      }
      
      console.log('Requesting AI feedback for phase:', phase, 'Exercise:', exerciseData.name);
      console.log('OpenAI enabled:', isOpenAIEnabled);
      console.log('Pose data sample:', { 
        keypoints: pose.keypoints.length, 
        sampleKeypoint: pose.keypoints[0] 
      });
      
      setLastAIRequestTime(now);
      
      const aiResponse = await getPoseFeedback(
        exerciseData,
        phase,
        pose,
        isCorrect,
        currentFeedbackMsg
      );
      
      console.log('AI feedback received:', aiResponse);
      setAIFeedback(aiResponse);
    } catch (error) {
      console.error('Error getting AI feedback:', error);
      setAIFeedback('Error getting AI feedback: ' + error.message);
    }
  }, [exerciseData, isOpenAIEnabled, isRepComplete, lastAIRequestTime]);

  // Early return if no exercise is provided
  if (!exercise) {
    return (
      <div className="error-message" style={{ padding: '20px', textAlign: 'center', color: 'red' }}>
        <h2>Error: No exercise selected</h2>
        <button onClick={onBack} className="back-button">Go Back</button>
      </div>
    );
  }

  return (
    <div className="pose-detector">
      <div className="controls" style={{ backgroundColor: '#f0f8ff', padding: '15px', borderRadius: '8px', marginBottom: '20px', boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
        <button onClick={onBack} style={{ marginRight: '15px', padding: '8px 15px', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Back</button>
        <h2 style={{ fontWeight: 'bold', fontSize: '2em', color: '#007bff', display: 'inline-block', margin: '10px 0', textShadow: '1px 1px 2px rgba(0,0,0,0.1)' }}>{exerciseData.name || 'Not selected'}</h2>
        <button 
          onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
          style={{ 
            marginLeft: '15px', 
            padding: '8px 15px', 
            backgroundColor: '#28a745', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px', 
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span role="img" aria-label="camera">📷</span>
          Switch Camera ({facingMode === 'user' ? 'Front' : 'Back'})
        </button>
      </div>
      <div className="detection-area">
        <div className="webcam-container">
          <Webcam
            ref={webcamRef}
            style={{
              position: 'absolute',
              marginLeft: 'auto',
              marginRight: 'auto',
              left: 0,
              right: 0,
              textAlign: 'center',
              zIndex: 9,
              width: 640,
              height: 480,
            }}
            audio={false}
            mirrored={facingMode === 'user'}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 640,
              height: 480,
              facingMode: facingMode,
              frameRate: { ideal: 30 }
            }}
            onUserMedia={(stream) => {
              console.log('Webcam access granted');
              console.log('Video tracks:', stream.getVideoTracks().length);
              const videoTrack = stream.getVideoTracks()[0];
              if (videoTrack) {
                console.log('Video track settings:', videoTrack.getSettings());
              }
            }}
            onUserMediaError={(error) => console.error('Webcam access error:', error)}
          />
          <canvas
            ref={canvasRef}
            style={{
              position: 'absolute',
              marginLeft: 'auto',
              marginRight: 'auto',
              left: 0,
              right: 0,
              textAlign: 'center',
              zIndex: 9,
              width: 640,
              height: 480,
            }}
          />
        </div>

        <div className="feedback-container" style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', margin: '20px 0' }}>
            <h3 style={{ fontWeight: 'bold', fontSize: '2em', color: '#ecf0f1', marginBottom: '15px', textAlign: 'center', padding: '15px', backgroundColor: '#2c3e50', borderRadius: '8px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', border: '2px solid #3498db' }}>Exercise: {exerciseData.name || 'Not selected'}</h3>
            <div className={`feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`} style={{ margin: '15px 0', padding: '10px', backgroundColor: '#fff', borderRadius: '6px', border: '1px solid #dee2e6' }}>
               <p>{feedback.message}</p>
             </div>
             <div className="ai-feedback" style={{
                backgroundColor: '#34495e',
                padding: '15px',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
                margin: '10px 0',
                border: '2px solid #3498db'
              }}>
                <h3 style={{ 
                  fontSize: '20px', 
                  margin: '0 0 10px 0', 
                  color: '#ecf0f1',
                  fontWeight: 'bold'
                }}>AI Voice Feedback:</h3>
                <p style={{ 
                  fontSize: '16px', 
                  margin: '0', 
                  color: '#ecf0f1',
                  fontWeight: '500'
                }}>{aiFeedback || 'Analyzing your form...'}</p>
              </div>
             <div className="stats" style={{ backgroundColor: '#e9ecef', padding: '15px', borderRadius: '8px', margin: '20px 0', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
               <div className="rep-counter" style={{ fontWeight: 'bold', fontSize: '2.2em', margin: '0', color: '#ffffff', backgroundColor: '#2980b9', padding: '15px 25px', borderRadius: '30px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', textAlign: 'center', display: 'inline-block', border: '2px solid #3498db', animation: isRepComplete ? 'pulse 1s' : 'none' }}>
                 <p className="rep-count" style={{ margin: '0' }}>Reps: {repCount}</p>
                 {isRepComplete && (
                   <div className="rep-complete-indicator" style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: '1.2em', animation: 'pulse 1s infinite', marginTop: '5px' }}>
                     Rep Complete! ✓
                   </div>
                 )}
               </div>
            
            <div className="phase-indicator" style={{ backgroundColor: '#fff3cd', padding: '15px', borderRadius: '8px', margin: '20px 0', border: '1px solid #ffeeba', boxShadow: '0 2px 6px rgba(0,0,0,0.1)' }}>
              <p className="current-phase" style={{ fontSize: '1.3em', fontWeight: 'bold', margin: '0', color: '#856404' }}>Current Phase: 
                <span className={`phase ${currentPhase}`} style={{ 
                  display: 'inline-block', 
                  marginLeft: '10px', 
                  padding: '5px 15px', 
                  borderRadius: '20px', 
                  backgroundColor: currentPhase === 'up' ? '#d4edda' : 
                                   currentPhase === 'down' ? '#f8d7da' : 
                                   currentPhase === 'going_up' ? '#cce5ff' : 
                                   currentPhase === 'going_down' ? '#fff3cd' : '#e2e3e5',
                  color: currentPhase === 'up' ? '#155724' : 
                         currentPhase === 'down' ? '#721c24' : 
                         currentPhase === 'going_up' ? '#004085' : 
                         currentPhase === 'going_down' ? '#856404' : '#383d41',
                  fontWeight: 'bold'
                }}>
                  {currentPhase === 'going_up' ? 'Rising' : 
                   currentPhase === 'going_down' ? 'Lowering' : 
                   currentPhase || 'neutral'}
                </span>
              </p>
            </div>
            
            {/* Phase history visualization */}
            <div className="phase-history" style={{ backgroundColor: '#34495e', padding: '15px', borderRadius: '8px', margin: '20px 0', border: '2px solid #3498db', boxShadow: '0 4px 8px rgba(0,0,0,0.2)' }}>
              <p style={{ fontSize: '1.3em', fontWeight: 'bold', marginBottom: '10px', color: '#ecf0f1' }}>Movement Sequence:</p>
              <div className="phase-dots" style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
                {phaseHistory.map((phase, index) => (
                  <span 
                    key={index} 
                    className={`phase-dot ${phase}`}
                    style={{
                      display: 'inline-block',
                      width: '35px',
                      height: '35px',
                      lineHeight: '35px',
                      textAlign: 'center',
                      borderRadius: '50%',
                      backgroundColor: phase === 'up' ? '#2ecc71' : 
                                       phase === 'down' ? '#e74c3c' : 
                                       phase === 'going_up' ? '#3498db' : 
                                       phase === 'going_down' ? '#f39c12' : '#95a5a6',
                      boxShadow: '0 3px 6px rgba(0,0,0,0.3)',
                      transition: 'all 0.3s ease',
                      color: '#fff',
                      fontWeight: 'bold'
                    }}
                    title={phase === 'going_up' ? 'Rising' : 
                           phase === 'going_down' ? 'Lowering' : phase}
                  >
                    {phase.charAt(0).toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
            
            <div className="exercise-progress" style={{ backgroundColor: '#34495e', padding: '15px', borderRadius: '8px', margin: '20px 0', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', border: '2px solid #3498db' }}>
              <p style={{ fontSize: '1.2em', fontWeight: 'bold', marginBottom: '10px', color: '#ecf0f1' }}>Progress:</p>
              <div className="progress-bar" style={{ height: '25px', backgroundColor: '#2c3e50', borderRadius: '15px', overflow: 'hidden', boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.2)' }}>
                <div 
                  className={`progress-indicator ${currentPhase}`}
                  style={{
                    width: currentPhase === 'up' ? '100%' : 
                           currentPhase === 'going_up' ? '75%' : 
                           currentPhase === 'going_down' ? '25%' : 
                           currentPhase === 'down' ? '0%' : '50%',
                    height: '100%',
                    backgroundColor: currentPhase === 'up' ? '#2ecc71' : 
                                     currentPhase === 'going_up' ? '#3498db' : 
                                     currentPhase === 'going_down' ? '#f39c12' : 
                                     currentPhase === 'down' ? '#e74c3c' : '#95a5a6',
                    transition: 'width 0.3s ease-in-out',
                    borderRadius: '15px',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Voice feedback component */}
      {voiceFeedbackEnabled && isOpenAIEnabled && (
        <VoiceFeedback 
          feedback={aiFeedback} 
          enabled={voiceFeedbackEnabled && isDetecting}
          formError={!feedback.isCorrect}
          repComplete={isRepComplete}
        />
      )}
    </div>
  );
};

export default PoseDetector;