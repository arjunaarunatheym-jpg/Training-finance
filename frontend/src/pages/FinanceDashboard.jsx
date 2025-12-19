import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { 
  DollarSign, FileText, CreditCard, Users, TrendingUp, 
  CheckCircle, Clock, AlertCircle, LogOut, RefreshCw,
  Eye, Check, X, Calendar, Building, Receipt
} from 'lucide-react';

const FinanceDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    loadDashboard();
    loadInvoices();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await axiosInstance.get('/finance/dashboard');
      setDashboard(response.data);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  };

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const url = statusFilter === 'all' ? '/finance/invoices' : `/finance/invoices?status=${statusFilter}`;
      const response = await axiosInstance.get(url);
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await axiosInstance.get('/finance/audit-log?limit=50');
      setAuditLogs(response.data);
    } catch (error) {
      toast.error('Failed to load audit logs');
    }
  };

  const handleApproveInvoice = async (invoiceId) => {
    try {
      await axiosInstance.post(`/finance/invoices/${invoiceId}/approve`);
      toast.success('Invoice approved');
      loadInvoices();
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to approve invoice');
    }
  };

  const handleIssueInvoice = async (invoiceId) => {
    try {
      await axiosInstance.post(`/finance/invoices/${invoiceId}/issue`);
      toast.success('Invoice issued');
      loadInvoices();
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to issue invoice');
    }
  };

  const handleCancelInvoice = async (invoiceId) => {
    const reason = prompt('Enter cancellation reason:');
    if (!reason) return;
    
    try {
      await axiosInstance.post(`/finance/invoices/${invoiceId}/cancel?reason=${encodeURIComponent(reason)}`);
      toast.success('Invoice cancelled');
      loadInvoices();
      loadDashboard();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel invoice');
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      auto_draft: { color: 'bg-gray-500', label: 'Draft' },
      finance_review: { color: 'bg-yellow-500', label: 'Under Review' },
      approved: { color: 'bg-blue-500', label: 'Approved' },
      issued: { color: 'bg-purple-500', label: 'Issued' },
      paid: { color: 'bg-green-500', label: 'Paid' },
      cancelled: { color: 'bg-red-500', label: 'Cancelled' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-400', label: status };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-green-600" />
            <div>
              <h1 className="text-xl font-bold text-gray-900">Finance Portal</h1>
              <p className="text-sm text-gray-500">Welcome, {user?.full_name}</p>
            </div>
          </div>
          <Button variant="outline" onClick={onLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            {dashboard && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Total Invoices</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{dashboard.invoices.total}</div>
                      <p className="text-xs text-gray-500 mt-1">
                        {dashboard.invoices.draft} draft, {dashboard.invoices.issued} issued
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Total Issued</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">
                        RM {dashboard.financials.total_issued.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Collected</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">
                        RM {dashboard.financials.total_collected.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-gray-500">Outstanding</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        RM {dashboard.financials.outstanding_receivables.toLocaleString()}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Invoice Status Overview */}
                <Card>
                  <CardHeader>
                    <CardTitle>Invoice Status Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div className="text-center p-4 bg-gray-100 rounded-lg">
                        <div className="text-2xl font-bold">{dashboard.invoices.draft}</div>
                        <div className="text-sm text-gray-500">Draft</div>
                      </div>
                      <div className="text-center p-4 bg-blue-100 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">{dashboard.invoices.approved}</div>
                        <div className="text-sm text-blue-600">Approved</div>
                      </div>
                      <div className="text-center p-4 bg-purple-100 rounded-lg">
                        <div className="text-2xl font-bold text-purple-600">{dashboard.invoices.issued}</div>
                        <div className="text-sm text-purple-600">Issued</div>
                      </div>
                      <div className="text-center p-4 bg-green-100 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">{dashboard.invoices.paid}</div>
                        <div className="text-sm text-green-600">Paid</div>
                      </div>
                      <div className="text-center p-4 bg-orange-100 rounded-lg">
                        <div className="text-2xl font-bold text-orange-600">
                          RM {dashboard.payables.pending_total.toLocaleString()}
                        </div>
                        <div className="text-sm text-orange-600">Pending Payables</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Invoices</CardTitle>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); }}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="auto_draft">Draft</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="issued">Issued</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="outline" onClick={loadInvoices}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading...</div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No invoices found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-3 px-2">Invoice #</th>
                          <th className="text-left py-3 px-2">Company</th>
                          <th className="text-left py-3 px-2">Programme</th>
                          <th className="text-left py-3 px-2">Dates</th>
                          <th className="text-right py-3 px-2">Amount</th>
                          <th className="text-center py-3 px-2">Status</th>
                          <th className="text-center py-3 px-2">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((invoice) => (
                          <tr key={invoice.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 px-2 font-mono text-sm">{invoice.invoice_number}</td>
                            <td className="py-3 px-2">{invoice.company_name || '-'}</td>
                            <td className="py-3 px-2">{invoice.programme_name || '-'}</td>
                            <td className="py-3 px-2 text-sm">{invoice.training_dates || '-'}</td>
                            <td className="py-3 px-2 text-right font-medium">
                              RM {invoice.total_amount?.toLocaleString() || '0'}
                            </td>
                            <td className="py-3 px-2 text-center">{getStatusBadge(invoice.status)}</td>
                            <td className="py-3 px-2">
                              <div className="flex justify-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => setSelectedInvoice(invoice)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                {['auto_draft', 'finance_review'].includes(invoice.status) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => handleApproveInvoice(invoice.id)}
                                  >
                                    <Check className="w-4 h-4" />
                                  </Button>
                                )}
                                {invoice.status === 'approved' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-blue-600"
                                    onClick={() => handleIssueInvoice(invoice.id)}
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                )}
                                {!['paid', 'cancelled'].includes(invoice.status) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => handleCancelInvoice(invoice.id)}
                                  >
                                    <X className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle>Payment Records</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500 text-center py-8">
                  Payment recording coming soon. Use invoice actions to manage payments.
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Audit Log Tab */}
          <TabsContent value="audit">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Audit Log</CardTitle>
                  <Button variant="outline" onClick={loadAuditLogs}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Load Logs
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    Click "Load Logs" to view audit history
                  </div>
                ) : (
                  <div className="space-y-2">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="p-3 bg-gray-50 rounded-lg text-sm">
                        <div className="flex justify-between">
                          <span className="font-medium">{log.action} - {log.entity_type}</span>
                          <span className="text-gray-500">{new Date(log.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="text-gray-600">By: {log.changed_by_name}</div>
                        {log.reason && <div className="text-gray-500">Reason: {log.reason}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Invoice Detail Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{selectedInvoice.invoice_number}</h2>
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <Button variant="ghost" onClick={() => setSelectedInvoice(null)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Company</p>
                  <p className="font-medium">{selectedInvoice.company_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Programme</p>
                  <p className="font-medium">{selectedInvoice.programme_name || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Training Dates</p>
                  <p className="font-medium">{selectedInvoice.training_dates || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Venue</p>
                  <p className="font-medium">{selectedInvoice.venue || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">PAX</p>
                  <p className="font-medium">{selectedInvoice.pax}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Amount</p>
                  <p className="font-medium text-lg">RM {selectedInvoice.total_amount?.toLocaleString() || '0'}</p>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                {['auto_draft', 'finance_review'].includes(selectedInvoice.status) && (
                  <Button onClick={() => { handleApproveInvoice(selectedInvoice.id); setSelectedInvoice(null); }}>
                    Approve Invoice
                  </Button>
                )}
                {selectedInvoice.status === 'approved' && (
                  <Button onClick={() => { handleIssueInvoice(selectedInvoice.id); setSelectedInvoice(null); }}>
                    Issue Invoice
                  </Button>
                )}
                <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default FinanceDashboard;
