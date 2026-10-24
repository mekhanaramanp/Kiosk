// sql/seed.js — Populate kiosk_db with all menu data from the frontend
require('dotenv').config();
const mysql   = require('mysql2/promise');
const bcrypt  = require('bcryptjs');

async function seed() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'kiosk_db',
    multipleStatements: true,
    charset: 'utf8mb4',
  });
  console.log('🌱  Seeding kiosk_db...');

  // ── OUTLETS ──────────────────────────────────────────────────────
  await conn.query(`
    INSERT IGNORE INTO outlets (id, name, emoji, eta_min, eta_max) VALUES
    (1, 'RB Kiosk',  '🔴', 8,  15),
    (2, 'AK Kiosk',  '🟣', 8,  15),
    (3, 'Canteen',   '🟢', 15, 30);
  `);

  // ── ADMIN USER ───────────────────────────────────────────────────
  const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'admin123', 10);
  await conn.query(`
    INSERT IGNORE INTO users (email, password, role, name) VALUES
    ('admin@saintgits.org', ?, 'admin', 'Admin');
  `, [adminHash]);

  // ── SAMPLE STUDENT USER ──────────────────────────────────────────
  const studentHash = await bcrypt.hash('student123', 10);
  await conn.query(`
    INSERT IGNORE INTO users (email, password, role, name) VALUES
    ('demo@saintgits.org', ?, 'user', 'Demo Student');
  `, [studentHash]);

  // ── MENU ITEMS ────────────────────────────────────────────────────
  // RB Kiosk
  const rbItems = [
    // snacks
    ['Meat Puffs',          1,'snacks', 20,'🥐','available',15,'Flaky puff pastry filled with spiced minced meat',null],
    ['Egg Puffs',           1,'snacks', 19,'🥚','available',12,'Golden pastry puff with a whole boiled egg inside',null],
    ['Meat Roll',           1,'snacks', 25,'🌯','available', 8,'Soft roll stuffed with well-seasoned minced meat',null],
    ['Samosa',              1,'snacks', 10,'🥟','available',20,'Crispy fried pastry with spiced filling',null],
    ['Uzhunvada',           1,'snacks', 10,'🍩','available',18,'Crispy black-gram donuts, Kerala style',null],
    ['Cream Bun',           1,'snacks', 10,'🍞','available',10,'Soft bun filled with sweet whipped cream',null],
    ['Ulli Vada',           1,'snacks', 10,'🧅','preparing', 0,'Crunchy onion fritters, deep fried to perfection','~15 min'],
    ['Parippu Vada',        1,'snacks', 10,'🟡','available',14,'Crispy lentil fritters – a Kerala tea-time classic',null],
    ['Vettu Cake',          1,'snacks', 15,'🍰','available', 9,'Sweet fried rice-flour cake, mildly spiced',null],
    ['Cutlet',              1,'snacks', 18,'🫓','available',11,'Minced meat & potato patty, shallow fried',null],
    ['Neyappam',            1,'snacks', 10,'🟤','preparing', 0,'Sweet jaggery rice fritters fried in ghee','~20 min'],
    ['Chicken Sandwich',    1,'snacks', 20,'🥪','available', 6,'Toasted bread with spiced chicken & veggies',null],
    // biscuits
    ['Jim Jam',             1,'biscuits',10,'🍪','available',30,'Classic cream-filled biscuit, sweet & crunchy',null],
    ['Good Day',            1,'biscuits',10,'🍪','available',30,'Buttery cashew biscuits by Britannia',null],
    ['Nabati Chocolate',    1,'biscuits',10,'🍫','available',25,'Wafer biscuit with chocolate cream layers',null],
    ['Nabati Cheese',       1,'biscuits',10,'🧀','available',25,'Wafer biscuit with creamy cheese filling',null],
    ['Cheese Slices',       1,'biscuits',10,'🧀','available',20,'Individual processed cheese slices pack',null],
    // drinks
    ['Coffee',              1,'drinks',  20,'☕','available',50,'Hot fresh South Indian filter coffee',null],
    ['Tea',                 1,'drinks',  15,'🍵','available',50,'Hot ginger-cardamom masala chai',null],
    ['Hot Chocolate',       1,'drinks',  20,'🍫','available',20,'Creamy warm cocoa with frothy milk',null],
    ['Green Tea',           1,'drinks',  10,'🍃','available',30,'Light antioxidant-rich green tea',null],
    // colddrinks
    ['Thick Shake – Chocolate',1,'colddrinks',40,'🥤','available',12,'Rich cold chocolate thick milkshake',null],
    ['Cold Coffee',         1,'colddrinks',40,'☕','available',12,'Chilled blended coffee with ice cream',null],
    ['Sambharam',           1,'colddrinks',10,'🥛','available',20,'Kerala spiced buttermilk, super refreshing',null],
    ['7UP',                 1,'colddrinks',10,'🟡','available',25,'Chilled lemon-lime fizzy drink (small bottle)',null],
    ['Pepsi',               1,'colddrinks',15,'🥤','available',25,'Classic cold cola (small bottle)',null],
    ['Vanilla Smoothie',    1,'colddrinks',40,'🍦','available', 8,'Creamy blended vanilla smoothie',null],
    // icecream
    ['Strawberry Ice Cream',   1,'icecream',30,'🍓','available',15,'Fruity strawberry flavoured ice cream scoop',null],
    ['Chocolate Ice Cream',    1,'icecream',40,'🍫','available',15,'Rich dark chocolate ice cream scoop',null],
    ['Vanilla Ice Cream',      1,'icecream',30,'🍦','available',15,'Classic creamy vanilla ice cream',null],
    ['Blueberry Ice Cream',    1,'icecream',50,'🫐','available', 8,'Premium blueberry ice cream scoop',null],
    ['Chocolate Currant Ice Cream',1,'icecream',45,'🍫','available',10,'Chocolate ice cream with currant swirls',null],
  ];

  // AK Kiosk (same items, outlet_id=2)
  const akItems = [
    ['Meat Puffs',       2,'snacks', 20,'🥐','available',15,'Flaky puff pastry filled with spiced minced meat',null],
    ['Egg Puffs',        2,'snacks', 19,'🥚','available',12,'Golden pastry puff with a whole boiled egg inside',null],
    ['Meat Roll',        2,'snacks', 25,'🌯','available', 8,'Soft roll stuffed with well-seasoned minced meat',null],
    ['Samosa',           2,'snacks', 10,'🥟','available',20,'Crispy fried pastry with spiced filling',null],
    ['Uzhunvada',        2,'snacks', 10,'🍩','preparing', 0,'Crispy black-gram donuts, Kerala style','~10 min'],
    ['Cream Bun',        2,'snacks', 10,'🍞','available',10,'Soft bun filled with sweet whipped cream',null],
    ['Ulli Vada',        2,'snacks', 10,'🧅','available',16,'Crunchy onion fritters, deep fried to perfection',null],
    ['Parippu Vada',     2,'snacks', 10,'🟡','available',14,'Crispy lentil fritters – a Kerala tea-time classic',null],
    ['Vettu Cake',       2,'snacks', 15,'🍰','available', 9,'Sweet fried rice-flour cake, mildly spiced',null],
    ['Cutlet',           2,'snacks', 18,'🫓','preparing', 0,'Minced meat & potato patty, shallow fried','~15 min'],
    ['Neyappam',         2,'snacks', 10,'🟤','available',12,'Sweet jaggery rice fritters fried in ghee',null],
    ['Chicken Sandwich', 2,'snacks', 20,'🥪','available', 6,'Toasted bread with spiced chicken & veggies',null],
    ['Jim Jam',          2,'biscuits',10,'🍪','available',30,'Classic cream-filled biscuit, sweet & crunchy',null],
    ['Good Day',         2,'biscuits',10,'🍪','available',30,'Buttery cashew biscuits by Britannia',null],
    ['Nabati Chocolate', 2,'biscuits',10,'🍫','available',25,'Wafer biscuit with chocolate cream layers',null],
    ['Nabati Cheese',    2,'biscuits',10,'🧀','available',25,'Wafer biscuit with creamy cheese filling',null],
    ['Cheese Slices',    2,'biscuits',10,'🧀','available',20,'Individual processed cheese slices pack',null],
    ['Coffee',           2,'drinks',  20,'☕','available',50,'Hot fresh South Indian filter coffee',null],
    ['Tea',              2,'drinks',  15,'🍵','available',50,'Hot ginger-cardamom masala chai',null],
    ['Hot Chocolate',    2,'drinks',  20,'🍫','available',20,'Creamy warm cocoa with frothy milk',null],
    ['Green Tea',        2,'drinks',  10,'🍃','available',30,'Light antioxidant-rich green tea',null],
    ['Thick Shake – Chocolate',2,'colddrinks',40,'🥤','available',12,'Rich cold chocolate thick milkshake',null],
    ['Cold Coffee',      2,'colddrinks',40,'☕','available',12,'Chilled blended coffee with ice cream',null],
    ['Sambharam',        2,'colddrinks',10,'🥛','available',20,'Kerala spiced buttermilk, super refreshing',null],
    ['7UP',              2,'colddrinks',10,'🟡','available',25,'Chilled lemon-lime fizzy drink (small bottle)',null],
    ['Pepsi',            2,'colddrinks',15,'🥤','available',25,'Classic cold cola (small bottle)',null],
    ['Vanilla Smoothie', 2,'colddrinks',40,'🍦','available', 8,'Creamy blended vanilla smoothie',null],
    ['Strawberry Ice Cream',   2,'icecream',30,'🍓','available',15,'Fruity strawberry flavoured ice cream scoop',null],
    ['Chocolate Ice Cream',    2,'icecream',40,'🍫','available',15,'Rich dark chocolate ice cream scoop',null],
    ['Vanilla Ice Cream',      2,'icecream',30,'🍦','available',15,'Classic creamy vanilla ice cream',null],
    ['Blueberry Ice Cream',    2,'icecream',50,'🫐','available', 8,'Premium blueberry ice cream scoop',null],
    ['Chocolate Currant Ice Cream',2,'icecream',45,'🍫','available',10,'Chocolate ice cream with currant swirls',null],
  ];

  // Canteen
  const canteenItems = [
    ['Appam',            3,'morning', 10,'🫓','available',30,'Soft lacy rice hoppers – light & fluffy',null],
    ['Chapathi',         3,'morning', 10,'🫔','available',30,'Soft whole-wheat flatbread',null],
    ['Veg Curry',        3,'morning', 50,'🥘','available',20,'Mixed vegetable curry with coconut gravy',null],
    ['Beef Curry',       3,'morning',100,'🍖','available',15,'Slow-cooked spicy Kerala beef curry',null],
    ['Egg Curry',        3,'morning', 40,'🥚','available',18,'Boiled eggs in a tangy onion-tomato gravy',null],
    ['Tea',              3,'morning', 20,'🍵','available',60,'Hot masala tea, freshly made',null],
    ['Coffee',           3,'morning', 20,'☕','available',60,'Hot South Indian filter coffee',null],
    ['Rice Meal',        3,'lunch',   70,'🍛','available',25,'Full rice plate with sambar, curry & papad',null],
    ['Biriyani',         3,'lunch',  110,'🍚','preparing', 0,'Fragrant Kerala-style chicken biriyani','~30 min'],
    ['Beef Roast',       3,'lunch',   80,'🍖','available',12,'Dry-roasted spiced beef with fried onions',null],
    ['Fish Fry',         3,'lunch',   70,'🐟','available',10,'Crispy Kerala-spiced pan-fried fish',null],
    ['Motta Porichathu', 3,'lunch',   15,'🍳','available',20,'Scrambled eggs with onions & green chilli',null],
    ['Chicken Fry',      3,'lunch',   80,'🍗','available',10,'Crispy fried chicken with pepper marinade',null],
    ['Egg Bhaji',        3,'evening', 10,'🥚','available',20,'Boiled egg coated in spiced batter & fried',null],
    ['Parippu Vada',     3,'evening', 10,'🟡','available',25,'Crispy lentil fritters, evening special',null],
    ['Banana Fritters',  3,'evening', 10,'🍌','available',20,'Sweet ripe banana fritters, Kerala style',null],
    ['Tea (Evening)',    3,'evening', 20,'🍵','available',60,'Hot evening masala tea',null],
    ['Coffee (Evening)', 3,'evening', 20,'☕','available',60,'Hot South Indian filter coffee',null],
  ];

  const allItems = [...rbItems, ...akItems, ...canteenItems];
  for (const item of allItems) {
    const [name, outletId, category, price, emoji, status, stockCount, description, eta] = item;
    await conn.query(
      `INSERT IGNORE INTO menu_items (name,outlet_id,category,price,emoji,status,stock_count,description,eta)
       VALUES (?,?,?,?,?,?,?,?,?)`,
      [name, outletId, category, price, emoji, status, stockCount, description, eta]
    );
  }

  console.log(`✅  Seeded: ${allItems.length} menu items across 3 outlets`);
  console.log('   Admin login: admin@saintgits.org / admin123');
  console.log('   Demo login:  demo@saintgits.org  / student123');
  await conn.end();
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1); });
