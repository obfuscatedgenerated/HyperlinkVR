import SchemaForm from "~components/dom/SchemaForm";
import { AuthManifestSchema } from "~lib/auth/schema";





const SCHEMAS = {
    "AuthManifest": {schema: AuthManifestSchema, title: "Auth Manifest Generator"}
}

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
    a.download = `${output_filename}.json` || `${schema_name}_v${data.version}.json`;
    a.click();
    URL.revokeObjectURL(url);
};

const FORMATS = {
    json: download_json
};

const download_form = (data: any) => {
    const format_func = FORMATS[output_format];
    if (!format_func) {
        console.error(`Unknown format: ${output_format}`);
        return;
    }
    format_func(data);
};

const DevtoolsForm = () => {
    if (!schema) {
        return <div>No schema found</div>;
    }

    if (!FORMATS[output_format]) {
        return <div>Unknown format: {output_format}</div>;
    }

    return (
        <SchemaForm
            schema={schema.schema}
            onSubmit={download_form}
            title={schema.title}
        />
    );
}

export default DevtoolsForm;
