import React, { useRef, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import * as poseDetection from '@tensorflow-models/pose-detection';
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-webgl';
import { calculateAngle } from '../utils/poseUtils';

const PoseDetector = ({ exercise, onBack, isDetecting }) => {
  console.log('PoseDetector rendered with exercise:', exercise, 'isDetecting:', isDetecting);
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  
  const [detector, setDetector] = useState(null);
  const [repCount, setRepCount] = useState(0);
  const [currentPhase, setCurrentPhase] = useState('');
  const [feedback, setFeedback] = useState({ isCorrect: true, message: 'Get ready...' });
  const [phaseHistory, setPhaseHistory] = useState([]);
  const [isRepComplete, setIsRepComplete] = useState(false);

  // Initialize the pose detector
  useEffect(() => {
    const initializeDetector = async () => {
      try {
        console.log('Setting up TensorFlow.js backend...');
        await tf.ready();
        await tf.setBackend('webgl');
        console.log('TensorFlow backend initialized:', tf.getBackend());
        
        console.log('Initializing pose detector...');
        const model = poseDetection.SupportedModels.MoveNet;
        const detectorConfig = {
          modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
          enableSmoothing: true,
        };
        
        console.log('Creating detector with config:', detectorConfig);
        const detector = await poseDetection.createDetector(model, detectorConfig);
        console.log('Pose detector created successfully');
          
          setDetector(detector);
          console.log('Pose detector state updated');
        } catch (error) {
          console.error('Error initializing pose detector:', error);
        }
    };
    console.log('Starting detector initialization...');
    initializeDetector();

    return () => {
      console.log('Cleaning up pose detector');
      // Remove setIsDetecting since it's not defined
    };
  }, []);

  // Run pose detection
  useEffect(() => {
    console.log('Detection effect triggered, detector:', detector ? 'initialized' : 'not initialized', 'isDetecting:', isDetecting);
    
    if (!detector || !isDetecting) {
      console.log('Skipping detection loop - detector or isDetecting not ready');
      return; // Only run when detector is initialized and isDetecting is true
    }
    
    let animationFrameId;
    let lastPhase = 'neutral';
    let phaseSequence = [];
    let repInProgress = false;
    let confidenceThreshold = 0.3; // Lower threshold for better detection
    let frameCount = 0;
    let lastKneeAngle = 0;
    let kneeAngleBuffer = [];
    const bufferSize = 3; // Smaller buffer for more responsive detection

    const detect = async () => {
      try {
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
        
        if (!canvasRef.current) {
          console.log('Canvas reference not available');
          animationFrameId = requestAnimationFrame(detect);
          return;
        }

        // Get video properties
        const video = webcamRef.current.video;
        
        if (!video || !video.readyState || video.readyState < 2) {
          console.log('Video not ready yet, readyState:', video ? video.readyState : 'no video');
          animationFrameId = requestAnimationFrame(detect);
          return;
        }
        
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        
        if (videoWidth === 0 || videoHeight === 0) {
          console.log('Video dimensions not available yet:', videoWidth, 'x', videoHeight);
          animationFrameId = requestAnimationFrame(detect);
          return;
        }

        // Set canvas dimensions
        canvasRef.current.width = videoWidth;
        canvasRef.current.height = videoHeight;

        // Make detection
        console.log('Estimating poses...');
        const poses = await detector.estimatePoses(video);
        console.log('Poses detected:', poses.length);

        if (poses.length > 0) {
          const pose = poses[0];
          drawPose(pose, canvasRef.current);
          validatePose(pose);
        } else {
          console.log('No poses detected');
        }
      } catch (error) {
        console.error('Error in pose detection:', error);
      }

      animationFrameId = requestAnimationFrame(detect);
    };

    const validatePose = (pose) => {
      if (!exercise || !pose.keypoints) return;

      // Extract keypoints with confidence check
      const keypoints = {};
      pose.keypoints.forEach(keypoint => {
        if (keypoint.score > confidenceThreshold) {
          keypoints[keypoint.name] = keypoint;
        }
      });
      
      // Check if we have enough keypoints for analysis
      const requiredKeypoints = ['left_hip', 'right_hip', 'left_knee', 'right_knee', 'left_ankle', 'right_ankle'];
      const hasRequiredKeypoints = requiredKeypoints.some(name => 
        keypoints['left_' + name.split('_')[1]] || keypoints['right_' + name.split('_')[1]]
      );
      
      console.log('Has required keypoints:', hasRequiredKeypoints);
      
      if (!hasRequiredKeypoints) {
        setCurrentPhase('neutral');
        return;
      }

      // Determine current phase based on joint angles
      let phase = 'neutral';
      let isCorrect = true;
      let feedbackMessage = 'Get ready to start...';

      // Example for squat validation
      if (exercise && exercise.exercise_id === 'squat1') {
        console.log('Validating squat exercise');
        // Calculate knee angles for both legs if available
        let leftKneeAngle = 0;
        let rightKneeAngle = 0;
        
        if (keypoints['left_hip'] && keypoints['left_knee'] && keypoints['left_ankle']) {
          leftKneeAngle = calculateAngle(
            keypoints['left_hip'],
            keypoints['left_knee'],
            keypoints['left_ankle']
          );
          console.log('Left knee angle:', Math.round(leftKneeAngle));
        }
        
        if (keypoints['right_hip'] && keypoints['right_knee'] && keypoints['right_ankle']) {
          rightKneeAngle = calculateAngle(
            keypoints['right_hip'],
            keypoints['right_knee'],
            keypoints['right_ankle']
          );
          console.log('Right knee angle:', Math.round(rightKneeAngle));
        }
        
        // Use the knee with better visibility or average if both are visible
        let kneeAngle = 0;
        if (leftKneeAngle > 0 && rightKneeAngle > 0) {
          kneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
          console.log('Using average knee angle:', Math.round(kneeAngle));
        } else if (leftKneeAngle > 0) {
          kneeAngle = leftKneeAngle;
          console.log('Using left knee angle:', Math.round(kneeAngle));
        } else if (rightKneeAngle > 0) {
          kneeAngle = rightKneeAngle;
          console.log('Using right knee angle:', Math.round(kneeAngle));
        }
        
        // Apply smoothing to knee angle
        if (kneeAngle > 0) {
          kneeAngleBuffer.push(kneeAngle);
          if (kneeAngleBuffer.length > bufferSize) {
            kneeAngleBuffer.shift();
          }
          console.log('Added angle to buffer, buffer size:', kneeAngleBuffer.length);
        }
        
        // Calculate smoothed angle
        const smoothedKneeAngle = kneeAngleBuffer.length > 0 ? 
          kneeAngleBuffer.reduce((sum, angle) => sum + angle, 0) / kneeAngleBuffer.length : 0;
        
        // Calculate hip angle
        let hipAngle = 0;
        if ((keypoints['left_shoulder'] || keypoints['right_shoulder']) && 
            (keypoints['left_hip'] || keypoints['right_hip']) && 
            (keypoints['left_knee'] || keypoints['right_knee'])) {
          hipAngle = calculateAngle(
            keypoints['left_shoulder'] || keypoints['right_shoulder'],
            keypoints['left_hip'] || keypoints['right_hip'],
            keypoints['left_knee'] || keypoints['right_knee']
          );
          console.log('Hip angle:', Math.round(hipAngle));
        }

        // Only proceed if we have valid knee angle measurements
        if (smoothedKneeAngle > 0) {
          // Detect movement direction by comparing with previous frame
          const kneeAngleDelta = smoothedKneeAngle - lastKneeAngle;
          lastKneeAngle = smoothedKneeAngle;
          
          console.log('Smoothed knee angle:', Math.round(smoothedKneeAngle), 'Delta:', Math.round(kneeAngleDelta));
          
          // SIMPLIFIED PHASE DETECTION
          // Determine phase based on angle thresholds with more lenient values
          if (smoothedKneeAngle < 100) { // Deep squat position - even more lenient threshold
            phase = 'down';
            feedbackMessage = `In DOWN position (knee: ${Math.round(smoothedKneeAngle)}°)`;
            
            // Validate against canonical data
            const kneeExpected = exercise.phases.find(p => p.phase === 'down')?.angles.find(a => a.joint === 'knee');
            const hipExpected = exercise.phases.find(p => p.phase === 'down')?.angles.find(a => a.joint === 'hip');
            
            if (kneeExpected && Math.abs(smoothedKneeAngle - kneeExpected.expected) > kneeExpected.tolerance) {
              isCorrect = false;
              feedbackMessage = `Adjust your knee angle (current: ${Math.round(smoothedKneeAngle)}°, target: ${kneeExpected.expected}°)`;
            }
            
            if (hipExpected && hipAngle > 0 && Math.abs(hipAngle - hipExpected.expected) > hipExpected.tolerance) {
              isCorrect = false;
              feedbackMessage = 'Adjust your hip position';
            }
          } else if (smoothedKneeAngle > 160) { // Standing position - more lenient threshold
            phase = 'up';
            feedbackMessage = `In UP position (knee: ${Math.round(smoothedKneeAngle)}°)`;
            
            // Validate against canonical data
            const kneeExpected = exercise.phases.find(p => p.phase === 'up')?.angles.find(a => a.joint === 'knee');
            const hipExpected = exercise.phases.find(p => p.phase === 'up')?.angles.find(a => a.joint === 'hip');
            
            if (kneeExpected && Math.abs(smoothedKneeAngle - kneeExpected.expected) > kneeExpected.tolerance) {
              isCorrect = false;
              feedbackMessage = `Straighten your legs more (current: ${Math.round(smoothedKneeAngle)}°, target: ${kneeExpected.expected}°)`;
            }
            
            if (hipExpected && hipAngle > 0 && Math.abs(hipAngle - hipExpected.expected) > hipExpected.tolerance) {
              isCorrect = false;
              feedbackMessage = 'Stand up straighter';
            }
          } else {
            // In transition between up and down - simplified detection with lower threshold
            const threshold = 2; // Lower threshold for more responsive detection
            if (Math.abs(kneeAngleDelta) > threshold) {
              phase = kneeAngleDelta < -threshold ? 'going_down' : 'going_up';
              feedbackMessage = phase === 'going_down' ? 
                `Lowering (knee: ${Math.round(smoothedKneeAngle)}°)` : 
                `Rising (knee: ${Math.round(smoothedKneeAngle)}°)`;
              console.log('Movement detected:', phase, 'with delta:', Math.round(kneeAngleDelta));
            } else {
              // Not enough movement to determine direction
              phase = lastPhase !== 'neutral' ? lastPhase : 'neutral';
              feedbackMessage = `Hold steady (knee: ${Math.round(smoothedKneeAngle)}°)`;
            }
          }
        } else {
          feedbackMessage = 'Position yourself in camera view';
        }

        // Track phase changes for rep counting
        if (phase !== lastPhase) {
          console.log(`Phase changed from ${lastPhase} to ${phase}`);
          phaseSequence.push(phase);
          
          // Update phase history for UI display
          setPhaseHistory(prev => {
            const newHistory = [...prev, phase].slice(-5); // Keep last 5 phases
            return newHistory;
          });
          
          // Start tracking a rep when user enters going_down or down phase
          if ((phase === 'down' || phase === 'going_down') && !repInProgress) {
            console.log('Starting rep - movement detected');
            repInProgress = true;
            setIsRepComplete(false);
          }
          
          // Complete a rep when user goes from down/going_up to up phase
          if ((lastPhase === 'down' || lastPhase === 'going_up') && phase === 'up' && repInProgress) {
            console.log('Completing rep - reached UP phase');
            setRepCount(prev => prev + 1);
            repInProgress = false;
            setIsRepComplete(true);
            
            // Reset phase sequence after completing a rep
            phaseSequence = [];
            
            // Show completion message
            feedbackMessage = 'Great job! Rep completed!';
          }
        }
        
        // Debug information
        frameCount++;
        if (frameCount % 5 === 0) { // Log more frequently for better debugging
          console.log(`Current knee angle: ${Math.round(smoothedKneeAngle)}°, Phase: ${phase}, Reps: ${repCount}, RepInProgress: ${repInProgress}`);
        }
      }

      lastPhase = phase;
      setCurrentPhase(phase);
      setFeedback({ isCorrect, message: feedbackMessage });
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
            
            // Add confidence score for debugging
            ctx.font = '12px Arial';
            ctx.fillText(`${(keypoint.score * 100).toFixed(0)}%`, keypoint.x + 10, keypoint.y + 15);
          }
        }
      });

      // Draw skeleton with thicker lines for leg connections
      const connections = [
        ['nose', 'left_eye'], ['left_eye', 'left_ear'], ['nose', 'right_eye'],
        ['right_eye', 'right_ear'], ['nose', 'left_shoulder'], ['nose', 'right_shoulder'],
        ['left_shoulder', 'left_elbow'], ['left_elbow', 'left_wrist'],
        ['right_shoulder', 'right_elbow'], ['right_elbow', 'right_wrist'],
        ['left_shoulder', 'right_shoulder'], ['left_shoulder', 'left_hip'],
        ['right_shoulder', 'right_hip'], ['left_hip', 'right_hip'],
        ['left_hip', 'left_knee'], ['left_knee', 'left_ankle'],
        ['right_hip', 'right_knee'], ['right_knee', 'right_ankle']
      ];

      const keypointMap = {};
      pose.keypoints.forEach(keypoint => {
        keypointMap[keypoint.name] = keypoint;
      });

      connections.forEach(([start, end]) => {
        const startPoint = keypointMap[start];
        const endPoint = keypointMap[end];

        if (startPoint && endPoint && startPoint.score > confidenceThreshold && endPoint.score > confidenceThreshold) {
          // Check if this is a leg connection
          const isLegConnection = (
            (start.includes('hip') && end.includes('knee')) ||
            (start.includes('knee') && end.includes('ankle'))
          );
          
          ctx.beginPath();
          ctx.moveTo(startPoint.x, startPoint.y);
          ctx.lineTo(endPoint.x, endPoint.y);
          ctx.lineWidth = isLegConnection ? 4 : 2;
          
          // Highlight leg connections with brighter colors based on phase
          if (isLegConnection) {
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
        }
      });
      
      console.log('Pose drawing complete');
    };

    console.log('Starting detection loop');
    detect();

    return () => {
      console.log('Cleaning up detection loop');
      cancelAnimationFrame(animationFrameId);
    };
  }, [detector, exercise, isDetecting]);

  return (
    <div className="pose-detector">
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
          mirrored={true}
          screenshotFormat="image/jpeg"
          videoConstraints={{
            width: 640,
            height: 480,
            facingMode: 'user',
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

      <div className="feedback-container">
        <h2>{exercise?.name || 'Exercise'}</h2>
        <div className={`feedback ${feedback.isCorrect ? 'correct' : 'incorrect'}`}>
          <p>{feedback.message}</p>
        </div>
        <div className="stats">
          <div className="rep-counter">
            <p className="rep-count">Reps: {repCount}</p>
            {isRepComplete && (
              <div className="rep-complete-indicator">
                Rep Complete! ✓
              </div>
            )}
          </div>
          
          <div className="phase-indicator">
            <p className="current-phase">Current Phase: 
              <span className={`phase ${currentPhase}`}>
                {currentPhase === 'going_up' ? 'Rising' : 
                 currentPhase === 'going_down' ? 'Lowering' : 
                 currentPhase || 'neutral'}
              </span>
            </p>
          </div>
          
          {/* Phase history visualization */}
          <div className="phase-history">
            <p>Movement Sequence:</p>
            <div className="phase-dots">
              {phaseHistory.map((phase, index) => (
                <span 
                  key={index} 
                  className={`phase-dot ${phase}`}
                  title={phase === 'going_up' ? 'Rising' : 
                         phase === 'going_down' ? 'Lowering' : phase}
                ></span>
              ))}
            </div>
          </div>
          
          <div className="exercise-progress">
            <p>Progress:</p>
            <div className="progress-bar">
              <div 
                className={`progress-indicator ${currentPhase}`}
                style={{
                  width: currentPhase === 'up' ? '100%' : 
                         currentPhase === 'going_up' ? '75%' : 
                         currentPhase === 'going_down' ? '25%' : 
                         currentPhase === 'down' ? '0%' : '50%'
                }}
              ></div>
            </div>
          </div>
        </div>
        <button className="back-button" onClick={onBack}>
          Back to Exercises
        </button>
      </div>
    </div>
  );
};

export default PoseDetector;