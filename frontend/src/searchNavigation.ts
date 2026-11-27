import {SearchEntry} from './searchIndex';

/** UI navigation only: never invoke a simulation or change scenario parameters. */
export async function navigateSearchResult(entry: SearchEntry, navigation: {
  setActiveTab:(value:string)=>void; setArchSection:(value:string)=>void;
}) {
  if (entry.unavailable) return;
  if (entry.module) navigation.setActiveTab(entry.module);
  if (entry.section) navigation.setArchSection(entry.section);
  const selector = entry.review ? `#${entry.review.id}` : entry.selector;
  let target: HTMLElement | null = null;
  for (let frame = 0; frame < 30; frame++) {
    await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
    target = selector ? document.querySelector<HTMLElement>(selector) : null;
    if (target) break;
  }
  target ??= document.querySelector<HTMLElement>('.workspace-content [role="status"], .workspace-content h1');
  if (!target) return;
  target.scrollIntoView({block:'center', inline:'nearest', behavior:'instant' as ScrollBehavior});
  const focusTarget = target.matches('input, button, select, textarea') ? target :
    target.querySelector<HTMLElement>('input:not([hidden]), button, select:not([hidden])') || target;
  if (!focusTarget.hasAttribute('tabindex') && !focusTarget.matches('input, button, select, textarea')) {
    focusTarget.tabIndex = -1;
    focusTarget.addEventListener('blur',()=>focusTarget.removeAttribute('tabindex'),{once:true});
  }
  focusTarget.focus({preventScroll:true});
  target.classList.add('search-target-highlight');
  const highlighted = target;
  window.setTimeout(()=>highlighted.classList.remove('search-target-highlight'),2200);
  if (entry.review) {
    target.dispatchEvent(new CustomEvent('wayquant:reveal-option',{detail:entry.review.value}));
  }
}
