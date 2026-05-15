type PendingTask = {
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
};

let worker: Worker | null = null;
let nextTaskId = 1;
const pendingTasks = new Map<number, PendingTask>();

const 获取后台Worker = (): Worker | null => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return null;
    if (worker) return worker;
    worker = new Worker(new URL('./gameHeavy.worker.ts', import.meta.url), { type: 'module' });
    worker.onmessage = (event: MessageEvent<any>) => {
        const { id, ok, result, error } = event.data || {};
        const pending = pendingTasks.get(id);
        if (!pending) return;
        pendingTasks.delete(id);
        if (ok) pending.resolve(result);
        else pending.reject(new Error(error || '后台任务失败'));
    };
    worker.onerror = (event) => {
        const error = new Error(event.message || '后台 Worker 执行失败');
        pendingTasks.forEach((pending) => pending.reject(error));
        pendingTasks.clear();
        worker?.terminate();
        worker = null;
    };
    return worker;
};

const 投递后台任务 = <T>(type: string, payload: any): Promise<T> => {
    const activeWorker = 获取后台Worker();
    if (!activeWorker) {
        return Promise.reject(new Error('当前环境不支持 Web Worker'));
    }
    const id = nextTaskId++;
    return new Promise<T>((resolve, reject) => {
        pendingTasks.set(id, { resolve, reject });
        activeWorker.postMessage({ id, type, payload });
    });
};

export const 执行游戏后台重计算 = async <T>(
    type: string,
    payload: any,
    fallback: () => T | Promise<T>
): Promise<T> => {
    try {
        return await 投递后台任务<T>(type, payload);
    } catch (error) {
        console.warn('[后台重计算] Web Worker 不可用，已回退到主线程分段执行', {
            type,
            message: error instanceof Error ? error.message : String(error || '')
        });
        return await fallback();
    }
};
