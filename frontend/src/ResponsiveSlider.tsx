import {memo, useEffect, useState, useRef, useId} from 'react';
type Props = {id?:string; label:string; value:number; min:number; max:number; step:number; percent?:boolean; onCommit:(v:number)=>void; onDraft:(active:boolean)=>void};
export const ResponsiveSlider = memo(function ResponsiveSlider({id,label,value,min,max,step,percent,onCommit,onDraft}:Props) {
  const inputId = useId();
  const [draft,setDraft] = useState(value);
  useEffect(()=>setDraft(value),[value]);
  const latest = useRef(value);
  useEffect(()=>{latest.current=value;},[value]);
  const commit = () => { if (latest.current !== value) onCommit(latest.current); onDraft(false); };
  const adjustmentKeys = ['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End','PageUp','PageDown'];
  return <div id={id} className="slider-field"><div className="flex justify-between gap-3 text-xs mb-1"><label htmlFor={inputId} className="text-slate-300">{label}</label><span className="font-mono shrink-0">{percent ? `${Math.round(draft*100)}%` : draft}</span></div>
    <input id={inputId} aria-label={label} type="range" min={min} max={max} step={step} value={draft} className="w-full accent-blue-500 cursor-pointer"
      onChange={e=>{latest.current=Number(e.currentTarget.value);setDraft(latest.current);}}
      onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);onDraft(true);}}
      onKeyDown={e=>{if(adjustmentKeys.includes(e.key))onDraft(true);}}
      onPointerUp={commit} onKeyUp={e=>{if(adjustmentKeys.includes(e.key))commit();}} onBlur={commit}
      onPointerCancel={()=>{latest.current=value;setDraft(value);onDraft(false);}}/></div>;
});
