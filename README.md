# 🍕 KIOSK – Saintgits Campus Food System — Backend

Node.js + Express REST API backed by **MySQL 8**, powering the KIOSK campus food ordering frontend.

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Runtime     | Node.js 18+                       |
| Framework   | Express 4                         |
| Database    | MySQL 8.0                         |
| Driver      | mysql2 (promise pool)             |
| Auth        | JWT (jsonwebtoken) + bcryptjs     |
| Validation  | express-validator                 |

---

## Project Structure

```
kiosk-backend/
├── server.js                  # Entry point
├── .env.example               # Environment template
├── package.json
├── config/
│   └── db.js                  # MySQL connection pool
├── middleware/
│   ├── auth.js                # JWT verify + adminOnly guard
│   └── errorHandler.js        # Centralised MySQL error handler
├── routes/
│   ├── auth.js                # /api/auth  (register, login, me)
│   ├── menu.js                # /api/menu  (browse + admin CRUD)
│   ├── orders.js              # /api/orders (place, history, admin)
│   └── income.js              # /api/income (admin analytics)
└── sql/
    ├── schema.sql             # Full DB schema + triggers
    └── seed.js                # All menu data + demo accounts
```

---

## Quick Start

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.example .env
# Fill in DB_HOST, DB_USER, DB_PASSWORD, JWT_SECRET
```

### 3. Create database and tables
```bash
mysql -u root -p < sql/schema.sql
```

### 4. Seed menu data
```bash
npm run seed
```

### 5. Start server
```bash
npm run dev     # development (nodemon)
npm start       # production
```

Server: **http://localhost:3000**

---

## Database Schema

| Table         | Description                                        |
|---------------|----------------------------------------------------|
| `users`       | Students, faculty, admin accounts                  |
| `outlets`     | RB Kiosk, AK Kiosk, Canteen                        |
| `menu_items`  | All food items with stock, status, category        |
| `orders`      | Placed orders with delivery info & payment         |
| `order_items` | Line items per order (price snapshot at order time)|

### Triggers
- **trg_decrement_stock** — auto-decrements `stock_count` when an order item is inserted; marks item `unavailable` if stock hits 0
- **trg_order_delivered** — auto-sets `delivered_at` when order status changes to `delivered`

---

## Authentication

All protected routes require a `Bearer` token in the `Authorization` header:
```
Authorization: Bearer <token>
```

| Role    | Access                                         |
|---------|------------------------------------------------|
| `user`  | Browse menu, place orders, view own history    |
| `admin` | All user access + manage menu + view all orders + income |

---

## API Reference

All responses:
```json
{ "success": true, "data": ... }
{ "success": false, "error": "..." }
```

---

### Auth  `/api/auth`

| Method | Path         | Auth | Description              |
|--------|--------------|------|--------------------------|
| POST   | `/register`  | —    | Create student account   |
| POST   | `/login`     | —    | Get JWT token            |
| GET    | `/me`        | ✅   | Get current user info    |

**Register body:**
```json
{
  "email": "yourname@saintgits.org",
  "password": "yourpassword",
  "name": "Your Name"
}
```
Only `@saintgits.org` emails are accepted (configurable via `ALLOWED_DOMAIN`).

**Login body:**
```json
{
  "email": "yourname@saintgits.org",
  "password": "yourpassword"
}
```
**Login response:**
```json
{
  "success": true,
  "token": "eyJhbGc...",
  "user": { "id": 1, "email": "...", "role": "user", "name": "..." }
}
```

---

### Menu  `/api/menu`

| Method | Path             | Auth         | Description                |
|--------|------------------|--------------|----------------------------|
| GET    | `/`              | —            | All items (with filters)   |
| GET    | `/outlets`       | —            | List outlets               |
| GET    | `/:id`           | —            | Single item                |
| POST   | `/`              | 🔒 Admin     | Add menu item              |
| PUT    | `/:id`           | 🔒 Admin     | Update item                |
| DELETE | `/:id`           | 🔒 Admin     | Delete item                |
| PATCH  | `/:id/status`    | 🔒 Admin     | Quick status update        |

**GET /api/menu query params:**
- `outlet` — outlet name or id (e.g. `RB Kiosk` or `1`)
- `category` — `snacks`, `biscuits`, `drinks`, `colddrinks`, `icecream`, `morning`, `lunch`, `evening`
- `status` — `available`, `preparing`, `unavailable`
- `q` — search term (name, description, category)

**POST body:**
```json
{
  "name": "Masala Dosa",
  "outlet_id": 3,
  "category": "morning",
  "price": 45,
  "emoji": "🫓",
  "status": "available",
  "stock_count": 20,
  "description": "Crispy dosa with spiced potato filling",
  "eta": null
}
```

**PATCH /:id/status body:**
```json
{ "status": "preparing", "eta": "~15 min", "stock_count": 0 }
```

---

### Orders  `/api/orders`

| Method | Path            | Auth         | Description                   |
|--------|-----------------|--------------|-------------------------------|
| POST   | `/`             | ✅ User      | Place order                   |
| GET    | `/my`           | ✅ User      | Own order history             |
| GET    | `/:id`          | ✅ User/Admin| Single order detail           |
| PATCH  | `/:id/status`   | 🔒 Admin     | Update order status           |
| GET    | `/`             | 🔒 Admin     | All orders (with filters)     |

**POST /api/orders body:**
```json
{
  "student_name": "Ravi Nair",
  "block": "B Block",
  "room": "B204",
  "payment_method": "upi",
  "items": [
    { "menu_item_id": 1, "qty": 2 },
    { "menu_item_id": 18, "qty": 1 }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "message": "Order placed!",
  "data": {
    "order_id": "ORD1234567",
    "total": 65,
    "eta": "~12 min",
    "payment_method": "upi"
  }
}
```

**PATCH /:id/status body:**
```json
{ "status": "delivered" }
```

---

### Income  `/api/income`  *(Admin only)*

| Method | Path              | Description                         |
|--------|-------------------|-------------------------------------|
| GET    | `/`               | Per-outlet revenue + order list     |
| GET    | `/daily`          | Day-by-day revenue (last 30 days)   |
| GET    | `/top-items`      | Best-selling items                  |
| GET    | `/payment-split`  | UPI vs COD breakdown                |

**GET /api/income response shape:**
```json
{
  "data": {
    "by_outlet": [
      {
        "outlet": "RB Kiosk",
        "revenue": 4250,
        "orders": 38,
        "items_sold": 112,
        "orders_list": [
          { "order_id": "ORD1234567", "amount": 75, "placed_at": "...", "student_name": "Ravi" }
        ]
      }
    ],
    "totals": {
      "grand_total": 9820,
      "items_total": 9720,
      "delivery_total": 380,
      "cod_total": 25,
      "order_count": 76
    }
  }
}
```

---

## Connecting the Frontend

Replace the hardcoded `menuData` array and in-memory `orderHistory` in the HTML with `fetch()` calls:

**Load menu on startup:**
```js
const res  = await fetch('http://localhost:3000/api/menu');
const json = await res.json();
menuData = json.data;  // drop-in replacement
```

**Login:**
```js
const res  = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});
const { token, user } = await res.json();
localStorage.setItem('token', token);
```

**Place order:**
```js
await fetch('http://localhost:3000/api/orders', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    student_name, block, room,
    payment_method: selectedPayment,
    items: Object.keys(cart).map(id => ({ menu_item_id: Number(id), qty: cart[id] }))
  })
});
```

---

## Error Codes

| HTTP | Situation                                   |
|------|---------------------------------------------|
| 200  | Success                                     |
| 201  | Created                                     |
| 400  | Validation error                            |
| 401  | Missing / invalid token                     |
| 403  | Forbidden (wrong role or email domain)      |
| 404  | Record not found                            |
| 409  | Conflict (stock, duplicate, FK violation)   |
| 500  | Unexpected server error                     |
