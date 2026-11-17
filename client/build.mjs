import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
const target=path.resolve(import.meta.dirname,'../server/wwwroot');
await fs.mkdir(target,{recursive:true});
await fs.cp(path.join(import.meta.dirname,'public'),target,{recursive:true});
const options={absWorkingDir:import.meta.dirname,entryPoints:['src/main.jsx'],bundle:true,minify:true,sourcemap:false,outdir:path.join(target,'assets'),entryNames:'app',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'},metafile:true};
if(process.argv.includes('--watch')){const context=await esbuild.context(options);await context.watch();console.log('Watching React source. Run ASP.NET at http://localhost:5080');}
else{const result=await esbuild.build(options);const template=await fs.readFile(path.join(import.meta.dirname,'index.html'),'utf8');await fs.writeFile(path.join(target,'index.html'),template.replace('<script type="module" src="/src/main.jsx"></script>','<link rel="stylesheet" href="/assets/app.css"/><script type="module" src="/assets/app.js"></script>'));console.log('React production build complete.');}
