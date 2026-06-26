import type { get_asset_path as AssetResolverType } from "@viewportvr/asset-resolver";

export const get_asset_path: typeof AssetResolverType = (
    script_path,
    relative_path,
    from_package
) => {
    return new URL(`../../${from_package}/${relative_path}`, script_path).href;
};
