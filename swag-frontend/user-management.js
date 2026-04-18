const API_BASE_URL = 'https://swagguan-li-dian-zi-hua.onrender.com/api';

document.addEventListener('DOMContentLoaded', function() {
    loadUsers();

    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) addUserForm.addEventListener('submit', handleAddUser);

    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) editUserForm.addEventListener('submit', handleEditUser);

    const grantForm = document.getElementById('grantForm');
    if (grantForm) grantForm.addEventListener('submit', handleGrant);

    const deductForm = document.getElementById('deductForm');
    if (deductForm) deductForm.addEventListener('submit', handleDeduct);

    const bulkGrantForm = document.getElementById('bulkGrantForm');
    if (bulkGrantForm) bulkGrantForm.addEventListener('submit', handleBulkGrant);

    const bulkAddForm = document.getElementById('bulkAddForm');
    if (bulkAddForm) bulkAddForm.addEventListener('submit', handleBulkAdd);

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) exportBtn.addEventListener('click', handleExport);

    const closeBtn = document.querySelector('.close');
    if (closeBtn) closeBtn.addEventListener('click', closeModal);

    window.addEventListener('click', function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) closeModal();
    });
});

async function loadUsers() {
    try {
        const response = await fetch(API_BASE_URL + '/users', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) throw new Error('ユーザー一覧の取得に失敗しました');
        const users = await response.json();
        displayUsers(users);
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

function displayUsers(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">登録されているユーザーがいません</td></tr>';
        return;
    }
    users.forEach(function(user) {
        const row = document.createElement('tr');
        row.innerHTML = '<td>' + user.id + '</td><td>' + user.name + '</td><td>' + user.swag + '</td><td>' + (user.is_admin === 1 || user.is_admin === true ? '✓' : '-') + '</td><td class="actions"><button class="btn btn-warning" onclick="openEditModal(\'' + user.id + '\', \'' + user.name + '\', ' + user.swag + ', ' + user.is_admin + ')">編集</button><button class="btn btn-danger" onclick="deleteUser(\'' + user.id + '\')">削除</button></td>';
        tbody.appendChild(row);
    });
}

async function handleAddUser(event) {
    event.preventDefault();
    const userId = document.getElementById('newUserId').value;
    const userName = document.getElementById('newUserName').value;
    const userSwag = parseInt(document.getElementById('newUserSwag').value) || 0;
    const isAdmin = document.getElementById('newUserAdmin').checked;
    try {
        const response = await fetch(API_BASE_URL + '/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: userId, name: userName, swag: userSwag, isAdmin: isAdmin })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ユーザーの追加に失敗しました');
        }
        alert('ユーザーを追加しました');
        document.getElementById('addUserForm').reset();
        loadUsers();
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

function openEditModal(userId, userName, userSwag, isAdmin) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserName').value = userName;
    document.getElementById('editUserSwag').value = userSwag;
    document.getElementById('editUserAdmin').checked = (isAdmin === 1 || isAdmin === true);
    document.getElementById('editModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

async function handleEditUser(event) {
    event.preventDefault();
    const userId = document.getElementById('editUserId').value;
    const userName = document.getElementById('editUserName').value;
    const userSwag = parseInt(document.getElementById('editUserSwag').value);
    const isAdmin = document.getElementById('editUserAdmin').checked;
    try {
        const response = await fetch(API_BASE_URL + '/users/' + userId, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: userName, swag: userSwag, isAdmin: isAdmin })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ユーザーの更新に失敗しました');
        }
        alert('ユーザー情報を更新しました');
        closeModal();
        loadUsers();
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

async function deleteUser(userId) {
    if (!confirm('ユーザー「' + userId + '」を削除してもよろしいですか?')) return;
    try {
        const response = await fetch(API_BASE_URL + '/users/' + userId, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' }
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'ユーザーの削除に失敗しました');
        }
        alert('ユーザーを削除しました');
        loadUsers();
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
        const response = await fetch(API_BASE_URL + '/users/' + targetUserId + '/grant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, reason: reason, grantedBy: 'admin' })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'SWAG付与に失敗しました');
        }
        document.getElementById('grantForm').reset();
        loadUsers();
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
        const response = await fetch(API_BASE_URL + '/users/' + targetUserId + '/deduct', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: amount, reason: reason, deductedBy: 'admin' })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'SWAG減数に失敗しました');
        }
        document.getElementById('deductForm').reset();
        loadUsers();
        alert('SWAGを減数しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

async function handleBulkGrant(event) {
    event.preventDefault();
    const userIdsText = document.getElementById('bulkGrantUserIds').value;
    const amount = parseInt(document.getElementById('bulkGrantAmount').value);
    const reason = document.getElementById('bulkGrantReason').value;
    const userIds = userIdsText.split(String.fromCharCode(10)).map(function(id) { return id.trim(); }).filter(function(id) { return id !== ''; });
    if (userIds.length === 0) {
        alert('ユーザーIDを入力してください');
        return;
    }
    try {
        const response = await fetch(API_BASE_URL + '/users/bulk-grant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: userIds, amount: amount, reason: reason, grantedBy: 'admin' })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '一括付与に失敗しました');
        }
        const data = await response.json();
        const successCount = data.results.filter(function(r) { return r.status === '付与成功'; }).length;
        const failCount = data.results.filter(function(r) { return r.status !== '付与成功'; }).length;
        document.getElementById('bulkGrantForm').reset();
        loadUsers();
        alert('一括付与完了！ 成功: ' + successCount + '件 / 失敗: ' + failCount + '件');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

async function handleBulkAdd(event) {
    event.preventDefault();
    const idsText = document.getElementById('bulkAddJson').value;
    const ids = idsText.split(String.fromCharCode(10)).map(function(id) { return id.trim(); }).filter(function(id) { return id !== ''; });
    if (ids.length === 0) {
        alert('ログインIDを入力してください');
        return;
    }
    const users = ids.map(function(id) { return { id: id, name: id, swag: 0, is_admin: false }; });
    try {
        const response = await fetch(API_BASE_URL + '/users/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ users: users })
        });
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || '一括追加に失敗しました');
        }
        const data = await response.json();
        const successCount = data.results.filter(function(r) { return r.status === '追加成功'; }).length;
        const skipCount = data.results.filter(function(r) { return r.status !== '追加成功'; }).length;
        document.getElementById('bulkAddForm').reset();
        loadUsers();
        alert('一括追加完了！ 追加成功: ' + successCount + '件 / スキップ（既存）: ' + skipCount + '件');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}

async function handleExport() {
    try {
        const response = await fetch(API_BASE_URL + '/users/export', { method: 'GET' });
        if (!response.ok) throw new Error('エクスポートに失敗しました');
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'swag_export.xlsx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        alert('エクスポートが完了しました');
    } catch (error) {
        alert('エラー: ' + error.message);
    }
}
