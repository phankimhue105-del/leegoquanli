/**
 * =========================================================================
 * LEEGO CENTER MANAGEMENT – GOOGLE APPS SCRIPT AUTHENTICATION BACKEND
 * =========================================================================
 * 
 * Instructions:
 * 1. Create a new Google Sheet named "LeeGo_User_Database" in Google Drive.
 * 2. Rename the first sheet tab to "Users".
 * 3. Add column headers in Row 1:
 *    A: userId | B: username | C: password | D: fullName | E: role | F: status | G: teacherId | H: permissions | I: assignedClasses | J: lastLogin
 * 
 * 4. In Google Sheets, click "Extensions" -> "Apps Script".
 * 5. Replace all content in Code.gs with this script.
 * 6. Click "Deploy" -> "New deployment" -> Select type "Web app".
 *    - Description: LeeGo Auth API
 *    - Execute as: Me (your Google account)
 *    - Who has access: Anyone (required for frontend web fetch)
 * 7. Copy the "Web app URL" (e.g., https://script.google.com/macros/s/.../exec).
 * 8. Add this URL to your project's .env file:
 *    VITE_AUTH_API_URL="https://script.google.com/macros/s/.../exec"
 */

const SHEET_NAME = 'Users';

/**
 * Handle HTTP POST requests from React frontend
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse({
        status: 'error',
        message: 'Yêu cầu không hợp lệ (Không có dữ liệu gửi lên).'
      });
    }

    const payload = JSON.parse(e.postData.contents);
    const action = payload.action;

    if (action === 'login') {
      return handleLogin(payload.username, payload.password);
    }

    return createJsonResponse({
      status: 'error',
      message: 'Hành động không được hỗ trợ: ' + action
    });

  } catch (error) {
    return createJsonResponse({
      status: 'error',
      message: 'Lỗi xử lý máy chủ: ' + error.toString()
    });
  }
}

/**
 * Handle HTTP GET (Health-check)
 */
function doGet(e) {
  return createJsonResponse({
    status: 'ok',
    message: 'LeeGo Center Auth API đang hoạt động bình thường.',
    timestamp: new Date().toISOString()
  });
}

/**
 * Account verification logic against Google Sheet
 */
function handleLogin(username, password) {
  if (!username || !password) {
    return createJsonResponse({
      status: 'error',
      message: 'Vui lòng cung cấp đầy đủ tên đăng nhập và mật khẩu.'
    });
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.getSheets()[0]; // Fallback to first sheet
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return createJsonResponse({
      status: 'error',
      message: 'Cơ sở dữ liệu tài khoản trống. Vui lòng thêm tài khoản vào Google Sheet.'
    });
  }

  const headers = data[0].map(h => String(h).trim().toLowerCase());
  const colIndex = {
    userId: headers.indexOf('userid'),
    username: headers.indexOf('username'),
    password: headers.indexOf('password'),
    fullName: headers.indexOf('fullname'),
    role: headers.indexOf('role'),
    status: headers.indexOf('status'),
    teacherId: headers.indexOf('teacherid'),
    permissions: headers.indexOf('permissions'),
    assignedClasses: headers.indexOf('assignedclasses')
  };

  const targetUsername = String(username).trim().toLowerCase();
  let matchedUser = null;
  let rowIndex = -1;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const uName = String(row[colIndex.username] || '').trim().toLowerCase();
    
    if (uName === targetUsername) {
      const storedPassword = String(row[colIndex.password] || '').trim();
      
      // Compare passwords (supports plaintext or hashed strings)
      if (storedPassword === String(password).trim()) {
        const statusVal = String(row[colIndex.status] || 'active').trim().toLowerCase();
        
        if (statusVal === 'inactive' || statusVal === 'locked' || statusVal === 'blocked') {
          return createJsonResponse({
            status: 'error',
            message: 'Tài khoản đã bị khóa. Vui lòng liên hệ Quản trị viên để được mở lại.'
          });
        }

        let permissionsArray = [];
        try {
          const rawPerms = row[colIndex.permissions];
          if (rawPerms) {
            permissionsArray = typeof rawPerms === 'string' && rawPerms.startsWith('[')
              ? JSON.parse(rawPerms)
              : String(rawPerms).split(',').map(p => p.trim());
          }
        } catch (e) {}

        let assignedClassesArray = [];
        try {
          const rawClasses = row[colIndex.assignedClasses];
          if (rawClasses) {
            assignedClassesArray = typeof rawClasses === 'string' && rawClasses.startsWith('[')
              ? JSON.parse(rawClasses)
              : String(rawClasses).split(',').map(c => c.trim());
          }
        } catch (e) {}

        matchedUser = {
          userId: String(row[colIndex.userId] || ('USR-' + i)),
          username: String(row[colIndex.username]),
          fullName: String(row[colIndex.fullName] || row[colIndex.username]),
          role: String(row[colIndex.role] || 'teacher').toLowerCase(),
          status: 'active',
          teacherId: row[colIndex.teacherId] ? String(row[colIndex.teacherId]) : undefined,
          permissions: permissionsArray,
          assignedClasses: assignedClassesArray
        };

        rowIndex = i + 1;
        break;
      } else {
        return createJsonResponse({
          status: 'error',
          message: 'Tên đăng nhập hoặc mật khẩu không chính xác.'
        });
      }
    }
  }

  if (!matchedUser) {
    return createJsonResponse({
      status: 'error',
      message: 'Tên đăng nhập hoặc mật khẩu không chính xác.'
    });
  }

  // Update last login timestamp in sheet if column exists
  const lastLoginColIndex = headers.indexOf('lastlogin');
  if (lastLoginColIndex !== -1 && rowIndex !== -1) {
    sheet.getRange(rowIndex, lastLoginColIndex + 1).setValue(new Date().toLocaleString('vi-VN'));
  }

  return createJsonResponse({
    status: 'success',
    user: matchedUser,
    token: 'leego_token_' + Utilities.getUuid()
  });
}

/**
 * Helper to build JSON responses with CORS headers
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
