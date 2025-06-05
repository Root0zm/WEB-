const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const bcrypt = require('bcrypt');
const app = express();
const port = 3000;

// Middleware
app.use(cors({
    origin: ['http://127.0.0.1:5500', 'http://localhost:5500']
}));
app.use(express.json());
app.use(express.static('.')); // Phục vụ file tĩnh (HTML, images)

// Mở database
const db = new sqlite3.Database('products.db', (err) => {
    if (err) {
        console.error('Lỗi mở database:', err.message);
    } else {
        console.log('Đã kết nối database.');
    }
});

// API lấy danh sách sản phẩm
app.get('/products', async (req, res) => {
    const brand = req.query.brand;
    const search = req.query.search;
    try {
        let query = `
            SELECT p.*, c.name AS category_name
            FROM products p
            JOIN categories c ON p.category_id = c.id
        `;
        const params = [];
        if (brand || search) {
            query += ' WHERE';
            if (brand) {
                query += ' p.brand = ?';
                params.push(brand);
            }
            if (brand && search) query += ' AND';
            if (search) {
                query += params.length ? ' p.name LIKE ?' : ' p.name LIKE ?';
                params.push(`%${search}%`);
            }
        }
        const products = await new Promise((resolve, reject) => {
            db.all(query, params, (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
        res.status(200).json(products);
    } catch (error) {
        console.error('Lỗi lấy sản phẩm:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra, vui lòng thử lại!' });
    }
});

// API đăng ký
app.post('/register', async (req, res) => {
    const { name, email, password, address, phone } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Vui lòng điền đầy đủ họ tên, email, mật khẩu!' });
    }

    // Kiểm tra email hợp lệ
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Email không hợp lệ!' });
    }

    try {
        // Kiểm tra email trùng
        const existingUser = await new Promise((resolve, reject) => {
            db.get('SELECT email FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (existingUser) {
            return res.status(400).json({ error: 'Email đã được sử dụng!' });
        }

        // Mã hóa mật khẩu
        const hashedPassword = await bcrypt.hash(password, 10);

        // Thêm người dùng
        await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO users (name, email, password, address, phone) VALUES (?, ?, ?, ?, ?)',
                [name, email, hashedPassword, address || null, phone || null],
                (err) => {
                    if (err) reject(err);
                    resolve();
                }
            );
        });

        res.status(201).json({ message: 'Đăng ký thành công!' });
    } catch (error) {
        console.error('Lỗi đăng ký:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra, vui lòng thử lại!' });
    }
});

// API đăng nhập
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Vui lòng điền đầy đủ email và mật khẩu!' });
    }

    try {
        // Tìm người dùng
        const user = await new Promise((resolve, reject) => {
            db.get('SELECT * FROM users WHERE email = ?', [email], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });

        if (!user) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng!' });
        }

        // Kiểm tra mật khẩu
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Email hoặc mật khẩu không đúng!' });
        }

        // Trả về thông tin user (không bao gồm password)
        const userData = { id: user.id, name: user.name, email: user.email };
        res.status(200).json({ message: 'Đăng nhập thành công!', user: userData });
    } catch (error) {
        console.error('Lỗi đăng nhập:', error);
        res.status(500).json({ error: 'Có lỗi xảy ra, vui lòng thử lại!' });
    }
});

// API thanh toán
app.post('/Checkout', async (req, res) => {
    const { userId, cart, name, email, phone, address, paymentMethod } = req.body;
    const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    try {
        // Thêm đơn hàng
        const orderId = await new Promise((resolve, reject) => {
            db.run(
                'INSERT INTO orders (user_id, total_amount, status) VALUES (?, ?, ?)',
                [userId, total, 'pending'],
                function (err) {
                    if (err) reject(err);
                    resolve(this.lastID);
                }
            );
        });

        // Thêm chi tiết đơn hàng
        for (const item of cart) {
            await new Promise((resolve, reject) => {
                db.run(
                    'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
                    [orderId, item.id, item.quantity, item.price],
                    (err) => {
                        if (err) reject(err);
                        resolve();
                    }
                );
            });
        }

        res.status(200).json({ message: 'Đặt hàng thành công!' });
    } catch (error) {
        console.error('Lỗi đặt hàng:', error);
        res.status(500).json({ error: 'Lỗi lưu đơn hàng!' });
    }
});

// Chạy server
app.listen(port, () => {
    console.log(`Server chạy trên http://localhost:${port}`);
});