const sqlite3 = require('sqlite3').verbose();
const { exec } = require('child_process');
const bcrypt = require('bcrypt');

// Mở database
const db = new sqlite3.Database('products.db', (err) => {
    if (err) {
        console.error('Lỗi mở database:', err.message);
        process.exit(1);
    }
    console.log('Đã kết nối database.');
});

// Tạo bảng và thêm dữ liệu
db.serialize(() => {
    // Tạo bảng users
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            address TEXT,
            phone TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `, (err) => {
        if (err) {
            console.error('Lỗi tạo bảng users:', err.message);
            process.exit(1);
        }
        console.log('Bảng users đã sẵn sàng.');
    });

    // Tạo bảng categories
    db.run(`
        CREATE TABLE IF NOT EXISTS categories (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL
        )
    `, (err) => {
        if (err) {
            console.error('Lỗi tạo bảng categories:', err.message);
            process.exit(1);
        }
        console.log('Bảng categories đã sẵn sàng.');
    });

    // Tạo bảng products
    db.run(`
        CREATE TABLE IF NOT EXISTS products (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            brand TEXT NOT NULL,
            category_id INTEGER NOT NULL,
            price INTEGER NOT NULL,
            description TEXT NOT NULL,
            image_url TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (category_id) REFERENCES categories(id)
        )
    `, (err) => {
        if (err) {
            console.error('Lỗi tạo bảng products:', err.message);
            process.exit(1);
        }
        console.log('Bảng products đã sẵn sàng.');
    });

    // Tạo bảng orders
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            total_amount INTEGER NOT NULL,
            status TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `, (err) => {
        if (err) {
            console.error('Lỗi tạo bảng orders:', err.message);
            process.exit(1);
        }
        console.log('Bảng orders đã sẵn sàng.');
    });

    // Tạo bảng order_items
    db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id INTEGER NOT NULL,
            product_id INTEGER NOT NULL,
            quantity INTEGER NOT NULL,
            price INTEGER NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(id),
            FOREIGN KEY (product_id) REFERENCES products(id)
        )
    `, (err) => {
        if (err) {
            console.error('Lỗi tạo bảng order_items:', err.message);
            process.exit(1);
        }
        console.log('Bảng order_items đã sẵn sàng.');
    });

    // Chèn dữ liệu mẫu
    // Chèn danh mục
    db.run(`
        INSERT OR IGNORE INTO categories (name) VALUES
        ('Smartphone cao cấp'),
        ('Smartphone tầm trung'),
        ('Smartphone giá rẻ')
    `, (err) => {
        if (err) {
            console.error('Lỗi thêm danh mục:', err.message);
            process.exit(1);
        }
        console.log('Danh mục đã thêm.');
    });

    // Chèn người dùng (mã hóa mật khẩu)
    const users = [
        ['Nguyễn Văn A', 'nva@gmail.com', 'pass123', '123 Đường Láng, Hà Nội', '0901234567'],
        ['Trần Thị B', 'ttb@gmail.com', 'pass456', '456 Nguyễn Trãi, TP.HCM', '0912345678'],
        ['Lê Văn C', 'lvc@gmail.com', 'pass789', '789 Lê Lợi, Đà Nẵng', '0923456789'],
        ['Phạm Thị D', 'ptd@gmail.com', 'pass101', '101 Phạm Ngũ Lão, Huế', '0934567890'],
        ['Hoàng Văn E', 'hve@gmail.com', 'pass202', '202 Hùng Vương, Cần Thơ', '0945678901'],
        ['Vũ Thị F', 'vtf@gmail.com', 'pass303', '303 Lý Thường Kiệt, Hải Phòng', '0956789012'],
        ['Đặng Văn G', 'dvg@gmail.com', 'pass404', '404 Trần Phú, Nha Trang', '0967890123'],
        ['Bùi Thị H', 'bth@gmail.com', 'pass505', '505 Nguyễn Huệ, Quy Nhơn', '0978901234'],
        ['Ngô Văn I', 'nvi@gmail.com', 'pass606', '606 Điện Biên Phủ, Vinh', '0989012345'],
        ['Đỗ Thị K', 'dtk@gmail.com', 'pass707', '707 Cách Mạng Tháng Tám, Biên Hòa', '0990123456']
    ];

    // Use Promise.all to wait for all user insertions
    const insertUsers = users.map(([name, email, password, address, phone]) => {
        return new Promise((resolve, reject) => {
            bcrypt.hash(password, 10, (err, hashedPassword) => {
                if (err) {
                    console.error('Lỗi mã hóa mật khẩu:', err.message);
                    reject(err);
                    return;
                }
                db.run(
                    `INSERT OR IGNORE INTO users (name, email, password, address, phone) VALUES (?, ?, ?, ?, ?)`,
                    [name, email, hashedPassword, address, phone],
                    (err) => {
                        if (err) {
                            console.error('Lỗi thêm người dùng:', err.message);
                            reject(err);
                            return;
                        }
                        resolve();
                    }
                );
            });
        });
    });

    // Wait for all user insertions to complete
    Promise.all(insertUsers)
        .then(() => {
            console.log('Người dùng đã thêm.');
            // Chèn sản phẩm
            db.run(`
                INSERT OR IGNORE INTO products (name, brand, category_id, price, description, image_url) VALUES
                ('iPhone 16', 'Apple', 1, 22990000, 'iPhone 16 với chip A18, camera 48MP, màn hình 6.1 inch.', 'images/iphone16.jpeg'),
                ('Samsung Galaxy S23', 'Samsung', 1, 19990000, 'Samsung S23 với Snapdragon 8 Gen 2, màn AMOLED 6.1 inch.', 'images/ss.jpg'),
                ('Xiaomi 13', 'Xiaomi', 1, 15990000, 'Xiaomi 13 với camera Leica, màn OLED 6.36 inch.', 'images/xm13.jpg'),
                ('OPPO Reno 8', 'OPPO', 2, 12990000, 'OPPO Reno 8 với thiết kế mỏng nhẹ, sạc nhanh 80W.', 'images/opo.jpg'),
                ('Vivo Y70', 'Vivo', 2, 7990000, 'Vivo Y70 với màn AMOLED 6.44 inch, pin 4400mAh.', 'images/vivo_y70.jpg'),
                ('Realme C35', 'Realme', 3, 4990000, 'Realme C35 với camera 50MP, pin 5000mAh.', 'images/realme_c35.jpg'),
                ('Nokia G21', 'Nokia', 3, 3990000, 'Nokia G21 với độ bền cao, pin 5050mAh.', 'images/nokia_g21.jpg'),
                ('Huawei Nova 10', 'Huawei', 2, 10990000, 'Huawei Nova 10 với camera selfie 60MP, sạc nhanh 66W.', 'images/huawei_nova10.jpg'),
                ('Samsung Galaxy A54', 'Samsung', 2, 9990000, 'Samsung A54 với màn Super AMOLED, chống nước IP67.', 'images/samsung_a54.jpg'),
                ('Xiaomi Poco X5', 'Xiaomi', 3, 6990000, 'Poco X5 với Snapdragon 695, màn 120Hz.', 'images/poco_x5.jpg')
            `, (err) => {
                if (err) {
                    console.error('Lỗi thêm sản phẩm:', err.message);
                    process.exit(1);
                }
                console.log('Sản phẩm đã thêm.');
                // Chèn đơn hàng
                db.run(`
                    INSERT OR IGNORE INTO orders (user_id, total_amount, status) VALUES
                    (1, 42980000, 'pending'),
                    (2, 19990000, 'completed'),
                    (3, 7990000, 'cancelled')
                `, (err) => {
                    if (err) {
                        console.error('Lỗi thêm đơn hàng:', err.message);
                        process.exit(1);
                    }
                    console.log('Đơn hàng đã thêm.');
                    // Chèn chi tiết đơn hàng
                    db.run(`
                        INSERT OR IGNORE INTO order_items (order_id, product_id, quantity, price) VALUES
                        (1, 1, 1, 22990000),
                        (1, 2, 1, 19990000),
                        (2, 2, 1, 19990000),
                        (3, 5, 1, 7990000),
                        (3, 6, 1, 4990000)
                    `, (err) => {
                        if (err) {
                            console.error('Lỗi thêm chi tiết đơn hàng:', err.message);
                            process.exit(1);
                        }
                        console.log('Chi tiết đơn hàng đã thêm.');
                        // Đóng database
                        db.close((err) => {
                            if (err) {
                                console.error('Lỗi đóng database:', err.message);
                            }
                            console.log('Đóng database.');
                            // Chạy server.js
                            exec('node server.js', (err, stdout, stderr) => {
                                if (err) {
                                    console.error('Lỗi chạy server:', err.message);
                                    return;
                                }
                                console.log(stdout);
                                console.error(stderr);
                            });
                            // Mở trình duyệt
                            setTimeout(() => {
                                exec('start http://127.0.0.1:5500/trangchu.html', (err) => {
                                    if (err) {
                                        console.error('Lỗi mở trình duyệt:', err.message);
                                    } else {
                                        console.log('Đã mở trình duyệt.');
                                    }
                                });
                            }, 4000);
                        });
                    });
                });
            });
        })
        .catch((err) => {
            console.error('Lỗi khi thêm người dùng:', err.message);
            process.exit(1);
        });
});