import { describe, expect, it } from 'vitest';
import {
    判断疑似网络或跨域错误,
    构建ComfyUI连接失败提示,
    构建通用生图连接失败提示
} from '../services/ai/imageGenerationDiagnostics';

describe('imageGenerationDiagnostics', () => {
    it('recognizes common browser fetch and CORS failures', () => {
        expect(判断疑似网络或跨域错误(new TypeError('Failed to fetch'))).toBe(true);
        expect(判断疑似网络或跨域错误(new Error('blocked by CORS policy'))).toBe(true);
        expect(判断疑似网络或跨域错误(new Error('validation failed'))).toBe(false);
    });

    it('builds actionable ComfyUI connection guidance', () => {
        const message = 构建ComfyUI连接失败提示('https://cnb-demo-001.cnb.space/', new Error('Failed to fetch'));

        expect(message).toContain('ComfyUI 连接失败');
        expect(message).toContain('CNB 的 VS Code 页面保持打开');
        expect(message).toContain('--enable-cors-header "*"');
        expect(message).toContain('https://cnb-xxxx-xxxx-001.cnb.space/?folder=/workspace');
        expect(message).toContain('原始错误：Failed to fetch');
    });

    it('uses backend-specific wording for SD WebUI', () => {
        const message = 构建通用生图连接失败提示('sd_webui', 'http://127.0.0.1:7860', new Error('NetworkError'));

        expect(message).toContain('Stable Diffusion WebUI 连接失败');
        expect(message).toContain('API/CORS');
        expect(message).toContain('NetworkError');
    });
});
