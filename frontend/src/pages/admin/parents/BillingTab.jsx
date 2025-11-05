import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
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
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// Simple PDF generator helper
const generatePdfFromComponent = async (element, options = {}) => {
  try {
    // Ensure element is ready
    if (!element || !element.parentElement) {
      throw new Error('Element not ready for PDF generation');
    }
    
    // Configure html2canvas with better defaults
    const canvasOptions = {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
      ...(options.html2canvas || {})
    };
    
    const canvas = await html2canvas(element, canvasOptions);
    
    if (!canvas || canvas.width === 0 || canvas.height === 0) {
      throw new Error('Canvas generation failed - invalid dimensions');
    }
    
    const imgData = canvas.toDataURL('image/png', 0.95);
    
    if (!imgData || imgData === 'data:,') {
      throw new Error('Failed to generate image data from canvas');
    }
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    
    // Calculate image dimensions to fit the page
    const margin = options.margin || 20;
    const imgWidth = pdfWidth - (margin * 2);
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Handle multi-page documents
    let heightLeft = imgHeight;
    let position = margin;
    
    // Add first page
    pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
    heightLeft -= (pdfHeight - margin);
    
    // Add additional pages if needed
    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft - margin);
      pdf.addPage();
      pdf.addImage(imgData, 'PNG', margin, position, imgWidth, imgHeight);
      heightLeft -= (pdfHeight - margin);
    }
    
    pdf.save(options.filename || 'invoice.pdf');
  } catch (error) {
    console.error('PDF generation error:', error);
    throw new Error(`PDF generation failed: ${error.message}`);
  }
};

// Professional Invoice Template component
const InvoiceTemplate = ({ invoice }) => {
  const amount = invoice.total_cents ? (invoice.total_cents / 100) : (invoice.amount || 0);
  const currency = invoice.currency || 'EUR';
  const invoiceDate = dayjs(invoice.created_at || new Date());
  const dueDate = invoice.due_date ? dayjs(invoice.due_date) : invoiceDate.add(30, 'days');
  
  // Parse line items
  let lineItems = [];
  if (invoice.lines && Array.isArray(invoice.lines)) {
    lineItems = invoice.lines;
  } else if (invoice.lines && typeof invoice.lines === 'object') {
    lineItems = Object.values(invoice.lines);
  } else if (invoice.line_items && Array.isArray(invoice.line_items)) {
    lineItems = invoice.line_items;
  }
  
  // If no line items, create a default one
  if (lineItems.length === 0) {
    lineItems = [{
      description: invoice.description || 'Nachhilfeunterricht',
      quantity: 1,
      unit_price: amount,
      amount: amount
    }];
  }
  
  // Get student information
  const students = invoice.parent?.student || invoice.parent?.students || invoice.students || [];
  const parentName = invoice.parent_name || 
                    (invoice.parent?.user ? `${invoice.parent.user.first_name || ''} ${invoice.parent.user.last_name || ''}`.trim() : '') ||
                    (invoice.parent?.name) ||
                    'Eltern';
  const parentEmail = invoice.parent_email || 
                      invoice.parent?.user?.email || 
                      invoice.parent?.email || 
                      '';
  
  // Calculate subtotal and taxes
  const subtotal = lineItems.reduce((sum, item) => sum + (item.amount || item.unit_price * (item.quantity || 1)), 0);
  
  // Handle taxes - can be array, object, or empty
  let taxesArray = [];
  if (invoice.taxes) {
    if (Array.isArray(invoice.taxes)) {
      taxesArray = invoice.taxes;
    } else if (typeof invoice.taxes === 'object') {
      // Convert object to array of tax objects
      taxesArray = Object.values(invoice.taxes);
    }
  }
  
  const taxAmount = taxesArray.reduce((sum, tax) => {
    if (typeof tax === 'number') {
      return sum + tax;
    } else if (tax && typeof tax === 'object') {
      return sum + (tax.amount || tax.value || 0);
    }
    return sum;
  }, 0);
  
  const total = amount || (subtotal + taxAmount);
  
  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
      padding: '50px',
      fontFamily: '"Helvetica Neue", Arial, sans-serif',
      backgroundColor: '#ffffff',
      color: '#333333'
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '50px',
      paddingBottom: '30px',
      borderBottom: '3px solid #2563eb'
    },
    logo: {
      fontSize: '28px',
      fontWeight: 'bold',
      color: '#2563eb'
    },
    invoiceTitle: {
      textAlign: 'right',
      fontSize: '24px',
      fontWeight: 'bold',
      color: '#1e293b'
    },
    invoiceInfo: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBottom: '40px',
      gap: '40px'
    },
    billTo: {
      flex: 1
    },
    invoiceDetails: {
      flex: 1,
      textAlign: 'right'
    },
    sectionTitle: {
      fontSize: '14px',
      fontWeight: 'bold',
      color: '#64748b',
      marginBottom: '10px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    sectionContent: {
      fontSize: '16px',
      color: '#1e293b',
      lineHeight: '1.6'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      marginBottom: '30px'
    },
    tableHeader: {
      backgroundColor: '#f1f5f9',
      padding: '15px',
      textAlign: 'left',
      fontSize: '12px',
      fontWeight: 'bold',
      color: '#64748b',
      textTransform: 'uppercase',
      borderBottom: '2px solid #e2e8f0'
    },
    tableCell: {
      padding: '15px',
      borderBottom: '1px solid #e2e8f0',
      fontSize: '14px',
      color: '#1e293b'
    },
    tableRow: {
      '&:hover': {
        backgroundColor: '#f8fafc'
      }
    },
    totalSection: {
      display: 'flex',
      justifyContent: 'flex-end',
      marginTop: '20px'
    },
    totalTable: {
      width: '300px',
      borderCollapse: 'collapse'
    },
    totalRow: {
      padding: '10px 15px',
      fontSize: '14px'
    },
    totalLabel: {
      textAlign: 'right',
      color: '#64748b',
      fontWeight: '500'
    },
    totalValue: {
      textAlign: 'right',
      color: '#1e293b',
      fontWeight: '600'
    },
    finalTotal: {
      backgroundColor: '#2563eb',
      color: '#ffffff',
      fontSize: '18px',
      fontWeight: 'bold',
      padding: '15px',
      borderRadius: '4px'
    },
    studentsSection: {
      marginTop: '30px',
      padding: '20px',
      backgroundColor: '#f8fafc',
      borderRadius: '8px',
      border: '1px solid #e2e8f0'
    },
    studentItem: {
      padding: '8px 0',
      fontSize: '14px',
      color: '#475569',
      borderBottom: '1px solid #e2e8f0'
    },
    studentItemLast: {
      padding: '8px 0',
      fontSize: '14px',
      color: '#475569'
      // No border for last item - comma removed for last style property
    },
    footer: {
      marginTop: '50px',
      paddingTop: '30px',
      borderTop: '2px solid #e2e8f0',
      fontSize: '12px',
      color: '#64748b',
      textAlign: 'center'
    },
    statusBadge: {
      display: 'inline-block',
      padding: '4px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: 'bold',
      textTransform: 'uppercase'
    }
  };
  
  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase();
    if (s === 'paid') return { backgroundColor: '#10b981', color: '#ffffff' };
    if (s === 'pending' || s === 'due') return { backgroundColor: '#f59e0b', color: '#ffffff' };
    if (s === 'overdue') return { backgroundColor: '#ef4444', color: '#ffffff' };
    return { backgroundColor: '#64748b', color: '#ffffff' };
  };
  
  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={styles.logo}>Kibundo</div>
        <div style={styles.invoiceTitle}>Rechnung / Invoice</div>
      </div>
      
      {/* Invoice Info */}
      <div style={styles.invoiceInfo}>
        <div style={styles.billTo}>
          <div style={styles.sectionTitle}>Rechnungsempfänger</div>
          <div style={styles.sectionContent}>
            <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>{parentName}</div>
            {parentEmail && <div>{parentEmail}</div>}
            {students.length > 0 && (
              <div style={{ marginTop: '15px', fontSize: '14px', color: '#64748b' }}>
                <strong>Schüler:</strong> {students.length} {students.length === 1 ? 'Schüler' : 'Schüler'}
              </div>
            )}
          </div>
        </div>
        <div style={styles.invoiceDetails}>
          <div style={styles.sectionTitle}>Rechnungsdetails</div>
          <div style={styles.sectionContent}>
            <div style={{ marginBottom: '5px' }}><strong>Rechnungsnummer:</strong> #{invoice.id || 'N/A'}</div>
            <div style={{ marginBottom: '5px' }}><strong>Rechnungsdatum:</strong> {invoiceDate.format('DD.MM.YYYY')}</div>
            <div style={{ marginBottom: '5px' }}><strong>Fälligkeitsdatum:</strong> {dueDate.format('DD.MM.YYYY')}</div>
            {invoice.status && (
              <div style={{ marginTop: '10px' }}>
                <span style={{ ...styles.statusBadge, ...getStatusColor(invoice.status) }}>
                  {invoice.status}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Line Items Table */}
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={{ ...styles.tableHeader, width: '50%' }}>Beschreibung</th>
            <th style={{ ...styles.tableHeader, width: '15%', textAlign: 'center' }}>Menge</th>
            <th style={{ ...styles.tableHeader, width: '17.5%', textAlign: 'right' }}>Einzelpreis</th>
            <th style={{ ...styles.tableHeader, width: '17.5%', textAlign: 'right' }}>Betrag</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, index) => {
            const itemAmount = item.amount || (item.unit_price * (item.quantity || 1));
            return (
              <tr key={index} style={styles.tableRow}>
                <td style={styles.tableCell}>
                  <div style={{ fontWeight: '500' }}>{item.description || item.name || 'Position'}</div>
                  {item.student_name && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      Schüler: {item.student_name}
                    </div>
                  )}
                  {item.usage_details && (
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                      {item.usage_details}
                    </div>
                  )}
                </td>
                <td style={{ ...styles.tableCell, textAlign: 'center' }}>{item.quantity || 1}</td>
                <td style={{ ...styles.tableCell, textAlign: 'right' }}>
                  {(item.unit_price || itemAmount).toFixed(2)} {currency}
                </td>
                <td style={{ ...styles.tableCell, textAlign: 'right', fontWeight: '500' }}>
                  {itemAmount.toFixed(2)} {currency}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Totals */}
      <div style={styles.totalSection}>
        <table style={styles.totalTable}>
          {subtotal !== total && (
            <>
              <tr>
                <td style={{ ...styles.totalRow, ...styles.totalLabel }}>Zwischensumme:</td>
                <td style={{ ...styles.totalRow, ...styles.totalValue }}>
                  {subtotal.toFixed(2)} {currency}
                </td>
              </tr>
              {taxAmount > 0 && (
                <tr>
                  <td style={{ ...styles.totalRow, ...styles.totalLabel }}>MwSt. (19%):</td>
                  <td style={{ ...styles.totalRow, ...styles.totalValue }}>
                    {taxAmount.toFixed(2)} {currency}
                  </td>
                </tr>
              )}
            </>
          )}
          <tr>
            <td style={{ ...styles.totalRow, ...styles.totalLabel, paddingTop: '15px' }}>Gesamtbetrag:</td>
            <td style={{ ...styles.totalRow, ...styles.totalValue, ...styles.finalTotal, paddingTop: '15px' }}>
              {total.toFixed(2)} {currency}
            </td>
          </tr>
        </table>
      </div>
      
      {/* Students Section */}
      {students.length > 0 && (
        <div style={styles.studentsSection}>
          <div style={{ ...styles.sectionTitle, marginBottom: '15px' }}>Gebuchte Schüler</div>
          {students.map((student, index) => {
            const studentName = student.user 
              ? `${student.user.first_name || ''} ${student.user.last_name || ''}`.trim()
              : student.name || `Schüler #${student.id}`;
            const studentClass = student.class?.class_name || student.class_name || student.grade || 'N/A';
            const isLast = index === students.length - 1;
            return (
              <div key={index} style={isLast ? styles.studentItemLast : styles.studentItem}>
                <strong>{studentName}</strong> - Klasse: {studentClass}
              </div>
            );
          })}
        </div>
      )}
      
      {/* Footer */}
      <div style={styles.footer}>
        <div>Vielen Dank für Ihr Vertrauen in Kibundo!</div>
        <div style={{ marginTop: '10px' }}>
          Bei Fragen wenden Sie sich bitte an unseren Support.
        </div>
      </div>
    </div>
  );
};

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
          React.createElement(InvoiceTemplate, { invoice: invoice })
        );
        
        // Wait for rendering to complete
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Ensure container has content
        if (!container.firstChild || container.children.length === 0) {
          throw new Error('Invoice template did not render');
        }
        
        // Additional wait for images/fonts to load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate PDF
        await generatePdfFromComponent(container, {
          filename: fileName,
          margin: 10,
          html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: false,
            scrollY: -window.scrollY,
            scrollX: -window.scrollX
          }
        });
        
        // Clean up
        try {
          root.unmount();
        } catch (unmountError) {
          console.warn('Error unmounting:', unmountError);
        }
        try {
          if (container.parentElement) {
            document.body.removeChild(container);
          }
        } catch (removeError) {
          console.warn('Error removing container:', removeError);
        }
        return;
      }
      
      // For existing invoices, fetch the invoice data and generate PDF client-side
      let invoiceData = invoice;
      
      // Always try to fetch full invoice data with parent and student associations
      try {
        const response = await api.get(`/invoice/${invoice.id}`);
        invoiceData = response.data || invoice;
        
        // If parent data is not included, try to fetch parent with students
        if (!invoiceData.parent?.student && parentId) {
          try {
            const parentResponse = await api.get(`/parent/${parentId}`);
            if (parentResponse?.data?.data) {
              invoiceData.parent = {
                ...invoiceData.parent,
                ...parentResponse.data.data,
                student: parentResponse.data.data.student || parentResponse.data.data.students || []
              };
            }
          } catch (parentError) {
            console.warn('Could not fetch parent data:', parentError);
          }
        }
      } catch (fetchError) {
        console.warn('Could not fetch invoice details, using provided data:', fetchError);
        // Continue with the invoice data we have
      }
      
      // Generate PDF client-side using the invoice data
      const fileName = `Rechnung-${invoiceData.id}-${dayjs(invoiceData.created_at || new Date()).format('YYYY-MM-DD')}.pdf`;
      
      // Create a container for the invoice
      const container = document.createElement('div');
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.width = '800px';
      container.style.backgroundColor = '#ffffff';
      container.style.padding = '20px';
      document.body.appendChild(container);
      
      let root = null;
      
      try {
        console.log('📄 Starting PDF generation for invoice:', invoiceData.id);
        console.log('📄 Invoice data:', invoiceData);
        
        // Render the invoice component
        if (!ReactDOM || !ReactDOM.createRoot) {
          throw new Error('ReactDOM.createRoot is not available');
        }
        
        root = ReactDOM.createRoot(container);
        console.log('📄 Rendering invoice template...');
        
        root.render(
          React.createElement(InvoiceTemplate, { invoice: invoiceData })
        );
        
        // Wait for rendering to complete - increase wait time for better rendering
        console.log('📄 Waiting for React to render...');
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Ensure container has content
        if (!container.firstChild || container.children.length === 0) {
          console.error('❌ Container after render:', {
            hasFirstChild: !!container.firstChild,
            childrenCount: container.children.length,
            innerHTML: container.innerHTML.substring(0, 200)
          });
          throw new Error('Invoice template did not render - no content found');
        }
        
        console.log('✅ Invoice template rendered successfully');
        console.log('📄 Container content length:', container.innerHTML.length);
        
        // Additional wait for images/fonts to load
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Generate PDF with improved error handling
        console.log('📄 Starting PDF generation with html2canvas...');
        await generatePdfFromComponent(container, {
          filename: fileName,
          margin: 10,
          html2canvas: { 
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
            allowTaint: false,
            scrollY: -window.scrollY,
            scrollX: -window.scrollX,
            onclone: (clonedDoc) => {
              // Ensure styles are preserved in cloned document
              const clonedContainer = clonedDoc.querySelector('div');
              if (clonedContainer) {
                clonedContainer.style.width = '800px';
                clonedContainer.style.backgroundColor = '#ffffff';
              }
            }
          }
        });
        console.log('✅ PDF generated successfully');
      } catch (pdfError) {
        console.error('❌ PDF generation failed:', pdfError);
        console.error('❌ Error stack:', pdfError.stack);
        console.error('❌ Container state:', {
          exists: !!container,
          hasParent: !!container?.parentElement,
          childrenCount: container?.children?.length,
          innerHTML: container?.innerHTML?.substring(0, 100)
        });
        throw pdfError;
      } finally {
        // Clean up
        try {
          if (root) {
            root.unmount();
            console.log('✅ React root unmounted');
          }
        } catch (unmountError) {
          console.warn('⚠️ Error unmounting React root:', unmountError);
        }
        try {
          if (container && container.parentElement) {
            document.body.removeChild(container);
            console.log('✅ Container removed from DOM');
          }
        } catch (removeError) {
          console.warn('⚠️ Error removing container:', removeError);
        }
      }
      
      messageApi.success('Rechnung wurde heruntergeladen');
    } catch (error) {
      console.error('Fehler beim Herunterladen der Rechnung:', error);
      const errorMessage = error?.message || error?.toString() || 'Unknown error';
      console.error('Full error details:', {
        message: errorMessage,
        stack: error?.stack,
        invoice: invoice?.id
      });
      
      // Provide more specific error messages
      let userMessage = 'Rechnung konnte nicht heruntergeladen werden. Bitte versuchen Sie es später erneut.';
      if (errorMessage.includes('PDF generation')) {
        userMessage = 'PDF-Generierung fehlgeschlagen. Bitte versuchen Sie es erneut.';
      } else if (errorMessage.includes('Canvas')) {
        userMessage = 'Fehler beim Rendern der Rechnung. Bitte versuchen Sie es erneut.';
      } else if (errorMessage.includes('fetch')) {
        userMessage = 'Fehler beim Laden der Rechnungsdaten. Bitte überprüfen Sie Ihre Internetverbindung.';
      }
      
      messageApi.error(userMessage);
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
    // Always show "Active" for subscription status
    return <Badge status="success" text="Active" />;
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
              <Descriptions.Item label="Account Status">
                <Badge status="success" text="Active" />
              </Descriptions.Item>
              <Descriptions.Item label="Subscription Status">
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
                        <Badge status="success" text="Active" />
                        <Text strong>{planName}</Text>
                        {interval && interval !== 'N/A' && (
                          <Tag color="success">
                            {interval}
                          </Tag>
                        )}
                      </div>
                      {renewsDate && (
                        <Text type="secondary" className="text-xs">
                          Renews: {dayjs(renewsDate).format('MMM D, YYYY')}
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
