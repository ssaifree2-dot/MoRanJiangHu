import React from 'react';
import { recordDiagnosticLog } from '../../services/diagnosticLog';

interface Props {
    children: React.ReactNode;
}

interface State {
    error: Error | null;
    copied: boolean;
}

class ErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null, copied: false };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        recordDiagnosticLog('error', ['React ErrorBoundary', error, info.componentStack]);
        console.error('Root render failed:', error, info);
    }

    handleCopy = async () => {
        if (!this.state.error) return;
        const text = [
            '应用界面加载失败',
            '',
            this.state.error.stack || this.state.error.message || '未知错误'
        ].join('\n');
        await navigator.clipboard?.writeText(text);
        this.setState({ copied: true });
        window.setTimeout(() => this.setState({ copied: false }), 1800);
    };

    render() {
        if (!this.state.error) {
            return this.props.children;
        }

        const message = this.state.error.message || '未知错误';
        const stack = this.state.error.stack || '';

        return (
            <div className="fixed inset-0 overflow-auto bg-[#050505] px-4 py-8 text-amber-100">
                <div className="mx-auto max-w-3xl rounded-2xl border border-amber-300/30 bg-stone-950/95 p-5 shadow-2xl">
                    <div className="text-xl font-bold text-amber-200">应用界面加载失败</div>
                    <p className="mt-3 text-sm leading-6 text-amber-100/85">
                        这通常是前端渲染时遇到了异常。请先刷新页面重试；如果仍然失败，把下面的错误信息发给维护人员即可定位。
                    </p>
                    <pre className="mt-4 max-h-[45vh] overflow-auto whitespace-pre-wrap break-words rounded-xl border border-amber-300/15 bg-black/45 p-4 text-xs leading-6 text-amber-50">
                        {stack || message}
                    </pre>
                    <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="mt-4 rounded-lg border border-amber-300/50 bg-amber-300/10 px-4 py-2 text-sm font-semibold text-amber-100 transition-colors hover:bg-amber-300/20"
                    >
                        刷新页面
                    </button>
                    <button
                        type="button"
                        onClick={this.handleCopy}
                        className="ml-2 mt-4 rounded-lg border border-sky-300/40 bg-sky-300/10 px-4 py-2 text-sm font-semibold text-sky-100 transition-colors hover:bg-sky-300/20"
                    >
                        {this.state.copied ? '已复制' : '复制错误'}
                    </button>
                </div>
            </div>
        );
    }
}

export default ErrorBoundary;
