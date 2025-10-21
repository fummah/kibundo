// Simple component to test authentication
import React, { useState } from 'react';
import { Button, Card, Typography, Space, message } from 'antd';
import api from '@/api/axios';

const { Title, Text } = Typography;

export default function AuthTest() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const testAuth = async () => {
    setLoading(true);
    try {
      // Test the allstudents endpoint
      const response = await api.get('/allstudents');
      setResult({
        success: true,
        endpoint: '/allstudents',
        data: response.data,
        status: response.status
      });
      message.success('Authentication test successful!');
    } catch (error) {
      setResult({
        success: false,
        endpoint: '/allstudents',
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      message.error(`Authentication test failed: ${error.response?.status}`);
    }
    setLoading(false);
  };

  const testNoAuth = async () => {
    setLoading(true);
    try {
      // Test the test endpoint without auth
      const response = await api.get('/test-allstudents');
      setResult({
        success: true,
        endpoint: '/test-allstudents',
        data: response.data,
        status: response.status
      });
      message.success('No-auth test successful!');
    } catch (error) {
      setResult({
        success: false,
        endpoint: '/test-allstudents',
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      message.error(`No-auth test failed: ${error.response?.status}`);
    }
    setLoading(false);
  };

  const checkToken = () => {
    const token = localStorage.getItem('kibundo_token') || localStorage.getItem('token');
    if (token) {
      message.info(`Token found: ${token.slice(0, 20)}...`);
    } else {
      message.error('No token found in localStorage');
    }
  };

  return (
    <Card title="🔧 Authentication Test" style={{ margin: '20px', maxWidth: '600px' }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <div>
          <Title level={5}>Quick Tests:</Title>
          <Space>
            <Button onClick={checkToken}>Check Token</Button>
            <Button type="primary" loading={loading} onClick={testAuth}>
              Test /allstudents API
            </Button>
            <Button loading={loading} onClick={testNoAuth}>
              Test /test-allstudents (no auth)
            </Button>
          </Space>
        </div>

        {result && (
          <div>
            <Title level={5}>Test Result:</Title>
            <pre style={{ 
              background: '#f5f5f5', 
              padding: '10px', 
              borderRadius: '4px',
              fontSize: '12px',
              overflow: 'auto',
              maxHeight: '200px'
            }}>
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div>
          <Title level={5}>Manual Token Check:</Title>
          <Text code>
            localStorage.getItem('kibundo_token')
          </Text>
        </div>
      </Space>
    </Card>
  );
}
