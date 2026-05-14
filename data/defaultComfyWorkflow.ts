const 默认NunchakuQwenImageComfyUI工作流 = {
  "1": {
    "inputs": {
      "vae_name": "qwen_image_vae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "加载VAE"
    }
  },
  "2": {
    "inputs": {
      "samples": [
        "12",
        0
      ],
      "vae": [
        "1",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE解码"
    }
  },
  "3": {
    "inputs": {
      "filename_prefix": "nunchaku-qwen-image/moranjianghu",
      "images": [
        "2",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "保存图像"
    }
  },
  "4": {
    "inputs": {
      "width": "__WIDTH__",
      "height": "__HEIGHT__",
      "batch_size": 1
    },
    "class_type": "EmptySD3LatentImage",
    "_meta": {
      "title": "空Latent图像（SD3）"
    }
  },
  "5": {
    "inputs": {
      "text": "__NEGATIVE_PROMPT__",
      "clip": [
        "7",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Negative Prompt)"
    }
  },
  "7": {
    "inputs": {
      "clip_name": "qwen_2.5_vl_7b_fp8_scaled.safetensors",
      "type": "qwen_image",
      "device": "default"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "加载CLIP"
    }
  },
  "8": {
    "inputs": {
      "shift": 3.1,
      "model": [
        "13",
        0
      ]
    },
    "class_type": "ModelSamplingAuraFlow",
    "_meta": {
      "title": "采样算法（AuraFlow）"
    }
  },
  "9": {
    "inputs": {
      "text": "__PROMPT__",
      "clip": [
        "7",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP Text Encode (Positive Prompt)"
    }
  },
  "12": {
    "inputs": {
      "seed": "__SEED__",
      "steps": "__STEPS__",
      "cfg": "__CFG__",
      "sampler_name": "__SAMPLER__",
      "scheduler": "__SCHEDULER__",
      "denoise": 1,
      "model": [
        "8",
        0
      ],
      "positive": [
        "9",
        0
      ],
      "negative": [
        "5",
        0
      ],
      "latent_image": [
        "4",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "K采样器"
    }
  },
  "13": {
    "inputs": {
      "model_name": "svdq-int4_r32-qwen-image.safetensors",
      "cpu_offload": "auto",
      "num_blocks_on_gpu": 1,
      "use_pin_memory": "disable"
    },
    "class_type": "NunchakuQwenImageDiTLoader",
    "_meta": {
      "title": "Nunchaku Qwen-Image DiT Loader"
    }
  }
};

const 默认ZImageTurboNSFWComfyUI工作流 = {
  "9": {
    "inputs": {
      "filename_prefix": "z-image/z",
      "images": [
        "43",
        0
      ]
    },
    "class_type": "SaveImage",
    "_meta": {
      "title": "保存图像"
    }
  },
  "39": {
    "inputs": {
      "clip_name": "qwen_3_4b.safetensors",
      "type": "lumina2",
      "device": "default"
    },
    "class_type": "CLIPLoader",
    "_meta": {
      "title": "加载CLIP"
    }
  },
  "40": {
    "inputs": {
      "vae_name": "ae.safetensors"
    },
    "class_type": "VAELoader",
    "_meta": {
      "title": "加载VAE"
    }
  },
  "41": {
    "inputs": {
      "width": "__WIDTH__",
      "height": "__HEIGHT__",
      "batch_size": 1
    },
    "class_type": "EmptySD3LatentImage",
    "_meta": {
      "title": "空Latent图像（SD3）"
    }
  },
  "42": {
    "inputs": {
      "conditioning": [
        "45",
        0
      ]
    },
    "class_type": "ConditioningZeroOut",
    "_meta": {
      "title": "条件零化"
    }
  },
  "43": {
    "inputs": {
      "samples": [
        "44",
        0
      ],
      "vae": [
        "40",
        0
      ]
    },
    "class_type": "VAEDecode",
    "_meta": {
      "title": "VAE解码"
    }
  },
  "44": {
    "inputs": {
      "seed": "__SEED__",
      "steps": "__STEPS__",
      "cfg": "__CFG__",
      "sampler_name": "__SAMPLER__",
      "scheduler": "__SCHEDULER__",
      "denoise": 1,
      "model": [
        "47",
        0
      ],
      "positive": [
        "45",
        0
      ],
      "negative": [
        "42",
        0
      ],
      "latent_image": [
        "41",
        0
      ]
    },
    "class_type": "KSampler",
    "_meta": {
      "title": "K采样器"
    }
  },
  "45": {
    "inputs": {
      "text": "__PROMPT__",
      "clip": [
        "39",
        0
      ]
    },
    "class_type": "CLIPTextEncode",
    "_meta": {
      "title": "CLIP文本编码"
    }
  },
  "46": {
    "inputs": {
      "unet_name": "mPMix_NSFW_V9_fp8.safetensors",
      "weight_dtype": "default"
    },
    "class_type": "UNETLoader",
    "_meta": {
      "title": "UNet加载器"
    }
  },
  "47": {
    "inputs": {
      "shift": 3,
      "model": [
        "46",
        0
      ]
    },
    "class_type": "ModelSamplingAuraFlow",
    "_meta": {
      "title": "采样算法（AuraFlow）"
    }
  },
  "49": {
    "inputs": {
      "unet_name": "qwen-image-2512-Q6_K.gguf"
    },
    "class_type": "UnetLoaderGGUF",
    "_meta": {
      "title": "Unet Loader (GGUF)"
    }
  }
};

export const 默认ComfyUI工作流JSON = JSON.stringify(默认NunchakuQwenImageComfyUI工作流, null, 2);
export const 默认NSFWComfyUI工作流JSON = JSON.stringify(默认ZImageTurboNSFWComfyUI工作流, null, 2);
