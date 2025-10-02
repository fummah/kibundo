import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Select, Typography, Descriptions,
  Space, message, Badge, Tooltip, Skeleton, Empty, Alert
} from 'antd';
import { FilePdfOutlined, SyncOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api from '@/api/axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const BillingTab = ({ parent, parentId: parentIdProp }) => {
  const params = useParams();            // expects a route like /parents/:id
  const routeId = params?.id && Number.isFinite(+params.id) ? +params.id : params?.id;
  const parentId = parent?.id ?? parentIdProp ?? routeId ?? null;

  const [loading, setLoading] = useState({ subscriptions: false, invoice: false, updating: false });
  const [subscriptions, setSubscriptions] = useState([]);
  const [fetchErr, setFetchErr] = useState(null);

  const parentName = parent?.name || parent?.full_name || parent?.first_name
    ? `${parent?.first_name ?? ''} ${parent?.last_name ?? ''}`.trim() || parent?.name || '—'
    : '—';
  const parentEmail = parent?.email || parent?.contact_email || null;
  const isActive = parent?.is_active ?? parent?.active ?? null;

  const fetchSubscriptions = useCallback(async () => {
    if (!parentId) return;
    setFetchErr(null);
    try {
      setLoading((p) => ({ ...p, subscriptions: true }));
      // Prefer documented path: GET /parents/:parentId/subscriptions
      const { data } = await api.get(`/parents/${parentId}/subscriptions`);
      setSubscriptions(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      // Remove the error message and just set empty array
      setSubscriptions([]);
    } finally {
      setLoading((p) => ({ ...p, subscriptions: false }));
    }
  }, [parentId]);

  useEffect(() => {
    if (parentId) fetchSubscriptions();
  }, [parentId, fetchSubscriptions]);

  const handleGenerateInvoice = async (subscription) => {
    if (!subscription?.id || !parentId) {
      message.error('Missing subscription or parent id');
      return;
    }
    try {
      setLoading((p) => ({ ...p, invoice: true }));
      const res = await api.post(
        '/invoices/generate',
        {
          subscription_id: subscription.id,
          parent_id: parentId,
          billing_cycle: subscription.billing_cycle || 'monthly',
        },
        { responseType: 'blob' }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${subscription.id}-${dayjs().format('YYYY-MM-DD')}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      message.success('Invoice generated successfully');
    } catch (error) {
      console.error('Invoice generation error:', error);
      message.error(error?.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setLoading((p) => ({ ...p, invoice: false }));
    }
  };

  const handleUpdateBillingCycle = async (subscriptionId, newCycle) => {
    if (!subscriptionId) return message.error('Invalid subscription');
    try {
      setLoading((p) => ({ ...p, updating: true }));
      await api.put(`/subscriptions/${subscriptionId}`, { billing_cycle: newCycle });
      message.success('Billing cycle updated successfully');
      setSubscriptions((prev) => prev.map((s) => (s.id === subscriptionId ? { ...s, billing_cycle: newCycle } : s)));
    } catch (error) {
      console.error('Update error:', error);
      message.error(error?.response?.data?.message || 'Failed to update billing cycle');
    } finally {
      setLoading((p) => ({ ...p, updating: false }));
    }
  };

  const getStatusTag = (status) => {
    const map = {
      active: { color: 'success', text: 'Active' },
      canceled: { color: 'default', text: 'Canceled' },
      past_due: { color: 'warning', text: 'Past Due' },
      unpaid: { color: 'error', text: 'Unpaid' },
      trialing: { color: 'processing', text: 'Trialing' },
    };
    const info = map[status] || { color: 'default', text: status || 'Unknown' };
    return <Badge status={info.color} text={info.text} />;
  };

  const columns = [
    {
      title: 'Subscription',
      key: 'subscription',
      render: (_, record) => (
        <div>
          <div className="font-medium">#{record?.id ?? 'N/A'}</div>
          <Text type="secondary" className="text-xs">
            {record?.created_at ? dayjs(record.created_at).format('MMM D, YYYY') : '—'}
          </Text>
          {record?.is_trial ? <Tag color="blue" className="mt-1">Trial</Tag> : null}
        </div>
      ),
    },
    {
      title: 'Plan',
      key: 'plan',
      render: (_, r) => r?.plan?.name || r?.product?.name || r?.plan_name || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => getStatusTag(status),
    },
    {
      title: 'Billing',
      key: 'billing',
      render: (_, r) => {
        const cycle = r?.billing_cycle || 'monthly';
        const next = r?.next_billing_date && dayjs(r.next_billing_date).isValid()
          ? dayjs(r.next_billing_date).format('MMM D')
          : null;
        const amount =
          typeof r?.amount === 'number'
            ? r.amount
            : typeof r?.price === 'number'
            ? r.price
            : null;

        return (
          <div>
            <div className="flex items-center gap-2">
              <Tag color={cycle === 'yearly' ? 'green' : 'blue'}>{cycle.toUpperCase()}</Tag>
              {next && (
                <Tooltip title="Next billing date">
                  <span className="text-xs text-gray-500">{next}</span>
                </Tooltip>
              )}
            </div>
            {amount !== null && (
              <div className="text-xs text-gray-500 mt-1">
                {amount > 0 ? `$${amount}/${cycle === 'yearly' ? 'year' : 'month'}` : 'Free'}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, r) => (
        <Space>
          <Button
            type="primary"
            icon={<FilePdfOutlined />}
            onClick={() => handleGenerateInvoice(r)}
            loading={loading.invoice}
            size="small"
            disabled={!r?.id}
          >
            Invoice
          </Button>
          <Select
            value={r?.billing_cycle || 'monthly'}
            onChange={(v) => handleUpdateBillingCycle(r?.id, v)}
            size="small"
            style={{ width: 120 }}
            loading={loading.updating}
            disabled={!r?.id || r?.status !== 'active'}
            options={[
              { value: 'monthly', label: 'Monthly' },
              { value: 'yearly', label: 'Yearly' },
            ]}
          />
        </Space>
      ),
    },
  ];

  // ---------- RENDER ----------

  // 1) If parent object itself is loading but we DO have an ID from route/prop, show a slim skeleton instead of blocking forever
  if (!parent && !parentId) {
    return (
      <Card>
        <Empty
          description={
            <div>
              <div className="font-medium">No parent selected</div>
              <div className="text-xs">Open a parent profile to view billing.</div>
            </div>
          }
        />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title={
          <div className="flex items-center gap-2">
            <SyncOutlined />
            <span>Billing Management</span>
            <Tooltip title="Manage subscription and billing for this parent">
              <InfoCircleOutlined className="text-gray-400" />
            </Tooltip>
          </div>
        }
        className="shadow-sm"
      >
        <Descriptions bordered column={2} className="mb-6">
          <Descriptions.Item label="Parent">
            <div>
              <div className="font-medium">{parentName}</div>
              {parentEmail ? <Text type="secondary" className="text-xs">{parentEmail}</Text> : null}
            </div>
          </Descriptions.Item>
          <Descriptions.Item label="Account Status">
            {isActive === null ? (
              <Badge status="default" text="—" />
            ) : isActive ? (
              <Badge status="success" text="Active" />
            ) : (
              <Badge status="default" text="Inactive" />
            )}
          </Descriptions.Item>
          <Descriptions.Item label="Subscription Status" span={2}>
            {subscriptions.some((s) => s.status === 'active') ? (
              <Badge status="success" text="Active Subscription" />
            ) : loading.subscriptions ? (
              <Badge status="processing" text="Checking…" />
            ) : (
              <Badge status="warning" text="No Active Subscription" />
            )}
          </Descriptions.Item>
        </Descriptions>

        {fetchErr ? (
          <Alert
            type="error"
            showIcon
            message="Could not load subscriptions"
            description={fetchErr}
            className="mb-4"
          />
        ) : null}

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Title level={5} className="!mb-0">Subscription History</Title>
            <Button
              size="small"
              icon={<SyncOutlined />}
              onClick={fetchSubscriptions}
              loading={loading.subscriptions}
              disabled={!parentId}
            >
              Refresh
            </Button>
          </div>

          <Table
            columns={columns}
            dataSource={subscriptions}
            rowKey={(r) => r?.id ?? `${r?.plan_id ?? r?.product?.id ?? 'sub'}-${r?.created_at ?? Math.random()}`}
            pagination={{ pageSize: 5 }}
            size="middle"
            loading={loading.subscriptions && !subscriptions.length}
            locale={{ emptyText: parentId ? 'No subscription history found' : 'No parent selected' }}
          />
        </div>
      </Card>
    </div>
  );
};

export default BillingTab;
