import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { FileText, Plus, Edit, Trash2, X, Save, GripVertical, Type, Hash, Calendar, CheckSquare, AlignLeft, Sparkles } from 'lucide-react';

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
}

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
  const [aiPrompt, setAiPrompt] = useState('');
  const [generatingWithAI, setGeneratingWithAI] = useState(false);
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

  const handleGenerateWithAI = async () => {
    if (!aiPrompt.trim()) return;

    setGeneratingWithAI(true);
    try {
      const suggestedFields: FormField[] = generateFormFromPrompt(aiPrompt);

      setFormData({
        ...formData,
        name: extractFormName(aiPrompt),
        description: aiPrompt,
        form_fields: suggestedFields,
      });
      setAiPrompt('');
      setSuccessMessage('Form generated! Review and edit as needed.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error generating form:', error);
      setSuccessMessage('Failed to generate form');
      setTimeout(() => setSuccessMessage(''), 3000);
    } finally {
      setGeneratingWithAI(false);
    }
  };

  const generateFormFromPrompt = (prompt: string): FormField[] => {
    const fields: FormField[] = [];
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('inspection') || lowerPrompt.includes('check')) {
      fields.push({
        id: generateFieldId(),
        label: 'Inspector Name',
        type: 'text',
        required: true,
      });
      fields.push({
        id: generateFieldId(),
        label: 'Inspection Date',
        type: 'date',
        required: true,
      });
    }

    if (lowerPrompt.includes('measurement') || lowerPrompt.includes('reading')) {
      fields.push({
        id: generateFieldId(),
        label: 'Measurement Value',
        type: 'number',
        required: true,
      });
      fields.push({
        id: generateFieldId(),
        label: 'Unit of Measurement',
        type: 'text',
        required: false,
      });
    }

    if (lowerPrompt.includes('test') || lowerPrompt.includes('result')) {
      fields.push({
        id: generateFieldId(),
        label: 'Test Result',
        type: 'select',
        required: true,
        options: ['Pass', 'Fail', 'Needs Review'],
      });
    }

    if (lowerPrompt.includes('condition') || lowerPrompt.includes('status')) {
      fields.push({
        id: generateFieldId(),
        label: 'Overall Condition',
        type: 'select',
        required: true,
        options: ['Excellent', 'Good', 'Fair', 'Poor'],
      });
    }

    if (lowerPrompt.includes('note') || lowerPrompt.includes('comment') || lowerPrompt.includes('observation')) {
      fields.push({
        id: generateFieldId(),
        label: 'Notes',
        type: 'textarea',
        required: false,
        placeholder: 'Enter additional notes or observations...',
      });
    }

    fields.push({
      id: generateFieldId(),
      label: 'Completed By',
      type: 'text',
      required: true,
    });

    fields.push({
      id: generateFieldId(),
      label: 'Completion Date',
      type: 'date',
      required: true,
    });

    return fields;
  };

  const extractFormName = (prompt: string): string => {
    const match = prompt.match(/(?:create|make|build|form for)\s+(?:a\s+)?(.+?)(?:\s+form)?(?:\s+with|\s+that|\s+including|$)/i);
    if (match && match[1]) {
      return match[1].split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ') + ' Form';
    }
    return 'Custom Form';
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
          <div className={`mb-4 p-4 rounded-lg ${successMessage.includes('successfully') ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
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
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 mb-2">AI Form Generator</h4>
                  <p className="text-sm text-blue-700 mb-3">
                    Describe the form you need and AI will generate fields for you
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g., Create a motor inspection form with measurements and test results"
                      className="flex-1 px-4 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      onKeyDown={(e) => e.key === 'Enter' && handleGenerateWithAI()}
                    />
                    <button
                      onClick={handleGenerateWithAI}
                      disabled={!aiPrompt.trim() || generatingWithAI}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingWithAI ? 'Generating...' : 'Generate'}
                    </button>
                  </div>
                </div>
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
                  Form Fields
                </label>
                <button
                  onClick={handleAddField}
                  className="flex items-center gap-1 text-sm px-3 py-1 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition"
                >
                  <Plus className="w-4 h-4" />
                  Add Field
                </button>
              </div>

              <div className="space-y-3">
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
                    <p className="text-slate-400 text-xs">Use AI Generator or click "Add Field" to get started</p>
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
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold text-slate-900">{form.name}</h3>
                      {form.ai_generated && (
                        <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          <Sparkles className="w-3 h-3" />
                          AI Generated
                        </span>
                      )}
                    </div>
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
