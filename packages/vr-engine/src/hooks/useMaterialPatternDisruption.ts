import { Material, RepeatWrapping, Texture } from "three";
import { useLayoutEffect } from "react";
import { useTexture } from "@react-three/drei";

const inject_shader = (
    noise_map: Texture,
    noise_scale: number = 0.05,
    contrast: number = 1.0,
    brightness: number = 0.0,
    offset_strength: number = 2.0,
    plank_mode: boolean = false,
    planks_vertical: boolean = false
) => (shader: any) => {
    shader.uniforms.tNoise = { value: noise_map };
    shader.uniforms.uNoiseScale = { value: noise_scale };
    shader.uniforms.uNoiseContrast = { value: contrast };
    shader.uniforms.uNoiseBrightness = { value: brightness };
    shader.uniforms.uOffsetStrength = { value: offset_strength };
    shader.uniforms.uPlankMode = { value: plank_mode ? 1.0 : 0.0 };
    shader.uniforms.uNoiseAxis = { value: planks_vertical ? 1.0 : 0.0 };

    shader.fragmentShader = shader.fragmentShader.replace(
        '#include <common>',
        `
        #include <common>
        uniform sampler2D tNoise;
        uniform float uNoiseScale;
        uniform float uNoiseContrast;
        uniform float uNoiseBrightness;
        uniform float uOffsetStrength;
        uniform float uPlankMode;
        uniform float uNoiseAxis;
        `
    )

    const map_replacement = `
    #ifdef USE_MAP
        // derivatives from the UNOFFSET uvs, or the gpu picks a blurry mip
        vec2 duv_dx = dFdx(vMapUv);
        vec2 duv_dy = dFdy(vMapUv);

        // two low-frequency noise samples: one per offset axis.
        // low frequency means whole regions shift together, which is what
        // actually destroys the grid. high frequency just smears.
        float noise_x = texture2D(tNoise, vMapUv * uNoiseScale).r;
        float noise_y = texture2D(tNoise, vMapUv * uNoiseScale + vec2(0.37, 0.71)).r;

        // offset must be large (whole tiles) and varying, not a fixed constant,
        // or the result is still periodic with the same period as the texture
        vec2 slide_dir = mix(vec2(1.0, 0.0), vec2(0.0, 1.0), uNoiseAxis);
        vec2 offset = uPlankMode > 0.5
            ? slide_dir * (noise_x - 0.5) * uOffsetStrength
            : (vec2(noise_x, noise_y) - 0.5) * uOffsetStrength;

        vec4 color_a = textureGrad(map, vMapUv, duv_dx, duv_dy);
        vec4 color_b = textureGrad(map, vMapUv + offset, duv_dx, duv_dy);

        // a third noise sample as the blend mask, decorrelated from the offsets,
        // so the blend seams don't line up with the offset regions
        float raw_mask = texture2D(tNoise, vMapUv * uNoiseScale * 1.7 + vec2(0.13, 0.59)).r;
        float mask = clamp((raw_mask + uNoiseBrightness - 0.5) * uNoiseContrast + 0.5, 0.0, 1.0);

        diffuseColor *= mix(color_a, color_b, mask);
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
                const noise_scale = typeof user_data.noise_scale === "number" ? user_data.noise_scale : 0.03;
                const contrast = typeof user_data.noise_contrast === "number" ? user_data.noise_contrast : 1.5;
                const brightness = typeof user_data.noise_brightness === "number" ? user_data.noise_brightness : 0.0;
                const offset_strength = typeof user_data.offset_strength === "number" ? user_data.offset_strength : 2.0;
                const plank_mode = user_data.plank_mode === true || user_data.plank_mode === 1;
                const planks_vertical = user_data.planks_vertical === true || user_data.planks_vertical === 1;

                material.onBeforeCompile = inject_shader(noise_map, noise_scale, contrast, brightness, offset_strength, plank_mode, planks_vertical);
                (material as any).customProgramCacheKey = () => `variance-${material.uuid}-${noise_scale}-${contrast}-${brightness}-${offset_strength}-${plank_mode}-${planks_vertical}`;
                material.needsUpdate = true;
            }
        })
    }, [materials, noise_map]);
}
