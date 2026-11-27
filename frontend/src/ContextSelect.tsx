import React, {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {Check, ChevronDown} from 'lucide-react';

type Props = {
  id: string;
  value: string | number;
  onChange: React.ChangeEventHandler<HTMLSelectElement>;
  children: React.ReactNode;
};

/** Presentation adapter: the original controlled select owns values and change events. */
export function ContextSelect({id, value, onChange, children}: Props) {
  const options = React.Children.toArray(children).filter(React.isValidElement).map(child => {
    const props = (child as React.ReactElement<{value: string; children: string}>).props;
    return {value: String(props.value), label: String(props.children)};
  });
  const selected = Math.max(0, options.findIndex(option => option.value === String(value)));
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selected);
  const [position, setPosition] = useState({left: 0, top: 0, width: 0, maxHeight: 320, transform: ''});
  const trigger = useRef<HTMLButtonElement>(null);
  const native = useRef<HTMLSelectElement>(null);
  const popup = useRef<HTMLDivElement>(null);
  const anchor = useRef({top: 0, left: 0});
  const search = useRef({text: '', time: 0});

  const show = (index = selected) => {
    const rect = trigger.current!.getBoundingClientRect();
    anchor.current = {top: rect.top, left: rect.left};
    const labelWidth = Math.min(420, Math.max(...options.map(option => option.label.length)) * 7 + 52);
    const width = Math.min(Math.max(rect.width, labelWidth), window.innerWidth - 24);
    const below = window.innerHeight - rect.bottom - 20;
    const above = rect.top - 20;
    const upward = below < 200 && above > below;
    const maxHeight = Math.min(320, Math.max(80, upward ? above : below));
    setPosition({left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)),
      top: upward ? rect.top - 8 : rect.bottom + 8, width, maxHeight,
      transform: upward ? 'translateY(-100%)' : ''});
    setActive(index);
    setOpen(true);
  };

  const choose = (index: number) => {
    // Dispatch the same native change event consumed by the existing handler.
    if (options[index].value !== String(value) && native.current) {
      native.current.value = options[index].value;
      native.current.dispatchEvent(new Event('change', {bubbles: true}));
    }
    setOpen(false);
    trigger.current?.focus({preventScroll: true});
  };

  useEffect(() => {
    const button = trigger.current;
    const reveal = (event: Event) => {
      const index = options.findIndex(option=>option.value === (event as CustomEvent<string>).detail);
      if (index >= 0) {
        button?.focus({preventScroll:true});
        show(index); // Highlight for review; committing still uses the original change handler.
      }
    };
    button?.addEventListener('wayquant:reveal-option',reveal);
    return ()=>button?.removeEventListener('wayquant:reveal-option',reveal);
  });

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!trigger.current?.contains(event.target as Node) && !popup.current?.contains(event.target as Node)) setOpen(false);
    };
    const dismiss = (event: Event) => {
      if (event.target instanceof Node && popup.current?.contains(event.target)) return;
      const rect = trigger.current?.getBoundingClientRect();
      // A queued focus/scroll event may precede opening; dismiss only if the
      // anchor actually moved, keeping freshly opened menus from disappearing.
      if (event.type === 'resize' || !rect || Math.abs(rect.top - anchor.current.top) > 0.5 || Math.abs(rect.left - anchor.current.left) > 0.5) setOpen(false);
    };
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [open]);

  useEffect(() => {
    const menu = popup.current;
    const option = menu?.querySelector<HTMLElement>(`[data-index="${active}"]`);
    if (!open || !menu || !option) return;
    // Reveal the active option without scrolling the sidebar or document.
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < menu.scrollTop) menu.scrollTop = top;
    else if (bottom > menu.scrollTop + menu.clientHeight) menu.scrollTop = bottom - menu.clientHeight;
  }, [open, active]);

  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const {key} = event;
    if (key === 'Tab') { setOpen(false); return; }
    if (key === 'Escape') { event.preventDefault(); setOpen(false); return; }
    if (key === 'Enter' || key === ' ') {
      event.preventDefault();
      if (open) choose(active); else show();
      return;
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(key)) {
      event.preventDefault();
      const next = key === 'Home' ? 0 : key === 'End' ? options.length - 1 :
        Math.max(0, Math.min(options.length - 1, (open ? active : selected) + (key === 'ArrowDown' ? 1 : -1)));
      if (open) setActive(next); else show(next);
      return;
    }
    if (key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      const now = Date.now();
      const text = now - search.current.time < 700 ? search.current.text + key : key;
      search.current = {text, time: now};
      const index = options.findIndex(option => option.label.toLocaleLowerCase().startsWith(text.toLocaleLowerCase()));
      if (index >= 0) { if (open) setActive(index); else show(index); }
    }
  };

  return <>
    <select ref={native} value={value} onChange={onChange} hidden aria-hidden="true" tabIndex={-1}>{children}</select>
    <button id={id} ref={trigger} type="button" role="combobox" className="context-select-trigger" title={options[selected]?.label}
      aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} aria-haspopup="listbox"
      aria-controls={open ? `${id}-listbox` : undefined} aria-activedescendant={open ? `${id}-option-${active}` : undefined}
      onClick={() => open ? setOpen(false) : show()} onKeyDown={keyboard} onBlur={() => setOpen(false)}>
      <span id={`${id}-value`}>{options[selected]?.label}</span><ChevronDown size={16} aria-hidden="true" />
    </button>
    {open && createPortal(<div ref={popup} id={`${id}-listbox`} role="listbox" aria-labelledby={`${id}-label`}
      className="context-select-menu" style={position}>
      {options.map((option, index) => <div key={option.value} id={`${id}-option-${index}`} role="option"
        aria-selected={option.value === String(value)} data-index={index} data-active={index === active}
        className="context-select-option" onPointerMove={() => setActive(index)}
        onPointerDown={event => event.preventDefault()} onClick={() => choose(index)}>
        <span>{option.label}</span>{option.value === String(value) && <Check size={16} aria-hidden="true" />}
      </div>)}
    </div>, document.body)}
  </>;
}
