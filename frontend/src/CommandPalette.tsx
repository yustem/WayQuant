import {useEffect, useId, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Search, X, Layers, Server, AlertTriangle, Sliders, BarChart2, Shield, FileText, Code, LayoutList, ArrowUpRight} from 'lucide-react';
import {SearchEntry, SearchCategory, searchCopy} from './searchIndex';
import './commandPalette.css';

const icons = {modules:Layers, assets:Server, threats:AlertTriangle, parameters:Sliders, metrics:BarChart2, controls:Shield, sections:LayoutList, reports:FileText, architecture:Code};
const normalize = (text: string) => text.normalize('NFKC').toLocaleLowerCase();

export function CommandPalette({lang, entries, onNavigate}: {lang: string; entries: SearchEntry[]; onNavigate:(entry:SearchEntry)=>void}) {
  const copy = searchCopy[lang];
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const shortcut = /Mac|iPhone|iPad/.test(navigator.platform) ? '⌘ K' : 'Ctrl K';
  const categories = Object.keys(copy.categories) as SearchCategory[];
  const results = useMemo(() => {
    const terms = normalize(query.trim()).split(/\s+/).filter(Boolean);
    return (Object.keys(searchCopy[lang].categories) as SearchCategory[]).flatMap(category => entries.filter(entry => entry.category === category && terms.every(term => normalize(`${entry.label} ${entry.keywords || ''} ${searchCopy[lang].categories[category]}`).includes(term))));
  }, [entries, query, lang]);
  const selected = Math.min(active, Math.max(0, results.length - 1));

  const close = () => {
    dialog.current?.close();
    setOpen(false);
    if (opener.current?.isConnected) opener.current.focus({preventScroll:true});
  };
  const start = () => {
    opener.current = document.activeElement as HTMLElement;
    setQuery('');setActive(0);setOpen(true);
  };
  const choose = (entry: SearchEntry) => {
    if (entry.unavailable) return;
    close();
    onNavigate(entry);
  };
  useEffect(() => {
    if (open) {
      dialog.current?.showModal();
      input.current?.focus({preventScroll:true});
    }
  }, [open]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        if (open) close(); else start();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => document.removeEventListener('keydown', keyboard);
  }, [open]);
  useEffect(() => {
    const element = document.getElementById(`${id}-option-${selected}`);
    if (!open || !element || !list.current) return;
    const row = element.getBoundingClientRect(), bounds = list.current.getBoundingClientRect();
    if (row.top < bounds.top) list.current.scrollTop -= bounds.top - row.top;
    else if (row.bottom > bounds.bottom) list.current.scrollTop += row.bottom - bounds.bottom;
  }, [open, selected, query]);

  return <>
    <div className="command-trigger-wrap">
      <button type="button" className="command-trigger" onClick={start} aria-haspopup="dialog" aria-expanded={open} aria-controls={`${id}-dialog`} aria-label={copy.trigger} aria-keyshortcuts="Control+k Meta+k">
        <Search size={15} aria-hidden="true"/><span>{copy.trigger}</span>
      </button>
      <kbd className="command-shortcut" aria-hidden="true">{shortcut}</kbd>
    </div>
    {createPortal(<dialog ref={dialog} id={`${id}-dialog`} className="command-palette" aria-labelledby={`${id}-title`}
      onCancel={event=>{event.preventDefault();close();}}
      onClick={event=>{
        if(event.target!==event.currentTarget)return;
        const box=event.currentTarget.getBoundingClientRect();
        if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)close();
      }}>
      <div className="command-heading"><h2 id={`${id}-title`}><label htmlFor={`${id}-query`}>{copy.title}</label></h2><button type="button" onClick={close} aria-label={copy.close}><X size={18}/></button></div>
      <div className="command-input-wrap"><Search size={20} aria-hidden="true"/>
        <input ref={input} id={`${id}-query`} type="text" role="combobox" aria-label={copy.title} placeholder={copy.placeholder}
          value={query} onChange={event=>{setQuery(event.target.value);setActive(0);}}
          aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-results`}
          aria-activedescendant={open&&results.length?`${id}-option-${selected}`:undefined}
          onKeyDown={event=>{
            if(event.key==='ArrowDown'||event.key==='ArrowUp') {
              event.preventDefault();
              if(results.length)setActive((selected+(event.key==='ArrowDown'?1:-1)+results.length)%results.length);
            }else if(event.key==='Enter'&&results[selected]) {event.preventDefault();choose(results[selected]);}
          }}/>
      </div>
      <div className="command-live" role="status" aria-live="polite">{copy.count}: {results.length}</div>
      <div ref={list} className="command-results" id={`${id}-results`} role="listbox" aria-label={copy.title}>
        {categories.map(category=>{
          const grouped=results.filter(entry=>entry.category===category);
          if(!grouped.length)return null;
          const Icon=icons[category];
          return <div role="group" key={category} aria-labelledby={`${id}-category-${category}`}>
            <h3 id={`${id}-category-${category}`}>{copy.categories[category]}</h3>
            {grouped.map(entry=>{
              const index=results.indexOf(entry);
              return <div key={entry.id} id={`${id}-option-${index}`} role="option" aria-selected={selected===index}
                aria-disabled={entry.unavailable||undefined} className="command-result" data-command-id={entry.id} data-command-target={entry.selector}
                onPointerMove={()=>setActive(index)} onPointerDown={event=>event.preventDefault()} onClick={()=>choose(entry)}>
                <Icon size={18} aria-hidden="true"/><div><span>{entry.label}</span>
                  {(entry.review||entry.unavailable)&&<small>{entry.unavailable?copy.unavailable:copy.review}</small>}
                </div><ArrowUpRight size={14} aria-hidden="true"/>
              </div>;
            })}
          </div>;
        })}
      </div>
      {!results.length&&<div className="command-empty"><Search size={24} aria-hidden="true"/><p>{copy.empty}</p><small>{copy.emptyHint}</small></div>}
      <div className="command-footer"><span><kbd>↑ ↓</kbd> {copy.navigate}</span><span><kbd>Enter</kbd> {copy.select}</span><span><kbd>Esc</kbd> {copy.dismiss}</span></div>
    </dialog>,document.body)}
  </>;
}
