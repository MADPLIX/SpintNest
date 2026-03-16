const fs = require('fs');
const https = require('https');
const FormData = require('g:/Programmier Projekte/scrum-planner/node_modules/form-data');

const installerPath = 'g:/Programmier Projekte/scrum-planner/src-tauri/target/release/bundle/nsis/SprintNest_0.4.1_x64-setup.exe';
const sig = fs.readFileSync(installerPath + '.sig', 'utf8').trim();

const notes = [
  '- Google Drive Sync: Projekte mit deinem Google-Account geräteübergreifend synchronisieren',
  '- Fälligkeits-Erinnerungen erscheinen jetzt als Toast (nicht mehr blockierend)',
  '- Sprint-Reihenfolge im Scrum Board behoben',
].join('\n');

const form = new FormData();
form.append('version', '0.4.1');
form.append('notes', notes);
form.append('platform', 'windows-x86_64');
form.append('signature', sig);
form.append('installer', fs.createReadStream(installerPath), { filename: 'SprintNest_0.4.1_x64-setup.exe', contentType: 'application/octet-stream' });

const options = {
  hostname: 'sn.madplix.de',
  path: '/admin/release',
  method: 'POST',
  headers: {
    ...form.getHeaders(),
    'Authorization': 'Bearer ${process.env.UPLOAD_TOKEN}',
  },
};

const req = https.request(options, res => {
  let d = '';
  res.setEncoding('utf8');
  res.on('data', c => d += c);
  res.on('end', () => console.log(d));
});
req.on('error', e => console.error(e));
form.pipe(req);
