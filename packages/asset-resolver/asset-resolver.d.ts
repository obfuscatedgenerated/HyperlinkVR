// declares a placeholder type for asset resolution,
// in which apps should declare their own shim for based on their own asset resolution strategy

declare module "@viewportvr/asset-resolver" {
    export function get_asset_path(
        script_path: string,
        relative_path: string,
        from_package = "assets"
    ): string;
}
