import { supabase } from './supabase';

interface ReportData {
  workOrderNumber: string;
  customerName: string;
  equipmentInfo: string;
  date: string;
  technician: string;
  findings: Array<{
    description: string;
    severity: string;
    recommendation: string;
  }>;
  measurements: Array<{
    parameter: string;
    value: string;
    specification: string;
    result: string;
  }>;
  photos: Array<{
    url: string;
    caption: string;
  }>;
  summary: string;
  recommendations: string[];
}

interface SignatureData {
  signerName: string;
  signerEmail: string;
  signerTitle: string;
  signatureDataUrl: string;
}

export class PDFGenerator {
  async generateWorkOrderReport(
    workOrderId: string,
    includePhotos: boolean = true
  ): Promise<string> {
    const reportData = await this.fetchReportData(workOrderId);
    const html = this.generateReportHTML(reportData, includePhotos);

    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return url;
  }

  async generateQuotePDF(quoteId: string): Promise<string> {
    const { data: quote } = await supabase
      .from('quotes')
      .select(`
        *,
        customer:customers(*),
        line_items:quote_line_items(*),
        created_by_user:users!quotes_created_by_fkey(full_name)
      `)
      .eq('id', quoteId)
      .maybeSingle();

    if (!quote) throw new Error('Quote not found');

    const html = this.generateQuoteHTML(quote);

    const response = await fetch('/api/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html }),
    });

    if (!response.ok) {
      throw new Error('Failed to generate PDF');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return url;
  }

  async addSignatureToPDF(
    pdfUrl: string,
    signature: SignatureData
  ): Promise<string> {
    const response = await fetch('/api/sign-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pdfUrl, signature }),
    });

    if (!response.ok) {
      throw new Error('Failed to sign PDF');
    }

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    return url;
  }

  private async fetchReportData(workOrderId: string): Promise<ReportData> {
    const { data: workOrder } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(company_name),
        equipment_unit:equipment_units(
          serial_number,
          equipment_model:equipment_models(model_number)
        ),
        assigned_user:users!work_orders_assigned_to_fkey(full_name),
        work_sessions(
          *,
          step_completions(*),
          photos(*)
        )
      `)
      .eq('id', workOrderId)
      .maybeSingle();

    if (!workOrder) throw new Error('Work order not found');

    return {
      workOrderNumber: workOrder.work_order_number,
      customerName: workOrder.customer?.company_name || 'N/A',
      equipmentInfo: `${workOrder.equipment_unit?.equipment_model?.model_number || 'N/A'} - ${workOrder.equipment_unit?.serial_number || 'N/A'}`,
      date: new Date(workOrder.completed_at || workOrder.created_at).toLocaleDateString(),
      technician: workOrder.assigned_user?.full_name || 'N/A',
      findings: [],
      measurements: [],
      photos: [],
      summary: workOrder.reported_issue || '',
      recommendations: [],
    };
  }

  private generateReportHTML(data: ReportData, includePhotos: boolean): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2563eb;
            margin: 0 0 10px 0;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-bottom: 30px;
          }
          .info-item {
            padding: 10px;
            background: #f8fafc;
            border-radius: 5px;
          }
          .info-label {
            font-weight: bold;
            color: #64748b;
            font-size: 12px;
            text-transform: uppercase;
          }
          .info-value {
            color: #1e293b;
            font-size: 16px;
            margin-top: 5px;
          }
          .section {
            margin-bottom: 30px;
          }
          .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #2563eb;
            border-bottom: 2px solid #e2e8f0;
            padding-bottom: 10px;
            margin-bottom: 15px;
          }
          .finding {
            background: #fef2f2;
            border-left: 4px solid #ef4444;
            padding: 15px;
            margin-bottom: 15px;
            border-radius: 5px;
          }
          .finding.minor { background: #fefce8; border-color: #eab308; }
          .finding.moderate { background: #fff7ed; border-color: #f97316; }
          .finding.major { background: #fef2f2; border-color: #ef4444; }
          .finding.critical { background: #fef2f2; border-color: #991b1b; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f1f5f9;
            font-weight: bold;
            color: #475569;
          }
          .photo-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
          }
          .photo-item img {
            width: 100%;
            border-radius: 5px;
            border: 1px solid #e2e8f0;
          }
          .photo-caption {
            font-size: 12px;
            color: #64748b;
            margin-top: 5px;
          }
          .signature-section {
            margin-top: 50px;
            padding-top: 30px;
            border-top: 2px solid #e2e8f0;
          }
          .signature-box {
            border: 1px solid #cbd5e1;
            border-radius: 5px;
            padding: 20px;
            min-height: 100px;
            margin-top: 10px;
          }
          .footer {
            margin-top: 50px;
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
          <h1>Work Order Report</h1>
          <p>Equipment Service & Repair Documentation</p>
        </div>

        <div class="info-grid">
          <div class="info-item">
            <div class="info-label">Work Order</div>
            <div class="info-value">${data.workOrderNumber}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Date</div>
            <div class="info-value">${data.date}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Customer</div>
            <div class="info-value">${data.customerName}</div>
          </div>
          <div class="info-item">
            <div class="info-label">Technician</div>
            <div class="info-value">${data.technician}</div>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <div class="info-label">Equipment</div>
            <div class="info-value">${data.equipmentInfo}</div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">Summary</div>
          <p>${data.summary}</p>
        </div>

        ${data.findings.length > 0 ? `
          <div class="section">
            <div class="section-title">Findings</div>
            ${data.findings.map(f => `
              <div class="finding ${f.severity}">
                <div style="font-weight: bold; margin-bottom: 5px;">
                  ${f.severity.toUpperCase()}: ${f.description}
                </div>
                <div>${f.recommendation}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        ${data.measurements.length > 0 ? `
          <div class="section">
            <div class="section-title">Measurements</div>
            <table>
              <thead>
                <tr>
                  <th>Parameter</th>
                  <th>Measured Value</th>
                  <th>Specification</th>
                  <th>Result</th>
                </tr>
              </thead>
              <tbody>
                ${data.measurements.map(m => `
                  <tr>
                    <td>${m.parameter}</td>
                    <td>${m.value}</td>
                    <td>${m.specification}</td>
                    <td>${m.result}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        ` : ''}

        ${includePhotos && data.photos.length > 0 ? `
          <div class="section">
            <div class="section-title">Photo Documentation</div>
            <div class="photo-grid">
              ${data.photos.map(p => `
                <div class="photo-item">
                  <img src="${p.url}" alt="${p.caption}" />
                  <div class="photo-caption">${p.caption}</div>
                </div>
              `).join('')}
            </div>
          </div>
        ` : ''}

        ${data.recommendations.length > 0 ? `
          <div class="section">
            <div class="section-title">Recommendations</div>
            <ul>
              ${data.recommendations.map(r => `<li>${r}</li>`).join('')}
            </ul>
          </div>
        ` : ''}

        <div class="signature-section">
          <div><strong>Technician Signature:</strong></div>
          <div class="signature-box"></div>
          <div style="margin-top: 30px;"><strong>Customer Signature:</strong></div>
          <div class="signature-box"></div>
        </div>

        <div class="footer">
          <p>This report was generated on ${new Date().toLocaleString()}</p>
          <p>Field Operations Management System</p>
        </div>
      </body>
      </html>
    `;
  }

  private generateQuoteHTML(quote: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: start;
          }
          .header h1 {
            color: #2563eb;
            margin: 0;
          }
          .quote-number {
            font-size: 24px;
            font-weight: bold;
            color: #64748b;
          }
          .info-section {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 30px;
            margin-bottom: 30px;
          }
          .info-block h3 {
            color: #2563eb;
            margin: 0 0 10px 0;
            font-size: 14px;
            text-transform: uppercase;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 30px 0;
          }
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #f1f5f9;
            font-weight: bold;
            color: #475569;
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
            padding: 10px 0;
            border-bottom: 1px solid #e2e8f0;
          }
          .totals-row.grand-total {
            font-size: 18px;
            font-weight: bold;
            border-top: 2px solid #2563eb;
            border-bottom: 2px solid #2563eb;
          }
          .terms {
            background: #f8fafc;
            padding: 20px;
            border-radius: 5px;
            margin-top: 30px;
          }
          .terms h3 {
            margin-top: 0;
            color: #2563eb;
          }
          .footer {
            margin-top: 50px;
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
          <div>
            <h1>QUOTE</h1>
            <p>Valid until: ${quote.valid_until || 'N/A'}</p>
          </div>
          <div class="quote-number">${quote.quote_number}</div>
        </div>

        <div class="info-section">
          <div class="info-block">
            <h3>Customer</h3>
            <div><strong>${quote.customer?.company_name || 'N/A'}</strong></div>
            <div>${quote.customer?.contact_person || ''}</div>
            <div>${quote.customer?.email || ''}</div>
            <div>${quote.customer?.phone || ''}</div>
          </div>
          <div class="info-block">
            <h3>Quote Details</h3>
            <div>Date: ${new Date(quote.created_at).toLocaleDateString()}</div>
            <div>Prepared by: ${quote.created_by_user?.full_name || 'N/A'}</div>
            <div>Status: ${quote.status}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Description</th>
              <th>Type</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${(quote.line_items || []).map((item: any) => `
              <tr>
                <td>${item.description}</td>
                <td>${item.item_type}</td>
                <td class="text-right">${item.quantity}</td>
                <td class="text-right">$${Number(item.unit_price).toFixed(2)}</td>
                <td class="text-right">$${Number(item.line_total).toFixed(2)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row">
            <span>Subtotal:</span>
            <span>$${Number(quote.subtotal).toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Tax (${quote.tax_rate}%):</span>
            <span>$${Number(quote.tax_amount).toFixed(2)}</span>
          </div>
          <div class="totals-row">
            <span>Discount:</span>
            <span>-$${Number(quote.discount_amount || 0).toFixed(2)}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Grand Total:</span>
            <span>$${Number(quote.total_amount).toFixed(2)}</span>
          </div>
        </div>

        ${quote.terms ? `
          <div class="terms">
            <h3>Terms & Conditions</h3>
            <p>${quote.terms}</p>
          </div>
        ` : ''}

        ${quote.notes ? `
          <div style="margin-top: 20px;">
            <h3>Notes</h3>
            <p>${quote.notes}</p>
          </div>
        ` : ''}

        <div class="footer">
          <p>This quote was generated on ${new Date().toLocaleString()}</p>
          <p>Thank you for your business!</p>
        </div>
      </body>
      </html>
    `;
  }
}

export const pdfGenerator = new PDFGenerator();