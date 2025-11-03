import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  FolderPlus,
  Upload,
  Folder,
  File,
  Download,
  Trash2,
  Edit2,
  X,
  ChevronRight,
  Search,
  FileText,
  Image as ImageIcon,
  FileSpreadsheet,
  FileType
} from 'lucide-react';

interface DocumentFolder {
  id: string;
  name: string;
  parent_folder_id: string | null;
  description: string | null;
  created_by: string;
  created_at: string;
}

interface Document {
  id: string;
  folder_id: string | null;
  name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  description: string | null;
  uploaded_by: string;
  created_at: string;
}

export default function DocumentsLibrary() {
  const { profile } = useAuth();
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [currentFolder, setCurrentFolder] = useState<string | null>(null);
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: 'Root' }
  ]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDescription, setNewFolderDescription] = useState('');
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const isAdminOrManager = profile?.role === 'admin' || profile?.role === 'manager';

  useEffect(() => {
    loadData();
  }, [currentFolder]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: foldersData } = await supabase
        .from('document_folders')
        .select('*')
        .eq('parent_folder_id', currentFolder)
        .order('name');

      const { data: docsData } = await supabase
        .from('documents')
        .select('*')
        .eq('folder_id', currentFolder)
        .order('created_at', { ascending: false });

      setFolders(foldersData || []);
      setDocuments(docsData || []);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !isAdminOrManager) return;

    try {
      const { error } = await supabase.from('document_folders').insert({
        name: newFolderName,
        parent_folder_id: currentFolder,
        description: newFolderDescription || null,
        created_by: profile?.id
      });

      if (error) throw error;

      setNewFolderName('');
      setNewFolderDescription('');
      setShowNewFolderModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating folder:', error);
      alert('Failed to create folder');
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `documents/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from('documents').insert({
        folder_id: currentFolder,
        name: file.name,
        file_url: publicUrl,
        file_type: fileExt || 'unknown',
        file_size: file.size,
        uploaded_by: profile?.id
      });

      if (dbError) throw dbError;

      loadData();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert('Failed to upload file. Make sure the storage bucket is configured.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      const { error } = await supabase.from('documents').delete().eq('id', docId);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting document:', error);
      alert('Failed to delete document');
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!confirm('Are you sure you want to delete this folder? All contents will be deleted.')) return;

    try {
      const { error } = await supabase.from('document_folders').delete().eq('id', folderId);
      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error deleting folder:', error);
      alert('Failed to delete folder');
    }
  };

  const navigateToFolder = (folderId: string | null, folderName: string) => {
    setCurrentFolder(folderId);

    if (folderId === null) {
      setBreadcrumb([{ id: null, name: 'Root' }]);
    } else {
      const folderIndex = breadcrumb.findIndex(b => b.id === folderId);
      if (folderIndex >= 0) {
        setBreadcrumb(breadcrumb.slice(0, folderIndex + 1));
      } else {
        setBreadcrumb([...breadcrumb, { id: folderId, name: folderName }]);
      }
    }
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(type)) return ImageIcon;
    if (['pdf'].includes(type)) return FileText;
    if (['xlsx', 'xls', 'csv'].includes(type)) return FileSpreadsheet;
    return FileType;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredFolders = folders.filter(folder =>
    folder.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Documents Library</h1>
        <p className="text-slate-600">Organize and manage all your documents in one place</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-slate-200 mb-6">
        <div className="p-4 border-b border-slate-200">
          <div className="flex items-center gap-2 text-sm text-slate-600 mb-4">
            {breadcrumb.map((crumb, index) => (
              <div key={crumb.id || 'root'} className="flex items-center gap-2">
                {index > 0 && <ChevronRight className="w-4 h-4" />}
                <button
                  onClick={() => navigateToFolder(crumb.id, crumb.name)}
                  className="hover:text-blue-600 transition"
                >
                  {crumb.name}
                </button>
              </div>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents and folders..."
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex gap-2">
              {isAdminOrManager && (
                <button
                  onClick={() => setShowNewFolderModal(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition"
                >
                  <FolderPlus className="w-5 h-5" />
                  <span>New Folder</span>
                </button>
              )}

              <label className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition cursor-pointer">
                <Upload className="w-5 h-5" />
                <span>{uploading ? 'Uploading...' : 'Upload'}</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-slate-200 border-t-blue-600 mx-auto"></div>
            </div>
          ) : (
            <>
              {filteredFolders.length === 0 && filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <Folder className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-slate-500">
                    {searchQuery ? 'No results found' : 'This folder is empty'}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {filteredFolders.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 mb-3">Folders</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredFolders.map((folder) => (
                          <div
                            key={folder.id}
                            className="group relative p-4 border border-slate-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition cursor-pointer"
                            onClick={() => navigateToFolder(folder.id, folder.name)}
                          >
                            <div className="flex items-start gap-3">
                              <Folder className="w-8 h-8 text-blue-500 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{folder.name}</p>
                                {folder.description && (
                                  <p className="text-sm text-slate-500 truncate">{folder.description}</p>
                                )}
                              </div>
                            </div>
                            {isAdminOrManager && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteFolder(folder.id);
                                }}
                                className="absolute top-2 right-2 p-1 bg-white border border-slate-200 rounded opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:border-red-300 hover:text-red-600 transition"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {filteredDocuments.length > 0 && (
                    <div>
                      <h3 className="text-sm font-medium text-slate-700 mb-3">Documents</h3>
                      <div className="space-y-2">
                        {filteredDocuments.map((doc) => {
                          const FileIcon = getFileIcon(doc.file_type);
                          return (
                            <div
                              key={doc.id}
                              className="group flex items-center gap-4 p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                            >
                              <FileIcon className="w-8 h-8 text-slate-400 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-slate-900 truncate">{doc.name}</p>
                                <p className="text-sm text-slate-500">
                                  {formatFileSize(doc.file_size)} • {new Date(doc.created_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <a
                                  href={doc.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-2 hover:bg-blue-50 rounded-lg transition"
                                  title="Download"
                                >
                                  <Download className="w-5 h-5 text-blue-600" />
                                </a>
                                {(isAdminOrManager || doc.uploaded_by === profile?.id) && (
                                  <button
                                    onClick={() => handleDeleteDocument(doc.id)}
                                    className="p-2 hover:bg-red-50 rounded-lg transition"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-5 h-5 text-red-600" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {showNewFolderModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h2 className="text-xl font-semibold text-slate-900">Create New Folder</h2>
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Folder Name
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="Enter folder name"
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newFolderDescription}
                  onChange={(e) => setNewFolderDescription(e.target.value)}
                  placeholder="Enter folder description"
                  rows={3}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 px-6 py-4 bg-slate-50 rounded-b-lg">
              <button
                onClick={() => setShowNewFolderModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateFolder}
                disabled={!newFolderName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Create Folder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
