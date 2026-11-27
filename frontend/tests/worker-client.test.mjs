import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

test('audit: worker is terminated if postMessage cannot clone input',async()=>{
 let terminated=0;
 class FakeWorker {postMessage(){throw new DOMException('Uncloneable payload','DataCloneError');}terminate(){terminated++;}}
 const file=new URL('../src/workerClient.ts',import.meta.url);
 const source=fs.readFileSync(file,'utf8').replaceAll('import.meta.url',JSON.stringify(file.href));
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const context={exports:{},Worker:FakeWorker,URL,DOMException};vm.runInNewContext(compiled,context);
 await assert.rejects(context.exports.runInWorker({invalid:()=>{}},new AbortController().signal),/Uncloneable/);
 assert.equal(terminated,1);
});

for(const event of ['message-error','runtime-error','abort','already-aborted'])test(`audit: worker cleanup on ${event}`,async()=>{
 let terminated=0,instance;
 class FakeWorker {constructor(){instance=this;}postMessage(){}terminate(){terminated++;}}
 const file=new URL('../src/workerClient.ts',import.meta.url);
 const source=fs.readFileSync(file,'utf8').replaceAll('import.meta.url',JSON.stringify(file.href));
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020}}).outputText;
 const context={exports:{},Worker:FakeWorker,URL,DOMException};vm.runInNewContext(compiled,context);
 const controller=new AbortController();if(event==='already-aborted')controller.abort();
 const promise=context.exports.runInWorker({},controller.signal);
 if(event==='message-error')instance.onmessage({data:{error:'Injected calculation failure'}});
 if(event==='runtime-error')instance.onerror({message:'Injected worker crash'});
 if(event==='abort')controller.abort();
 await assert.rejects(promise,/Injected|Aborted/);assert.equal(terminated,1);
});
