import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, RefreshCw, HardDrive } from 'lucide-react';
import { syncManager } from '../../lib/syncManager';

export default function OfflineIndicator() {
  const [status, setStatus] = useState({
    isOnline: navigator.onLine,
    pendingPhotos: 0,
    pendingSync: 0,
    storageUsed: 0,
    storageAvailable: 0,
  });
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    updateStatus();

    const handleOnline = () => {
      updateStatus();
      syncManager.syncAll();
    };

    const handleOffline = () => {
      updateStatus();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const interval = setInterval(updateStatus, 10000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, []);

  const updateStatus = async () => {
    const newStatus = await syncManager.getOfflineStatus();
    setStatus(newStatus);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    await syncManager.syncAll();
    await updateStatus();
    setIsSyncing(false);
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const hasPendingData = status.pendingPhotos > 0 || status.pendingSync > 0;

  return (
    <div className="fixed bottom-4 right-4 bg-white rounded-lg shadow-lg p-4 max-w-sm">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          {status.isOnline ? (
            <Wifi className="w-5 h-5 text-green-600" />
          ) : (
            <WifiOff className="w-5 h-5 text-red-600" />
          )}
          <span className="font-semibold">
            {status.isOnline ? 'Online' : 'Offline'}
          </span>
        </div>

        {status.isOnline && hasPendingData && (
          <button
            onClick={handleSync}
            disabled={isSyncing}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync
          </button>
        )}
      </div>

      {hasPendingData && (
        <div className="space-y-2 text-sm">
          {status.pendingPhotos > 0 && (
            <div className="flex items-center justify-between text-slate-600">
              <span>Pending Photos:</span>
              <span className="font-medium">{status.pendingPhotos}</span>
            </div>
          )}

          {status.pendingSync > 0 && (
            <div className="flex items-center justify-between text-slate-600">
              <span>Pending Changes:</span>
              <span className="font-medium">{status.pendingSync}</span>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-500 mt-3 pt-3 border-t border-slate-200">
        <div className="flex items-center gap-1">
          <HardDrive className="w-4 h-4" />
          <span>Storage:</span>
        </div>
        <span>
          {formatBytes(status.storageUsed)} / {formatBytes(status.storageAvailable)}
        </span>
      </div>
    </div>
  );
}