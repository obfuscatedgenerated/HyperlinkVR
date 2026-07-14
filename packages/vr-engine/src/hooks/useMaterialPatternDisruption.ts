import { Material, RepeatWrapping, Texture } from "three";
import { useLayoutEffect } from "react";
import { useTexture } from "@react-three/drei";

const inject_shader = (
    noise_map: Texture,
    noise_scale: number = 0.05,
    contrast: number = 1.0,
    brightness: number = 0.0,
    plank_mode: boolean = false,
    planks_vertical: boolean = false
) => (shader: any) => {
    shader.uniforms.tNoise = { value: noise_map }
    shader.uniforms.uNoiseScale = { value: noise_scale }
    shader.uniforms.uNoiseContrast = { value: contrast }
    shader.uniforms.uNoiseBrightness = { value: brightness }
    shader.uniforms.uNoiseAxis = { value: planks_vertical ? 1.0 : 0.0 }

    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform sampler2D tNoise;
        uniform float uNoiseScale;
        uniform float uNoiseContrast;
        uniform float uNoiseBrightness;
        uniform float uNoiseAxis;
        `
    )

    const map_replacement = plank_mode ? `
        #ifdef USE_MAP
            vec2 uvA = vMapUv;
            
            float rawNoise = texture2D(tNoise, vMapUv * uNoiseScale).r;
            float noiseMask = clamp((rawNoise + uNoiseBrightness - 0.5) * uNoiseContrast + 0.5, 0.0, 1.0);

            // Dynamically blend offset direction based on uNoiseAxis uniform (0.0 for X, 1.0 for Y)
            vec2 slideDir = mix(vec2(1.0, 0.0), vec2(0.0, 1.0), uNoiseAxis);
            vec2 uvB = vMapUv + (slideDir * noiseMask * 0.2);

            vec4 texColorA = texture2D(map, uvA);
            vec4 texColorB = texture2D(map, uvB);
            
            diffuseColor *= mix(texColorA, texColorB, noiseMask);
        #endif
    ` : `
        #ifdef USE_MAP
            vec2 uvA = vMapUv;
            float angle = 0.785; 
            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            vec2 uvB = rot * (vMapUv - 0.5) + 0.5; 
            uvB *= 0.675; 

            float rawNoise = texture2D(tNoise, vMapUv * uNoiseScale).r;
            float noiseMask = clamp((rawNoise + uNoiseBrightness - 0.5) * uNoiseContrast + 0.5, 0.0, 1.0);

            vec4 texColorA = texture2D(map, uvA);
            vec4 texColorB = texture2D(map, uvB);
            
            diffuseColor *= mix(texColorA, texColorB, noiseMask);
        #endif
    `;

    shader.fragmentShader = shader.fragmentShader.replace("#include <map_fragment>", map_replacement);
}

const noise_map_url = new URL("../../assets/perlin_256.png", import.meta.url).href;

export const useMaterialPatternDisruptor = (materials: Record<string, Material> | undefined) => {
    const noise_map = useTexture(noise_map_url);

    useLayoutEffect(() => {
        if (!materials || !noise_map) return;

        noise_map.wrapS = RepeatWrapping;
        noise_map.wrapT = RepeatWrapping;

        Object.values(materials).forEach((material) => {
            const user_data = material.userData || {};
            const needs_disruption = user_data.disrupt_pattern === true || user_data.disrupt_pattern === 1;

            if (needs_disruption) {
                const noise_scale = typeof user_data.noise_scale === "number" ? user_data.noise_scale : 0.05;
                const contrast = typeof user_data.noise_contrast === "number" ? user_data.noise_contrast : 1.5;
                const brightness = typeof user_data.noise_brightness === "number" ? user_data.noise_brightness : 0.0;
                const plank_mode = user_data.plank_mode === true || user_data.plank_mode === 1;
                const planks_vertical = user_data.planks_vertical === true || user_data.planks_vertical === 1;

                material.onBeforeCompile = inject_shader(noise_map, noise_scale, contrast, brightness, plank_mode, planks_vertical);
                (material as any).customProgramCacheKey = () => `variance-${material.uuid}-${noise_scale}-${contrast}-${brightness}-${plank_mode}-${planks_vertical}`;
                material.needsUpdate = true;
            }
        })
    }, [materials, noise_map]);
}
