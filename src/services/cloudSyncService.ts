import { getAuthApiUrl } from './authService';
import { AppDataStore } from './dataService';

export type CloudSyncStatus = 'idle' | 'syncing' | 'saving' | 'synced' | 'error';

const PENDING_KEYS_STORAGE_KEY = 'leego_pending_sync_keys_v1';

export interface CloudFetchResult {
  success: boolean;
  initialized: boolean;
  version: number;
  keyVersions: Record<string, number>;
  updatedAt?: string;
  updatedBy?: string;
  data?: Partial<AppDataStore> & Record<string, unknown>;
  error?: string;
}

export interface CloudVersionResult {
  success: boolean;
  initialized: boolean;
  version: number;
  keyVersions: Record<string, number>;
  updatedAt?: string;
  updatedBy?: string;
  error?: string;
}

export interface CloudSaveResult {
  success: boolean;
  alreadyInitialized?: boolean;
  conflict?: boolean;
  conflictKeys?: string[];
  version: number;
  keyVersions: Record<string, number>;
  updatedAt?: string;
  updatedBy?: string;
  data?: Partial<AppDataStore> & Record<string, unknown>;
  error?: string;
}

async function postToSyncApi<T extends Record<string, unknown>>(
  payload: Record<string, unknown>
): Promise<{ ok: boolean; json?: T; error?: string }> {
  const apiUrl = getAuthApiUrl();
  if (!apiUrl) {
    return {
      ok: false,
      error: 'Chưa cấu hình URL Google Apps Script (VITE_AUTH_API_URL).'
    };
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload),
      redirect: 'follow'
    });

    if (!response.ok) {
      return {
        ok: false,
        error: `Máy chủ đồng bộ phản hồi lỗi HTTP ${response.status}.`
      };
    }

    const parsed = (await response.json()) as T;
    return { ok: true, json: parsed };
  } catch (err) {
    console.error('Cloud sync request failed:', err);
    return {
      ok: false,
      error: 'Không thể kết nối máy chủ Google Apps Script. Vui lòng kiểm tra kết nối mạng.'
    };
  }
}

export async function fetchCenterDataFromCloud(): Promise<CloudFetchResult> {
  const res = await postToSyncApi<Record<string, unknown>>({
    action: 'getCenterData'
  });

  if (!res.ok || !res.json) {
    return {
      success: false,
      initialized: false,
      version: 0,
      keyVersions: {},
      error: res.error || 'Không thể tải dữ liệu dùng chung từ Cloud.'
    };
  }

  const body = res.json;
  if (body.success !== true) {
    return {
      success: false,
      initialized: false,
      version: 0,
      keyVersions: {},
      error: String(body.message || 'Máy chủ từ chối yêu cầu tải dữ liệu.')
    };
  }

  return {
    success: true,
    initialized: Boolean(body.initialized),
    version: Number(body.version || 0),
    keyVersions: (body.keyVersions as Record<string, number>) || {},
    updatedAt: body.updatedAt ? String(body.updatedAt) : undefined,
    updatedBy: body.updatedBy ? String(body.updatedBy) : undefined,
    data: (body.data as Partial<AppDataStore> & Record<string, unknown>) || undefined
  };
}

export async function fetchCenterVersionFromCloud(): Promise<CloudVersionResult> {
  const res = await postToSyncApi<Record<string, unknown>>({
    action: 'getCenterVersion'
  });

  if (!res.ok || !res.json) {
    return {
      success: false,
      initialized: false,
      version: 0,
      keyVersions: {},
      error: res.error || 'Không thể kiểm tra phiên bản dữ liệu trên Cloud.'
    };
  }

  const body = res.json;
  if (body.success !== true) {
    return {
      success: false,
      initialized: false,
      version: 0,
      keyVersions: {},
      error: String(body.message || 'Lỗi kiểm tra phiên bản Cloud.')
    };
  }

  return {
    success: true,
    initialized: Boolean(body.initialized),
    version: Number(body.version || 0),
    keyVersions: (body.keyVersions as Record<string, number>) || {},
    updatedAt: body.updatedAt ? String(body.updatedAt) : undefined,
    updatedBy: body.updatedBy ? String(body.updatedBy) : undefined
  };
}

export async function initializeCenterDataOnCloud(
  data: AppDataStore & Record<string, unknown>,
  updatedBy: string
): Promise<CloudSaveResult> {
  const res = await postToSyncApi<Record<string, unknown>>({
    action: 'initializeCenterData',
    data,
    updatedBy
  });

  if (!res.ok || !res.json) {
    return {
      success: false,
      version: 0,
      keyVersions: {},
      error: res.error || 'Không thể khởi tạo dữ liệu dùng chung lên Google Sheets.'
    };
  }

  const body = res.json;
  if (body.success !== true) {
    return {
      success: false,
      version: Number(body.version || 0),
      keyVersions: (body.keyVersions as Record<string, number>) || {},
      error: String(body.message || 'Khởi tạo dữ liệu lên Cloud thất bại.')
    };
  }

  return {
    success: true,
    alreadyInitialized: Boolean(body.alreadyInitialized),
    version: Number(body.version || 1),
    keyVersions: (body.keyVersions as Record<string, number>) || {},
    updatedAt: body.updatedAt ? String(body.updatedAt) : undefined,
    updatedBy: body.updatedBy ? String(body.updatedBy) : undefined,
    data: (body.data as Partial<AppDataStore> & Record<string, unknown>) || undefined
  };
}

export async function saveCenterKeysToCloud(
  keys: Record<string, unknown>,
  baseKeyVersions: Record<string, number>,
  updatedBy: string,
  force: boolean = false
): Promise<CloudSaveResult> {
  const res = await postToSyncApi<Record<string, unknown>>({
    action: 'saveCenterData',
    keys,
    baseKeyVersions,
    updatedBy,
    force
  });

  if (!res.ok || !res.json) {
    return {
      success: false,
      version: 0,
      keyVersions: {},
      error: res.error || 'Không thể lưu dữ liệu lên Google Sheets.'
    };
  }

  const body = res.json;

  if (body.conflict === true) {
    return {
      success: false,
      conflict: true,
      conflictKeys: Array.isArray(body.conflictKeys) ? (body.conflictKeys as string[]) : [],
      version: Number(body.version || 0),
      keyVersions: (body.keyVersions as Record<string, number>) || {},
      updatedAt: body.updatedAt ? String(body.updatedAt) : undefined,
      updatedBy: body.updatedBy ? String(body.updatedBy) : undefined,
      data: (body.data as Partial<AppDataStore> & Record<string, unknown>) || undefined,
      error: `Dữ liệu trên Cloud vừa được ${String(body.updatedBy || 'tài khoản khác')} cập nhật. Vui lòng đồng bộ lại trước khi lưu tiếp.`
    };
  }

  if (body.success !== true) {
    return {
      success: false,
      version: Number(body.version || 0),
      keyVersions: (body.keyVersions as Record<string, number>) || {},
      error: String(body.message || 'Lưu dữ liệu lên Google Sheets thất bại.')
    };
  }

  return {
    success: true,
    version: Number(body.version || 0),
    keyVersions: (body.keyVersions as Record<string, number>) || {},
    updatedAt: body.updatedAt ? String(body.updatedAt) : undefined,
    updatedBy: body.updatedBy ? String(body.updatedBy) : undefined
  };
}

export function loadPendingSyncKeys(): string[] {
  try {
    const raw = localStorage.getItem(PENDING_KEYS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(k => typeof k === 'string') : [];
  } catch {
    return [];
  }
}

export function savePendingSyncKeys(keys: string[]): void {
  try {
    if (keys.length === 0) {
      localStorage.removeItem(PENDING_KEYS_STORAGE_KEY);
    } else {
      localStorage.setItem(PENDING_KEYS_STORAGE_KEY, JSON.stringify(keys));
    }
  } catch (err) {
    console.error('Failed to persist pending sync keys', err);
  }
}

const MERGEABLE_ARRAY_KEYS = [
  'students',
  'classes',
  'teachers',
  'teachingAssistants',
  'programs',
  'timetable',
  'attendance',
  'assessments',
  'lessonPlans',
  'parents',
  'teachingSchedules',
  'courseDurations',
  'courseHolidays',
  'courseMakeups',
  'courseDurationHistory',
  'lessonReports',
  'incompleteReports',
  'makeupSessions'
];

/**
 * Detect custom local records that exist in browser cache, are NOT baseline demo records,
 * and have NOT yet been saved to the shared Google Sheet.
 */
export function detectUnsyncedLocalRecords(
  localStore: Record<string, unknown>,
  cloudStore: Record<string, unknown>,
  baselineStore: Record<string, unknown>
): number {
  let count = 0;

  for (const key of MERGEABLE_ARRAY_KEYS) {
    const localList = Array.isArray(localStore[key]) ? (localStore[key] as Array<{ id?: string }>) : [];
    const cloudList = Array.isArray(cloudStore[key]) ? (cloudStore[key] as Array<{ id?: string }>) : [];
    const baseList = Array.isArray(baselineStore[key]) ? (baselineStore[key] as Array<{ id?: string }>) : [];

    const cloudIds = new Set(cloudList.map(item => item?.id).filter(Boolean));
    const baseIds = new Set(baseList.map(item => item?.id).filter(Boolean));

    for (const item of localList) {
      if (item?.id && !cloudIds.has(item.id) && !baseIds.has(item.id)) {
        count += 1;
      }
    }
  }

  return count;
}

/**
 * Non-destructively append unsynchronized local records into the cloud collections
 * without overwriting or deleting any existing cloud records.
 */
export function mergeLocalRecordsIntoCloud(
  localStore: Record<string, unknown>,
  cloudStore: Record<string, unknown>,
  baselineStore: Record<string, unknown>
): { mergedKeys: Record<string, unknown[]>; mergedCount: number } {
  const mergedKeys: Record<string, unknown[]> = {};
  let mergedCount = 0;

  for (const key of MERGEABLE_ARRAY_KEYS) {
    const localList = Array.isArray(localStore[key]) ? (localStore[key] as Array<{ id?: string }>) : [];
    const cloudList = Array.isArray(cloudStore[key]) ? (cloudStore[key] as Array<{ id?: string }>) : [];
    const baseList = Array.isArray(baselineStore[key]) ? (baselineStore[key] as Array<{ id?: string }>) : [];

    const cloudIds = new Set(cloudList.map(item => item?.id).filter(Boolean));
    const baseIds = new Set(baseList.map(item => item?.id).filter(Boolean));

    const additions = localList.filter(
      item => item?.id && !cloudIds.has(item.id) && !baseIds.has(item.id)
    );

    if (additions.length > 0) {
      mergedKeys[key] = [...additions, ...cloudList];
      mergedCount += additions.length;
    }
  }

  return { mergedKeys, mergedCount };
}
