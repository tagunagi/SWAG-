// API設定
const API_BASE_URL = 'https://swagguan-li-dian-zi-hua.onrender.com/api';

// グローバル変数
let currentUser = null;

// ページ読み込み時にログイン状態をクリア（不具合1の修正）
window.addEventListener('load', function() {
    // ログイン状態をクリア
    currentUser = null;

    // ログイン画面を表示、管理画面を非表示
    const loginSection = document.getElementById('loginSection');
    const managementSection = document.getElementById('managementSection');

    if (loginSection) loginSection.style.display = 'block';
    if (managementSection) managementSection.style.display = 'none';
});

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // ログインフォームのイベントリスナー
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // SWAG使用フォームのイベントリスナー
    const useForm = document.getElementById('useForm');
    if (useForm) {
        useForm.addEventListener('submit', handleUse);
    }

    // SWAG付与フォームのイベントリスナー
    const grantForm = document.getElementById('grantForm');
    if (grantForm) {
        grantForm.addEventListener('submit', handleGrant);
    }

    // SWAG減数フォームのイベントリスナー
    const deductForm = document.getElementById('deductForm');
    if (deductForm) {
        deductForm.addEventListener('submit', handleDeduct);
    }

    // ログアウトボタンのイベントリスナー
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

// ログイン処理
async function handleLogin(event) {
    event.preventDefault();

    const userId = document.getElementById('loginId').value;

    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userId })
        });

        if (!response.ok) {
            throw new Error('ログインに失敗しました');
        }

        const data = await response.json();
        currentUser = data;

        // ログイン画面を非表示、管理画面を表示
        document.getElementById('loginSection').style.display = 'none';
        document.getElementById('managementSection').style.display = 'block';

        // ユーザー情報を表示
        document.getElementById('userName').textContent = data.name;
        document.getElementById('swagBalance').textContent = data.swag;

        // 管理者メニューの表示/非表示
        if (data.isAdmin) {
            document.getElementById('adminMenu').style.display = 'block';
        } else {
            document.getElementById('adminMenu').style.display = 'none';
        }

        // 履歴を読み込み
        await loadHistory();

    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// SWAG使用処理
async function handleUse(event) {
    event.preventDefault();

    const amount = parseInt(document.getElementById('useAmount').value);
    const reason = document.getElementById('useReason').value;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/use`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                reason: reason
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'SWAG使用に失敗しました');
        }

        const data = await response.json();

        // SWAG残高を更新
        currentUser.swag = data.newBalance;
        document.getElementById('swagBalance').textContent = data.newBalance;

        // フォームをリセット
        document.getElementById('useForm').reset();

        // 履歴を再読み込み（不具合2の修正）
        await loadHistory();

        alert('SWAGを使用しました');

    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// SWAG付与処理(管理者用)
async function handleGrant(event) {
    event.preventDefault();

    const targetUserId = document.getElementById('grantUserId').value;
    const amount = parseInt(document.getElementById('grantAmount').value);
    const reason = document.getElementById('grantReason').value;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/grant`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                reason: reason,
                grantedBy: currentUser.id
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'SWAG付与に失敗しました');
        }

        const data = await response.json();

        // フォームをリセット
        document.getElementById('grantForm').reset();

        // 自分自身への付与の場合、残高を更新
        if (targetUserId === currentUser.id) {
            currentUser.swag = data.newBalance;
            document.getElementById('swagBalance').textContent = data.newBalance;
        }

        // 履歴を再読み込み（不具合2の修正）
        await loadHistory();

        alert('SWAGを付与しました');

    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// SWAG減数処理(管理者用)
async function handleDeduct(event) {
    event.preventDefault();

    const targetUserId = document.getElementById('deductUserId').value;
    const amount = parseInt(document.getElementById('deductAmount').value);
    const reason = document.getElementById('deductReason').value;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${targetUserId}/deduct`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: amount,
                reason: reason,
                deductedBy: currentUser.id
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'SWAG減数に失敗しました');
        }

        const data = await response.json();

        // フォームをリセット
        document.getElementById('deductForm').reset();

        // 自分自身への減数の場合、残高を更新
        if (targetUserId === currentUser.id) {
            currentUser.swag = data.newBalance;
            document.getElementById('swagBalance').textContent = data.newBalance;
        }

        // 履歴を再読み込み（不具合2の修正）
        await loadHistory();

        alert('SWAGを減数しました');

    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

// 履歴取得処理
async function loadHistory() {
    try {
        const response = await fetch(`${API_BASE_URL}/users/${currentUser.id}/history`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('履歴の取得に失敗しました');
        }

        const data = await response.json();

        // 使用履歴を表示
        displayUseHistory(data.useHistory);

        // 付与履歴を表示
        displayGrantHistory(data.grantHistory);

        // 減数履歴を表示
        displayDeductHistory(data.deductHistory);

    } catch (error) {
        console.error('履歴取得エラー:', error);
    }
}

// 使用履歴を表示
function displayUseHistory(history) {
    const tbody = document.getElementById('useHistoryBody');
    tbody.innerHTML = '';

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4">履歴がありません</td></tr>';
        return;
    }

    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td>${item.amount}</td>
            <td>${item.reason || '-'}</td>
            <td>${item.balance}</td>
        `;
        tbody.appendChild(row);
    });
}

// 付与履歴を表示
function displayGrantHistory(history) {
    const tbody = document.getElementById('grantHistoryBody');
    tbody.innerHTML = '';

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">履歴がありません</td></tr>';
        return;
    }

    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td>${item.amount}</td>
            <td>${item.reason || '-'}</td>
            <td>${item.granted_by || '-'}</td>
            <td>${item.balance}</td>
        `;
        tbody.appendChild(row);
    });
}

// 減数履歴を表示
function displayDeductHistory(history) {
    const tbody = document.getElementById('deductHistoryBody');
    tbody.innerHTML = '';

    if (history.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">履歴がありません</td></tr>';
        return;
    }

    history.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${formatDate(item.date)}</td>
            <td>${item.amount}</td>
            <td>${item.reason || '-'}</td>
            <td>${item.deducted_by || '-'}</td>
            <td>${item.balance}</td>
        `;
        tbody.appendChild(row);
    });
}

// 日付フォーマット
function formatDate(dateString) {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}`;
}

// ログアウト処理
function handleLogout() {
    currentUser = null;
    document.getElementById('loginSection').style.display = 'block';
    document.getElementById('managementSection').style.display = 'none';
    document.getElementById('loginForm').reset();
}
