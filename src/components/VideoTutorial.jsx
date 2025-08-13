import React, { useEffect, useMemo } from 'react';
import pushupVideo from '../videos/pushup.mp4';
import squatVideo from '../videos/squat.mp4';
import lungeVideo from '../videos/lunge.mp4';
import plankVideo from '../videos/plank.mp4';
import pullupVideo from '../videos/pullup.mp4';

const VideoTutorial = ({ exerciseId }) => {
  // Map exercise IDs to video file paths using useMemo
  const videoMap = useMemo(() => ({
    'pushup1': pushupVideo,
    'squat1': squatVideo,
    'lunge1': lungeVideo,
    'plank1': plankVideo,
    'pullup1': pullupVideo
  }), []); // Empty dependency array since the map never changes

  useEffect(() => {
    console.log('Exercise ID:', exerciseId);
    console.log('Video source:', videoMap[exerciseId]);
    
    // Check if the video file exists
    if (videoMap[exerciseId]) {
      const videoElement = document.createElement('video');
      videoElement.src = videoMap[exerciseId];
      videoElement.onloadeddata = () => {
        console.log('Video loaded successfully:', videoMap[exerciseId]);
      };
      videoElement.onerror = (e) => {
        console.error('Error loading video:', e);
      };
    }
  }, [exerciseId, videoMap]);

  // Try to get video source using either exercise ID format
  const videoSrc = videoMap[exerciseId] || '';
  console.log('Video source path:', videoSrc);
  console.log('Trying to load video for exerciseId:', exerciseId);

  if (!videoSrc) {
    console.warn('No video source found for exerciseId:', exerciseId);
    return <div className="video-tutorial-placeholder">Tutorial video coming soon...</div>;
  }

  return (
    <div className="video-tutorial">
      <h3>Exercise Tutorial</h3>
      <video 
        src={videoSrc} 
        controls 
        width="100%" 
        height="auto"
        onError={(e) => console.error('Video error:', e)}
        onLoadedData={() => console.log('Video loaded successfully')}
      >
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

export default VideoTutorial;