const 判断ComfyUI正向文本节点 = (node: any): boolean => {
    const title = String(node?._meta?.title || node?.title || '').toLowerCase();
    const text = String(node?.inputs?.text || '').toLowerCase();
    return /positive|prompt|正向|正面|提示词/.test(title)
        || (!/negative|负向|负面|反向/.test(title) && !/lowres|bad anatomy|worst quality|watermark|nsfw/.test(text));
};

const 判断ComfyUI负向文本节点 = (node: any): boolean => {
    const title = String(node?._meta?.title || node?.title || '').toLowerCase();
    const text = String(node?.inputs?.text || '').toLowerCase();
    return /negative|负向|负面|反向/.test(title)
        || /lowres|bad anatomy|worst quality|watermark|bad hands|blurry/.test(text);
};

export const 规范化ComfyUI工作流JSON = (raw: unknown): string => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new Error('ComfyUI API workflow JSON 必须是对象');
    }
    const workflow = JSON.parse(JSON.stringify(raw)) as Record<string, any>;
    const nodes = Object.entries(workflow).filter(([, node]) => node && typeof node === 'object');
    let positiveDone = false;
    let negativeDone = false;

    nodes.forEach(([, node]) => {
        const classType = String(node.class_type || '').toLowerCase();
        const inputs = node.inputs && typeof node.inputs === 'object' ? node.inputs : null;
        if (!inputs) return;

        if (typeof inputs.text === 'string' && /cliptextencode|textencode|prompt/.test(classType)) {
            if (!negativeDone && 判断ComfyUI负向文本节点(node)) {
                inputs.text = '__NEGATIVE_PROMPT__';
                negativeDone = true;
            } else if (!positiveDone && 判断ComfyUI正向文本节点(node)) {
                inputs.text = '__PROMPT__';
                positiveDone = true;
            }
        }

        if (/emptylatentimage|latent/.test(classType)) {
            if ('width' in inputs) inputs.width = '__WIDTH__';
            if ('height' in inputs) inputs.height = '__HEIGHT__';
        }

        if (/ksampler|sampler/.test(classType)) {
            if ('seed' in inputs) inputs.seed = '__SEED__';
            if ('steps' in inputs) inputs.steps = '__STEPS__';
            if ('cfg' in inputs) inputs.cfg = '__CFG__';
            if ('sampler_name' in inputs) inputs.sampler_name = '__SAMPLER__';
            if ('scheduler' in inputs) inputs.scheduler = '__SCHEDULER__';
        }
    });

    if (!positiveDone) {
        const textNode = nodes.find(([, node]) => typeof node?.inputs?.text === 'string');
        if (textNode) textNode[1].inputs.text = '__PROMPT__';
    }

    return JSON.stringify(workflow, null, 2);
};
