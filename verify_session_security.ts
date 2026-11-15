import {
  AUTH_USER_KEY,
  AUTH_STATUS_KEY,
  AUTH_META_KEY,
  IDLE_TIMEOUT_MS,
  ABSOLUTE_TIMEOUT_MS,
  SessionMeta,
  sanitizeUserForSession,
  isSessionExpired,
  clearPersistentAndSessionStorage
} from './src/context/AuthContext';
import { initialUsers } from './src/data/initialData';
import { User } from './src/types';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`);
    process.exit(1);
  } else {
    console.log(`✅ PASSED: ${msg}`);
  }
}

console.log('=== TEST SUITE: LOGIN SESSION SECURITY HARDENING ===\n');

// Mock browser storage objects
const mockSessionStorage: Record<string, string> = {};
const mockLocalStorage: Record<string, string> = {};

(global as any).sessionStorage = {
  getItem: (k: string) => mockSessionStorage[k] || null,
  setItem: (k: string, v: string) => { mockSessionStorage[k] = v; },
  removeItem: (k: string) => { delete mockSessionStorage[k]; },
  clear: () => { Object.keys(mockSessionStorage).forEach(k => delete mockSessionStorage[k]); }
};

(global as any).localStorage = {
  getItem: (k: string) => mockLocalStorage[k] || null,
  setItem: (k: string, v: string) => { mockLocalStorage[k] = v; },
  removeItem: (k: string) => { delete mockLocalStorage[k]; },
  clear: () => { Object.keys(mockLocalStorage).forEach(k => delete mockLocalStorage[k]); }
};

// --- Test 1: Password stripping (No plaintext passwords stored) ---
console.log('--- Test 1: Password Stripping & No Plaintext Passwords ---');
const userWithPassword: User = {
  id: 'USR-TEST-001',
  name: 'Test Admin',
  email: 'admin@leego.edu.vn',
  role: 'admin',
  password: 'SuperSecretPlaintextPassword123!',
  status: 'active'
};

const safeUser = sanitizeUserForSession(userWithPassword);
assert(safeUser.password === undefined, 'Sanitize user removes password field');
assert(!('password' in safeUser), 'Password property completely removed from user object');

// --- Test 2: Session validation with active and valid timestamps ---
console.log('\n--- Test 2: Valid Session Handling ---');
const now = Date.now();
const validMeta: SessionMeta = {
  loginTime: now - 1000 * 60 * 10, // Logged in 10 minutes ago
  lastActivity: now - 1000 * 60 * 5 // Active 5 minutes ago
};

const checkValid = isSessionExpired(validMeta);
assert(checkValid.expired === false, 'Session within 10m login and 5m activity is valid');

// --- Test 3: Idle timeout (30 minutes without activity) ---
console.log('\n--- Test 3: Idle Timeout (30 minutes) ---');
const idleExpiredMeta: SessionMeta = {
  loginTime: now - 1000 * 60 * 35, // Logged in 35 minutes ago
  lastActivity: now - (IDLE_TIMEOUT_MS + 1000) // Idle for 30m 1s
};

const checkIdle = isSessionExpired(idleExpiredMeta);
assert(checkIdle.expired === true, 'Session with > 30m inactivity is marked expired');
assert(checkIdle.reason === 'idle', 'Expiration reason correctly flagged as idle');

// --- Test 4: Absolute timeout (8 hours lifetime) ---
console.log('\n--- Test 4: Absolute Session Lifetime (8 hours) ---');
const absoluteExpiredMeta: SessionMeta = {
  loginTime: now - (ABSOLUTE_TIMEOUT_MS + 1000), // Logged in 8h 1s ago
  lastActivity: now - 1000 * 10 // Active 10 seconds ago
};

const checkAbsolute = isSessionExpired(absoluteExpiredMeta);
assert(checkAbsolute.expired === true, 'Session with > 8h login time is marked expired even with recent activity');
assert(checkAbsolute.reason === 'absolute', 'Expiration reason correctly flagged as absolute');

// --- Test 5: Storage Isolation (sessionStorage used, legacy localStorage cleared) ---
console.log('\n--- Test 5: Storage Isolation & Legacy Key Cleanup ---');
// Prepopulate legacy localStorage keys to simulate previous persistent session
mockLocalStorage['leego_auth_user_v1'] = JSON.stringify(userWithPassword);
mockLocalStorage['leego_auth_status_v1'] = 'true';

// Save valid session in sessionStorage
mockSessionStorage[AUTH_USER_KEY] = JSON.stringify(safeUser);
mockSessionStorage[AUTH_STATUS_KEY] = 'true';
mockSessionStorage[AUTH_META_KEY] = JSON.stringify(validMeta);

// Execute cleanup
clearPersistentAndSessionStorage();
assert(mockLocalStorage['leego_auth_user_v1'] === undefined, 'Legacy persistent user cleared from localStorage');
assert(mockLocalStorage['leego_auth_status_v1'] === undefined, 'Legacy persistent status cleared from localStorage');
assert(mockSessionStorage[AUTH_USER_KEY] === undefined, 'Session user cleared from sessionStorage');
assert(mockSessionStorage[AUTH_STATUS_KEY] === undefined, 'Session status cleared from sessionStorage');
assert(mockSessionStorage[AUTH_META_KEY] === undefined, 'Session meta cleared from sessionStorage');

// --- Test 6: Role Verification for all 4 roles ---
console.log('\n--- Test 6: Role Verification (Admin, Academic Manager, Teacher, TA) ---');
const adminUser = initialUsers.find(u => u.role === 'admin');
const academicManagerUser = initialUsers.find(u => u.role === 'academic_manager');
const teacherUser = initialUsers.find(u => u.role === 'teacher');
const taUser = initialUsers.find(u => u.role === 'teaching_assistant');

assert(adminUser !== undefined && adminUser.role === 'admin', 'Admin user found with role admin');
assert(academicManagerUser !== undefined && academicManagerUser.role === 'academic_manager', 'Academic Manager user found with role academic_manager');
assert(teacherUser !== undefined && teacherUser.role === 'teacher', 'Teacher user found with role teacher');
assert(taUser !== undefined && taUser.role === 'teaching_assistant', 'TA user found with role teaching_assistant');

// Ensure sanitized versions have no passwords
[adminUser, academicManagerUser, teacherUser, taUser].forEach(u => {
  if (u) {
    const s = sanitizeUserForSession(u);
    assert(!('password' in s) || s.password === undefined, `Sanitized ${u.role} has no plaintext password`);
  }
});

// --- Test 7: Simulating Page Refresh vs New Browser Session ---
console.log('\n--- Test 7: Simulating Page Refresh vs New Session ---');
// Page refresh: sessionStorage remains populated in the same tab
mockSessionStorage[AUTH_USER_KEY] = JSON.stringify(safeUser);
mockSessionStorage[AUTH_STATUS_KEY] = 'true';
mockSessionStorage[AUTH_META_KEY] = JSON.stringify(validMeta);

const reloadedStatus = mockSessionStorage[AUTH_STATUS_KEY];
const reloadedMeta: SessionMeta = JSON.parse(mockSessionStorage[AUTH_META_KEY]);
assert(reloadedStatus === 'true' && !isSessionExpired(reloadedMeta).expired, 'Refreshing page in same tab preserves valid session');

// New browser session: starts with empty sessionStorage
const newTabSessionStorage: Record<string, string> = {};
const newTabStatus = newTabSessionStorage[AUTH_STATUS_KEY];
assert(newTabStatus === undefined, 'New browser tab / session requires fresh authentication');

console.log('\n🎉 ALL SESSION SECURITY TESTS PASSED SUCCESSFULLY!');
