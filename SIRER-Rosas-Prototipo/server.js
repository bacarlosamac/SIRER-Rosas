'use strict';
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { URL } = require('node:url');
const root = __dirname;
const STATUS = ['registrado', 'en_revision', 'validado', 'cerrado'];
const TYPES = ['Movimiento en masa', 'Afectación vial'];
const bounds = {minLat:2.2505,maxLat:2.3375,minLng:-76.845,maxLng:-76.6075};
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.ico':'image/x-icon','.json':'application/json; charset=utf-8'};
const sessions = new Map();
const passwordHash = (p, salt=crypto.randomBytes(16).toString('hex')) => `${salt}:${crypto.scryptSync(p,salt,64).toString('hex')}`;
const validPassword = (p, h) => {const [salt,digest] = h.split(':'); const a=crypto.scryptSync(p,salt,64); const b=Buffer.from(digest,'hex'); return a.length===b.length && crypto.timingSafeEqual(a,b);};
function initData(dataFile) {
  fs.mkdirSync(path.dirname(dataFile), {recursive:true});
  if (!fs.existsSync(dataFile)) {
    const seed=JSON.parse(fs.readFileSync(path.join(root,'data/seed.json'),'utf8'));
    const reports=seed.map(s=>({...s, evidence:[], history:s.history||[{status:'registrado',at:s.date+'T10:00:00.000Z',by:s.createdBy,note:'Reporte recibido'}]}));
    const users=[{id:'u-gestor',name:'Equipo de revisión',email:'gestor@sirer.local',role:'gestor',password:passwordHash('ClaveGestor2026!')},{id:'u-comunidad',name:'Participante comunitario',email:'comunidad@sirer.local',role:'comunidad',password:passwordHash('ClaveComunidad2026!')}];
    fs.writeFileSync(dataFile,JSON.stringify({users,reports},null,2));
  }
}
function createApp(options={}) {
 const dataFile=options.dataFile||path.join(root,'data/database.json');initData(dataFile);
 const load=()=>JSON.parse(fs.readFileSync(dataFile,'utf8'));
 const save=(db)=>{const t=dataFile+'.tmp';fs.writeFileSync(t,JSON.stringify(db,null,2));fs.renameSync(t,dataFile);};
 const send=(res,status,payload)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(payload));};
 const read=(req)=>new Promise((resolve,reject)=>{let body='';req.on('data',c=>{body+=c;if(body.length>3_000_000){reject(Object.assign(new Error('Solicitud demasiado grande'),{status:413}));req.destroy();}});req.on('end',()=>{try{resolve(body?JSON.parse(body):{});}catch{reject(Object.assign(new Error('JSON inválido'),{status:400}));}});req.on('error',reject);});
 const actor=(req)=>{const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');const session=sessions.get(token);if(!session)return null;if(session.exp<Date.now()){sessions.delete(token);return null;}return load().users.find(u=>u.id===session.uid)||null;};
 const userView=u=>({id:u.id,name:u.name,email:u.email,role:u.role});
 return http.createServer(async(req,res)=>{
   try{
    const u=new URL(req.url,'http://localhost');const pathname=decodeURIComponent(u.pathname);const method=req.method;
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Referrer-Policy','no-referrer');
    if(pathname==='/api/health'&&method==='GET')return send(res,200,{ok:true,service:'SIRER-Rosas',time:new Date().toISOString()});
    if(pathname==='/api/auth/login'&&method==='POST'){
      const b=await read(req);const db=load();const found=db.users.find(x=>x.email===String(b.email||'').trim().toLowerCase());
      if(!found||!validPassword(String(b.password||''),found.password))return send(res,401,{error:'Credenciales incorrectas'});
      const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{uid:found.id,exp:Date.now()+8*60*60*1000});return send(res,200,{token,user:userView(found)});
    }
    if(pathname==='/api/auth/register'&&method==='POST'){
      const b=await read(req);const name=String(b.name||'').trim();const email=String(b.email||'').trim().toLowerCase();const password=String(b.password||'');
      if(b.consent!==true)return send(res,400,{error:'Debe aceptar el tratamiento de datos para crear la cuenta'});
      if(name.length<3||name.length>70||!/^\S+@\S+\.\S+$/.test(email)||password.length<10)return send(res,400,{error:'Ingrese nombre, correo válido y contraseña de mínimo 10 caracteres'});
      const db=load();if(db.users.some(x=>x.email===email))return send(res,409,{error:'Ya existe una cuenta con ese correo'});
      const account={id:crypto.randomUUID(),name,email,role:'comunidad',password:passwordHash(password),consentAt:new Date().toISOString()};db.users.push(account);save(db);
      const token=crypto.randomBytes(32).toString('hex');sessions.set(token,{uid:account.id,exp:Date.now()+8*60*60*1000});return send(res,201,{token,user:userView(account)});
    }
    if(pathname==='/api/auth/me'&&method==='GET'){
      const a=actor(req);if(!a)return send(res,401,{error:'Debe iniciar sesión'});return send(res,200,{user:userView(a)});
    }
    if(pathname==='/api/auth/logout'&&method==='POST'){const token=(req.headers.authorization||'').replace(/^Bearer\s+/i,'');sessions.delete(token);return send(res,200,{ok:true});}
    if(pathname==='/api/reports'&&method==='GET'){
      const db=load();let reports=db.reports;
      const type=u.searchParams.get('type');const status=u.searchParams.get('status');const search=u.searchParams.get('q');
      if(type)reports=reports.filter(r=>r.type===type);if(status)reports=reports.filter(r=>r.status===status);
      if(search)reports=reports.filter(r=>[r.title,r.sector,r.description,r.id].join(' ').toLowerCase().includes(search.toLowerCase()));
      return send(res,200,{reports:reports.sort((a,b)=>b.date.localeCompare(a.date)||b.id.localeCompare(a.id))});
    }
    if(pathname==='/api/reports'&&method==='POST'){
      const a=actor(req);if(!a)return send(res,401,{error:'Inicie sesión para enviar un reporte'});
      const b=await read(req);const title=String(b.title||'').trim();const description=String(b.description||'').trim();const sector=String(b.sector||'').trim();const lat=Number(b.lat),lng=Number(b.lng);const date=String(b.date||'');
      if(title.length<8||title.length>100||sector.length<3||sector.length>75||description.length<20||description.length>1200||!TYPES.includes(b.type)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(Date.parse(date))||new Date(date+'T00:00:00Z')>new Date()||!Number.isFinite(lat)||!Number.isFinite(lng)||lat<bounds.minLat||lat>bounds.maxLat||lng<bounds.minLng||lng>bounds.maxLng)return send(res,400,{error:'Verifique los datos y seleccione una ubicación dentro del área delimitada de Rosas'});
      const evidence=Array.isArray(b.evidence)?b.evidence.slice(0,2):[];
      if(evidence.some(e=>!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(e)||e.length>900_000))return send(res,400,{error:'Se admiten hasta dos imágenes JPG, PNG o WebP pequeñas'});
      if(evidence.length && b.evidenceConsent!==true)return send(res,400,{error:'Confirme la autorización para adjuntar las imágenes'});
      const db=load();const seq=db.reports.reduce((m,r)=>Math.max(m,Number((r.id||'').split('-').pop())||0),0)+1;
      const report={id:'SR-'+new Date().getFullYear()+'-'+String(seq).padStart(3,'0'),title,sector,type:b.type,description,lat,lng,date,evidence,createdBy:a.name,createdById:a.id,priority:['Baja','Media','Alta'].includes(b.priority)?b.priority:'Media',status:'registrado',history:[{status:'registrado',at:new Date().toISOString(),by:a.name,note:'Reporte recibido'}]};db.reports.unshift(report);save(db);return send(res,201,{report});
    }
    const m=pathname.match(/^\/api\/reports\/([^/]+)\/status$/);
    if(m&&method==='PATCH'){
      const a=actor(req);if(!a||a.role!=='gestor')return send(res,403,{error:'Solo el rol gestor puede actualizar el seguimiento'});
      const b=await read(req);if(!STATUS.includes(b.status))return send(res,400,{error:'Estado no permitido'});
      const db=load();const report=db.reports.find(r=>r.id===m[1]);if(!report)return send(res,404,{error:'Reporte no encontrado'});
      const current=STATUS.indexOf(report.status),next=STATUS.indexOf(b.status);
      if(next<=current)return send(res,400,{error:'El estado debe avanzar en el flujo de revisión'});
      const note=String(b.note||'').trim();if(note.length<8||note.length>280)return send(res,400,{error:'Agregue una observación entre 8 y 280 caracteres'});
      report.status=b.status;report.history.push({status:b.status,by:a.name,at:new Date().toISOString(),note});save(db);return send(res,200,{report});
    }
    if(pathname.startsWith('/api/'))return send(res,404,{error:'Ruta no disponible'});
    const rel=pathname==='/'?'index.html':pathname.slice(1);const fp=path.resolve(root,'public',rel);const publicRoot=path.resolve(root,'public');
    if(!fp.startsWith(publicRoot+path.sep)&&fp!==publicRoot){res.writeHead(403);return res.end();}
    let stat;try{stat=fs.statSync(fp);}catch{res.writeHead(404);return res.end('No encontrado');}
    if(!stat.isFile()){res.writeHead(404);return res.end('No encontrado');}
    res.writeHead(200,{'Content-Type':mime[path.extname(fp)]||'application/octet-stream','Cache-Control':'no-cache'});fs.createReadStream(fp).pipe(res);
   }catch(e){if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Error interno del servidor'});}
 });
}
if(require.main===module){const port=Number(process.env.PORT||3000);createApp().listen(port,'0.0.0.0',()=>console.log(`SIRER-Rosas en http://localhost:${port}`));}
module.exports={createApp,initData,bounds};
