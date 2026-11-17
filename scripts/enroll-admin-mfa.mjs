// Run locally in a private terminal. Never paste the secret into chat or source control.
import readline from 'node:readline/promises';
import {stdin,stdout} from 'node:process';
const rl=readline.createInterface({input:stdin,output:stdout});
async function hidden(prompt){
 if(!stdin.isTTY)throw Error('Use an interactive terminal to protect password input.');
 rl.pause();stdout.write(prompt);stdin.setRawMode(true);stdin.resume();
 return await new Promise((resolve,reject)=>{let value='';const read=chunk=>{for(const c of chunk.toString()){if(c==='\u0003'){cleanup();reject(Error('Cancelled'));return}if(c==='\r'||c==='\n'){cleanup();resolve(value);return}if(c==='\u007f'||c==='\b')value=value.slice(0,-1);else if(c>=' ')value+=c;}};function cleanup(){stdin.off('data',read);stdin.setRawMode(false);stdout.write('\n');rl.resume()}stdin.on('data',read)});
}
try{
 const url=(process.env.SUPABASE_URL||await rl.question('Supabase project URL: ')).trim().replace(/\/$/,'');
 if(!/^https:\/\/[a-z0-9-]+\.supabase\.co$/.test(url))throw Error('Use your official https://PROJECT.supabase.co URL.');
 const key=process.env.SUPABASE_PUBLISHABLE_KEY||await rl.question('Supabase publishable / anon key (NOT service_role): ');
 const email=await rl.question('Confirmed admin email: ');
 let password=await hidden('Admin password (hidden): ');
 async function call(path,body,token){const r=await fetch(url+'/auth/v1'+path,{method:'POST',headers:{apikey:key,'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error('Supabase rejected this step. Check credentials, email confirmation and MFA settings.');return d;}
 const login=await call('/token?grant_type=password',{email,password});password='';
 if(login.user.factors?.some(f=>f.status==='verified'))throw Error('An MFA factor is already verified. Use that authenticator to sign into the store.');
 const factor=await call('/factors',{factor_type:'totp',friendly_name:'Accessorati Admin',issuer:'Accessorati'},login.access_token);
 stdout.write('\nAdd a new time-based account in your authenticator app.\n');
 stdout.write('Email: '+email+'\nSecret (private): '+factor.totp.secret+'\n');
 const code=(await rl.question('Enter the six-digit authenticator code: ')).trim();
 if(!/^\d{6}$/.test(code))throw Error('Use a six-digit code.');
 const challenge=await call('/factors/'+factor.id+'/challenge',{},login.access_token);
 await call('/factors/'+factor.id+'/verify',{challenge_id:challenge.id,code},login.access_token);
 stdout.write('\nMFA enabled. Set Admin__UserId to this user UUID in Render: '+login.user.id+'\n');
 stdout.write('Keep your authenticator and recovery options safe. Clear the terminal containing the enrollment secret.\n');
}catch(e){console.error(e.message);process.exitCode=1}finally{rl.close()}
