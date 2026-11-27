export const languageKey = 'wayquant.language';
export function initialLanguage(): 'en'|'ru' {
  try { return localStorage.getItem(languageKey) === 'ru' ? 'ru' : 'en'; } catch { return 'en'; }
}
export function persistLanguage(lang: string) { try { localStorage.setItem(languageKey,lang); } catch { /* Storage may be disabled; language still works for this session. */ } }
export const localeFor = (lang: string) => lang === 'ru' ? 'ru-RU' : 'en-US';
export const fraction = (value:number,lang:string,digits:number) => new Intl.NumberFormat(localeFor(lang),{minimumFractionDigits:digits,maximumFractionDigits:digits}).format(value);
export function displayError(value: unknown, lang: string): string {
 const message=String(value || '');
 const ru=lang==='ru';
 if (/30 seconds|30 секунд/.test(message)) return ru?'Расчёт не завершился за 30 секунд. Проверьте соединение и повторите попытку.':'Calculation did not finish within 30 seconds. Check the connection and retry.';
 if (/Invalid API response|Некорректный ответ API|invalid.*result|invalid governance/i.test(message)) return ru?'Некорректный ответ API. Результат не принят; повторите расчёт.':'Invalid API response. Results were not accepted; retry the calculation.';
 if (/busy|429/i.test(message)) return ru?'Вычислительное ядро занято. Повторите попытку позже.':'The simulation engine is busy. Please retry shortly.';
 if (/network|connection|timeout/i.test(message)) return ru?'Не удалось установить соединение. Проверьте подключение и повторите расчёт.':'Connection failed. Check your connection and retry.';
 if (/SLM|sigma|floor|P95|lognormal/i.test(message)) return ru?'Проверьте вторичный ущерб: нижняя граница < мода < P95 либо все три значения равны; σ ≤ 2,5.':'Check secondary loss: floor < mode < P95, or all three values equal; σ ≤ 2.5.';
 if (/budget|supported|iterations|seed|must|greater|less|finite|Invalid|validation|Input should|estimate|_min|_mode|_max/i.test(message)) return ru?'Проверьте ввод: допустимые числа, порядок оценок, вероятность 0–1, целые итерации и seed в допустимых пределах. Уменьшите число итераций или частоту при превышении бюджета событий.':'Check valid numbers, ordered estimates, probability 0–1, integer iterations and seed within supported limits. Reduce iterations or frequency if the event budget is exceeded.';
 return ru?'Расчёт завершился ошибкой. Проверьте параметры и доступность сервера, затем повторите попытку.':'Calculation failed. Check the inputs and server availability, then retry.';
}
