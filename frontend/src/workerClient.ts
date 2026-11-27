export function runInWorker(input: unknown, signal: AbortSignal): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./simulation.worker.js', import.meta.url), {type: 'module'});
    const abort = () => { worker.terminate(); reject(new DOMException('Aborted', 'AbortError')); };
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, {once:true});
    const finish = () => { signal.removeEventListener('abort',abort); worker.terminate(); };
    worker.onmessage = ({data}) => { finish(); data.error ? reject(new Error(data.error)) : resolve(data); };
    worker.onerror = (e) => { finish(); reject(new Error(e.message)); };
    try { worker.postMessage(input); }
    catch (error) { finish(); reject(error); }
  });
}
