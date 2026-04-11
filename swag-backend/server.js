const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());

const db = new sqlite3.Database('./swag_system.db', (err) => {
    if (err) {
        console.error('データベース接続エラー:', err.message);
    } else {
        console.log('データベースに接続しました');
        initializeDatabase();
    }
});

function initializeDatabase() {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        swag INTEGER DEFAULT 0,
        is_admin INTEGER DEFAULT 0
    )`);

    const initialUsers = [
        { id: 'kuniyak', name: 'クニヤ ケンタ', swag: 100, is_admin: 0 },
        { id: 'tagunagi', name: 'タグチ ナギサ', swag: 500, is_admin: 1 }
    ];

    initialUsers.forEach(user => {
        db.run(`INSERT OR IGNORE INTO users (id, name, swag, is_admin) VALUES (?, ?, ?, ?)`,
            [user.id, user.name, user.swag, user.is_admin]);
    });

    console.log('データベースの初期化が完了しました');
}

app.post('/api/login', (req, res) => {
    const { userId } = req.body;
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'データベースエラー' });
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        res.json({
            id: user.id,
            name: user.name,
            swag: user.swag,
            isAdmin: user.is_admin === 1
        });
    });
});
// SWAG使用
app.post('/api/users/:userId/use', (req, res) => {
    const { userId } = req.params;
    const { amount, reason } = req.body;

    db.get('SELECT swag FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'データベースエラー' });
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        if (user.swag < amount) return res.status(400).json({ error: '所持SWAG数が不足しています' });

        const newBalance = user.swag - amount;
        const date = new Date().toISOString();

        db.run('UPDATE users SET swag = ? WHERE id = ?', [newBalance, userId], (err) => {
            if (err) return res.status(500).json({ error: 'データベースエラー' });

            // 使用履歴テーブルに記録を追加
            db.run(`CREATE TABLE IF NOT EXISTS use_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                amount INTEGER,
                reason TEXT,
                balance INTEGER,
                date TEXT
            )`);

            db.run('INSERT INTO use_history (user_id, amount, reason, balance, date) VALUES (?, ?, ?, ?, ?)',
                [userId, amount, reason, newBalance, date], (err) => {
                    if (err) console.error('履歴記録エラー:', err);
                });

            res.json({ success: true, newBalance: newBalance });
        });

    });
});

// SWAG付与(管理者用)
app.post('/api/users/:userId/grant', (req, res) => {
    const { userId } = req.params;
    const { amount, reason, grantedBy } = req.body;

    db.get('SELECT swag FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'データベースエラー' });
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });

        const newBalance = user.swag + amount;
        const date = new Date().toISOString();

        db.run('UPDATE users SET swag = ? WHERE id = ?', [newBalance, userId], (err) => {
            if (err) return res.status(500).json({ error: 'データベースエラー' });

            // 付与履歴テーブルに記録を追加
            db.run(`CREATE TABLE IF NOT EXISTS grant_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                amount INTEGER,
                reason TEXT,
                granted_by TEXT,
                balance INTEGER,
                date TEXT
            )`);

            db.run('INSERT INTO grant_history (user_id, amount, reason, granted_by, balance, date) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, amount, reason, grantedBy, newBalance, date], (err) => {
                    if (err) console.error('履歴記録エラー:', err);
                });

            res.json({ success: true, newBalance: newBalance });
        });
    });
});


// SWAG減数(管理者用)
app.post('/api/users/:userId/deduct', (req, res) => {
    const { userId } = req.params;
    const { amount, reason, deductedBy } = req.body;

    db.get('SELECT swag FROM users WHERE id = ?', [userId], (err, user) => {
        if (err) return res.status(500).json({ error: 'データベースエラー' });
        if (!user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        if (user.swag < amount) return res.status(400).json({ error: '所持SWAG数が不足しています' });

        const newBalance = user.swag - amount;
        const date = new Date().toISOString();

        db.run('UPDATE users SET swag = ? WHERE id = ?', [newBalance, userId], (err) => {
            if (err) return res.status(500).json({ error: 'データベースエラー' });

            // 減数履歴テーブルに記録を追加
            db.run(`CREATE TABLE IF NOT EXISTS deduct_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id TEXT,
                amount INTEGER,
                reason TEXT,
                deducted_by TEXT,
                balance INTEGER,
                date TEXT
            )`);

            db.run('INSERT INTO deduct_history (user_id, amount, reason, deducted_by, balance, date) VALUES (?, ?, ?, ?, ?, ?)',
                [userId, amount, reason, deductedBy, newBalance, date], (err) => {
                    if (err) console.error('履歴記録エラー:', err);
                });

            res.json({ success: true, newBalance: newBalance });
        });
    });
});


// 使用履歴・付与履歴・減数履歴取得
app.get('/api/users/:userId/history', (req, res) => {
    const { userId } = req.params;

    db.all('SELECT * FROM use_history WHERE user_id = ? ORDER BY date DESC', [userId], (err, useHistory) => {
        if (err) {
            console.error('使用履歴取得エラー:', err);
            useHistory = [];
        }

        db.all('SELECT * FROM grant_history WHERE user_id = ? ORDER BY date DESC', [userId], (err, grantHistory) => {
            if (err) {
                console.error('付与履歴取得エラー:', err);
                grantHistory = [];
            }

            db.all('SELECT * FROM deduct_history WHERE user_id = ? ORDER BY date DESC', [userId], (err, deductHistory) => {
                if (err) {
                    console.error('減数履歴取得エラー:', err);
                    deductHistory = [];
                }
                res.json({
                    useHistory: useHistory || [],
                    grantHistory: grantHistory || [],
                    deductHistory: deductHistory || []
                });
            });
        });
    });
});




app.listen(PORT, '0.0.0.0', () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
    console.log(`ネットワークアクセス: http://[IP_ADDRESS]:${PORT}`);
});



