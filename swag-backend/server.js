const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const Database = require('better-sqlite3');


const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const db = new Database('./swag_system.db');
console.log('データベースに接続しました');
initializeDatabase();

function initializeDatabase() {
    db.exec(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        swag INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0
    )`);

    const initialUsers = [
        { id: 'kuniyak', name: 'クニヤ ケンタ', swag: 100, is_admin: 0 },
        { id: 'tagunagi', name: 'タグチ ナギサ', swag: 500, is_admin: 1 }
    ];

    const insertUser = db.prepare(`INSERT OR IGNORE INTO users (id, name, swag, is_admin) VALUES (?, ?, ?, ?)`);

    initialUsers.forEach(user => {
        insertUser.run(user.id, user.name, user.swag, user.is_admin);
    });

    console.log('データベースの初期化が完了しました');
}

app.post('/api/login', (req, res) => {
    const { userId } = req.body;
    try {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        res.json({
            id: user.id,
            name: user.name,
            swag: user.swag,
            isAdmin: user.is_admin === 1
        });
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

// SWAG使用
app.post('/api/users/:userId/use', (req, res) => {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    try {
        const user = db.prepare('SELECT swag FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        if (user.swag < amount) return res.status(400).json({ error: '所持SWAG数が不足しています' });

        const newBalance = user.swag - amount;
        const date = new Date().toISOString();

        db.prepare('UPDATE users SET swag = ? WHERE id = ?').run(newBalance, userId);

        // 使用履歴テーブルに記録を追加
        db.exec(`CREATE TABLE IF NOT EXISTS use_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            amount INTEGER,
            reason TEXT,
            balance INTEGER,
            date TEXT
        )`);

        db.prepare('INSERT INTO use_history (user_id, amount, reason, balance, date) VALUES (?, ?, ?, ?, ?)').run(userId, amount, reason, newBalance, date);

        res.json({ success: true, newBalance: newBalance });
    } catch (err) {
        console.error('エラー:', err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

// SWAG付与(管理者用)
app.post('/api/users/:userId/grant', (req, res) => {
    const { userId } = req.params;
    const { amount, reason, grantedBy } = req.body;

    try {
        const user = db.prepare('SELECT swag FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });

        const newBalance = user.swag + amount;
        const date = new Date().toISOString();

        db.prepare('UPDATE users SET swag = ? WHERE id = ?').run(newBalance, userId);

        // 付与履歴テーブルに記録を追加
        db.exec(`CREATE TABLE IF NOT EXISTS grant_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            amount INTEGER,
            reason TEXT,
            granted_by TEXT,
            balance INTEGER,
            date TEXT
        )`);

        db.prepare('INSERT INTO grant_history (user_id, amount, reason, granted_by, balance, date) VALUES (?, ?, ?, ?, ?, ?)').run(userId, amount, reason, grantedBy, newBalance, date);

        res.json({ success: true, newBalance: newBalance });
    } catch (err) {
        console.error('エラー:', err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});


// SWAG減数(管理者用)
app.post('/api/users/:userId/deduct', (req, res) => {
    const { userId } = req.params;
    const { amount, reason, deductedBy } = req.body;

    try {
        const user = db.prepare('SELECT swag FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        if (user.swag < amount) return res.status(400).json({ error: '所持SWAG数が不足しています' });

        const newBalance = user.swag - amount;
        const date = new Date().toISOString();

        db.prepare('UPDATE users SET swag = ? WHERE id = ?').run(newBalance, userId);

        // 減数履歴テーブルに記録を追加
        db.exec(`CREATE TABLE IF NOT EXISTS deduct_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            amount INTEGER,
            reason TEXT,
            deducted_by TEXT,
            balance INTEGER,
            date TEXT
        )`);

        db.prepare('INSERT INTO deduct_history (user_id, amount, reason, deducted_by, balance, date) VALUES (?, ?, ?, ?, ?, ?)').run(userId, amount, reason, deductedBy, newBalance, date);

        res.json({ success: true, newBalance: newBalance });
    } catch (err) {
        console.error('エラー:', err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});


// 使用履歴・付与履歴・減数履歴取得
app.get('/api/users/:userId/history', (req, res) => {
    const { userId } = req.params;

    try {
        let useHistory = [];
        let grantHistory = [];
        let deductHistory = [];

        try {
            useHistory = db.prepare('SELECT * FROM use_history WHERE user_id = ? ORDER BY date DESC').all(userId);
        } catch (err) {
            console.error('使用履歴取得エラー:', err);
        }

        try {
            grantHistory = db.prepare('SELECT * FROM grant_history WHERE user_id = ? ORDER BY date DESC').all(userId);
        } catch (err) {
            console.error('付与履歴取得エラー:', err);
        }

        try {
            deductHistory = db.prepare('SELECT * FROM deduct_history WHERE user_id = ? ORDER BY date DESC').all(userId);
        } catch (err) {
            console.error('減数履歴取得エラー:', err);
        }

        res.json({
            useHistory: useHistory || [],
            grantHistory: grantHistory || [],
            deductHistory: deductHistory || []
        });
    } catch (err) {
        console.error('エラー:', err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

// ユーザー一覧取得(管理者用)
app.get('/api/users', (req, res) => {
    try {
        const users = db.prepare('SELECT id, name, swag, is_admin FROM users ORDER BY id').all();
        res.json(users);
    } catch (err) {
        console.error('エラー:', err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

// ユーザー追加(管理者用)
app.post('/api/users', (req, res) => {
    const { id, name, swag, isAdmin } = req.body;

    try {
        // ユーザーIDの重複チェック
        const existingUser = db.prepare('SELECT id FROM users WHERE id = ?').get(id);
        if (existingUser) {
            return res.status(400).json({ error: 'このユーザーIDは既に使用されています' });
        }

        // 新しいユーザーを追加
        db.prepare('INSERT INTO users (id, name, swag, is_admin) VALUES (?, ?, ?, ?)').run(id, name, swag || 0, isAdmin ? 1 : 0);

        res.json({ success: true, message: 'ユーザーを追加しました' });
    } catch (err) {
        console.error('エラー:', err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

// ユーザー編集(管理者用)
app.put('/api/users/:userId', (req, res) => {
    const { userId } = req.params;
    const { name, swag, isAdmin } = req.body;

    try {
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });

        db.prepare('UPDATE users SET name = ?, swag = ?, is_admin = ? WHERE id = ?').run(name, swag, isAdmin ? 1 : 0, userId);

        res.json({ success: true, message: 'ユーザー情報を更新しました' });
    } catch (err) {
        console.error('エラー:', err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

// ユーザー削除(管理者用)
app.delete('/api/users/:userId', (req, res) => {
    const { userId } = req.params;

    try {
        const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });

        db.prepare('DELETE FROM users WHERE id = ?').run(userId);

        res.json({ success: true, message: 'ユーザーを削除しました' });
    } catch (err) {
        console.error('エラー:', err);
        return res.status(500).json({ error: 'データベースエラー' });
    }
});


app.listen(PORT, '0.0.0.0', () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`ネットワークアクセス: http://[IP_ADDRESS]:${PORT}`);
});



