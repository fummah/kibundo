import { Modal, Form, Input, Button, message, Space } from 'antd';
import { useState, useEffect } from 'react';
import { UserOutlined, LockOutlined, MailOutlined, EyeInvisibleOutlined, EyeOutlined } from '@ant-design/icons';
import api from '@/api/axios';

const EditCredentialsModal = ({ visible, onCancel, userId, userName, onSuccess }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Debug: Log when modal opens
  useEffect(() => {
    if (visible) {
      console.log('🔓 EditCredentialsModal opened for user:', userId, userName);
    }
  }, [visible, userId, userName]);

  const generatePassword = () => {
    // Generate a random 8-character password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    form.setFieldsValue({ password });
    setShowPassword(true);
    message.success('Password generated! Make sure to save it.');
  };

  const handleSubmit = async (values) => {
    console.log('🚀 handleSubmit called with values:', values);
    
    try {
      setLoading(true);
      
      const payload = {};
      
      // Only add fields that have actual values
      if (values.email && values.email.trim() !== '') {
        payload.email = values.email.trim();
      }
      if (values.username && values.username.trim() !== '') {
        payload.username = values.username.trim();
      }
      if (values.password && values.password !== '') {
        payload.password = values.password;
      }

      // Validate that at least one field is being updated
      if (Object.keys(payload).length === 0) {
        message.warning('Please enter at least one field to update');
        setLoading(false);
        return;
      }

      console.log('🔑 Updating credentials for user:', userId);
      console.log('📤 Payload being sent:', {
        ...payload,
        password: payload.password ? '***' : undefined
      });

      const response = await api.post(`/users/${userId}/admin-update-credentials`, payload);

      console.log('✅ Credentials updated successfully');
      console.log('📥 Response from server:', {
        ...response.data,
        user: response.data.user ? {
          id: response.data.user.id,
          email: response.data.user.email,
          username: response.data.user.username,
          plain_pass: response.data.user.plain_pass
        } : null
      });
      
      message.success('Login credentials updated successfully!');
      form.resetFields();
      onSuccess?.(response.data.user);
      onCancel();
    } catch (err) {
      console.error('❌ Error updating credentials:', err);
      console.error('❌ Error details:', err.response?.data);
      const errorMessage = err?.response?.data?.message || 'Failed to update credentials';
      message.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setShowPassword(false);
    onCancel();
  };

  return (
    <Modal
      title={`Edit Login Credentials - ${userName}`}
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        autoComplete="off"
      >
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Update email, username, or password for portal access. Leave fields empty to keep current values.
        </p>

        <Form.Item
          label="Email Address"
          name="email"
          rules={[
            { type: 'email', message: 'Please enter a valid email address' }
          ]}
        >
          <Input 
            prefix={<MailOutlined />}
            placeholder="Enter new email address"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label="Portal Login (Username)"
          name="username"
          rules={[
            { min: 3, message: 'Username must be at least 3 characters' }
          ]}
          extra={<span className="text-xs">This is stored in the 'username' field</span>}
        >
          <Input 
            prefix={<UserOutlined />}
            placeholder="Enter new portal username"
            size="large"
          />
        </Form.Item>

        <Form.Item
          label={
            <Space>
              <span>Portal Password (Plain Text)</span>
              <Button 
                type="link" 
                size="small" 
                onClick={generatePassword}
                className="p-0 h-auto"
              >
                Generate Random
              </Button>
            </Space>
          }
          name="password"
          rules={[
            { min: 6, message: 'Password must be at least 6 characters' }
          ]}
          extra={<span className="text-xs">Stored in 'plain_pass' field. Minimum 6 characters</span>}
        >
          <Input 
            prefix={<LockOutlined />}
            type={showPassword ? 'text' : 'password'}
            placeholder="Enter new portal password"
            size="large"
            suffix={
              <Button
                type="text"
                size="small"
                icon={showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                onClick={() => setShowPassword(!showPassword)}
              />
            }
          />
        </Form.Item>

        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-lg p-3 mb-4">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>⚠️ Important:</strong> Make sure to save the new credentials securely and share them with the user.
          </p>
        </div>

        <Form.Item className="mb-0">
          <Space>
            <Button type="primary" htmlType="submit" loading={loading} size="large">
              Update Credentials
            </Button>
            <Button onClick={handleCancel} size="large">
              Cancel
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EditCredentialsModal;

