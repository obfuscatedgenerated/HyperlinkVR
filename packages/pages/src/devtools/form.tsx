import { AuthManifestSchema } from "@viewportvr/auth";
import { lazy, Suspense } from "react";
import { LoadingSpinner } from "@viewportvr/ui-dom";

// lazy load schema form to avoid loading css on wrong pages / bundle bloat
// in regards to css it shouldn't be strictly necessary but may as well give vite an easier time, especially since this bundle will be big anyway with mantine
// TODO: look into scoping the css to the schemaform
const SchemaForm = lazy(() => import("@viewportvr/schema-form").then((module) => ({ default: module.SchemaForm })));

const SCHEMAS = {
    AuthManifest: {
        schema: AuthManifestSchema,
        title: "Auth Manifest Generator"
    }
} as Record<string, { schema: any; title: string }>;

// TODO: use strategy
const params = new URLSearchParams(window.location.search);
const schema_name = params.get("schema");
const schema = schema_name ? SCHEMAS[schema_name] : null;
const output_format = params.get("format") || "json";
const output_filename = params.get("filename");

const download_json = (data: any) => {
    const blob = new Blob([JSON.stringify(data, null, 4)], {
        type: "application/json"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download =
        `${output_filename}.json` || `${schema_name}_v${data.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

const FORMATS = {
    json: download_json
} as Record<string, (data: any) => void>;

const download_form = (data: any) => {
    console.log("Downloading form data", data);
    const format_func = FORMATS[output_format];
    if (!format_func) {
        console.error(`Unknown format: ${output_format}`);
        return;
    }
    format_func(data);
};

export const DevToolsFormPage = () => {
    if (!schema) {
        return <div>No schema found</div>;
    }

    if (!FORMATS[output_format]) {
        return <div>Unknown format: {output_format}</div>;
    }

    return (
        <Suspense fallback={<LoadingSpinner />}>
            <SchemaForm
                schema={schema.schema}
                onSubmit={download_form}
                title={schema.title}
            />
        </Suspense>
    );
};
