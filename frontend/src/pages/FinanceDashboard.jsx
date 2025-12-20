import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../components/ui/dialog';
import { 
  DollarSign, FileText, CreditCard, TrendingUp, 
  CheckCircle, Clock, AlertCircle, LogOut, RefreshCw,
  Check, X, Plus, FileX, Receipt
} from 'lucide-react';

const FinanceDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [payments, setPayments] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  
  // Payment form state
  const [paymentForm, setPaymentForm] = useState({
    invoice_id: '',
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'bank_transfer',
    reference_number: '',
    notes: '',
    create_cn: false,
    cn_percentage: '4',
    cn_reason: 'HRDCorp Levy Deduction'
  });
  const [pendingInvoices, setPendingInvoices] = useState([]);
  const [creditNotes, setCreditNotes] = useState([]);
  const [showCNDialog, setShowCNDialog] = useState(false);

  useEffect(() => {
    loadDashboard();
    loadInvoices();
    loadPendingInvoices();
    loadCreditNotes();
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
      const response = await axiosInstance.get('/finance/invoices');
      setInvoices(response.data);
    } catch (error) {
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const loadPendingInvoices = async () => {
    try {
      const response = await axiosInstance.get('/finance/invoices');
      // Filter to show only issued invoices (ready for payment)
      const pending = response.data.filter(inv => inv.status === 'issued' || inv.status === 'approved');
      setPendingInvoices(pending);
    } catch (error) {
      console.error('Failed to load pending invoices');
    }
  };

  const loadCreditNotes = async () => {
    try {
      const response = await axiosInstance.get('/finance/credit-notes');
      setCreditNotes(response.data);
    } catch (error) {
      console.error('Failed to load credit notes');
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

  const loadPayments = async () => {
    try {
      const response = await axiosInstance.get('/finance/payments');
      setPayments(response.data);
    } catch (error) {
      console.error('Failed to load payments');
    }
  };

  const handleApproveInvoice = async (invoiceId) => {
    try {
      await axiosInstance.post(`/finance/invoices/${invoiceId}/approve`);
      toast.success('Invoice approved');
      loadInvoices();
      loadDashboard();
      loadPendingInvoices();
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
      loadPendingInvoices();
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
      loadPendingInvoices();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to cancel invoice');
    }
  };

  const handleRecordPayment = async () => {
    if (!paymentForm.invoice_id) {
      toast.error('Please select an invoice');
      return;
    }
    if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    try {
      // Record the payment
      await axiosInstance.post('/finance/payments', {
        invoice_id: paymentForm.invoice_id,
        amount: parseFloat(paymentForm.amount),
        payment_date: paymentForm.payment_date,
        payment_method: paymentForm.payment_method,
        reference_number: paymentForm.reference_number,
        notes: paymentForm.notes
      });

      // If CN checkbox is checked, create credit note
      if (paymentForm.create_cn) {
        const selectedInvoice = pendingInvoices.find(inv => inv.id === paymentForm.invoice_id);
        if (selectedInvoice) {
          await axiosInstance.post(`/finance/session/${selectedInvoice.session_id}/credit-note`, {
            reason: paymentForm.cn_reason,
            description: `${paymentForm.cn_percentage}% deduction`,
            percentage: parseFloat(paymentForm.cn_percentage),
            base_amount: selectedInvoice.total_amount
          });
          toast.success('Credit Note created');
        }
      }

      toast.success('Payment recorded successfully');
      
      // Reset form
      setPaymentForm({
        invoice_id: '',
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_transfer',
        reference_number: '',
        notes: '',
        create_cn: false,
        cn_percentage: '4',
        cn_reason: 'HRDCorp Levy Deduction'
      });
      
      loadInvoices();
      loadDashboard();
      loadPendingInvoices();
      loadPayments();
      loadCreditNotes();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to record payment');
    }
  };

  const handleInvoiceSelect = (invoiceId) => {
    const selected = pendingInvoices.find(inv => inv.id === invoiceId);
    setPaymentForm({
      ...paymentForm,
      invoice_id: invoiceId,
      amount: selected?.total_amount?.toString() || ''
    });
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      auto_draft: { color: 'bg-gray-500', label: 'Draft' },
      draft: { color: 'bg-gray-500', label: 'Draft' },
      finance_review: { color: 'bg-yellow-500', label: 'Under Review' },
      approved: { color: 'bg-blue-500', label: 'Approved' },
      issued: { color: 'bg-purple-500', label: 'Issued' },
      paid: { color: 'bg-green-500', label: 'Paid' },
      cancelled: { color: 'bg-red-500', label: 'Cancelled' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-400', label: status };
    return <Badge className={`${config.color} text-white`}>{config.label}</Badge>;
  };

  // Filter invoices based on status
  const filteredInvoices = statusFilter === 'all' 
    ? invoices 
    : statusFilter === 'pending' 
      ? invoices.filter(inv => !['paid', 'cancelled'].includes(inv.status))
      : invoices.filter(inv => inv.status === statusFilter);

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
            <TabsTrigger value="credit-notes">Credit Notes</TabsTrigger>
            <TabsTrigger value="audit">Audit Log</TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Total Invoices
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-900">
                    {dashboard?.total_invoices || 0}
                  </div>
                  <p className="text-sm text-blue-600">
                    RM {(dashboard?.total_invoiced || 0).toLocaleString()}
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-green-700 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Collected
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-900">
                    RM {(dashboard?.total_collected || 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-green-600">
                    {dashboard?.paid_invoices || 0} invoices paid
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Outstanding
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-900">
                    RM {(dashboard?.outstanding || 0).toLocaleString()}
                  </div>
                  <p className="text-sm text-orange-600">
                    {dashboard?.pending_invoices || 0} pending
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Payables
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-900">
                    RM {((dashboard?.pending_trainer_fees || 0) + (dashboard?.pending_coordinator_fees || 0)).toLocaleString()}
                  </div>
                  <p className="text-sm text-purple-600">
                    Staff payments pending
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  <Button onClick={() => setActiveTab('payments')} className="bg-green-600 hover:bg-green-700">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Record Payment
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('credit-notes')}>
                    <FileX className="w-4 h-4 mr-2" />
                    View Credit Notes
                  </Button>
                  <Button variant="outline" onClick={() => { loadInvoices(); loadDashboard(); }}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Data
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center flex-wrap gap-4">
                  <CardTitle>Invoice Management</CardTitle>
                  <div className="flex gap-2">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Filter by status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Invoices</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="draft">Draft</SelectItem>
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
                  <div className="text-center py-8">Loading invoices...</div>
                ) : filteredInvoices.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No invoices found</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Invoice #</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Company</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Session</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Amount</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {filteredInvoices.map((invoice) => (
                          <tr key={invoice.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium">{invoice.invoice_number}</td>
                            <td className="px-4 py-3 text-sm">{invoice.company_name || '-'}</td>
                            <td className="px-4 py-3 text-sm">{invoice.session_name || '-'}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium">RM {invoice.total_amount?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">{getStatusBadge(invoice.status)}</td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex justify-center gap-1">
                                {(invoice.status === 'auto_draft' || invoice.status === 'draft') && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => handleApproveInvoice(invoice.id)}
                                    title="Approve"
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
                                    title="Issue"
                                  >
                                    <FileText className="w-4 h-4" />
                                  </Button>
                                )}
                                {invoice.status === 'issued' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => {
                                      handleInvoiceSelect(invoice.id);
                                      setActiveTab('payments');
                                    }}
                                    title="Record Payment"
                                  >
                                    <CreditCard className="w-4 h-4" />
                                  </Button>
                                )}
                                {!['paid', 'cancelled'].includes(invoice.status) && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="text-red-600"
                                    onClick={() => handleCancelInvoice(invoice.id)}
                                    title="Cancel"
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Record Payment Form */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    Record Payment
                  </CardTitle>
                  <CardDescription>Record payment received for an invoice</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Select Invoice (Pending Only)</Label>
                    <Select value={paymentForm.invoice_id} onValueChange={handleInvoiceSelect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an invoice to pay" />
                      </SelectTrigger>
                      <SelectContent>
                        {pendingInvoices.length === 0 ? (
                          <SelectItem value="" disabled>No pending invoices</SelectItem>
                        ) : (
                          pendingInvoices.map(inv => (
                            <SelectItem key={inv.id} value={inv.id}>
                              {inv.invoice_number} - {inv.company_name || inv.session_name} (RM {inv.total_amount?.toLocaleString()})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Payment Amount (RM)</Label>
                      <Input 
                        type="number" 
                        value={paymentForm.amount}
                        onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <Label>Payment Date</Label>
                      <Input 
                        type="date" 
                        value={paymentForm.payment_date}
                        onChange={(e) => setPaymentForm({...paymentForm, payment_date: e.target.value})}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Payment Method</Label>
                      <Select value={paymentForm.payment_method} onValueChange={(v) => setPaymentForm({...paymentForm, payment_method: v})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                          <SelectItem value="cheque">Cheque</SelectItem>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="online">Online Payment</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Reference Number</Label>
                      <Input 
                        value={paymentForm.reference_number}
                        onChange={(e) => setPaymentForm({...paymentForm, reference_number: e.target.value})}
                        placeholder="Transaction ref"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label>Notes (Optional)</Label>
                    <Input 
                      value={paymentForm.notes}
                      onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                      placeholder="Additional notes"
                    />
                  </div>
                  
                  {/* Credit Note Option */}
                  <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-3">
                    <div className="flex items-center gap-2">
                      <input 
                        type="checkbox" 
                        id="create-cn"
                        checked={paymentForm.create_cn}
                        onChange={(e) => setPaymentForm({...paymentForm, create_cn: e.target.checked})}
                      />
                      <Label htmlFor="create-cn" className="text-red-700 font-medium">
                        Create Credit Note (e.g., HRDCorp deduction)
                      </Label>
                    </div>
                    {paymentForm.create_cn && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-sm">Deduction %</Label>
                          <Input 
                            type="number" 
                            value={paymentForm.cn_percentage}
                            onChange={(e) => setPaymentForm({...paymentForm, cn_percentage: e.target.value})}
                            placeholder="4"
                          />
                        </div>
                        <div>
                          <Label className="text-sm">Reason</Label>
                          <Input 
                            value={paymentForm.cn_reason}
                            onChange={(e) => setPaymentForm({...paymentForm, cn_reason: e.target.value})}
                            placeholder="HRDCorp Levy"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex gap-2">
                    <Button onClick={handleRecordPayment} className="bg-green-600 hover:bg-green-700 flex-1">
                      <CreditCard className="w-4 h-4 mr-2" />
                      Record Payment
                    </Button>
                    <Button variant="outline" onClick={() => setPaymentForm({
                      invoice_id: '',
                      amount: '',
                      payment_date: new Date().toISOString().split('T')[0],
                      payment_method: 'bank_transfer',
                      reference_number: '',
                      notes: '',
                      create_cn: false,
                      cn_percentage: '4',
                      cn_reason: 'HRDCorp Levy Deduction'
                    })}>
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Payments */}
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Recent Payments</CardTitle>
                    <Button variant="outline" size="sm" onClick={loadPayments}>
                      <RefreshCw className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {payments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <Receipt className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                      <p>No payments recorded yet</p>
                      <Button variant="outline" size="sm" className="mt-2" onClick={loadPayments}>
                        Load Payments
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {payments.slice(0, 10).map((payment) => (
                        <div key={payment.id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{payment.invoice_number}</p>
                              <p className="text-sm text-gray-500">{payment.payment_date}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">RM {payment.amount?.toLocaleString()}</p>
                              <p className="text-xs text-gray-500">{payment.payment_method}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Credit Notes Tab */}
          <TabsContent value="credit-notes">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileX className="w-5 h-5 text-red-600" />
                      Credit Notes
                    </CardTitle>
                    <CardDescription>Track deductions like HRDCorp levy</CardDescription>
                  </div>
                  <Button variant="outline" onClick={loadCreditNotes}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {creditNotes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <FileX className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p>No credit notes yet</p>
                    <p className="text-sm">Credit notes are created when recording payments with deductions</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">CN Number</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Invoice</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Company</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Reason</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-gray-500">Amount</th>
                          <th className="px-4 py-3 text-center text-sm font-medium text-gray-500">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {creditNotes.map((cn) => (
                          <tr key={cn.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-sm font-medium text-red-600">{cn.cn_number}</td>
                            <td className="px-4 py-3 text-sm">{cn.invoice_number || '-'}</td>
                            <td className="px-4 py-3 text-sm">{cn.company_name || '-'}</td>
                            <td className="px-4 py-3 text-sm">{cn.reason}</td>
                            <td className="px-4 py-3 text-sm text-right font-medium text-red-600">- RM {cn.amount?.toLocaleString()}</td>
                            <td className="px-4 py-3 text-center">
                              <Badge className={cn.status === 'approved' ? 'bg-green-500' : 'bg-yellow-500'}>
                                {cn.status}
                              </Badge>
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
                    <p>Click 'Load Logs' to view audit history</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {auditLogs.map((log, idx) => (
                      <div key={log.id || idx} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">{log.action} - {log.entity_type}</p>
                            <p className="text-sm text-gray-500">By: {log.changed_by_name}</p>
                            {log.remark && <p className="text-sm text-gray-400">{log.remark}</p>}
                          </div>
                          <p className="text-xs text-gray-400">
                            {log.timestamp ? new Date(log.timestamp).toLocaleString() : '-'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default FinanceDashboard;
