// API設定
const API_BASE_URL = 'https://swagguan-li-dian-zi-hua.onrender.com/api';

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();

    // 新規ユーザー追加フォームのイベントリスナー
    const addUserForm = document.getElementById('addUserForm');
    if (addUserForm) {
        addUserForm.addEventListener('submit', handleAddUser);
    }

    // ユーザー編集フォームのイベントリスナー
    const editUserForm = document.getElementById('editUserForm');
    if (editUserForm) {
        editUserForm.addEventListener('submit', handleEditUser);
    }

    // モーダルを閉じる
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', closeModal);
    }

    // モーダルの外側をクリックしたら閉じる
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('editModal');
        if (event.target === modal) {
            closeModal();
        }
    });
});

// ユーザー一覧を読み込み
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error('ユーザー一覧の取得に失敗しました');
        }

        const users = await response.json();
        displayUsers(users);

    } catch (error) {
        console.error('エラー:', error);
        alert('エラー: ' + error.message);
    }
}

// ユーザー一覧を表示
function displayUsers(users) {
    const tbody = document.getElementById('userTableBody');
    tbody.innerHTML = '';

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5">登録されているユーザーがいません</td></tr>';
        return;
    }

    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.swag}</td>
            <td>${user.is_admin === 1 ? '✓' : '-'}</td>
            <td class="actions">
                <button class="btn btn-warning" onclick="openEditModal('${user.id}', '${user.name}', ${user.swag}, ${user.is_admin})">編集</button>
                <button class="btn btn-danger" onclick="deleteUser('${user.id}')">削除</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

// 新規ユーザー追加
async function handleAddUser(event) {
    event.preventDefault();

    const userId = document.getElementById('newUserId').value;
    const userName = document.getElementById('newUserName').value;
    const userSwag = parseInt(document.getElementById('newUserSwag').value) || 0;
    const isAdmin = document.getElementById('newUserAdmin').checked;

    try {
        const response = await fetch(`${API_BASE_URL}/users`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: userId,
                name: userName,
                swag: userSwag,
                isAdmin: isAdmin
            })
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

// 編集モーダルを開く
function openEditModal(userId, userName, userSwag, isAdmin) {
    document.getElementById('editUserId').value = userId;
    document.getElementById('editUserName').value = userName;
    document.getElementById('editUserSwag').value = userSwag;
    document.getElementById('editUserAdmin').checked = isAdmin === 1;

    document.getElementById('editModal').style.display = 'block';
}

// モーダルを閉じる
function closeModal() {
    document.getElementById('editModal').style.display = 'none';
}

// ユーザー編集
async function handleEditUser(event) {
    event.preventDefault();

    const userId = document.getElementById('editUserId').value;
    const userName = document.getElementById('editUserName').value;
    const userSwag = parseInt(document.getElementById('editUserSwag').value);
    const isAdmin = document.getElementById('editUserAdmin').checked;

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: userName,
                swag: userSwag,
                isAdmin: isAdmin
            })
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

// ユーザー削除
async function deleteUser(userId) {
    if (!confirm(`ユーザー「${userId}」を削除してもよろしいですか?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json'
            }
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
