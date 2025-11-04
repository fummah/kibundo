import React, { useState, useEffect, useCallback } from 'react';
import {
  Card, Table, Tag, Button, Select, Typography, Descriptions, Tabs,
  Space, Badge, Tooltip, Skeleton, Empty, Alert, App
} from 'antd';
import { 
  FilePdfOutlined, 
  SyncOutlined, 
  InfoCircleOutlined, 
  FileTextOutlined,
  DollarOutlined
} from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import api from '@/api/axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const BillingTab = ({ parent, parentId: parentIdProp, entity }) => {
  const { message: messageApi, modal } = App.useApp();
  const params = useParams();            // expects a route like /parents/:id
  const routeId = params?.id && Number.isFinite(+params.id) ? +params.id : params?.id;
  
  // Use entity prop if provided, otherwise use parent prop
  const parentData = entity || parent;
  const parentId = parentData?.id ?? parent?.id ?? parentIdProp ?? routeId ?? null;
  const [activeTab, setActiveTab] = useState('subscriptions');

  const [loading, setLoading] = useState({ 
    subscriptions: false, 
    invoice: false, 
    updating: false,
    invoices: false
  });
  const [subscriptions, setSubscriptions] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [fetchErr, setFetchErr] = useState(null);

  // Extract parent name from various possible structures
  const parentName = parentData?.name || 
                     (parentData?.first_name || parentData?.last_name 
                       ? `${parentData?.first_name ?? ''} ${parentData?.last_name ?? ''}`.trim() 
                       : null) ||
                     (parentData?.user?.first_name || parentData?.user?.last_name
                       ? `${parentData?.user?.first_name ?? ''} ${parentData?.user?.last_name ?? ''}`.trim()
                       : null) ||
                     parentData?.full_name || '—';
  
  // Extract parent email from various possible structures
  const parentEmail = parentData?.email || 
                      parentData?.contact_email || 
                      parentData?.user?.email || 
                      null;
  
  // Extract account status from various possible structures
  const accountStatus = parentData?.status || 
                        parentData?.user?.status ||
                        null;
  const isActive = (parentData?.is_active ?? parentData?.active) ?? 
                   (accountStatus?.toLowerCase() === 'active' ? true : null);

  const fetchInvoices = useCallback(async () => {
    if (!parentId) return;
    setFetchErr(null);
    try {
      setLoading((p) => ({ ...p, invoices: true }));
      const { data } = await api.get('/invoices');
      const parentInvoices = Array.isArray(data)
        ? data.filter((invoice) => invoice.parent_id === parentId)
        : [];
      setInvoices(parentInvoices);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      setInvoices([]);
      messageApi.error('Failed to load invoices');
    } finally {
      setLoading((p) => ({ ...p, invoices: false }));
    }
  }, [parentId]);

  const handleDownloadInvoice = useCallback(async (invoice) => {
    if (!invoice) return;
    
    try {
      setLoading((p) => ({ ...p, invoice: true }));
      
      // If this is a temporary invoice (preview), generate it client-side
      if (invoice.id.startsWith('TEMP-')) {
        const fileName = `Rechnung-${dayjs().format('YYYY-MM-DD')}.pdf`;
        
        // Create a container for the invoice
        const container = document.createElement('div');
        container.style.position = 'absolute';
        container.style.left = '-9999px';
        document.body.appendChild(container);
        
        // Render the invoice component
        const root = ReactDOM.createRoot(container);
        root.render(
          <InvoiceTemplate invoice={invoice} />
        );
        
        // Wait for rendering to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate PDF
        await generatePdfFromComponent(container, {
          filename: fileName,
          margin: 10,
          image: { type: 'jpeg', quality: 0.98 },
          html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            scrollY: 0,
            scrollX: 0,
            windowWidth: document.documentElement.offsetWidth,
            windowHeight: document.documentElement.offsetHeight
          },
          pagebreak: { 
            before: '.page-break-before',
            after: '.page-break-after',
            avoid: 'img, .no-break' 
          }
        });
        
        // Clean up
        root.unmount();
        document.body.removeChild(container);
        return;
      }
      
      // For existing invoices, try to download from the server
      let response;
      try {
        // First try the parent-specific endpoint
        response = await api.get(`/parents/${parentId}/invoices/${invoice.id}/download`, {
          responseType: 'blob',
        });
      } catch (firstError) {
        // Fall back to the generic endpoint
        response = await api.get(`/invoices/${invoice.id}/download`, {
          responseType: 'blob',
        });
      }
      
      if (!response?.data) {
        throw new Error('Keine Daten vom Server empfangen');
      }
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Rechnung-${invoice.id}-${dayjs(invoice.created_at || new Date()).format('YYYY-MM-DD')}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      // Revoke the object URL to free up memory
      setTimeout(() => window.URL.revokeObjectURL(url), 100);
      
      messageApi.success('Rechnung wurde heruntergeladen');
    } catch (error) {
      console.error('Fehler beim Herunterladen der Rechnung:', error);
      messageApi.error('Rechnung konnte nicht heruntergeladen werden. Bitte versuchen Sie es später erneut.');
    } finally {
      setLoading((p) => ({ ...p, invoice: false }));
    }
  }, [parentId]);

  const fetchSubscriptions = useCallback(async () => {
    if (!parentId) return;
    setFetchErr(null);
    try {
      setLoading((p) => ({ ...p, subscriptions: true }));
      const { data } = await api.get('/subscriptions');
      const parentSubscriptions = Array.isArray(data) 
        ? data.filter(sub => sub.parent_id === parentId) 
        : [];
      setSubscriptions(parentSubscriptions);
    } catch (error) {
      console.error('Error fetching subscriptions:', error);
      setSubscriptions([]);
      messageApi.error('Failed to load subscriptions');
    } finally {
      setLoading((p) => ({ ...p, subscriptions: false }));
    }
  }, [parentId]);

  // Use subscription data from parent entity if available, otherwise fetch
  useEffect(() => {
    const subs = parentData?.subscriptions || 
                 parentData?.raw?.subscriptions ||
                 parent?.subscriptions || 
                 [];
    
    if (Array.isArray(subs) && subs.length > 0) {
      setSubscriptions(subs);
    } else if (parentId) {
      fetchSubscriptions();
    }
  }, [parentData?.subscriptions, parentData?.raw?.subscriptions, parent?.subscriptions, parentId, fetchSubscriptions]);

  useEffect(() => {
    if (parentId) {
      fetchInvoices();
    }
  }, [parentId, fetchInvoices]);

  const handleGenerateInvoice = async (subscription) => {
    if (!subscription?.id || !parentId) {
      messageApi.error('Fehlende Abonnement- oder Eltern-ID');
      return;
    }
    
    try {
      setLoading((p) => ({ ...p, invoice: true }));
      
      // Get latest subscription data
      const { data: latestSubscription } = await api.get(`/subscription/${subscription.id}`);
      
      // Calculate amount
      const amount = latestSubscription.total_cents !== undefined 
        ? (latestSubscription.total_cents / 100)
        : subscription.total_cents !== undefined 
          ? (subscription.total_cents / 100)
          : 0;

      // Create invoice data
      const invoiceData = {
        subscription_id: subscription.id,
        parent_id: parentId,
        parent_name: parent?.name || parent?.full_name || 'Eltern',
        parent_email: parent?.email || parent?.contact_email || '',
        amount: amount,
        total_cents: Math.round(amount * 100),
        status: 'pending',
        due_date: dayjs().add(30, 'days').format('YYYY-MM-DD'),
        billing_cycle: latestSubscription.billing_cycle || subscription.billing_cycle || 'monthly',
        description: latestSubscription.description || `Nachhilfeunterricht ${dayjs().format('MM/YYYY')}`,
        created_at: new Date().toISOString(),
        id: `TEMP-${Date.now()}` // Temporary ID for preview
      };

      // Show preview before saving
      const confirmCreate = await new Promise((resolve) => {
        modal.confirm({
          title: 'Rechnungsvorschau',
          icon: <FilePdfOutlined />,
          width: 900,
          content: (
            <div style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              <InvoiceTemplate invoice={invoiceData} />
            </div>
          ),
          okText: 'Rechnung erstellen',
          cancelText: 'Abbrechen',
          onOk: () => resolve(true),
          onCancel: () => resolve(false),
        });
      });

      if (!confirmCreate) {
        messageApi.info('Vorgang abgebrochen');
        return;
      }

      // Create the actual invoice
      const { data: newInvoice } = await api.post('/addinvoice', invoiceData);
      
      // Generate and download the PDF
      await handleDownloadInvoice({
        ...newInvoice,
        parent_name: invoiceData.parent_name,
        parent_email: invoiceData.parent_email,
        description: invoiceData.description
      });
      
      // Refresh the invoices list
      await fetchInvoices();
      messageApi.success('Rechnung erfolgreich erstellt');
      
    } catch (error) {
      console.error('Fehler beim Erstellen der Rechnung:', error);
      messageApi.error(error?.response?.data?.message || 'Fehler beim Erstellen der Rechnung');
    } finally {
      setLoading((p) => ({ ...p, invoice: false }));
    }
  };

  const handleUpdateBillingCycle = async (subscriptionId, newCycle) => {
    if (!subscriptionId) return messageApi.error('Invalid subscription');
    try {
      setLoading((p) => ({ ...p, updating: true }));
      // Update subscription billing cycle
      await api.put(`/subscription/${subscriptionId}`, { 
        billing_cycle: newCycle,
        // Include any other required fields
      });
      
      // Update local state
      setSubscriptions((prev) => 
        prev.map((s) => 
          s.id === subscriptionId 
            ? { ...s, billing_cycle: newCycle } 
            : s
        )
      );
      
      messageApi.success('Billing cycle updated successfully');
    } catch (error) {
      console.error('Update error:', error);
      messageApi.error(error?.response?.data?.message || 'Failed to update billing cycle');
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

  const handleGenerateApiUsageInvoice = async () => {
    if (!parentId) {
      messageApi.error('No parent selected');
      return;
    }
    
    try {
      setLoading((p) => ({ ...p, invoice: true }));
      
      const { data } = await api.post(`/parent/${parentId}/generate-api-invoice`);
      
      if (data.success) {
        messageApi.success('API usage invoice generated successfully');
        await fetchInvoices();
      } else {
        messageApi.error(data.message || 'Failed to generate invoice');
      }
    } catch (error) {
      console.error('Error generating API usage invoice:', error);
      messageApi.error(error?.response?.data?.message || 'Failed to generate invoice');
    } finally {
      setLoading((p) => ({ ...p, invoice: false }));
    }
  };

  const invoiceColumns = [
    {
      title: 'Invoice',
      key: 'invoice',
      render: (_, record) => (
        <div>
          <div className="font-medium">#{record?.id ?? 'N/A'}</div>
          <Text type="secondary" className="text-xs">
            {record?.created_at ? dayjs(record.created_at).format('MMM D, YYYY') : '—'}
          </Text>
          {record?.lines && record.lines.length > 0 && (
            <div className="mt-1">
              {record.lines.map((line, idx) => (
                <Tag key={idx} color="blue" className="text-xs mr-1 mb-1">
                  {line.student_name || `Student #${line.student_id}`}
                </Tag>
              ))}
            </div>
          )}
        </div>
      ),
    },
    {
      title: 'Amount',
      key: 'amount',
      render: (_, record) => {
        const amount = record.total_cents ? (record.total_cents / 100) : record.amount;
        return (
          <div>
            <div className="font-medium">{amount ? `$${amount.toFixed(2)}` : '—'}</div>
            {record?.lines && record.lines.length > 0 && (
              <Text type="secondary" className="text-xs">
                {record.lines.length} student{record.lines.length > 1 ? 's' : ''}
              </Text>
            )}
          </div>
        );
      },
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'default';
        if (status === 'paid') color = 'success';
        if (status === 'unpaid') color = 'error';
        if (status === 'pending') color = 'warning';
        if (status === 'draft') color = 'default';
        return <Tag color={color}>{status || '—'}</Tag>;
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<FilePdfOutlined />}
            onClick={() => handleDownloadInvoice(record)}
            loading={loading.invoice}
            size="small"
          >
            Download
          </Button>
          {record.lines && record.lines.length > 0 && (
            <Tooltip title="View student breakdown">
              <Button
                type="link"
                icon={<InfoCircleOutlined />}
                onClick={() => {
                  modal.info({
                    title: `Invoice #${record.id} - Student Breakdown`,
                    width: 700,
                    content: (
                      <div className="mt-4">
                        <Table
                          size="small"
                          dataSource={record.lines}
                          pagination={false}
                          rowKey={(line) => line.student_id}
                          columns={[
                            { 
                              title: 'Student', 
                              dataIndex: 'student_name', 
                              key: 'student_name',
                              render: (name, line) => name || `Student #${line.student_id}`
                            },
                            { 
                              title: 'Scans', 
                              dataIndex: 'scan_count', 
                              key: 'scan_count' 
                            },
                            { 
                              title: 'Tokens', 
                              dataIndex: 'tokens_used', 
                              key: 'tokens_used',
                              render: (tokens) => tokens?.toLocaleString() || 0
                            },
                            { 
                              title: 'Amount', 
                              dataIndex: 'amount', 
                              key: 'amount',
                              render: (amount) => `$${amount?.toFixed(4) || '0.0000'}`
                            },
                          ]}
                        />
                      </div>
                    ),
                  });
                }}
                size="small"
              >
                Details
              </Button>
            </Tooltip>
          )}
        </Space>
      ),
    },
  ];

  const renderSubscriptionsTable = () => {
    if (loading.subscriptions) return <Skeleton active />;
    if (!subscriptions.length) return <Empty description="No subscriptions found" />;
    
    return (
      <Table
        columns={columns}
        dataSource={subscriptions}
        rowKey="id"
        pagination={false}
        size="small"
      />
    );
  };

  const renderInvoicesTable = () => {
    if (loading.invoices) return <Skeleton active />;
    if (!invoices.length) return <Empty description="No invoices found" />;
    
    return (
      <Table
        columns={invoiceColumns}
        dataSource={invoices}
        rowKey="id"
        pagination={false}
        size="small"
      />
    );
  };

  const renderContent = () => {
    if (!parentId) {
      return (
        <Empty
          description={
            <div className="text-center">
              <div className="font-medium">No parent selected</div>
              <div className="text-sm text-gray-500">Open a parent profile to view billing information</div>
            </div>
          }
        />
      );
    }

    return (
      <Tabs 
      activeKey={activeTab} 
      onChange={setActiveTab}
      items={[
        {
          key: 'subscriptions',
          label: (
            <span>
              <FileTextOutlined />
              Subscriptions
            </span>
          ),
          children: renderSubscriptionsTable()
        },
        {
          key: 'invoices',
          label: (
            <span>
              <FilePdfOutlined />
              Invoices
            </span>
          ),
          children: (
            <div>
              <div className="mb-4 flex justify-between items-center">
                <Alert
                  message="API Usage Invoices"
                  description="Invoices are automatically generated based on AI homework analysis usage. Each invoice shows per-student costs."
                  type="info"
                  showIcon
                  className="flex-1 mr-4"
                />
                <Button
                  type="primary"
                  icon={<DollarOutlined />}
                  onClick={handleGenerateApiUsageInvoice}
                  loading={loading.invoice}
                  size="large"
                >
                  Generate/Update API Invoice
                </Button>
              </div>
              {renderInvoicesTable()}
            </div>
          )
        }
      ]}
    />
    );
  };


  return (
    <div className="billing-tab">
      <Card
        title={
          <Space>
            <DollarOutlined />
            <span>Billing & Invoices</span>
            <Tooltip title="Manage subscription and billing for this parent">
              <InfoCircleOutlined className="text-gray-400" />
            </Tooltip>
            {isActive === false && <Tag color="warning">Account Inactive</Tag>}
          </Space>
        }
        extra={
          <Button
            icon={<SyncOutlined spin={loading.subscriptions || loading.invoices} />}
            onClick={() => {
              if (activeTab === 'subscriptions') fetchSubscriptions();
              else fetchInvoices();
            }}
            disabled={loading.subscriptions || loading.invoices}
          >
            Refresh
          </Button>
        }
        className="shadow-sm"
      >
        {parentId && (
          <div className="mb-6">
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Parent">
                <div>
                  <div className="font-medium">{parentName}</div>
                  {parentEmail && (
                    <Text type="secondary" className="text-xs">
                      {parentEmail}
                    </Text>
                  )}
                </div>
              </Descriptions.Item>
              <Descriptions.Item label="Account Status">
                {(() => {
                  if (accountStatus) {
                    const statusLower = accountStatus.toLowerCase();
                    if (statusLower === 'active') {
                      return <Badge status="success" text="Active" />;
                    } else if (statusLower === 'inactive' || statusLower === 'suspended') {
                      return <Badge status="error" text={accountStatus} />;
                    } else {
                      return <Badge status="default" text={accountStatus} />;
                    }
                  }
                  // Fallback to isActive boolean
                  if (isActive === null || isActive === undefined) {
                    return <Badge status="default" text="—" />;
                  }
                  return isActive ? (
                    <Badge status="success" text="Active" />
                  ) : (
                    <Badge status="default" text="Inactive" />
                  );
                })()}
              </Descriptions.Item>
              <Descriptions.Item label="Subscription Status" span={2}>
                {(() => {
                  // Try to get subscriptions from various sources
                  const allSubs = subscriptions.length > 0 
                    ? subscriptions 
                    : parentData?.subscriptions || 
                      parentData?.raw?.subscriptions ||
                      [];
                  
                  if (!allSubs || allSubs.length === 0) {
                    return <Badge status="default" text="No subscription" />;
                  }
                  
                  // Find active subscription first, otherwise show the most recent one
                  const activeSub = allSubs.find((s) => s.status === 'active' || s.status === 'trialing');
                  const latestSub = activeSub || allSubs[0];
                  
                  // Extract subscription details
                  const planName = latestSub?.product?.name || 
                                  latestSub?.plan?.name || 
                                  latestSub?.price?.nickname || 
                                  latestSub?.metadata?.plan_name ||
                                  latestSub?.plan_name ||
                                  "Unknown Plan";
                  const status = latestSub?.status || "unknown";
                  const interval = latestSub?.product?.billing_interval ||
                                  latestSub?.metadata?.billing_interval ||
                                  latestSub?.price?.interval ||
                                  latestSub?.billing_interval ||
                                  "N/A";
                  const renewsDate = latestSub?.current_period_end || 
                                     latestSub?.metadata?.renewal_date ||
                                     latestSub?.renewal_date ||
                                     null;
                  
                  // Determine status color
                  let statusColor = 'default';
                  if (status === 'active' || status === 'trialing') {
                    statusColor = 'success';
                  } else if (status === 'incomplete' || status === 'past_due') {
                    statusColor = 'warning';
                  } else if (status === 'canceled' || status === 'unpaid') {
                    statusColor = 'error';
                  }
                  
                  return (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge status={statusColor} text={status || 'unknown'} />
                        <Text strong>{planName}</Text>
                        {interval && interval !== 'N/A' && (
                          <Tag color={statusColor}>
                            {interval}
                          </Tag>
                        )}
                      </div>
                      {renewsDate && (
                        <Text type="secondary" className="text-xs">
                          Renews: {dayjs(renewsDate).format('MMM D, YYYY')}
                        </Text>
                      )}
                      {latestSub?.stripe_subscription_id && (
                        <Text type="secondary" className="text-xs block">
                          Stripe ID: {latestSub.stripe_subscription_id.substring(0, 20)}...
                        </Text>
                      )}
                      {allSubs.length > 1 && (
                        <Text type="secondary" className="text-xs">
                          {allSubs.length} total subscription{allSubs.length > 1 ? 's' : ''}
                        </Text>
                      )}
                    </div>
                  );
                })()}
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
        {renderContent()}
      </Card>
    </div>
  );
};

export default BillingTab;
