import * as esbuild from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
const target=path.resolve(import.meta.dirname,'../server/wwwroot');
await fs.mkdir(target,{recursive:true});
await fs.cp(path.join(import.meta.dirname,'public'),target,{recursive:true});
const template=await fs.readFile(path.join(import.meta.dirname,'index.html'),'utf8');
const htmlPlugin={name:'versioned-html',setup(build){build.onEnd(async result=>{
 if(result.errors.length)return;
 const entry=Object.entries(result.metafile.outputs).find(([name,meta])=>name.endsWith('.js')&&meta.entryPoint);
 if(!entry)throw new Error('Missing storefront JavaScript entrypoint');
 const script='/assets/'+path.basename(entry[0]);
 const css=entry[1].cssBundle?'<link rel="stylesheet" href="/assets/'+path.basename(entry[1].cssBundle)+'"/>':'';
 await fs.writeFile(path.join(target,'index.html'),template.replace('<script type="module" src="/src/main.jsx"></script>',css+'<script type="module" src="'+script+'"></script>'));
})}};
const options={absWorkingDir:import.meta.dirname,entryPoints:['src/main.jsx'],bundle:true,minify:true,sourcemap:false,outdir:path.join(target,'assets'),entryNames:'app-[hash]',jsx:'automatic',loader:{'.woff2':'file'},assetNames:'font-[hash]',publicPath:'/assets',define:{'process.env.NODE_ENV':'"production"'},metafile:true,plugins:[htmlPlugin]};
if(process.argv.includes('--watch')){const context=await esbuild.context(options);await context.watch();console.log('Watching React source. Run ASP.NET at http://localhost:5080');}
else{await esbuild.build(options);console.log('React production build complete with versioned assets.');}
