import { describe, expect, it } from 'vitest';
import { 规范化ComfyUI工作流JSON } from '../services/ai/comfyWorkflowTools';

describe('规范化ComfyUI工作流JSON', () => {
    it('replaces common ComfyUI API workflow inputs with placeholders', () => {
        const normalized = 规范化ComfyUI工作流JSON({
            '1': {
                class_type: 'CLIPTextEncode',
                _meta: { title: 'Positive Prompt' },
                inputs: { text: 'masterpiece, wuxia hero' }
            },
            '2': {
                class_type: 'CLIPTextEncode',
                _meta: { title: 'Negative Prompt' },
                inputs: { text: 'lowres, bad anatomy' }
            },
            '3': {
                class_type: 'EmptyLatentImage',
                inputs: { width: 832, height: 1216 }
            },
            '4': {
                class_type: 'KSampler',
                inputs: {
                    seed: 123,
                    steps: 28,
                    cfg: 7,
                    sampler_name: 'euler',
                    scheduler: 'normal'
                }
            }
        });

        const workflow = JSON.parse(normalized);
        expect(workflow['1'].inputs.text).toBe('__PROMPT__');
        expect(workflow['2'].inputs.text).toBe('__NEGATIVE_PROMPT__');
        expect(workflow['3'].inputs.width).toBe('__WIDTH__');
        expect(workflow['3'].inputs.height).toBe('__HEIGHT__');
        expect(workflow['4'].inputs.seed).toBe('__SEED__');
        expect(workflow['4'].inputs.steps).toBe('__STEPS__');
        expect(workflow['4'].inputs.cfg).toBe('__CFG__');
        expect(workflow['4'].inputs.sampler_name).toBe('__SAMPLER__');
        expect(workflow['4'].inputs.scheduler).toBe('__SCHEDULER__');
    });

    it('falls back to the first text node when a positive prompt is not obvious', () => {
        const workflow = JSON.parse(规范化ComfyUI工作流JSON({
            '1': {
                class_type: 'CLIPTextEncode',
                inputs: { text: 'quiet bamboo grove' }
            }
        }));

        expect(workflow['1'].inputs.text).toBe('__PROMPT__');
    });

    it('rejects non-object workflow payloads', () => {
        expect(() => 规范化ComfyUI工作流JSON([])).toThrow('必须是对象');
    });
});
