import { supabase } from './supabase';
import { offlineStorage } from './offlineStorage';

class SyncManager {
  private isSyncing = false;
  private syncInterval: number | null = null;

  async startAutoSync(intervalMs: number = 30000): Promise<void> {
    if (this.syncInterval) return;

    this.syncInterval = window.setInterval(() => {
      this.syncAll();
    }, intervalMs);

    await this.syncAll();
  }

  stopAutoSync(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  async syncAll(): Promise<{ success: boolean; errors: string[] }> {
    if (this.isSyncing) {
      return { success: false, errors: ['Sync already in progress'] };
    }

    if (!navigator.onLine) {
      return { success: false, errors: ['No internet connection'] };
    }

    this.isSyncing = true;
    const errors: string[] = [];

    try {
      await this.syncPhotos();
      await this.syncQueue();

      return { success: true, errors };
    } catch (error) {
      errors.push(`Sync error: ${error}`);
      return { success: false, errors };
    } finally {
      this.isSyncing = false;
    }
  }

  private async syncPhotos(): Promise<void> {
    const photos = await offlineStorage.getUnuploadedPhotos();

    for (const photo of photos) {
      try {
        const fileName = `${photo.id}-${Date.now()}.jpg`;
        const { error } = await supabase.storage
          .from('photos')
          .upload(fileName, photo.blob);

        if (!error) {
          await offlineStorage.markPhotoAsUploaded(photo.id);

          if (photo.metadata.work_session_id) {
            await supabase.from('photos').insert({
              id: photo.id,
              work_session_id: photo.metadata.work_session_id,
              step_completion_id: photo.metadata.step_completion_id,
              storage_path: fileName,
              photo_type: photo.metadata.photo_type || 'during',
              caption: photo.metadata.caption,
              taken_by: photo.metadata.taken_by,
              taken_at: photo.metadata.taken_at,
            });
          }
        }
      } catch (error) {
        console.error('Error syncing photo:', error);
      }
    }
  }

  private async syncQueue(): Promise<void> {
    const queue = await offlineStorage.getSyncQueue();

    for (const item of queue) {
      if (item.retries >= 5) {
        await offlineStorage.removeSyncQueueItem(item.id);
        continue;
      }

      try {
        if (item.operation === 'insert') {
          await supabase.from(item.table).insert(item.data);
        } else if (item.operation === 'update') {
          await supabase.from(item.table).update(item.data).eq('id', item.data.id);
        } else if (item.operation === 'delete') {
          await supabase.from(item.table).delete().eq('id', item.data.id);
        }

        await offlineStorage.removeSyncQueueItem(item.id);
      } catch (error) {
        console.error('Error syncing queue item:', error);
        await offlineStorage.incrementSyncRetries(item.id);
      }
    }
  }

  async downloadWorkOrderData(workOrderId: string): Promise<void> {
    const { data: workOrder } = await supabase
      .from('work_orders')
      .select(`
        *,
        customer:customers(*),
        equipment_unit:equipment_units(
          *,
          equipment_model:equipment_models(
            *,
            manufacturer:manufacturers(*),
            equipment_type:equipment_types(*)
          )
        )
      `)
      .eq('id', workOrderId)
      .maybeSingle();

    if (workOrder) {
      await offlineStorage.saveWorkOrder(workOrderId, workOrder);
    }

    const { data: sessions } = await supabase
      .from('work_sessions')
      .select('*')
      .eq('work_order_id', workOrderId);

    if (sessions) {
      for (const session of sessions) {
        await offlineStorage.saveWorkSession(session.id, session);
      }
    }

    if (workOrder?.equipment_unit?.equipment_model?.equipment_type_id) {
      const { data: procedures } = await supabase
        .from('procedure_templates')
        .select(`
          *,
          steps:procedure_steps(*)
        `)
        .eq('equipment_type_id', workOrder.equipment_unit.equipment_model.equipment_type_id);

      if (procedures) {
        for (const procedure of procedures) {
          await offlineStorage.saveProcedure(procedure.id, procedure);
        }
      }
    }
  }

  async getOfflineStatus(): Promise<{
    isOnline: boolean;
    pendingPhotos: number;
    pendingSync: number;
    storageUsed: number;
    storageAvailable: number;
  }> {
    const photos = await offlineStorage.getUnuploadedPhotos();
    const queue = await offlineStorage.getSyncQueue();
    const storage = await offlineStorage.getStorageSize();

    return {
      isOnline: navigator.onLine,
      pendingPhotos: photos.length,
      pendingSync: queue.length,
      storageUsed: storage.used,
      storageAvailable: storage.available,
    };
  }
}

export const syncManager = new SyncManager();