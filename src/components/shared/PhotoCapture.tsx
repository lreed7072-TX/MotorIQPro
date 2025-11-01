import { useState, useRef } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Camera, Upload, X, Image as ImageIcon } from 'lucide-react';

interface PhotoCaptureProps {
  workSessionId: string;
  stepCompletionId?: string;
  photoType?: 'before' | 'during' | 'after' | 'issue' | 'reference';
  onPhotoUploaded?: () => void;
}

export default function PhotoCapture({
  workSessionId,
  stepCompletionId,
  photoType = 'during',
  onPhotoUploaded,
}: PhotoCaptureProps) {
  const { profile } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState('');
  const [showCaptionModal, setShowCaptionModal] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    setShowCaptionModal(true);
  };

  const handleUpload = async () => {
    if (!selectedFile || !profile) return;

    try {
      setUploading(true);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${workSessionId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('photos')
        .upload(fileName, selectedFile);

      if (uploadError) throw uploadError;

      const { data: photoData, error: photoError } = await supabase
        .from('photos')
        .insert({
          work_session_id: workSessionId,
          step_completion_id: stepCompletionId,
          storage_path: uploadData.path,
          photo_type: photoType,
          caption: caption || null,
          taken_by: profile.id,
        })
        .select()
        .single();

      if (photoError) throw photoError;

      setShowCaptionModal(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      setCaption('');

      if (onPhotoUploaded) {
        onPhotoUploaded();
      }

      alert('Photo uploaded successfully!');
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error uploading photo. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCancel = () => {
    setShowCaptionModal(false);
    setSelectedFile(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCaption('');
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 px-4 py-2 border border-slate-300 rounded-lg hover:bg-slate-50 transition"
      >
        <Camera className="w-5 h-5" />
        <span>Add Photo</span>
      </button>

      {showCaptionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">Add Photo</h2>
              <button
                onClick={handleCancel}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6">
              {previewUrl && (
                <div className="mb-6">
                  <img
                    src={previewUrl}
                    alt="Preview"
                    className="w-full rounded-lg border border-slate-200"
                  />
                </div>
              )}

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Caption (Optional)
                </label>
                <textarea
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  placeholder="Describe what this photo shows..."
                  rows={3}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancel}
                  className="flex-1 px-6 py-3 border border-slate-300 rounded-lg hover:bg-slate-50 transition font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
