const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 10000;
const JWT_SECRET = process.env.JWT_SECRET;
const STUDENTS_FILE = process.env.STUDENTS_FILE || '/etc/secrets/students.json';
const DATA_DIR = process.env.DATA_DIR || (process.env.RENDER ? '/var/data' : path.join(__dirname, 'data'));
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const CONTENT_FILE = path.join(DATA_DIR, 'spotlights.json');
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  console.error('FATAL: Set JWT_SECRET to a random secret of at least 32 characters.');
  process.exit(1);
}
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://akuhir.github.io').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin(origin, cb) { if (!origin || allowedOrigins.includes(origin)) return cb(null, true); return cb(new Error('Origin is not allowed by CORS')); } }));
app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(UPLOAD_DIR, { maxAge: '1d' }));

function loadStudents() {
  let parsed;
  try { parsed = JSON.parse(fs.readFileSync(STUDENTS_FILE, 'utf8')); }
  catch (e) { throw new Error(`Cannot read STUDENTS_FILE at ${STUDENTS_FILE}: ${e.message}`); }
  const list = Array.isArray(parsed) ? parsed : parsed.students;
  if (!Array.isArray(list) || !list.length) throw new Error('students.json must contain a non-empty students array.');
  return list.map(s => ({
    matric: String(s.matric || s.matricNo || '').trim().toUpperCase(),
    name: String(s.name || '').trim(),
    department: String(s.department || 'hir').trim().toLowerCase(),
    role: s.role === 'admin' ? 'admin' : 'student',
    isActive: s.isActive !== false && s.active !== false
  })).filter(s => s.matric && s.name);
}
function readContent() {
  try { return JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8')); }
  catch (e) { if (e.code === 'ENOENT') return { person: null, quote: null }; throw e; }
}
function writeContent(data) {
  const tmp = `${CONTENT_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
  fs.renameSync(tmp, CONTENT_FILE);
}
function bearer(req, res, next) {
  const value = req.headers.authorization || '';
  if (!value.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'Please log in again.' });
  try { req.user = jwt.verify(value.slice(7), JWT_SECRET); return next(); }
  catch (_) { return res.status(401).json({ success: false, message: 'Your session is invalid or expired. Please log in again.' }); }
}
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin' || req.user.department !== 'hir') return res.status(403).json({ success: false, message: 'Administrator permission required.' });
  return next();
}
function publicPerson(p) { return p ? { name:p.name, description:p.description, photo_url:p.photo || '', updated_at:p.updatedAt } : null; }
function publicQuote(q) { return q ? { quote_text:q.quote, quote_author:q.author, updated_at:q.updatedAt } : null; }
function safeDeletePhoto(photoUrl) {
  if (!photoUrl || !photoUrl.startsWith('/uploads/')) return;
  const name = path.basename(photoUrl);
  const full = path.join(UPLOAD_DIR, name);
  if (full.startsWith(UPLOAD_DIR + path.sep)) { try { fs.unlinkSync(full); } catch (e) { if (e.code !== 'ENOENT') console.warn('Photo cleanup:', e.message); } }
}

app.get('/health', (_req, res) => {
  let roster = 'unavailable';
  try { roster = `${loadStudents().length} student records loaded`; } catch (_) {}
  res.json({ status: 'ok', storage: 'json-file', database: 'none', roster });
});

// Existing matric-number + part-of-name login, verified server-side against the private Secret File.
const recentAttempts = new Map();
app.post('/api/auth/login', (req, res) => {
  const ip = req.ip || 'unknown';
  const now = Date.now();
  const prior = recentAttempts.get(ip) || { count: 0, start: now };
  if (now - prior.start > 10 * 60 * 1000) { prior.count = 0; prior.start = now; }
  prior.count += 1; recentAttempts.set(ip, prior);
  if (prior.count > 30) return res.status(429).json({ success:false, message:'Too many login attempts. Please wait a few minutes.' });
  try {
    const matric = String(req.body?.matric || req.body?.matricNo || '').trim().toUpperCase();
    const namePart = String(req.body?.namePart || req.body?.name || '').trim().toLowerCase();
    if (!matric || namePart.length < 3) return res.status(400).json({ success:false, message:'Enter your matric number and at least 3 letters of your name.' });
    const student = loadStudents().find(s => s.matric === matric);
    const match = student && student.name.toLowerCase().split(/\s+/).some(part => part.startsWith(namePart));
    if (!student || !student.isActive || !match) return res.status(401).json({ success:false, message:'Matric number or name does not match our records.' });
    const expiresIn = req.body?.rememberMe ? '30d' : '1d';
    const token = jwt.sign({ sub: student.matric, matric:student.matric, name:student.name, department:student.department, role:student.role }, JWT_SECRET, { expiresIn });
    recentAttempts.delete(ip);
    return res.json({ success:true, token, user:{ matric:student.matric, matricNo:student.matric, name:student.name, department:student.department, role:student.role } });
  } catch (e) { console.error('Login error:', e.message); return res.status(500).json({ success:false, message:'Login service is not configured correctly. Please contact the administrator.' }); }
});
app.get('/api/me', bearer, (req, res) => res.json({ success:true, user:{ matric:req.user.matric, matricNo:req.user.matric, name:req.user.name, department:req.user.department, role:req.user.role } }));

// Public monthly content; legacy URL names retained so the existing frontend can be wired with minimal changes.
app.get('/api/:department/person-of-week', (req,res) => {
  if (req.params.department !== 'hir') return res.status(404).json({success:false,message:'Department not found.'});
  try { return res.json({success:true,data:publicPerson(readContent().person)}); }
  catch(e) { console.error('Read person:',e.message); return res.status(500).json({success:false,message:'Could not read monthly content.'}); }
});
app.get('/api/:department/quote-of-week', (req,res) => {
  if (req.params.department !== 'hir') return res.status(404).json({success:false,message:'Department not found.'});
  try { return res.json({success:true,data:publicQuote(readContent().quote)}); }
  catch(e) { console.error('Read quote:',e.message); return res.status(500).json({success:false,message:'Could not read monthly content.'}); }
});
const upload = multer({ storage:multer.diskStorage({
  destination:(_req,_file,cb)=>cb(null,UPLOAD_DIR),
  filename:(_req,file,cb)=>cb(null,`${Date.now()}-${crypto.randomBytes(6).toString('hex')}${({ 'image/jpeg':'.jpg','image/png':'.png','image/webp':'.webp','image/gif':'.gif' })[file.mimetype] || '.img'}`)
}), limits:{fileSize:5*1024*1024}, fileFilter:(_req,file,cb)=>{
  const ok=['image/jpeg','image/png','image/webp','image/gif'].includes(file.mimetype);
  cb(ok?null:new Error('Only JPEG, PNG, WEBP, or GIF images are allowed.'),ok);
}});
function uploadError(err,req,res,next) { if (err) return res.status(400).json({success:false,message:err.message || 'Photo upload failed.'}); next(); }
app.put('/api/admin/:department/person-of-week', bearer, adminOnly, (req,res) => {
  if (req.params.department !== 'hir') return res.status(404).json({success:false,message:'Department not found.'});
  const name=String(req.body?.name || '').trim(), description=String(req.body?.description || '').trim();
  if (!name || name.length>150 || !description || description.length>3000) return res.status(400).json({success:false,message:'Enter a name (max 150 characters) and description (max 3000 characters).'});
  try { const content=readContent(); content.person={...(content.person||{}),name,description,photo:content.person?.photo||'',updatedAt:new Date().toISOString(),updatedBy:req.user.matric}; writeContent(content); return res.json({success:true,data:publicPerson(content.person)}); }
  catch(e) { console.error('Save person:',e.message); return res.status(500).json({success:false,message:'Could not save Person of the Month.'}); }
});
app.post('/api/admin/:department/person-of-week/photo', bearer, adminOnly, upload.single('photo'), uploadError, (req,res) => {
  if (req.params.department !== 'hir') return res.status(404).json({success:false,message:'Department not found.'});
  if (!req.file) return res.status(400).json({success:false,message:'Choose an image first.'});
  try { const content=readContent(); if (!content.person) { fs.unlinkSync(req.file.path); return res.status(400).json({success:false,message:'Save the person name and description before uploading the photo.'}); }
    const old=content.person.photo; content.person.photo=`/uploads/${req.file.filename}`; content.person.updatedAt=new Date().toISOString(); content.person.updatedBy=req.user.matric; writeContent(content); safeDeletePhoto(old); return res.json({success:true,data:publicPerson(content.person)});
  } catch(e) { console.error('Upload person photo:',e.message); return res.status(500).json({success:false,message:'Could not save the photo.'}); }
});
app.delete('/api/admin/:department/person-of-week', bearer, adminOnly, (req,res) => {
  if (req.params.department !== 'hir') return res.status(404).json({success:false,message:'Department not found.'});
  try { const content=readContent(); safeDeletePhoto(content.person?.photo); content.person=null; writeContent(content); return res.json({success:true,message:'Person of the Month deleted.'}); }
  catch(e) { console.error('Delete person:',e.message); return res.status(500).json({success:false,message:'Could not delete Person of the Month.'}); }
});
app.put('/api/admin/:department/quote-of-week', bearer, adminOnly, (req,res) => {
  if (req.params.department !== 'hir') return res.status(404).json({success:false,message:'Department not found.'});
  const quote=String(req.body?.quoteText ?? req.body?.quote ?? '').trim(), author=String(req.body?.quoteAuthor ?? req.body?.author ?? '').trim();
  if (!quote || quote.length>1200 || !author || author.length>150) return res.status(400).json({success:false,message:'Enter a quote (max 1200 characters) and author (max 150 characters).'});
  try { const content=readContent(); content.quote={quote,author,updatedAt:new Date().toISOString(),updatedBy:req.user.matric}; writeContent(content); return res.json({success:true,data:publicQuote(content.quote)}); }
  catch(e) { console.error('Save quote:',e.message); return res.status(500).json({success:false,message:'Could not save Quote of the Month.'}); }
});
app.delete('/api/admin/:department/quote-of-week', bearer, adminOnly, (req,res) => {
  if (req.params.department !== 'hir') return res.status(404).json({success:false,message:'Department not found.'});
  try { const content=readContent(); content.quote=null; writeContent(content); return res.json({success:true,message:'Quote of the Month deleted.'}); }
  catch(e) { console.error('Delete quote:',e.message); return res.status(500).json({success:false,message:'Could not delete Quote of the Month.'}); }
});
app.use((req,res)=>res.status(404).json({success:false,message:'Route not found.'}));
app.use((err,req,res,next)=>{ console.error('Request error:',err.message); res.status(400).json({success:false,message:err.message || 'Request failed.'}); });
app.listen(PORT,()=>console.log(`AKUHIR JSON backend listening on ${PORT}; content directory: ${DATA_DIR}; roster file: ${STUDENTS_FILE}`));
