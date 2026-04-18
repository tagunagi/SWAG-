const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

console.log('Supabaseに接続しました');

async function initializeDatabase() {
    const initialUsers = [
        { id: 'kuniyak', name: 'クニヤ ケンタ', swag: 0, is_admin: true },
        { id: 'tagunagi', name: 'タグチ ナギサ', swag: 0, is_admin: true }
    ];
    for (const user of initialUsers) {
        const { data } = await supabase.from('users').select('id').eq('id', user.id).single();
        if (!data) {
            await supabase.from('users').insert([{ id: user.id, name: user.name, swag: user.swag, is_admin: user.is_admin }]);
        }
    }
    console.log('データベースの初期化が完了しました');
}
initializeDatabase();

app.post('/api/login', async (req, res) => {
    const { userId } = req.body;
    try {
        const { data: user, error } = await supabase.from('users').select('*').eq('id', userId).single();
        if (error || !user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        res.json({ id: user.id, name: user.name, swag: user.swag, isAdmin: user.is_admin });
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

app.post('/api/users/bulk', async (req, res) => {
    const { users } = req.body;
    try {
        const results = [];
        for (const user of users) {
            const { data: existingUser } = await supabase.from('users').select('id').eq('id', user.id).single();
            if (!existingUser) {
                await supabase.from('users').insert([{ id: user.id, name: user.name, swag: user.swag || 0, is_admin: user.is_admin || false }]);
                results.push({ id: user.id, status: '追加成功' });
            } else {
                results.push({ id: user.id, status: '既存ユーザー（スキップ）' });
            }
        }
        res.json({ success: true, results });
    } catch (err) {
        return res.status(500).json({ error: '一括追加に失敗しました' });
    }
});

app.post('/api/users/bulk-grant', async (req, res) => {
    const { userIds, amount, reason, grantedBy } = req.body;
    try {
        const results = [];
        const date = new Date().toISOString();
        for (const userId of userIds) {
            const { data: user, error } = await supabase.from('users').select('swag').eq('id', userId).single();
            if (error || !user) { results.push({ id: userId, status: 'ユーザーが見つかりません' }); continue; }
            const newBalance = user.swag + amount;
            await supabase.from('users').update({ swag: newBalance }).eq('id', userId);
            await supabase.from('grant_history').insert([{ user_id: userId, amount: amount, reason: reason, granted_by: grantedBy, balance: newBalance, date: date }]);
            results.push({ id: userId, status: '付与成功', newBalance });
        }
        res.json({ success: true, results });
    } catch (err) {
        return res.status(500).json({ error: '一括付与に失敗しました' });
    }
});

app.get('/api/users/export', async (req, res) => {
    try {
        const { data: users, error: usersError } = await supabase.from('users').select('id, name, swag, is_admin').order('id');
        if (usersError) return res.status(500).json({ error: 'データベースエラー' });

        const { data: grantHistory, error: grantError } = await supabase.from('grant_history').select('*').order('date', { ascending: false });
        if (grantError) return res.status(500).json({ error: 'データベースエラー' });

        const ExcelJS = require('exceljs');
        const workbook = new ExcelJS.Workbook();

        const sheet1 = workbook.addWorksheet('ユーザー一覧');
        sheet1.columns = [
            { header: 'ログインID', key: 'id', width: 20 },
            { header: '名前', key: 'name', width: 20 },
            { header: '所持SWAG', key: 'swag', width: 15 },
            { header: '権限', key: 'role', width: 10 }
        ];
        users.forEach(function(u) {
            sheet1.addRow({ id: u.id, name: u.name, swag: u.swag, role: (u.is_admin ? '管理者' : '一般') });
        });

        const sheet2 = workbook.addWorksheet('付与履歴');
        sheet2.columns = [
            { header: '日時（日本時間）', key: 'date', width: 25 },
            { header: '対象ユーザーID', key: 'user_id', width: 20 },
            { header: '付与SWAG数', key: 'amount', width: 15 },
            { header: '付与後残高', key: 'balance', width: 15 },
            { header: '理由', key: 'reason', width: 30 },
            { header: '付与した管理者', key: 'granted_by', width: 20 }
        ];
        grantHistory.forEach(function(h) {
            var utcDate = new Date(h.date);
            var jstDate = new Date(utcDate.getTime() + 9 * 60 * 60 * 1000);
            var year = jstDate.getUTCFullYear();
            var month = String(jstDate.getUTCMonth() + 1).padStart(2, '0');
            var day = String(jstDate.getUTCDate()).padStart(2, '0');
            var hours = String(jstDate.getUTCHours()).padStart(2, '0');
            var minutes = String(jstDate.getUTCMinutes()).padStart(2, '0');
            var jstString = year + '/' + month + '/' + day + ' ' + hours + ':' + minutes;
            sheet2.addRow({ date: jstString, user_id: h.user_id, amount: h.amount, balance: h.balance, reason: h.reason || '-', granted_by: h.granted_by || '-' });
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="swag_export.xlsx"');
        await workbook.xlsx.write(res);
        res.end();
    } catch (err) {
        console.error('エクスポートエラー:', err);
        return res.status(500).json({ error: 'エクスポートに失敗しました' });
    }
});

app.post('/api/users/:userId/use', async (req, res) => {
    const { userId } = req.params;
    const { amount, reason } = req.body;
    try {
        const { data: user, error } = await supabase.from('users').select('swag').eq('id', userId).single();
        if (error || !user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        if (user.swag < amount) return res.status(400).json({ error: '所持SWAG数が不足しています' });
        const newBalance = user.swag - amount;
        const date = new Date().toISOString();
        const { error: updateError } = await supabase.from('users').update({ swag: newBalance }).eq('id', userId);
        if (updateError) return res.status(500).json({ error: 'SWAG残高の更新に失敗しました' });
        const { error: historyError } = await supabase.from('use_history').insert([{ user_id: userId, amount: amount, reason: reason, balance: newBalance, date: date }]);
        if (historyError) return res.status(500).json({ error: '使用履歴の保存に失敗しました' });
        res.json({ success: true, newBalance: newBalance });
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

app.post('/api/users/:userId/grant', async (req, res) => {
    const { userId } = req.params;
    const { amount, reason, grantedBy } = req.body;
    try {
        const { data: user, error } = await supabase.from('users').select('swag').eq('id', userId).single();
        if (error || !user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        const newBalance = user.swag + amount;
        const date = new Date().toISOString();
        const { error: updateError } = await supabase.from('users').update({ swag: newBalance }).eq('id', userId);
        if (updateError) return res.status(500).json({ error: 'SWAG残高の更新に失敗しました' });
        const { error: historyError } = await supabase.from('grant_history').insert([{ user_id: userId, amount: amount, reason: reason, granted_by: grantedBy, balance: newBalance, date: date }]);
        if (historyError) return res.status(500).json({ error: '付与履歴の保存に失敗しました' });
        res.json({ success: true, newBalance: newBalance });
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

app.post('/api/users/:userId/deduct', async (req, res) => {
    const { userId } = req.params;
    const { amount, reason, deductedBy } = req.body;
    try {
        const { data: user, error } = await supabase.from('users').select('swag').eq('id', userId).single();
        if (error || !user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        if (user.swag < amount) return res.status(400).json({ error: '所持SWAG数が不足しています' });
        const newBalance = user.swag - amount;
        const date = new Date().toISOString();
        const { error: updateError } = await supabase.from('users').update({ swag: newBalance }).eq('id', userId);
        if (updateError) return res.status(500).json({ error: 'SWAG残高の更新に失敗しました' });
        const { error: historyError } = await supabase.from('deduct_history').insert([{ user_id: userId, amount: amount, reason: reason, deducted_by: deductedBy, balance: newBalance, date: date }]);
        if (historyError) return res.status(500).json({ error: '減数履歴の保存に失敗しました' });
        res.json({ success: true, newBalance: newBalance });
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

app.get('/api/users/:userId/history', async (req, res) => {
    const { userId } = req.params;
    try {
        const { data: useHistory } = await supabase.from('use_history').select('*').eq('user_id', userId).order('date', { ascending: false });
        const { data: grantHistory } = await supabase.from('grant_history').select('*').eq('user_id', userId).order('date', { ascending: false });
        const { data: deductHistory } = await supabase.from('deduct_history').select('*').eq('user_id', userId).order('date', { ascending: false });
        res.json({ useHistory: useHistory || [], grantHistory: grantHistory || [], deductHistory: deductHistory || [] });
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

app.get('/api/users', async (req, res) => {
    try {
        const { data: users, error } = await supabase.from('users').select('id, name, swag, is_admin').order('id');
        if (error) return res.status(500).json({ error: 'データベースエラー' });
        res.json(users);
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

app.post('/api/users', async (req, res) => {
    const { id, name, swag, isAdmin } = req.body;
    try {
        const { data: existingUser } = await supabase.from('users').select('id').eq('id', id).single();
        if (existingUser) return res.status(400).json({ error: 'このユーザーIDは既に使用されています' });
        await supabase.from('users').insert([{ id: id, name: name, swag: swag || 0, is_admin: isAdmin || false }]);
        res.json({ success: true, message: 'ユーザーを追加しました' });
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

app.put('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    const { name, swag, isAdmin } = req.body;
    try {
        const { data: user, error } = await supabase.from('users').select('id').eq('id', userId).single();
        if (error || !user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        await supabase.from('users').update({ name: name, swag: swag, is_admin: isAdmin }).eq('id', userId);
        res.json({ success: true, message: 'ユーザー情報を更新しました' });
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

app.delete('/api/users/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const { data: user, error } = await supabase.from('users').select('id').eq('id', userId).single();
        if (error || !user) return res.status(404).json({ error: 'ユーザーが見つかりません' });
        await supabase.from('users').delete().eq('id', userId);
        res.json({ success: true, message: 'ユーザーを削除しました' });
    } catch (err) {
        return res.status(500).json({ error: 'データベースエラー' });
    }
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`サーバーが起動しました: http://localhost:${PORT}`);
});
