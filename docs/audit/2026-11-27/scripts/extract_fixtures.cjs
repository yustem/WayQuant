// Evaluate only the existing literal UI dictionaries/preset factory, not the application.
const ts=require('../../../../frontend/node_modules/typescript');
const fs=require('fs'),path=require('path');
const root=path.resolve(__dirname,'../../../..');
function declarations(file,names){
 const ast=ts.createSourceFile(file,fs.readFileSync(path.join(root,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),result=[];
 function visit(n){if(ts.isVariableDeclaration(n)&&names.includes(n.name.getText(ast)))result.push(`const ${n.name.getText(ast)} = ${n.initializer.getText(ast)};`);ts.forEachChild(n,visit);}visit(ast);return result.join('\n');
}
const app=declarations('frontend/src/App.tsx',['I18N','makePreset','ASSET_PRESETS','THREAT_CONTROL_KEYS']);
const controls=declarations('frontend/src/data/threatControls.ts',['THREAT_CONTROLS_MAP']);
const data=new Function(`${app}\n${controls}\nreturn {i18n:I18N,presets:ASSET_PRESETS,controlKeys:THREAT_CONTROL_KEYS,controls:THREAT_CONTROLS_MAP};`)();
const out=path.join(root,'docs/audit/2026-11-27/evidence/ui-fixtures.json');fs.writeFileSync(out,JSON.stringify(data,null,2));console.log(out);
