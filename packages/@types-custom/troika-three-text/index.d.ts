declare module "troika-three-text" {
    import { Object3D, Material, BufferGeometry } from "three";

    export interface TextProps {
        text?: string;
        fontSize?: number;
        color?: string | number;
        font?: string;
        anchorX?: "left" | "center" | "right" | number;
        anchorY?:
            | "top"
            | "top-baseline"
            | "middle"
            | "bottom-baseline"
            | "bottom"
            | number;
        textAlign?: "left" | "right" | "center" | "justify";
        maxWidth?: number;
        lineHeight?: number;
        letterSpacing?: number;
        whiteSpace?: "normal" | "overflowWrap" | "nowrap";
        overflowWrap?: "normal" | "break-word";
        material?: Material | Material[];
        geometry?: BufferGeometry;
    }

    export class Text extends Object3D {
        text: string;
        fontSize: number;
        color: string | number;
        font: string;
        anchorX: "left" | "center" | "right" | number;
        anchorY:
            | "top"
            | "top-baseline"
            | "middle"
            | "bottom-baseline"
            | "bottom"
            | number;
        textAlign: "left" | "right" | "center" | "justify";
        maxWidth: number;
        lineHeight: number;
        letterSpacing: number;
        whiteSpace: "normal" | "overflowWrap" | "nowrap";
        overflowWrap: "normal" | "break-word";
        material: Material | Material[];
        geometry: BufferGeometry;

        sync(): void;
        dispose(): void;
    }

    export interface TextBuilderConfig {
        defaultFont?: string;
        useWorker?: boolean;
    }

    export function configureTextBuilder(config: TextBuilderConfig): void;
}
