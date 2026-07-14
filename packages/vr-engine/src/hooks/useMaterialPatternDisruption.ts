import { Material, RepeatWrapping, Texture } from "three";
import { useLayoutEffect } from "react";
import { useTexture } from "@react-three/drei";

const inject_shader = (
    noise_map: Texture,
    noise_scale: number = 0.05,
    contrast: number = 1.0,
    brightness: number = 0.0
) => (shader: any) => {
    shader.uniforms.tNoise = { value: noise_map }
    shader.uniforms.uNoiseScale = { value: noise_scale }
    shader.uniforms.uNoiseContrast = { value: contrast }
    shader.uniforms.uNoiseBrightness = { value: brightness }

    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <common>",
        `
        #include <common>
        uniform sampler2D tNoise;
        uniform float uNoiseScale;
        uniform float uNoiseContrast;
        uniform float uNoiseBrightness;
        `
    )

    shader.fragmentShader = shader.fragmentShader.replace(
        "#include <map_fragment>",
        `
        #ifdef USE_MAP
            vec2 uvA = vMapUv;
            
            float angle = 0.785; 
            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            vec2 uvB = rot * (vMapUv - 0.5) + 0.5; 
            uvB *= 0.675; 

            // Sample raw gradient noise
            float rawNoise = texture2D(tNoise, vMapUv * uNoiseScale).r;

            // Soften / remap contrast and brightness (mimicking a Color Ramp)
            float noiseMask = clamp((rawNoise + uNoiseBrightness - 0.5) * uNoiseContrast + 0.5, 0.0, 1.0);

            vec4 texColorA = texture2D(map, uvA);
            vec4 texColorB = texture2D(map, uvB);
            
            diffuseColor *= mix(texColorA, texColorB, noiseMask);
        #endif
        `
    )
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

                material.onBeforeCompile = inject_shader(noise_map, noise_scale, contrast, brightness);
                (material as any).customProgramCacheKey = () => `variance-${material.uuid}-${noise_scale}-${contrast}-${brightness}`;
                material.needsUpdate = true;
            }
        })
    }, [materials, noise_map]);
}
