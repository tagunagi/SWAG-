const API_BASE_URL = 'https://swagguan-li-dian-zi-hua.onrender.com/api';

let currentUser = null;

window.addEventListener('load', function() {
    currentUser = null;
    const loginSection = document.getElementById('loginSection');
    const managementSection = document.getElementById('managementSection');
    if (loginSection) loginSection.style.display = 'block';
    if (managementSection) managementSection.style.display = 'none';
});

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const useForm = document.getElementById('useForm');
    if (useForm) useForm.addEventListener('submit', handleUse);

    const grantForm = document.getElementById('grantForm');
    if (grantForm) grantForm.addEventListener('submit', handleGrant);

    const deductForm = document.getElementById('deductForm');
    if (deductForm) deductForm.addEventListener('submit', handleDeduct);

    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', handleExport);

    const bulkGrantForm = document.getElementById('bulkGrantForm');
    if (bulkGrantForm) bulkGrantForm.addEventListener('submit', handleBulkGrant);

    const bulkAddForm = document.getElementById('bulkAddForm');
    if (bulkAddForm) bulkAddForm.addEventListener('submit', handleBulkAdd);
});

async function handleLogin(event) {
    event.preventDefault();
    const userId = document.getElementById('loginId').value;
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId })
        });
        if (!response.ok) throw new Error('ログインに失敗しました');
        const data = await response.json();
        currentUser = data;
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('managementSection').style.display = 'block';
        document.getElementById('userName').textContent = data.name;
        document.getElementById('swagBalance').textContent = data.swag;
        if (data.isAdmin) {
            document.getElementById('adminMenu').style.display = 'block';
        } else {
            document.getElementById('adminMenu').style.display = 'none';
        }
        await loadHistory();
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

async function handleUse(event) {
    event.preventDefault();
    const amount = parseInt(document.getElementById('useAmount').value);
    const reason = document.getElementById('useReason').value;
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/use`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, reason: reason })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'SWAG使用に失敗しました');
        }
        const data = await response.json();
        currentUser.swag = data.newBalance;
        document.getElementById('swagBalance').textContent = data.newBalance;
        document.getElementById('useForm').reset();
        await loadHistory();
        alert('SWAGを使用しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

async function handleGrant(event) {
    event.preventDefault();
    const targetUserId = document.getElementById('grantUserId').value;
    const amount = parseInt(document.getElementById('grantAmount').value);
    const reason = document.getElementById('grantReason').value;
    try {
        const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/grant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, reason: reason, grantedBy: currentUser.id })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'SWAG付与に失敗しました');
        }
        const data = await response.json();
        document.getElementById('grantForm').reset();
        if (targetUserId === currentUser.id) {
            currentUser.swag = data.newBalance;
            document.getElementById('swagBalance').textContent = data.newBalance;
        }
        await loadHistory();
        alert('SWAGを付与しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

async function handleDeduct(event) {
    event.preventDefault();
    const targetUserId = document.getElementById('deductUserId').value;
    const amount = parseInt(document.getElementById('deductAmount').value);
    const reason = document.getElementById('deductReason').value;
    try {
        const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/deduct`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, reason: reason, deductedBy: currentUser.id })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'SWAG減数に失敗しました');
        }
        const data = await response.json();
        document.getElementById('deductForm').reset();
        if (targetUserId === currentUser.id) {
            currentUser.swag = data.newBalance;
            document.getElementById('swagBalance').textContent = data.newBalance;
        }
        await loadHistory();
        alert('SWAGを減数しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// エクスポート処理（管理者用）
async function handleExport() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/export`, {
            method: 'GET'
        });
        if (!response.ok) throw new Error('エクスポートに失敗しました');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'swag_users.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        alert('エクスポートが完了しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 一括SWAG付与処理（管理者用）
async function handleBulkGrant(event) {
    event.preventDefault();
    const userIdsText = document.getElementById('bulkGrantUserIds').value;
    const amount = parseInt(document.getElementById('bulkGrantAmount').value);
    const reason = document.getElementById('bulkGrantReason').value;
    const userIds = userIdsText.split(String.fromCharCode(10)).map(id => id.trim()).filter(id => id !== '');
    if (userIds.length === 0) {
        alert('ユーザーIDを入力してください');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/users/bulk-grant`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: userIds, amount: amount, reason: reason, grantedBy: currentUser.id })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '一括付与に失敗しました');
        }
        const data = await response.json();
        const successCount = data.results.filter(r => r.status === '付与成功').length;
        const failCount = data.results.filter(r => r.status !== '付与成功').length;
        document.getElementById('bulkGrantForm').reset();
        await loadHistory();
        alert(`一括付与完了！
成功: ${successCount}件
失敗: ${failCount}件`);
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 一括ユーザー追加処理（管理者用）
async function handleBulkAdd(event) {
    event.preventDefault();
    const jsonText = document.getElementById('bulkAddJson').value;
    let users;
    try {
        users = JSON.parse(jsonText);
    } catch (e) {
        alert('JSONの形式が正しくありません。確認してください。');
        return;
    }
    try {
        const response = await fetch(`${API_BASE_URL}/users/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: users })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '一括追加に失敗しました');
        }
        const data = await response.json();
        const successCount = data.results.filter(r => r.status === '追加成功').length;
        const skipCount = data.results.filter(r => r.status !== '追加成功').length;
        document.getElementById('bulkAddForm').reset();
        alert(`一括追加完了！
追加成功: ${successCount}件
スキップ（既存）: ${skipCount}件`);
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/history`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('履歴の取得に失敗しました');
        const data = await response.json();
        displayUseHistory(data.useHistory);
        displayGrantHistory(data.grantHistory);
        displayDeductHistory(data.deductHistory);
    } catch (error) {
        console.error('履歴取得エラー:', error);
    }
}

function displayUseHistory(history) {
    const tbody = document.getElementById('useHistoryBody');
    tbody.innerHTML = '';
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">履歴がありません</td></tr>';
        return;
    }
    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + formatDate(item.date) + '</td><td>' + item.amount + '</td><td>' + (item.reason || '-') + '</td><td>' + item.balance + '</td>';
        tbody.appendChild(row);
    });
}

function displayGrantHistory(history) {
    const tbody = document.getElementById('grantHistoryBody');
    tbody.innerHTML = '';
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">履歴がありません</td></tr>';
        return;
    }
    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + formatDate(item.date) + '</td><td>' + item.amount + '</td><td>' + (item.reason || '-') + '</td><td>' + (item.granted_by || '-') + '</td><td>' + item.balance + '</td>';
        tbody.appendChild(row);
    });
}

function displayDeductHistory(history) {
    const tbody = document.getElementById('deductHistoryBody');
    tbody.innerHTML = '';
    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">履歴がありません</td></tr>';
        return;
    }
    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + formatDate(item.date) + '</td><td>' + item.amount + '</td><td>' + (item.reason || '-') + '</td><td>' + (item.deducted_by || '-') + '</td><td>' + item.balance + '</td>';
        tbody.appendChild(row);
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
}

function handleLogout() {
    currentUser = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('managementSection').style.display = 'none';
    document.getElementById('loginForm').reset();
}
