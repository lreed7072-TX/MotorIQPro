import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface OfflineDB extends DBSchema {
  workOrders: {
    key: string;
    value: {
      id: string;
      data: any;
      lastSynced: number;
    };
  };
  workSessions: {
    key: string;
    value: {
      id: string;
      data: any;
      lastSynced: number;
    };
  };
  procedures: {
    key: string;
    value: {
      id: string;
      data: any;
      lastSynced: number;
    };
  };
  photos: {
    key: string;
    value: {
      id: string;
      blob: Blob;
      metadata: any;
      uploaded: boolean;
    };
  };
  syncQueue: {
    key: number;
    value: {
      id?: number;
      table: string;
      operation: 'insert' | 'update' | 'delete';
      data: any;
      timestamp: number;
      retries: number;
    };
    indexes: { 'by-timestamp': number };
  };
}

class OfflineStorage {
  private db: IDBPDatabase<OfflineDB> | null = null;
  private readonly DB_NAME = 'FieldOpsOffline';
  private readonly DB_VERSION = 1;

  async init(): Promise<void> {
    if (this.db) return;

    this.db = await openDB<OfflineDB>(this.DB_NAME, this.DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('workOrders')) {
          db.createObjectStore('workOrders', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('workSessions')) {
          db.createObjectStore('workSessions', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('procedures')) {
          db.createObjectStore('procedures', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('photos')) {
          db.createObjectStore('photos', { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains('syncQueue')) {
          const syncStore = db.createObjectStore('syncQueue', {
            keyPath: 'id',
            autoIncrement: true,
          });
          syncStore.createIndex('by-timestamp', 'timestamp');
        }
      },
    });
  }

  async saveWorkOrder(id: string, data: any): Promise<void> {
    await this.init();
    await this.db!.put('workOrders', {
      id,
      data,
      lastSynced: Date.now(),
    });
  }

  async getWorkOrder(id: string): Promise<any | undefined> {
    await this.init();
    const record = await this.db!.get('workOrders', id);
    return record?.data;
  }

  async getAllWorkOrders(): Promise<any[]> {
    await this.init();
    const records = await this.db!.getAll('workOrders');
    return records.map(r => r.data);
  }

  async saveWorkSession(id: string, data: any): Promise<void> {
    await this.init();
    await this.db!.put('workSessions', {
      id,
      data,
      lastSynced: Date.now(),
    });
  }

  async getWorkSession(id: string): Promise<any | undefined> {
    await this.init();
    const record = await this.db!.get('workSessions', id);
    return record?.data;
  }

  async saveProcedure(id: string, data: any): Promise<void> {
    await this.init();
    await this.db!.put('procedures', {
      id,
      data,
      lastSynced: Date.now(),
    });
  }

  async getProcedure(id: string): Promise<any | undefined> {
    await this.init();
    const record = await this.db!.get('procedures', id);
    return record?.data;
  }

  async savePhoto(id: string, blob: Blob, metadata: any): Promise<void> {
    await this.init();
    await this.db!.put('photos', {
      id,
      blob,
      metadata,
      uploaded: false,
    });
  }

  async getPhoto(id: string): Promise<{ blob: Blob; metadata: any } | undefined> {
    await this.init();
    const record = await this.db!.get('photos', id);
    if (!record) return undefined;
    return { blob: record.blob, metadata: record.metadata };
  }

  async getUnuploadedPhotos(): Promise<Array<{ id: string; blob: Blob; metadata: any }>> {
    await this.init();
    const photos = await this.db!.getAll('photos');
    return photos
      .filter(p => !p.uploaded)
      .map(p => ({ id: p.id, blob: p.blob, metadata: p.metadata }));
  }

  async markPhotoAsUploaded(id: string): Promise<void> {
    await this.init();
    const photo = await this.db!.get('photos', id);
    if (photo) {
      photo.uploaded = true;
      await this.db!.put('photos', photo);
    }
  }

  async addToSyncQueue(
    table: string,
    operation: 'insert' | 'update' | 'delete',
    data: any
  ): Promise<void> {
    await this.init();
    await this.db!.add('syncQueue', {
      table,
      operation,
      data,
      timestamp: Date.now(),
      retries: 0,
    });
  }

  async getSyncQueue(): Promise<Array<{
    id: number;
    table: string;
    operation: string;
    data: any;
    timestamp: number;
    retries: number;
  }>> {
    await this.init();
    return await this.db!.getAll('syncQueue');
  }

  async removeSyncQueueItem(id: number): Promise<void> {
    await this.init();
    await this.db!.delete('syncQueue', id);
  }

  async incrementSyncRetries(id: number): Promise<void> {
    await this.init();
    const item = await this.db!.get('syncQueue', id);
    if (item) {
      item.retries += 1;
      await this.db!.put('syncQueue', item);
    }
  }

  async clearAllData(): Promise<void> {
    await this.init();
    await this.db!.clear('workOrders');
    await this.db!.clear('workSessions');
    await this.db!.clear('procedures');
    await this.db!.clear('photos');
    await this.db!.clear('syncQueue');
  }

  async getStorageSize(): Promise<{ used: number; available: number }> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      const estimate = await navigator.storage.estimate();
      return {
        used: estimate.usage || 0,
        available: estimate.quota || 0,
      };
    }
    return { used: 0, available: 0 };
  }
}

export const offlineStorage = new OfflineStorage();