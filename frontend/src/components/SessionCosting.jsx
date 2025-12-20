import React, { useState, useEffect } from 'react';
import { axiosInstance } from '../App';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { 
  DollarSign, Users, Truck, Calculator, Plus, Trash2, Save, 
  FileText, TrendingUp, User, Building2, Calendar
} from 'lucide-react';

const SessionCosting = ({ session, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [costing, setCosting] = useState(null);
  const [expenseCategories, setExpenseCategories] = useState([]);
  
  // Form states
  const [invoiceData, setInvoiceData] = useState({
    pricing_type: 'lumpsum',
    lumpsum_amount: '',
    per_pax_rate: '',
    tax_rate: '',
  });
  
  const [trainerFees, setTrainerFees] = useState([]);
  const [coordinatorFee, setCoordinatorFee] = useState({ num_days: 1, daily_rate: 50 });
  const [expenses, setExpenses] = useState([]);
  const [marketing, setMarketing] = useState({
    marketing_user_id: '',
    commission_type: 'percentage',
    commission_rate: '',
    fixed_amount: '',
    create_new: false,
    full_name: '',
    id_number: '',
  });
  const [marketingUsers, setMarketingUsers] = useState([]);

  useEffect(() => {
    loadData();
  }, [session.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [costingRes, categoriesRes, marketingUsersRes] = await Promise.all([
        axiosInstance.get(`/finance/session/${session.id}/costing`),
        axiosInstance.get('/finance/expense-categories'),
        axiosInstance.get('/finance/marketing-users').catch(() => ({ data: [] }))
      ]);
      
      setCosting(costingRes.data);
      setExpenseCategories(categoriesRes.data);
      setMarketingUsers(marketingUsersRes.data);
      
      // Initialize trainer fees from session
      if (session.trainer_assignments?.length > 0) {
        const existingFees = costingRes.data.trainer_fees || [];
        const fees = session.trainer_assignments.map(ta => {
          const existing = existingFees.find(f => f.trainer_id === ta.trainer_id);
          return {
            trainer_id: ta.trainer_id,
            trainer_name: existing?.trainer_name || ta.trainer_name || 'Unknown Trainer',
            role: ta.role,
            fee_amount: existing?.fee_amount || '',
            remark: existing?.remark || ''
          };
        });
        setTrainerFees(fees);
      } else if (costingRes.data.trainer_fees?.length > 0) {
        // If session doesn't have trainer_assignments but costing has trainer fees
        setTrainerFees(costingRes.data.trainer_fees.map(f => ({
          trainer_id: f.trainer_id,
          trainer_name: f.trainer_name || 'Unknown Trainer',
          role: f.role || 'trainer',
          fee_amount: f.fee_amount || '',
          remark: f.remark || ''
        })));
      }
      
      // Initialize coordinator fee
      if (costingRes.data.coordinator_fee) {
        setCoordinatorFee(costingRes.data.coordinator_fee);
      } else if (session.coordinator_id) {
        // Calculate days from session dates
        const start = new Date(session.start_date);
        const end = new Date(session.end_date);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        setCoordinatorFee({ num_days: days, daily_rate: 50 });
      }
      
      // Initialize expenses
      if (costingRes.data.expenses?.length > 0) {
        setExpenses(costingRes.data.expenses);
      }
      
      // Initialize marketing
      if (costingRes.data.marketing) {
        setMarketing({
          marketing_user_id: costingRes.data.marketing.marketing_user_id,
          commission_type: costingRes.data.marketing.commission_type,
          commission_rate: costingRes.data.marketing.commission_rate || '',
          fixed_amount: costingRes.data.marketing.fixed_amount || '',
          create_new: false,
          full_name: '',
          id_number: ''
        });
      }
      
      // Initialize invoice data
      if (costingRes.data.invoice_total > 0) {
        setInvoiceData({
          pricing_type: 'lumpsum',
          lumpsum_amount: costingRes.data.invoice_total,
          per_pax_rate: '',
          tax_rate: costingRes.data.less_tax > 0 ? (costingRes.data.less_tax / costingRes.data.invoice_total * 100).toFixed(1) : ''
        });
      }
      
    } catch (error) {
      toast.error('Failed to load costing data');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const addExpense = () => {
    setExpenses([...expenses, {
      category: '',
      description: '',
      expense_type: 'fixed',
      estimated_amount: '',
      actual_amount: '',
      remark: ''
    }]);
  };

  const removeExpense = (index) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  const updateExpense = (index, field, value) => {
    const updated = [...expenses];
    updated[index][field] = value;
    setExpenses(updated);
  };

  const saveAll = async () => {
    setSaving(true);
    try {
      // Save invoice/line items
      const invoicePayload = {
        pricing_type: invoiceData.pricing_type,
        line_items: invoiceData.pricing_type === 'lumpsum' 
          ? [{ description: 'Training Course Fee', quantity: 1, unit_price: parseFloat(invoiceData.lumpsum_amount) || 0, amount: parseFloat(invoiceData.lumpsum_amount) || 0 }]
          : [{ description: 'Training Fee per Participant', quantity: costing?.pax || 0, unit_price: parseFloat(invoiceData.per_pax_rate) || 0, amount: (costing?.pax || 0) * (parseFloat(invoiceData.per_pax_rate) || 0) }],
        subtotal: invoiceData.pricing_type === 'lumpsum' 
          ? parseFloat(invoiceData.lumpsum_amount) || 0 
          : (costing?.pax || 0) * (parseFloat(invoiceData.per_pax_rate) || 0),
        tax_rate: parseFloat(invoiceData.tax_rate) || 0,
        tax_amount: (invoiceData.pricing_type === 'lumpsum' 
          ? parseFloat(invoiceData.lumpsum_amount) || 0 
          : (costing?.pax || 0) * (parseFloat(invoiceData.per_pax_rate) || 0)) * (parseFloat(invoiceData.tax_rate) || 0) / 100,
        total_amount: invoiceData.pricing_type === 'lumpsum' 
          ? parseFloat(invoiceData.lumpsum_amount) || 0 
          : (costing?.pax || 0) * (parseFloat(invoiceData.per_pax_rate) || 0)
      };
      
      // Get invoice ID from session
      const invoices = await axiosInstance.get('/finance/invoices');
      const sessionInvoice = invoices.data.find(inv => inv.session_id === session.id);
      if (sessionInvoice) {
        await axiosInstance.put(`/finance/invoices/${sessionInvoice.id}`, invoicePayload);
      }
      
      // Save trainer fees
      const validFees = trainerFees.filter(f => f.fee_amount);
      if (validFees.length > 0) {
        await axiosInstance.post(`/finance/session/${session.id}/trainer-fees`, validFees);
      }
      
      // Save coordinator fee
      if (session.coordinator_id && coordinatorFee.num_days > 0) {
        await axiosInstance.post(`/finance/session/${session.id}/coordinator-fee`, {
          coordinator_id: session.coordinator_id,
          num_days: coordinatorFee.num_days,
          daily_rate: coordinatorFee.daily_rate
        });
      }
      
      // Save expenses
      const validExpenses = expenses.filter(e => e.category && (e.estimated_amount || e.actual_amount));
      if (validExpenses.length > 0) {
        await axiosInstance.post(`/finance/session/${session.id}/expenses`, validExpenses);
      }
      
      // Save marketing
      if (marketing.marketing_user_id || marketing.create_new) {
        await axiosInstance.post(`/finance/session/${session.id}/marketing`, {
          marketing_user_id: marketing.marketing_user_id || null,
          commission_type: marketing.commission_type,
          commission_rate: parseFloat(marketing.commission_rate) || 0,
          fixed_amount: parseFloat(marketing.fixed_amount) || 0,
          create_new: marketing.create_new,
          full_name: marketing.full_name,
          id_number: marketing.id_number
        });
      }
      
      toast.success('Costing saved successfully');
      loadData(); // Refresh
      if (onUpdate) onUpdate();
      
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to save costing');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const calculateProfit = () => {
    const invoiceTotal = invoiceData.pricing_type === 'lumpsum' 
      ? parseFloat(invoiceData.lumpsum_amount) || 0 
      : (costing?.pax || 0) * (parseFloat(invoiceData.per_pax_rate) || 0);
    const taxAmount = invoiceTotal * (parseFloat(invoiceData.tax_rate) || 0) / 100;
    const grossRevenue = invoiceTotal - taxAmount;
    
    const trainerTotal = trainerFees.reduce((sum, f) => sum + (parseFloat(f.fee_amount) || 0), 0);
    const coordTotal = coordinatorFee.num_days * coordinatorFee.daily_rate;
    const expensesTotal = expenses.reduce((sum, e) => sum + (parseFloat(e.actual_amount) || parseFloat(e.estimated_amount) || 0), 0);
    
    const profitBeforeMarketing = grossRevenue - trainerTotal - coordTotal - expensesTotal;
    
    let marketingAmount = 0;
    if (marketing.commission_type === 'percentage') {
      marketingAmount = profitBeforeMarketing * (parseFloat(marketing.commission_rate) || 0) / 100;
    } else {
      marketingAmount = parseFloat(marketing.fixed_amount) || 0;
    }
    
    const finalProfit = profitBeforeMarketing - marketingAmount;
    const profitPct = grossRevenue > 0 ? (finalProfit / grossRevenue * 100) : 0;
    
    return { invoiceTotal, taxAmount, grossRevenue, trainerTotal, coordTotal, expensesTotal, marketingAmount, finalProfit, profitPct };
  };

  if (loading) {
    return <div className="p-8 text-center">Loading costing data...</div>;
  }

  const profit = calculateProfit();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-5xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <DollarSign className="w-6 h-6 text-green-600" />
              Session Costing
            </h2>
            <p className="text-sm text-gray-500">{session.name}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={saveAll} disabled={saving} className="bg-green-600 hover:bg-green-700">
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save All'}
            </Button>
          </div>
        </div>

        <div className="p-4 space-y-6">
          {/* Session Info */}
          <Card className="bg-blue-50">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><Building2 className="w-4 h-4 inline mr-1" /> {costing?.company_name}</div>
                <div><Calendar className="w-4 h-4 inline mr-1" /> {costing?.training_dates}</div>
                <div><Users className="w-4 h-4 inline mr-1" /> {costing?.pax} Participants</div>
              </div>
            </CardContent>
          </Card>

          {/* Invoice / Revenue */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Invoice / Revenue
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Pricing Type</Label>
                  <Select value={invoiceData.pricing_type} onValueChange={(v) => setInvoiceData({...invoiceData, pricing_type: v})}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="lumpsum">Lump Sum</SelectItem>
                      <SelectItem value="per_pax">Per Participant</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {invoiceData.pricing_type === 'lumpsum' ? (
                  <div>
                    <Label>Total Amount (RM)</Label>
                    <Input 
                      type="number" 
                      value={invoiceData.lumpsum_amount} 
                      onChange={(e) => setInvoiceData({...invoiceData, lumpsum_amount: e.target.value})}
                      placeholder="e.g. 8000"
                    />
                  </div>
                ) : (
                  <div>
                    <Label>Rate Per Participant (RM)</Label>
                    <Input 
                      type="number" 
                      value={invoiceData.per_pax_rate} 
                      onChange={(e) => setInvoiceData({...invoiceData, per_pax_rate: e.target.value})}
                      placeholder="e.g. 400"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Total: RM {((costing?.pax || 0) * (parseFloat(invoiceData.per_pax_rate) || 0)).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
              <div className="w-1/2">
                <Label>SST/Tax Rate (%)</Label>
                <Input 
                  type="number" 
                  value={invoiceData.tax_rate} 
                  onChange={(e) => setInvoiceData({...invoiceData, tax_rate: e.target.value})}
                  placeholder="e.g. 6"
                />
              </div>
            </CardContent>
          </Card>

          {/* Trainer Fees */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5 text-purple-600" />
                Trainer Fees
              </CardTitle>
              <CardDescription>Set custom fee for each trainer assigned to this session</CardDescription>
            </CardHeader>
            <CardContent>
              {trainerFees.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No trainers assigned to this session</p>
              ) : (
                <div className="space-y-3">
                  {trainerFees.map((fee, index) => (
                    <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium">{fee.trainer_name}</p>
                        <Badge variant="outline" className="text-xs">{fee.role}</Badge>
                      </div>
                      <div className="w-32">
                        <Input 
                          type="number" 
                          value={fee.fee_amount} 
                          onChange={(e) => {
                            const updated = [...trainerFees];
                            updated[index].fee_amount = e.target.value;
                            setTrainerFees(updated);
                          }}
                          placeholder="Fee (RM)"
                        />
                      </div>
                      <div className="w-40">
                        <Input 
                          value={fee.remark || ''} 
                          onChange={(e) => {
                            const updated = [...trainerFees];
                            updated[index].remark = e.target.value;
                            setTrainerFees(updated);
                          }}
                          placeholder="Remark"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Coordinator Fee */}
          {session.coordinator_id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-pink-600" />
                  Coordinator Fee
                </CardTitle>
                <CardDescription>RM {coordinatorFee.daily_rate} per day</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4">
                  <div>
                    <Label>Number of Days</Label>
                    <Input 
                      type="number" 
                      value={coordinatorFee.num_days} 
                      onChange={(e) => setCoordinatorFee({...coordinatorFee, num_days: parseInt(e.target.value) || 1})}
                      className="w-24"
                    />
                  </div>
                  <div>
                    <Label>Daily Rate (RM)</Label>
                    <Input 
                      type="number" 
                      value={coordinatorFee.daily_rate} 
                      onChange={(e) => setCoordinatorFee({...coordinatorFee, daily_rate: parseFloat(e.target.value) || 50})}
                      className="w-24"
                    />
                  </div>
                  <div className="pt-6">
                    <Badge className="bg-pink-100 text-pink-800">
                      Total: RM {(coordinatorFee.num_days * coordinatorFee.daily_rate).toLocaleString()}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Expenses */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Truck className="w-5 h-5 text-orange-600" />
                    Training Expenses
                  </CardTitle>
                  <CardDescription>Estimated and actual expenses</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={addExpense}>
                  <Plus className="w-4 h-4 mr-1" /> Add Expense
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No expenses added yet</p>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense, index) => (
                    <div key={index} className="grid grid-cols-6 gap-2 items-center p-3 bg-gray-50 rounded-lg">
                      <Select value={expense.category} onValueChange={(v) => updateExpense(index, 'category', v)}>
                        <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
                        <SelectContent>
                          {expenseCategories.map(cat => (
                            <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input 
                        value={expense.description || ''} 
                        onChange={(e) => updateExpense(index, 'description', e.target.value)}
                        placeholder="Description"
                      />
                      <Input 
                        type="number"
                        value={expense.estimated_amount || ''} 
                        onChange={(e) => updateExpense(index, 'estimated_amount', e.target.value)}
                        placeholder="Estimated (RM)"
                      />
                      <Input 
                        type="number"
                        value={expense.actual_amount || ''} 
                        onChange={(e) => updateExpense(index, 'actual_amount', e.target.value)}
                        placeholder="Actual (RM)"
                      />
                      <Input 
                        value={expense.remark || ''} 
                        onChange={(e) => updateExpense(index, 'remark', e.target.value)}
                        placeholder="Remark"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeExpense(index)}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Marketing Commission */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Marketing Commission
              </CardTitle>
              <CardDescription>Commission is calculated from PROFIT (not gross revenue)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="create-new-marketing"
                  checked={marketing.create_new}
                  onChange={(e) => setMarketing({...marketing, create_new: e.target.checked, marketing_user_id: ''})}
                />
                <Label htmlFor="create-new-marketing">Create new marketing person</Label>
              </div>
              
              {marketing.create_new ? (
                <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg">
                  <div>
                    <Label>Full Name *</Label>
                    <Input 
                      value={marketing.full_name} 
                      onChange={(e) => setMarketing({...marketing, full_name: e.target.value})}
                      placeholder="Marketing person name"
                    />
                  </div>
                  <div>
                    <Label>IC Number *</Label>
                    <Input 
                      value={marketing.id_number} 
                      onChange={(e) => setMarketing({...marketing, id_number: e.target.value})}
                      placeholder="IC number"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label>Select Marketing Person</Label>
                  <Select 
                    value={marketing.marketing_user_id || "none"} 
                    onValueChange={(v) => setMarketing({...marketing, marketing_user_id: v === "none" ? "" : v})}
                  >
                    <SelectTrigger><SelectValue placeholder="Select marketing person" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {marketingUsers.map(user => (
                        <SelectItem key={user.id} value={user.id}>{user.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              {(marketing.marketing_user_id || marketing.create_new) && (
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label>Commission Type</Label>
                    <Select 
                      value={marketing.commission_type} 
                      onValueChange={(v) => setMarketing({...marketing, commission_type: v})}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">Percentage of Profit</SelectItem>
                        <SelectItem value="fixed">Fixed Amount</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {marketing.commission_type === 'percentage' ? (
                    <div>
                      <Label>Commission Rate (%)</Label>
                      <Input 
                        type="number"
                        value={marketing.commission_rate} 
                        onChange={(e) => setMarketing({...marketing, commission_rate: e.target.value})}
                        placeholder="e.g. 10"
                      />
                    </div>
                  ) : (
                    <div>
                      <Label>Fixed Amount (RM)</Label>
                      <Input 
                        type="number"
                        value={marketing.fixed_amount} 
                        onChange={(e) => setMarketing({...marketing, fixed_amount: e.target.value})}
                        placeholder="e.g. 500"
                      />
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profit Summary */}
          <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Calculator className="w-5 h-5 text-green-600" />
                Profit Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Invoice Total</p>
                  <p className="text-lg font-bold">RM {profit.invoiceTotal.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Less Tax ({invoiceData.tax_rate || 0}%)</p>
                  <p className="text-lg font-bold text-red-600">- RM {profit.taxAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Gross Revenue</p>
                  <p className="text-lg font-bold text-blue-600">RM {profit.grossRevenue.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Trainer Fees</p>
                  <p className="text-lg font-bold text-purple-600">- RM {profit.trainerTotal.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Coordinator Fee</p>
                  <p className="text-lg font-bold text-pink-600">- RM {profit.coordTotal.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Expenses</p>
                  <p className="text-lg font-bold text-orange-600">- RM {profit.expensesTotal.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-white rounded-lg">
                  <p className="text-xs text-gray-500">Marketing ({marketing.commission_type === 'percentage' ? `${marketing.commission_rate || 0}%` : 'Fixed'})</p>
                  <p className="text-lg font-bold text-green-600">- RM {profit.marketingAmount.toLocaleString()}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg border-2 border-green-400">
                  <p className="text-xs text-green-700 font-medium">NET PROFIT</p>
                  <p className="text-2xl font-bold text-green-700">RM {profit.finalProfit.toLocaleString()}</p>
                  <p className="text-xs text-green-600">{profit.profitPct.toFixed(1)}% margin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SessionCosting;
