import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { X, DollarSign, Plus, Trash2, Save } from 'lucide-react';

interface GenerateQuoteProps {
  workOrder: any;
  onClose: () => void;
}

interface QuoteItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function GenerateQuote({ workOrder, onClose }: GenerateQuoteProps) {
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [items, setItems] = useState<QuoteItem[]>([
    { description: '', quantity: 1, unitPrice: 0, total: 0 }
  ]);
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadCompanySettings();
    const defaultDate = new Date();
    defaultDate.setDate(defaultDate.getDate() + 30);
    setValidUntil(defaultDate.toISOString().split('T')[0]);
  }, []);

  const loadCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setCompanySettings(data);
    } catch (error) {
      console.error('Error loading company settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: '', quantity: 1, unitPrice: 0, total: 0 }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: keyof QuoteItem, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;

    if (field === 'quantity' || field === 'unitPrice') {
      newItems[index].total = newItems[index].quantity * newItems[index].unitPrice;
    }

    setItems(newItems);
  };

  const calculateSubtotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.08; // 8% tax
  };

  const calculateTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleGenerateQuote = () => {
    const quoteHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 40px;
      color: #1e293b;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 3px solid #3b82f6;
    }
    .company-info {
      flex: 1;
    }
    .company-logo {
      max-width: 200px;
      max-height: 80px;
      margin-bottom: 10px;
    }
    .company-name {
      font-size: 24px;
      font-weight: bold;
      color: #0f172a;
      margin-bottom: 5px;
    }
    .company-details {
      font-size: 12px;
      color: #64748b;
      line-height: 1.6;
    }
    .quote-title {
      font-size: 32px;
      font-weight: bold;
      color: #3b82f6;
      text-align: right;
    }
    .quote-number {
      font-size: 14px;
      color: #64748b;
      text-align: right;
      margin-top: 5px;
    }
    .info-section {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 30px;
      margin-bottom: 30px;
    }
    .info-box {
      background: #f8fafc;
      padding: 20px;
      border-radius: 8px;
    }
    .info-box h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #3b82f6;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .info-box p {
      margin: 5px 0;
      font-size: 13px;
      line-height: 1.6;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 30px 0;
    }
    .items-table th {
      background: #3b82f6;
      color: white;
      padding: 12px;
      text-align: left;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .items-table td {
      padding: 12px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 13px;
    }
    .items-table tr:hover {
      background: #f8fafc;
    }
    .text-right {
      text-align: right;
    }
    .totals {
      margin-left: auto;
      width: 300px;
      margin-top: 20px;
    }
    .totals-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      font-size: 14px;
    }
    .totals-row.subtotal {
      border-top: 1px solid #e2e8f0;
      padding-top: 15px;
    }
    .totals-row.total {
      border-top: 2px solid #3b82f6;
      padding-top: 15px;
      font-size: 18px;
      font-weight: bold;
      color: #3b82f6;
    }
    .notes {
      margin-top: 40px;
      padding: 20px;
      background: #f8fafc;
      border-left: 4px solid #3b82f6;
      border-radius: 4px;
    }
    .notes h3 {
      margin: 0 0 10px 0;
      font-size: 14px;
      color: #3b82f6;
    }
    .notes p {
      margin: 0;
      font-size: 13px;
      line-height: 1.6;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
      font-size: 12px;
      color: #64748b;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-info">
      ${companySettings?.company_logo_url ? `<img src="${companySettings.company_logo_url}" alt="Company Logo" class="company-logo" />` : ''}
      <div class="company-name">${companySettings?.company_name || 'MotorIQ Pro'}</div>
      <div class="company-details">
        ${companySettings?.address ? `${companySettings.address}<br/>` : ''}
        ${companySettings?.city ? `${companySettings.city}, ` : ''}${companySettings?.state || ''} ${companySettings?.zip_code || ''}<br/>
        ${companySettings?.phone ? `Phone: ${companySettings.phone}<br/>` : ''}
        ${companySettings?.email ? `Email: ${companySettings.email}` : ''}
      </div>
    </div>
    <div>
      <div class="quote-title">QUOTE</div>
      <div class="quote-number">Quote Date: ${new Date().toLocaleDateString()}</div>
      <div class="quote-number">Valid Until: ${new Date(validUntil).toLocaleDateString()}</div>
      <div class="quote-number">Work Order: ${workOrder.work_order_number}</div>
    </div>
  </div>

  <div class="info-section">
    <div class="info-box">
      <h3>Customer Information</h3>
      <p><strong>${workOrder.customer?.company_name || 'N/A'}</strong></p>
      ${workOrder.customer?.contact_person ? `<p>${workOrder.customer.contact_person}</p>` : ''}
      ${workOrder.customer?.phone ? `<p>Phone: ${workOrder.customer.phone}</p>` : ''}
      ${workOrder.customer?.email ? `<p>Email: ${workOrder.customer.email}</p>` : ''}
    </div>
    <div class="info-box">
      <h3>Equipment Information</h3>
      <p><strong>Manufacturer:</strong> ${workOrder.equipment_unit?.equipment_model?.manufacturer?.name || 'N/A'}</p>
      <p><strong>Model:</strong> ${workOrder.equipment_unit?.equipment_model?.model_number || 'N/A'}</p>
      <p><strong>Serial Number:</strong> ${workOrder.equipment_unit?.serial_number || 'N/A'}</p>
    </div>
  </div>

  ${workOrder.reported_issue ? `
  <div class="info-box" style="margin-bottom: 20px;">
    <h3>Reported Issue</h3>
    <p>${workOrder.reported_issue}</p>
  </div>
  ` : ''}

  <table class="items-table">
    <thead>
      <tr>
        <th style="width: 50%">Description</th>
        <th class="text-right" style="width: 15%">Quantity</th>
        <th class="text-right" style="width: 15%">Unit Price</th>
        <th class="text-right" style="width: 20%">Total</th>
      </tr>
    </thead>
    <tbody>
      ${items.map(item => `
        <tr>
          <td>${item.description}</td>
          <td class="text-right">${item.quantity}</td>
          <td class="text-right">$${item.unitPrice.toFixed(2)}</td>
          <td class="text-right">$${item.total.toFixed(2)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <div class="totals">
    <div class="totals-row subtotal">
      <span>Subtotal:</span>
      <span>$${calculateSubtotal().toFixed(2)}</span>
    </div>
    <div class="totals-row">
      <span>Tax (8%):</span>
      <span>$${calculateTax().toFixed(2)}</span>
    </div>
    <div class="totals-row total">
      <span>Total:</span>
      <span>$${calculateTotal().toFixed(2)}</span>
    </div>
  </div>

  ${notes ? `
  <div class="notes">
    <h3>Notes & Terms</h3>
    <p>${notes}</p>
  </div>
  ` : ''}

  <div class="footer">
    <p>Thank you for your business!</p>
    ${companySettings?.website ? `<p>${companySettings.website}</p>` : ''}
  </div>
</body>
</html>
    `;

    const blob = new Blob([quoteHTML], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Quote-${workOrder.work_order_number}-${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    alert('Quote generated successfully!');
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full my-8">
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between rounded-t-lg">
          <div className="flex items-center gap-3">
            <DollarSign className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-slate-900">Generate Quote</h2>
              <p className="text-sm text-slate-600">{workOrder.work_order_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Customer</h3>
              <p className="text-sm font-medium text-slate-900">{workOrder.customer?.company_name}</p>
              {workOrder.customer?.contact_person && (
                <p className="text-sm text-slate-600">{workOrder.customer.contact_person}</p>
              )}
            </div>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h3 className="text-sm font-medium text-slate-700 mb-2">Equipment</h3>
              <p className="text-sm font-medium text-slate-900">
                {workOrder.equipment_unit?.equipment_model?.manufacturer?.name}{' '}
                {workOrder.equipment_unit?.equipment_model?.model_number}
              </p>
              <p className="text-sm text-slate-600">SN: {workOrder.equipment_unit?.serial_number}</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Valid Until
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-slate-700">Line Items</h3>
              <button
                onClick={addItem}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-start">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description}
                    onChange={(e) => updateItem(index, 'description', e.target.value)}
                    className="col-span-5 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                    className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <input
                    type="number"
                    placeholder="Price"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="col-span-2 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    min="0"
                    step="0.01"
                  />
                  <div className="col-span-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-medium text-slate-900">
                    ${item.total.toFixed(2)}
                  </div>
                  <button
                    onClick={() => removeItem(index)}
                    disabled={items.length === 1}
                    className="col-span-1 p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200 pt-4">
            <div className="flex justify-end space-y-2">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Subtotal:</span>
                  <span className="font-medium text-slate-900">${calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tax (8%):</span>
                  <span className="font-medium text-slate-900">${calculateTax().toFixed(2)}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="font-semibold text-slate-900">Total:</span>
                  <span className="font-bold text-blue-600 text-lg">${calculateTotal().toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Notes & Terms
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any additional notes, terms, or conditions..."
              rows={4}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200 rounded-b-lg">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateQuote}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Save className="w-4 h-4 inline mr-2" />
            Generate Quote
          </button>
        </div>
      </div>
    </div>
  );
}
