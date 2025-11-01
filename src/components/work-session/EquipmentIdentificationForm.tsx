import { useState } from 'react';
import { CheckCircle } from 'lucide-react';

interface EquipmentDetails {
  customer: string;
  model: string;
  serial_number: string;
  hp_kw?: string;
  voltage?: string;
  speed?: string;
  bearing_type?: string;
  lubrication_type?: string;
  seal_arrangement?: string;
}

interface EquipmentIdentificationFormProps {
  initialData: EquipmentDetails;
  onComplete: (details: EquipmentDetails) => void;
  loading: boolean;
}

export default function EquipmentIdentificationForm({
  initialData,
  onComplete,
  loading,
}: EquipmentIdentificationFormProps) {
  const [details, setDetails] = useState<EquipmentDetails>(initialData);
  const [currentField, setCurrentField] = useState<string>('verify');

  const fields = [
    { key: 'hp_kw', label: 'HP/kW', placeholder: 'e.g., 50 HP or 37 kW' },
    { key: 'voltage', label: 'Voltage', placeholder: 'e.g., 460V 3-phase' },
    { key: 'speed', label: 'Speed', placeholder: 'e.g., 1750 RPM' },
    { key: 'bearing_type', label: 'Bearing Type', placeholder: 'e.g., 6309 or Sleeve' },
    { key: 'lubrication_type', label: 'Lubrication Type', placeholder: 'e.g., Oil or Grease' },
    { key: 'seal_arrangement', label: 'Seal Arrangement', placeholder: 'e.g., Mechanical Seal Type 21' },
  ];

  const handleVerify = () => {
    setCurrentField(fields[0].key);
  };

  const handleFieldSubmit = (key: string, value: string) => {
    const newDetails = { ...details, [key]: value };
    setDetails(newDetails);

    const currentIndex = fields.findIndex((f) => f.key === key);
    if (currentIndex < fields.length - 1) {
      setCurrentField(fields[currentIndex + 1].key);
    } else {
      setCurrentField('complete');
    }
  };

  const handleComplete = () => {
    const finalDetails = { ...details };
    fields.forEach((field) => {
      if (!finalDetails[field.key as keyof EquipmentDetails]) {
        finalDetails[field.key as keyof EquipmentDetails] = 'N/A';
      }
    });
    onComplete(finalDetails);
  };

  if (currentField === 'verify') {
    return (
      <div className="space-y-6">
        <div>
          <h3 className="font-semibold text-slate-900 mb-4">Verify Equipment Information</h3>
          <p className="text-sm text-slate-600 mb-4">
            Please verify the following information from the work order is correct:
          </p>
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div>
              <span className="text-sm font-medium text-slate-700">Customer:</span>
              <p className="text-slate-900">{details.customer}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-700">Model:</span>
              <p className="text-slate-900">{details.model}</p>
            </div>
            <div>
              <span className="text-sm font-medium text-slate-700">Serial Number:</span>
              <p className="text-slate-900">{details.serial_number}</p>
            </div>
          </div>
        </div>

        <button
          onClick={handleVerify}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Information is Correct - Continue
        </button>
      </div>
    );
  }

  if (currentField === 'complete') {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
          <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
          <h3 className="font-semibold text-green-900 mb-2">Equipment Identification Complete</h3>
          <p className="text-sm text-green-700">
            Review your entries below and click Complete Step to continue.
          </p>
        </div>

        <div className="bg-slate-50 rounded-lg p-4 space-y-3">
          <div>
            <span className="text-sm font-medium text-slate-700">Customer:</span>
            <p className="text-slate-900">{details.customer}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-700">Model:</span>
            <p className="text-slate-900">{details.model}</p>
          </div>
          <div>
            <span className="text-sm font-medium text-slate-700">Serial Number:</span>
            <p className="text-slate-900">{details.serial_number}</p>
          </div>
          {fields.map((field) => {
            const value = details[field.key as keyof EquipmentDetails];
            if (value) {
              return (
                <div key={field.key}>
                  <span className="text-sm font-medium text-slate-700">{field.label}:</span>
                  <p className="text-slate-900">{value}</p>
                </div>
              );
            }
            return null;
          })}
        </div>

        <button
          onClick={handleComplete}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Saving...' : 'Complete Step'}
        </button>
      </div>
    );
  }

  const currentFieldConfig = fields.find((f) => f.key === currentField);
  if (!currentFieldConfig) return null;

  const currentIndex = fields.findIndex((f) => f.key === currentField);
  const currentValue = details[currentField as keyof EquipmentDetails] || '';

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-900">{currentFieldConfig.label}</h3>
          <span className="text-sm text-slate-500">
            Field {currentIndex + 1} of {fields.length}
          </span>
        </div>

        <input
          type="text"
          value={currentValue}
          onChange={(e) => setDetails({ ...details, [currentField]: e.target.value })}
          placeholder={currentFieldConfig.placeholder}
          className="w-full px-4 py-3 text-lg border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleFieldSubmit(currentField, currentValue);
            }
          }}
        />
      </div>

      <div className="flex gap-3">
        <button
          onClick={() => handleFieldSubmit(currentField, 'N/A')}
          className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition"
        >
          Not Applicable
        </button>
        <button
          onClick={() => handleFieldSubmit(currentField, currentValue)}
          className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
        >
          Next
        </button>
      </div>

      <div className="flex gap-2 justify-center">
        {fields.map((field, idx) => (
          <div
            key={field.key}
            className={`h-2 rounded-full transition-all ${
              idx < currentIndex
                ? 'w-8 bg-green-600'
                : idx === currentIndex
                ? 'w-12 bg-blue-600'
                : 'w-8 bg-slate-300'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
