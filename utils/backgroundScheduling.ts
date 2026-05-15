export const 后台让出主线程 = async (timeout = 16): Promise<void> => {
    if (typeof window === 'undefined') {
        await new Promise<void>(resolve => setTimeout(resolve, 0));
        return;
    }

    const requestIdle = window.requestIdleCallback;
    if (typeof requestIdle === 'function') {
        await new Promise<void>(resolve => {
            requestIdle(() => resolve(), { timeout: Math.max(1, timeout) });
        });
        return;
    }

    await new Promise<void>(resolve => setTimeout(resolve, 0));
};

export const 后台分段执行 = async <T>(
    task: () => T,
    options?: { before?: boolean; after?: boolean; timeout?: number }
): Promise<T> => {
    if (options?.before !== false) {
        await 后台让出主线程(options?.timeout);
    }
    const result = task();
    if (options?.after !== false) {
        await 后台让出主线程(options?.timeout);
    }
    return result;
};
