const express = require('express');
const session = require('express-session');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const https = require('https');
const crypto = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const DATA_DIR = path.join(__dirname, 'data');
fs.mkdirSync(DATA_DIR, { recursive: true });
const db = new Database(path.join(DATA_DIR, 'abinfo.db'));
db.pragma('journal_mode = WAL');

const WILAYAS = [
['01','Adrar','أدرار'],['02','Chlef','الشلف'],['03','Laghouat','الأغواط'],['04','Oum El Bouaghi','أم البواقي'],['05','Batna','باتنة'],['06','Béjaïa','بجاية'],['07','Biskra','بسكرة'],['08','Béchar','بشار'],['09','Blida','البليدة'],['10','Bouira','البويرة'],['11','Tamanrasset','تمنراست'],['12','Tébessa','تبسة'],['13','Tlemcen','تلمسان'],['14','Tiaret','تيارت'],['15','Tizi Ouzou','تيزي وزو'],['16','Alger','الجزائر'],['17','Djelfa','الجلفة'],['18','Jijel','جيجل'],['19','Sétif','سطيف'],['20','Saïda','سعيدة'],['21','Skikda','سكيكدة'],['22','Sidi Bel Abbès','سيدي بلعباس'],['23','Annaba','عنابة'],['24','Guelma','قالمة'],['25','Constantine','قسنطينة'],['26','Médéa','المدية'],['27','Mostaganem','مستغانم'],['28','M’Sila','المسيلة'],['29','Mascara','معسكر'],['30','Ouargla','ورقلة'],['31','Oran','وهران'],['32','El Bayadh','البيض'],['33','Illizi','إليزي'],['34','Bordj Bou Arréridj','برج بوعريريج'],['35','Boumerdès','بومرداس'],['36','El Tarf','الطارف'],['37','Tindouf','تندوف'],['38','Tissemsilt','تيسمسيلت'],['39','El Oued','الوادي'],['40','Khenchela','خنشلة'],['41','Souk Ahras','سوق أهراس'],['42','Tipaza','تيبازة'],['43','Mila','ميلة'],['44','Aïn Defla','عين الدفلى'],['45','Naâma','النعامة'],['46','Aïn Témouchent','عين تموشنت'],['47','Ghardaïa','غرداية'],['48','Relizane','غليزان'],['49','Timimoun','تيميمون'],['50','Bordj Badji Mokhtar','برج باجي مختار'],['51','Ouled Djellal','أولاد جلال'],['52','Béni Abbès','بني عباس'],['53','In Salah','عين صالح'],['54','In Guezzam','عين قزام'],['55','Touggourt','توقرت'],['56','Djanet','جانت'],['57','El M’Ghair','المغير'],['58','El Meniaa','المنيعة'],
['59','Aflou','أفلو'],['60','Barika','بريكة'],['61','Ksar Chellala','قصر الشلالة'],['62','Messaad','مسعد'],['63','Aïn Oussara','عين وسارة'],['64','Boussaâda','بوسعادة'],['65','El Bayadh Sidi Cheikh','الأبيض سيدي الشيخ'],['66','El Kantara','القنطرة'],['67','Bir El Ater','بئر العاتر'],['68','Ksar El Boukhari','قصر البخاري'],['69','El Aricha','العريشة']
].map(([code,fr,ar])=>({code,fr,ar}));

const schema = `
CREATE TABLE IF NOT EXISTS admins(id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY AUTOINCREMENT, name_ar TEXT NOT NULL, name_fr TEXT NOT NULL, name_en TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS products(id INTEGER PRIMARY KEY AUTOINCREMENT, sku TEXT UNIQUE NOT NULL, name_ar TEXT NOT NULL, name_fr TEXT NOT NULL, name_en TEXT NOT NULL, category_id INTEGER, price REAL NOT NULL DEFAULT 0, sale_price REAL, images TEXT DEFAULT '[]', description_ar TEXT DEFAULT '', description_fr TEXT DEFAULT '', description_en TEXT DEFAULT '', specs_ar TEXT DEFAULT '', specs_fr TEXT DEFAULT '', specs_en TEXT DEFAULT '', published INTEGER NOT NULL DEFAULT 1, seo_title TEXT DEFAULT '', seo_description TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(category_id) REFERENCES categories(id));
CREATE TABLE IF NOT EXISTS customers(id INTEGER PRIMARY KEY AUTOINCREMENT, full_name TEXT NOT NULL, phone TEXT NOT NULL, wilaya TEXT NOT NULL, commune TEXT NOT NULL, address TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS orders(id INTEGER PRIMARY KEY AUTOINCREMENT, order_no TEXT UNIQUE NOT NULL, customer_id INTEGER NOT NULL, items_json TEXT NOT NULL, subtotal REAL NOT NULL DEFAULT 0, delivery_fee REAL NOT NULL DEFAULT 0, total REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'new', payment_method TEXT NOT NULL DEFAULT 'cash_on_delivery', notes TEXT DEFAULT '', created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(customer_id) REFERENCES customers(id));
CREATE TABLE IF NOT EXISTS delivery_rates(wilaya_code TEXT PRIMARY KEY, fee REAL NOT NULL DEFAULT 0, enabled INTEGER NOT NULL DEFAULT 1);
CREATE TABLE IF NOT EXISTS settings(key TEXT PRIMARY KEY, value TEXT NOT NULL DEFAULT '');
`;
db.exec(schema);

const defaults = {
 store_name:'ABInfo', currency:'DZD', phone:'+213660191452', email:'b.ahmaida@gmail.com',
 tagline_ar:'تسوقك، أولويتنا', tagline_fr:'Votre shopping, notre priorité', tagline_en:'Your shopping, our priority',
 facebook:'', instagram:'', whatsapp:'', tiktok:'', youtube:'', x:'',
 google_sheet_id:'11PqHIHH_uydQ40GF6RpkeohWBCj0P8Bjnx-2XnK4VsA', google_form_id:'1MeXGHFoIhgA8ToVTtrL3OFgtecZiM1IV7zw-QrPMiRU'
};
const setDefault = db.prepare('INSERT OR IGNORE INTO settings(key,value) VALUES(?,?)');
Object.entries(defaults).forEach(([k,v])=>setDefault.run(k,String(v)));

const adminHash = p => crypto.createHash('sha256').update(String(p)).digest('hex');
if(!db.prepare('SELECT id FROM admins LIMIT 1').get()) {
 const initialUser = process.env.ADMIN_USERNAME || 'admin';
 const initialPass = process.env.ADMIN_PASSWORD || 'admin123';
 db.prepare('INSERT INTO admins(username,password) VALUES(?,?)').run(initialUser, adminHash(initialPass));
}
if(!db.prepare('SELECT id FROM categories LIMIT 1').get()) {
 const add=db.prepare('INSERT INTO categories(name_ar,name_fr,name_en) VALUES(?,?,?)');
 [['هواتف وإلكترونيات','Téléphones & Électronique','Phones & Electronics'],['أجهزة منزلية','Électroménager','Home Appliances'],['إكسسوارات','Accessoires','Accessories'],['عروض خاصة','Offres spéciales','Special Offers']].forEach(x=>add.run(...x));
}
if(!db.prepare('SELECT id FROM products LIMIT 1').get()) {
 const cat=db.prepare('SELECT id FROM categories ORDER BY id LIMIT 1').get().id;
 db.prepare(`INSERT INTO products(sku,name_ar,name_fr,name_en,category_id,price,sale_price,images,description_ar,description_fr,description_en,specs_ar,specs_fr,specs_en,published,seo_title,seo_description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(
 'AB-001','هاتف AB Pro','AB Pro Smartphone','AB Pro Smartphone',cat,89900,79900,JSON.stringify(['https://images.unsplash.com/photo-1511707171634-5f897ff02aa9?auto=format&fit=crop&w=900&q=80']),
 'هاتف أنيق بأداء قوي وشاشة عالية الجودة.','Smartphone élégant avec écran haute qualité.','Elegant smartphone with a high-quality display.','شاشة 6.7 بوصة • ذاكرة 256GB','Écran 6,7 pouces • 256 Go','6.7-inch display • 256GB',1,'AB Pro Smartphone','ABInfo AB Pro smartphone.'
 );
}
const seedRates=db.prepare('INSERT OR IGNORE INTO delivery_rates(wilaya_code,fee,enabled) VALUES(?,?,1)');
WILAYAS.forEach(w=>seedRates.run(w.code,0));

app.use(express.json({limit:'5mb'}));
app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||'ABINFO_DEV_ONLY_CHANGE_ME_please_use_env',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:8*60*60*1000}}));
app.use(express.static(path.join(__dirname,'public')));

const admin=(req,res,next)=>req.session.admin?next():res.status(401).json({error:'Unauthorized'});
const lang=(req)=>['ar','fr','en'].includes(req.query.lang)?req.query.lang:'ar';
function productOut(p,l='ar'){
 return {...p, name:p[`name_${l}`]||p.name_ar, description:p[`description_${l}`]||p.description_ar, specs:p[`specs_${l}`]||p.specs_ar, images:JSON.parse(p.images||'[]')};
}
function settingMap(){return Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map(x=>[x.key,x.value]));}

app.get('/api/config',(req,res)=>res.json({settings:settingMap(),wilayas:WILAYAS,delivery:db.prepare('SELECT * FROM delivery_rates').all()}));
app.get('/api/categories',(req,res)=>{const l=lang(req);res.json(db.prepare(`SELECT id,name_${l} AS name FROM categories ORDER BY id`).all())});
app.get('/api/products',(req,res)=>{const l=lang(req);let ps=db.prepare(`SELECT p.*,c.name_${l} AS category_name FROM products p LEFT JOIN categories c ON c.id=p.category_id WHERE p.published=1 ORDER BY p.id DESC`).all();const q=(req.query.q||'').trim().toLowerCase();const cat=Number(req.query.category||0);if(q)ps=ps.filter(p=>[p[`name_${l}`],p.sku,p[`description_${l}`]].join(' ').toLowerCase().includes(q));if(cat)ps=ps.filter(p=>p.category_id===cat);res.json(ps.map(p=>productOut(p,l))) });
app.get('/api/products/:id',(req,res)=>{const l=lang(req);const p=db.prepare('SELECT * FROM products WHERE id=? AND published=1').get(req.params.id);if(!p)return res.status(404).json({error:'Not found'});res.json(productOut(p,l))});

app.post('/api/orders',(req,res)=>{
 try{
  const {customer,items,notes=''}=req.body;if(!customer?.full_name||!customer?.phone||!customer?.wilaya||!customer?.commune||!customer?.address||!Array.isArray(items)||!items.length)return res.status(400).json({error:'يرجى إكمال بيانات الطلب'});
  const ids=[...new Set(items.map(x=>Number(x.id)).filter(Boolean))];const placeholders=ids.map(()=>'?').join(',');const products=db.prepare(`SELECT * FROM products WHERE id IN (${placeholders}) AND published=1`).all(...ids);const map=new Map(products.map(p=>[p.id,p]));
  const clean=items.map(x=>{const p=map.get(Number(x.id));if(!p)throw new Error('منتج غير صالح');const qty=Math.max(1,Math.min(99,Number(x.qty)||1));const unit=Number(p.sale_price??p.price);return{id:p.id,name_ar:p.name_ar,name_fr:p.name_fr,name_en:p.name_en,sku:p.sku,qty,unit,total:unit*qty}});
  const subtotal=clean.reduce((s,x)=>s+x.total,0);const rate=db.prepare('SELECT fee,enabled FROM delivery_rates WHERE wilaya_code=?').get(String(customer.wilaya));if(!rate||!rate.enabled)return res.status(400).json({error:'التوصيل غير متاح لهذه الولاية'});const delivery=Number(rate.fee)||0;const total=subtotal+delivery;
  const tx=db.transaction(()=>{const c=db.prepare('INSERT INTO customers(full_name,phone,wilaya,commune,address) VALUES(?,?,?,?,?)').run(customer.full_name,customer.phone,customer.wilaya,customer.commune,customer.address);const next=Number(db.prepare('SELECT COALESCE(MAX(id),0)+1 n FROM orders').get().n);const orderNo=`CMD-${new Date().getFullYear()}-${String(next).padStart(6,'0')}`;db.prepare('INSERT INTO orders(order_no,customer_id,items_json,subtotal,delivery_fee,total,status,payment_method,notes) VALUES(?,?,?,?,?,?,?,?,?)').run(orderNo,c.lastInsertRowid,JSON.stringify(clean),subtotal,delivery,total,'new','cash_on_delivery',notes);return orderNo;});
  const savedOrder = {order_no:tx, customer, items:clean, subtotal, delivery_fee:delivery, total, status:'new', payment_method:'cash_on_delivery', notes, created_at:new Date().toISOString()};
  syncGoogle(savedOrder);
  res.json({ok:true,order_no:tx,subtotal,delivery_fee:delivery,total,payment_method:'cash_on_delivery'});
 }catch(e){res.status(400).json({error:e.message||'تعذر إنشاء الطلب'})}
});

async function syncGoogle(order){
  const url=process.env.GOOGLE_APPS_SCRIPT_URL;
  if(!url || typeof fetch!=='function') return;
  try{
    await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type:'order',secret:process.env.GOOGLE_APPS_SCRIPT_SECRET||'',order})});
  }catch(err){ console.warn('Google sync skipped:',err.message); }
}

app.post('/api/login',(req,res)=>{const u=db.prepare('SELECT * FROM admins WHERE username=? AND password=?').get(req.body.username,adminHash(req.body.password||''));if(!u)return res.status(401).json({error:'اسم المستخدم أو كلمة المرور غير صحيحة'});req.session.admin={id:u.id,username:u.username};res.json({ok:true,username:u.username})});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));app.get('/api/me',(req,res)=>res.json(req.session.admin||null));
app.get('/api/admin/dashboard',admin,(req,res)=>{const products=db.prepare('SELECT COUNT(*) n FROM products').get().n;const customers=db.prepare('SELECT COUNT(*) n FROM customers').get().n;const orders=db.prepare('SELECT COUNT(*) n FROM orders').get().n;const revenue=db.prepare("SELECT COALESCE(SUM(total),0) n FROM orders WHERE status!='cancelled'").get().n;const recent=db.prepare('SELECT o.*,c.full_name,c.phone,c.wilaya FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.id DESC LIMIT 12').all();res.json({products,customers,orders,revenue,recent})});
app.get('/api/admin/products',admin,(req,res)=>res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(p=>({...p,images:JSON.parse(p.images||'[]')}))));
app.post('/api/admin/products',admin,(req,res)=>{const p=req.body;if(!p.sku||!p.name_ar||!p.name_fr||!p.name_en)return res.status(400).json({error:'أكمل أسماء المنتج والمراجع'});const info=db.prepare(`INSERT INTO products(sku,name_ar,name_fr,name_en,category_id,price,sale_price,images,description_ar,description_fr,description_en,specs_ar,specs_fr,specs_en,published,seo_title,seo_description) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(p.sku,p.name_ar,p.name_fr,p.name_en,p.category_id||null,Number(p.price)||0,p.sale_price===''||p.sale_price==null?null:Number(p.sale_price),JSON.stringify(p.images||[]),p.description_ar||'',p.description_fr||'',p.description_en||'',p.specs_ar||'',p.specs_fr||'',p.specs_en||'',p.published?1:0,p.seo_title||'',p.seo_description||'');res.json({id:info.lastInsertRowid})});
app.put('/api/admin/products/:id',admin,(req,res)=>{const p=req.body;db.prepare(`UPDATE products SET sku=?,name_ar=?,name_fr=?,name_en=?,category_id=?,price=?,sale_price=?,images=?,description_ar=?,description_fr=?,description_en=?,specs_ar=?,specs_fr=?,specs_en=?,published=?,seo_title=?,seo_description=? WHERE id=?`).run(p.sku,p.name_ar,p.name_fr,p.name_en,p.category_id||null,Number(p.price)||0,p.sale_price===''||p.sale_price==null?null:Number(p.sale_price),JSON.stringify(p.images||[]),p.description_ar||'',p.description_fr||'',p.description_en||'',p.specs_ar||'',p.specs_fr||'',p.specs_en||'',p.published?1:0,p.seo_title||'',p.seo_description||'',req.params.id);res.json({ok:true})});
app.delete('/api/admin/products/:id',admin,(req,res)=>{db.prepare('DELETE FROM products WHERE id=?').run(req.params.id);res.json({ok:true})});
app.get('/api/admin/categories',admin,(req,res)=>res.json(db.prepare('SELECT * FROM categories ORDER BY id DESC').all()));
app.post('/api/admin/categories',admin,(req,res)=>{const x=req.body;if(!x.name_ar||!x.name_fr||!x.name_en)return res.status(400).json({error:'أكمل أسماء الفئة'});const i=db.prepare('INSERT INTO categories(name_ar,name_fr,name_en) VALUES(?,?,?)').run(x.name_ar,x.name_fr,x.name_en);res.json({id:i.lastInsertRowid})});
app.put('/api/admin/categories/:id',admin,(req,res)=>{const x=req.body;db.prepare('UPDATE categories SET name_ar=?,name_fr=?,name_en=? WHERE id=?').run(x.name_ar,x.name_fr,x.name_en,req.params.id);res.json({ok:true})});
app.delete('/api/admin/categories/:id',admin,(req,res)=>{db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);res.json({ok:true})});
app.get('/api/admin/orders',admin,(req,res)=>{const os=db.prepare('SELECT o.*,c.full_name,c.phone,c.wilaya,c.commune,c.address FROM orders o JOIN customers c ON c.id=o.customer_id ORDER BY o.id DESC').all();os.forEach(o=>o.items=JSON.parse(o.items_json));res.json(os)});
app.put('/api/admin/orders/:id',admin,(req,res)=>{const allowed=['new','confirmed','processing','shipped','delivered','cancelled'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'حالة غير صالحة'});db.prepare('UPDATE orders SET status=? WHERE id=?').run(req.body.status,req.params.id);res.json({ok:true})});
app.get('/api/admin/customers',admin,(req,res)=>res.json(db.prepare('SELECT * FROM customers ORDER BY id DESC').all()));
app.get('/api/admin/delivery',admin,(req,res)=>res.json(db.prepare('SELECT d.*,w.fr,w.ar FROM delivery_rates d JOIN (SELECT ? AS x) z ON 1=1 LEFT JOIN delivery_rates d2 ON d2.wilaya_code=d.wilaya_code ORDER BY CAST(d.wilaya_code AS INTEGER)').all('x')));
app.put('/api/admin/delivery/:code',admin,(req,res)=>{db.prepare('INSERT INTO delivery_rates(wilaya_code,fee,enabled) VALUES(?,?,?) ON CONFLICT(wilaya_code) DO UPDATE SET fee=excluded.fee,enabled=excluded.enabled').run(req.params.code,Number(req.body.fee)||0,req.body.enabled?1:0);res.json({ok:true})});
app.get('/api/admin/settings',admin,(req,res)=>res.json(settingMap()));
app.put('/api/admin/settings',admin,(req,res)=>{const allowed=['store_name','phone','email','tagline_ar','tagline_fr','tagline_en','facebook','instagram','whatsapp','tiktok','youtube','x','google_sheet_id','google_form_id'];const q=db.prepare('INSERT INTO settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value');const tx=db.transaction(obj=>allowed.filter(k=>Object.prototype.hasOwnProperty.call(obj,k)).forEach(k=>q.run(k,String(obj[k]??''))));tx(req.body);res.json({ok:true,settings:settingMap()})});
app.put('/api/admin/password',admin,(req,res)=>{if(!req.body.password||req.body.password.length<6)return res.status(400).json({error:'كلمة المرور يجب أن تكون 6 أحرف على الأقل'});db.prepare('UPDATE admins SET password=? WHERE id=?').run(adminHash(req.body.password),req.session.admin.id);res.json({ok:true})});

app.get('/healthz',(req,res)=>res.json({ok:true,service:'ABInfo',production:IS_PRODUCTION}));

app.get('*',(req,res)=>res.sendFile(path.join(__dirname,'public','index.html')));

const cert=process.env.SSL_CERT_PATH,key=process.env.SSL_KEY_PATH;
if(cert&&key&&fs.existsSync(cert)&&fs.existsSync(key)) https.createServer({cert:fs.readFileSync(cert),key:fs.readFileSync(key)},app).listen(PORT,()=>console.log(`ABInfo HTTPS on ${PORT}`));
else app.listen(PORT,()=>console.log(`ABInfo on http://localhost:${PORT}`));
