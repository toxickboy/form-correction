import React, { useState, useEffect } from 'react';
import { initOpenAI, testOpenAIConnection } from '../services/openaiService';

const OpenAITester = () => {
  const [connectionStatus, setConnectionStatus] = useState('checking');
  const [testMessage, setTestMessage] = useState('');
  const [response, setResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Check connection on component mount
  useEffect(() => {
    const checkConnection = async () => {
      try {
        const isConnected = initOpenAI();
        setConnectionStatus(isConnected ? 'connected' : 'failed');
        if (!isConnected) {
          setErrorMessage('Failed to initialize OpenAI client. Check your API key.');
        }
      } catch (error) {
        console.error('Error checking OpenAI connection:', error);
        setConnectionStatus('failed');
        setErrorMessage(error.message || 'Unknown error occurred');
      }
    };

    checkConnection();
  }, []);

  const handleTestConnection = async () => {
    if (!testMessage.trim()) {
      setErrorMessage('Please enter a test message');
      return;
    }

    setIsLoading(true);
    setResponse('');
    setErrorMessage('');

    try {
      const result = await testOpenAIConnection(testMessage);
      setResponse(result);
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Test connection error:', error);
      setErrorMessage(error.message || 'Failed to get response from OpenAI');
      setConnectionStatus('failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="openai-tester">
      <div className="connection-status">
        <div className={`status-indicator ${connectionStatus}`}>
          <div className="status-dot"></div>
          <span>
            {connectionStatus === 'checking' && 'Checking connection...'}
            {connectionStatus === 'connected' && 'Connected to OpenAI API'}
            {connectionStatus === 'failed' && 'Connection failed'}
          </span>
        </div>
      </div>

      <div className="test-form">
        <h3>Test the Connection</h3>
        <div className="input-group">
          <label htmlFor="test-message">Enter a test message:</label>
          <textarea
            id="test-message"
            value={testMessage}
            onChange={(e) => setTestMessage(e.target.value)}
            placeholder="Enter a simple message to test the OpenAI connection"
            disabled={isLoading}
          />
        </div>
        <button 
          onClick={handleTestConnection} 
          disabled={isLoading || connectionStatus === 'checking'}
          className="test-button"
        >
          {isLoading ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {errorMessage && (
        <div className="error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {response && (
        <div className="response">
          <h3>Response from OpenAI:</h3>
          <p>{response}</p>
        </div>
      )}

      <style jsx>{`
        .openai-tester {
          background: white;
          border-radius: 8px;
          padding: 20px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          margin-bottom: 30px;
        }

        .connection-status {
          margin-bottom: 20px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          padding: 10px 15px;
          border-radius: 4px;
          background: #f5f5f5;
        }

        .status-indicator.checking {
          background: #fff9c4;
        }

        .status-indicator.connected {
          background: #e8f5e9;
        }

        .status-indicator.failed {
          background: #ffebee;
        }

        .status-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          margin-right: 10px;
        }

        .status-indicator.checking .status-dot {
          background: #ffc107;
        }

        .status-indicator.connected .status-dot {
          background: #4caf50;
        }

        .status-indicator.failed .status-dot {
          background: #f44336;
        }

        .test-form {
          margin-top: 20px;
        }

        .input-group {
          margin-bottom: 15px;
        }

        label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
        }

        textarea {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          min-height: 80px;
          font-family: inherit;
          resize: vertical;
        }

        .test-button {
          background: #2196f3;
          color: white;
          border: none;
          padding: 10px 15px;
          border-radius: 4px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.3s;
        }

        .test-button:hover {
          background: #1976d2;
        }

        .test-button:disabled {
          background: #bdbdbd;
          cursor: not-allowed;
        }

        .error-message {
          margin-top: 20px;
          padding: 10px 15px;
          background: #ffebee;
          border-left: 4px solid #f44336;
          border-radius: 4px;
        }

        .response {
          margin-top: 20px;
          padding: 15px;
          background: #f5f5f5;
          border-radius: 4px;
          border-left: 4px solid #2196f3;
        }

        .response h3 {
          margin-top: 0;
          color: #2196f3;
        }
      `}</style>
    </div>
  );
};

export default OpenAITester;