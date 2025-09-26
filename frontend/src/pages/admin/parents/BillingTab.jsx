import { useState, useEffect } from 'react';
import { Button, Modal, Select, Table, Tag, notification } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import api from '@/api/axios';

const BillingTab = ({ entity }) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await api.get('/products');
        setProducts(response.data);
      } catch (error) {
        notification.error({ message: 'Failed to fetch products' });
      }
    };
    fetchProducts();
  }, []);

  const handleSubscribe = async () => {
    if (!selectedProduct) {
      notification.warning({ message: 'Please select a product.' });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/subscriptions/create-checkout-session', {
        priceId: selectedProduct, // Assuming the value is the price ID
        parentId: entity.id,
      });

      const { id: sessionId } = response.data;
      // Removed Stripe-related code
    } catch (error) {
      notification.error({ message: 'Subscription Error', description: 'Failed to create subscription session.' });
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: 'ID', dataIndex: 'id', key: 'id' },
    { title: 'Plan', dataIndex: ['product', 'name'], key: 'plan' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: status => <Tag>{status}</Tag> },
    { title: 'End of Period', dataIndex: 'current_period_end', key: 'current_period_end', render: date => new Date(date).toLocaleDateString() },
  ];

  return (
    <div>
     
      <Table dataSource={entity.subscriptions} columns={columns} rowKey="id" />

      <Modal
        title="Create New Subscription"
        visible={isModalVisible}
        onOk={handleSubscribe}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
      >
        <Select
          placeholder="Select a product"
          style={{ width: '100%' }}
          onChange={value => setSelectedProduct(value)}
          options={products.map(p => ({ value: p.stripe_product_id, label: `${p.name} - $${p.price}` }))}
        />
      </Modal>
    </div>
  );
};

export default BillingTab;
