import React from 'react';
import OpenAITester from '../components/OpenAITester';
import { Link } from 'react-router-dom';

const TestOpenAI = () => {
  return (
    <div className="test-openai-page">
      <div className="header">
        <h1>OpenAI Connection Test</h1>
        <Link to="/" className="back-link">Back to Main App</Link>
      </div>
      
      <div className="content">
        <p className="intro">
          This page helps you test your OpenAI API connection to ensure AI feedback and voice functionality work correctly.
        </p>
        
        <OpenAITester />
        
        <div className="help-section">
          <h2>Troubleshooting</h2>
          <ul>
            <li>Make sure you have a <code>.env</code> file in the root directory</li>
            <li>Ensure your API key is formatted as <code>VITE_OPENAI_API_KEY=sk-your_key_here</code> (no quotes or spaces)</li>
            <li>Your API key should start with <code>sk-</code> (not <code>sk-proj-</code>)</li>
            <li>Check that you've restarted the development server after creating/updating the .env file</li>
            <li>Verify that your OpenAI API key is valid and has not expired</li>
            <li>Check the <code>OPENAI_SETUP_GUIDE.md</code> file for detailed instructions</li>
          </ul>
        </div>
      </div>
      
      <style jsx>{`
        .test-openai-page {
          max-width: 800px;
          margin: 0 auto;
          padding: 20px;
        }
        
        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 30px;
        }
        
        h1 {
          margin: 0;
          color: #333;
        }
        
        .back-link {
          background: #333;
          color: white;
          padding: 8px 15px;
          border-radius: 4px;
          text-decoration: none;
          font-size: 14px;
        }
        
        .back-link:hover {
          background: #555;
        }
        
        .intro {
          font-size: 18px;
          line-height: 1.5;
          margin-bottom: 30px;
        }
        
        .help-section {
          margin-top: 40px;
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #333;
        }
        
        .help-section h2 {
          margin-top: 0;
        }
      `}</style>
    </div>
  );
};

export default TestOpenAI;