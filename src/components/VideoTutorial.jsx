import React, { useEffect, useMemo } from 'react';

const VideoTutorial = ({ exerciseId }) => {
  // Map exercise IDs to video file paths using useMemo
  const videoMap = useMemo(() => ({
    'pushup1': '/src/videos/pushup.mp4',
    'squat1': '/src/videos/squat.mp4',
    'lunge1': '/src/videos/lunge.mp4',
    'plank1': '/src/videos/plank.mp4',
    'pullup1': '/src/videos/pullup.mp4'
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

  const videoSrc = videoMap[exerciseId] || '';
  console.log('Video source path:', videoSrc);

  if (!videoSrc) {
    console.log('No video source found for exerciseId:', exerciseId);
    return <div className="video-tutorial-placeholder">No tutorial video available for {exerciseId}</div>;
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