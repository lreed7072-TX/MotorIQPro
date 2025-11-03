import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Plus, Edit, Trash2, X, Save, GripVertical, Type, Hash, Calendar, CheckSquare, AlignLeft } from 'lucide-react';

interface CustomForm {
  id: string;
  name: string;
  description: string | null;
  form_fields: FormField[];
  ai_generated: boolean;
  ai_prompt: string | null;
  created_at: string;
}

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'checkbox' | 'textarea' | 'select';
  required: boolean;
  placeholder?: string;
  options?: string[];
  validation?: any;
  name?: string;
}

interface PreMadeFormField {
  label: string;
  name: string;
  type: string;
  required: boolean;
  validation?: any;
}

const PRE_MADE_FORMS: Record<string, PreMadeFormField[]> = {
  'Submersible Wastewater Pumps Start up': [
    { label: "Installation Date", name: "installation_date", type: "date", required: true },
    { label: "Installer Name", name: "installer_name", type: "string", required: true, validation: { pattern: "^[A-Za-z ,.'-]{2,60}$" } },
    { label: "Installer Company", name: "installer_company", type: "string", required: true, validation: { maxLength: 80 } },
    { label: "Mounting Type", name: "mounting_type", type: "string", required: true, validation: { enum: ["Guide rail", "Free standing", "Portable"] } },
    { label: "Discharge Size (in)", name: "discharge_size_in", type: "number", required: true, validation: { min: 1, max: 48 } },
    { label: "Cable Length (ft)", name: "cable_length_ft", type: "number", required: false, validation: { min: 1, max: 500 } },
    { label: "Site Conditions Notes", name: "site_conditions_notes", type: "string", required: false, validation: { maxLength: 500 } },
    { label: "Wet Well Level at Start (ft below rim)", name: "wet_well_level_start_ft", type: "number", required: false, validation: { min: 0, max: 100 } },
    { label: "Ambient Temperature (°C)", name: "ambient_temp_c", type: "number", required: false, validation: { min: -20, max: 60 } },
    { label: "Supply Voltage AB (V)", name: "voltage_ab_v", type: "number", required: true, validation: { min: 180, max: 660 } },
    { label: "Supply Voltage BC (V)", name: "voltage_bc_v", type: "number", required: true, validation: { min: 180, max: 660 } },
    { label: "Supply Voltage CA (V)", name: "voltage_ca_v", type: "number", required: true, validation: { min: 180, max: 660 } },
    { label: "Voltage Imbalance (%)", name: "voltage_imbalance_pct", type: "number", required: false, validation: { min: 0, max: 10 } },
    { label: "Line Current A (A)", name: "current_a_a", type: "number", required: true, validation: { min: 0, max: 2000 } },
    { label: "Line Current B (A)", name: "current_b_a", type: "number", required: true, validation: { min: 0, max: 2000 } },
    { label: "Line Current C (A)", name: "current_c_a", type: "number", required: true, validation: { min: 0, max: 2000 } },
    { label: "Current Imbalance (%)", name: "current_imbalance_pct", type: "number", required: false, validation: { min: 0, max: 10 } },
    { label: "Frequency (Hz)", name: "measured_hz", type: "number", required: true, validation: { min: 45, max: 65 } },
    { label: "Power Factor", name: "power_factor", type: "number", required: false, validation: { min: 0, max: 1 } },
    { label: "Insulation Resistance to Ground (MΩ)", name: "ir_megohms", type: "number", required: true, validation: { min: 1, max: 1000 } },
    { label: "IR Test Voltage (VDC)", name: "ir_test_voltage_vdc", type: "number", required: true, validation: { enum: [500, 1000] } },
    { label: "Winding Resistance A-B (Ω)", name: "wres_ab_ohm", type: "number", required: false, validation: { min: 0, max: 100 } },
    { label: "Winding Resistance B-C (Ω)", name: "wres_bc_ohm", type: "number", required: false, validation: { min: 0, max: 100 } },
    { label: "Winding Resistance C-A (Ω)", name: "wres_ca_ohm", type: "number", required: false, validation: { min: 0, max: 100 } },
    { label: "Start Method", name: "start_method", type: "string", required: true, validation: { enum: ["DOL/Across-the-line", "Soft starter", "VFD"] } },
    { label: "VFD Output Frequency at Duty (Hz)", name: "vfd_output_hz", type: "number", required: false, validation: { min: 0, max: 120 } },
    { label: "Run Time During Test (min)", name: "runtime_min", type: "number", required: true, validation: { min: 1, max: 240 } },
    { label: "Flow Rate (GPM)", name: "flow_gpm", type: "number", required: false, validation: { min: 0, max: 20000 } },
    { label: "Total Dynamic Head (ft)", name: "tdh_ft", type: "number", required: false, validation: { min: 0, max: 300 } },
    { label: "Discharge Pressure (psi)", name: "discharge_psi", type: "number", required: false, validation: { min: 0, max: 150 } },
    { label: "Vibration RMS at Motor (mm/s)", name: "vibration_mms", type: "number", required: false, validation: { min: 0, max: 50 } },
    { label: "Motor Temperature at End of Test (°C)", name: "motor_temp_c", type: "number", required: false, validation: { min: 0, max: 150 } },
    { label: "Rotation Verified Correct", name: "rotation_correct", type: "boolean", required: true },
    { label: "Lockout/Tagout Removed After Checks", name: "chk_loto_removed", type: "boolean", required: true },
    { label: "Area Cleared and Barricaded", name: "chk_area_secure", type: "boolean", required: true },
    { label: "Grounding Verified", name: "chk_grounding", type: "boolean", required: true },
    { label: "Cable Entry/Seals Intact", name: "chk_cable_entry", type: "boolean", required: true },
    { label: "Seal Oil Level OK", name: "chk_seal_oil", type: "boolean", required: true },
    { label: "Leakage/Seal Probe Tested", name: "chk_seal_probe", type: "boolean", required: true },
    { label: "Thermal Sensors Tested", name: "chk_thermal", type: "boolean", required: true },
    { label: "Check Valve Operation Verified", name: "chk_check_valve", type: "boolean", required: true },
    { label: "Non-Return/Isolation Valves Positioned Correctly", name: "chk_valve_positions", type: "boolean", required: true },
    { label: "No Abnormal Noise or Vibration", name: "chk_noise_vibration", type: "boolean", required: true },
    { label: "No Visible Leaks at Discharge Piping", name: "chk_no_leaks", type: "boolean", required: true },
    { label: "Control Panel Settings Recorded/Backed Up", name: "chk_panel_settings_saved", type: "boolean", required: true },
    { label: "Alarms and Interlocks Tested", name: "chk_alarms_interlocks", type: "boolean", required: true },
    { label: "Pump Auto/Lead-Lag Sequencing Verified", name: "chk_lead_lag", type: "boolean", required: false },
    { label: "Operational Test Passed", name: "chk_operational_pass", type: "boolean", required: true },
    { label: "Photos/Docs Attached (URLs)", name: "attachments_urls", type: "string", required: false, validation: { maxLength: 500 } },
    { label: "Remarks / Corrective Actions", name: "remarks", type: "string", required: false, validation: { maxLength: 1000 } },
    { label: "Commissioning Technician Name", name: "tech_name", type: "string", required: true, validation: { pattern: "^[A-Za-z ,.'-]{2,60}$" } },
    { label: "Commissioning Date", name: "commission_date", type: "date", required: true },
    { label: "Owner/Representative Name", name: "owner_rep_name", type: "string", required: false, validation: { pattern: "^[A-Za-z ,.'-]{2,60}$" } },
    { label: "Owner Acceptance", name: "owner_accept", type: "boolean", required: false }
  ]
};

export default function CustomFormBuilder() {
  const [forms, setForms] = useState<CustomForm[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFormEditor, setShowFormEditor] = useState(false);
  const [editingForm, setEditingForm] = useState<CustomForm | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    form_fields: [] as FormField[],
  });
  const [selectedPreMadeForm, setSelectedPreMadeForm] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadForms();
  }, []);

  const loadForms = async () => {
    try {
      const { data, error } = await supabase
        .from('custom_forms')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setForms(data || []);
    } catch (error) {
      console.error('Error loading forms:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateFieldId = () => `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const convertPreMadeFieldType = (type: string): 'text' | 'number' | 'date' | 'checkbox' | 'textarea' | 'select' => {
    switch (type) {
      case 'string': return 'text';
      case 'number': return 'number';
      case 'date': return 'date';
      case 'boolean': return 'checkbox';
      default: return 'text';
    }
  };

  const handleLoadPreMadeForm = () => {
    if (!selectedPreMadeForm) return;

    const preMadeFields = PRE_MADE_FORMS[selectedPreMadeForm];
    if (!preMadeFields) return;

    const convertedFields: FormField[] = preMadeFields.map(field => {
      const convertedField: FormField = {
        id: generateFieldId(),
        label: field.label,
        name: field.name,
        type: convertPreMadeFieldType(field.type),
        required: field.required,
        validation: field.validation,
      };

      if (field.validation?.enum) {
        convertedField.type = 'select';
        convertedField.options = field.validation.enum;
      }

      if (field.validation?.maxLength && field.validation.maxLength > 200) {
        convertedField.type = 'textarea';
      }

      return convertedField;
    });

    setFormData({
      name: selectedPreMadeForm,
      description: `Pre-made form: ${selectedPreMadeForm}`,
      form_fields: convertedFields,
    });

    setSelectedPreMadeForm('');
    setSuccessMessage('Pre-made form loaded! Review and save when ready.');
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleAddField = () => {
    const newField: FormField = {
      id: generateFieldId(),
      label: 'New Field',
      type: 'text',
      required: false,
      placeholder: '',
    };
    setFormData({
      ...formData,
      form_fields: [...formData.form_fields, newField],
    });
  };

  const handleUpdateField = (id: string, updates: Partial<FormField>) => {
    setFormData({
      ...formData,
      form_fields: formData.form_fields.map((field) =>
        field.id === id ? { ...field, ...updates } : field
      ),
    });
  };

  const handleRemoveField = (id: string) => {
    setFormData({
      ...formData,
      form_fields: formData.form_fields.filter((field) => field.id !== id),
    });
  };

  const handleSaveForm = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (editingForm) {
        const { error } = await supabase
          .from('custom_forms')
          .update({
            name: formData.name,
            description: formData.description,
            form_fields: formData.form_fields,
          })
          .eq('id', editingForm.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('custom_forms')
          .insert([{
            name: formData.name,
            description: formData.description,
            form_fields: formData.form_fields,
            ai_generated: false,
            created_by: user?.id,
          }]);

        if (error) throw error;
      }

      setSuccessMessage(editingForm ? 'Form updated successfully!' : 'Form created successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setShowFormEditor(false);
      setEditingForm(null);
      setFormData({ name: '', description: '', form_fields: [] });
      loadForms();
    } catch (error) {
      console.error('Error saving form:', error);
      setSuccessMessage('Failed to save form');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const handleEditForm = (form: CustomForm) => {
    setEditingForm(form);
    setFormData({
      name: form.name,
      description: form.description || '',
      form_fields: form.form_fields,
    });
    setShowFormEditor(true);
  };

  const handleDeleteForm = async (id: string) => {
    if (!confirm('Are you sure you want to delete this form?')) return;

    try {
      const { error } = await supabase
        .from('custom_forms')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setSuccessMessage('Form deleted successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      loadForms();
    } catch (error) {
      console.error('Error deleting form:', error);
      setSuccessMessage('Failed to delete form');
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const getFieldIcon = (type: string) => {
    switch (type) {
      case 'text': return <Type className="w-4 h-4" />;
      case 'number': return <Hash className="w-4 h-4" />;
      case 'date': return <Calendar className="w-4 h-4" />;
      case 'checkbox': return <CheckSquare className="w-4 h-4" />;
      case 'textarea': return <AlignLeft className="w-4 h-4" />;
      default: return <Type className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
        <p className="mt-4 text-slate-600">Loading...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Custom Forms</h2>
            <p className="text-slate-600">Create custom forms for work orders and inspections</p>
          </div>
          <button
            onClick={() => {
              setShowFormEditor(true);
              setEditingForm(null);
              setFormData({ name: '', description: '', form_fields: [] });
            }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <Plus className="w-4 h-4" />
            Create Form
          </button>
        </div>

        {successMessage && (
          <div className={`mb-4 p-4 rounded-lg ${successMessage.includes('successfully') || successMessage.includes('loaded') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
            {successMessage}
          </div>
        )}
      </div>

      {showFormEditor ? (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-slate-900">
              {editingForm ? 'Edit Form' : 'Create New Form'}
            </h3>
            <button
              onClick={() => {
                setShowFormEditor(false);
                setEditingForm(null);
                setFormData({ name: '', description: '', form_fields: [] });
              }}
              className="p-2 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2">Load Pre-Made Form</h4>
              <p className="text-sm text-green-700 mb-3">
                Select a pre-made form template to get started quickly
              </p>
              <div className="flex gap-2">
                <select
                  value={selectedPreMadeForm}
                  onChange={(e) => setSelectedPreMadeForm(e.target.value)}
                  className="flex-1 px-4 py-2 border border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="">Select a pre-made form...</option>
                  {Object.keys(PRE_MADE_FORMS).map(formName => (
                    <option key={formName} value={formName}>{formName}</option>
                  ))}
                </select>
                <button
                  onClick={handleLoadPreMadeForm}
                  disabled={!selectedPreMadeForm}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Load Form
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Form Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Motor Inspection Checklist"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Brief description of this form's purpose..."
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-slate-700">
                  Form Fields ({formData.form_fields.length})
                </label>
                <button
                  onClick={handleAddField}
                  className="flex items-center gap-1 text-sm px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Field
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {formData.form_fields.map((field, index) => (
                  <div key={field.id} className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <GripVertical className="w-5 h-5 text-slate-400 mt-2 cursor-move" />
                      <div className="flex-1 space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Field Label
                            </label>
                            <input
                              type="text"
                              value={field.label}
                              onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Field Type
                            </label>
                            <select
                              value={field.type}
                              onChange={(e) => handleUpdateField(field.id, { type: e.target.value as any })}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            >
                              <option value="text">Text</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="checkbox">Checkbox</option>
                              <option value="textarea">Text Area</option>
                              <option value="select">Select Dropdown</option>
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-slate-600 mb-1">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            value={field.placeholder || ''}
                            onChange={(e) => handleUpdateField(field.id, { placeholder: e.target.value })}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Placeholder text..."
                          />
                        </div>

                        {field.type === 'select' && (
                          <div>
                            <label className="block text-xs font-medium text-slate-600 mb-1">
                              Options (comma-separated)
                            </label>
                            <input
                              type="text"
                              value={field.options?.join(', ') || ''}
                              onChange={(e) => handleUpdateField(field.id, {
                                options: e.target.value.split(',').map(o => o.trim()).filter(o => o)
                              })}
                              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                              placeholder="Option 1, Option 2, Option 3"
                            />
                          </div>
                        )}

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={field.required}
                            onChange={(e) => handleUpdateField(field.id, { required: e.target.checked })}
                            className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm text-slate-700">Required field</span>
                        </label>
                      </div>
                      <button
                        onClick={() => handleRemoveField(field.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {formData.form_fields.length === 0 && (
                  <div className="text-center py-8 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
                    <FileText className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-500 text-sm">No fields added yet</p>
                    <p className="text-slate-400 text-xs">Load a pre-made form or click "Add Field" to get started</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <button
                onClick={() => {
                  setShowFormEditor(false);
                  setEditingForm(null);
                  setFormData({ name: '', description: '', form_fields: [] });
                }}
                className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveForm}
                disabled={!formData.name || formData.form_fields.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Save className="w-4 h-4" />
                Save Form
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {forms.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-slate-200">
              <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No custom forms yet</h3>
              <p className="text-slate-600 mb-4">Create your first custom form to get started</p>
              <button
                onClick={() => setShowFormEditor(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
              >
                <Plus className="w-4 h-4" />
                Create Your First Form
              </button>
            </div>
          ) : (
            forms.map((form) => (
              <div key={form.id} className="bg-white rounded-lg border border-slate-200 p-6 hover:border-slate-300 transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-900 mb-1">{form.name}</h3>
                    {form.description && (
                      <p className="text-sm text-slate-600">{form.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditForm(form)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteForm(form.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  <span>{form.form_fields.length} fields</span>
                  <span>Created {new Date(form.created_at).toLocaleDateString()}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {form.form_fields.slice(0, 5).map((field) => (
                    <div key={field.id} className="flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded">
                      {getFieldIcon(field.type)}
                      <span>{field.label}</span>
                      {field.required && <span className="text-red-500">*</span>}
                    </div>
                  ))}
                  {form.form_fields.length > 5 && (
                    <div className="px-2 py-1 bg-slate-100 text-slate-600 text-xs rounded">
                      +{form.form_fields.length - 5} more
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
