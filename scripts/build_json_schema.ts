import fs from "fs";
import path from "path";



import { EXPORT_TO_JSON as AUTH_EXPORTS } from "~lib/auth/schema";





const EXPORT_TO_JSON = [
    ...AUTH_EXPORTS
];


const SCHEMA_URL_BASE = "https://vvr.ollieg.codes/schemas";

const OUTPUT_DIR = path.join(__dirname, "../build/schemas");

// TODO: auto publish workflow

if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

for (const {schema, version, name, title, description} of EXPORT_TO_JSON) {
    const raw_schema = schema.toJSONSchema();

    // force the current version to be exact
    raw_schema.properties.version = {
        type: "integer",
        const: version
    };

    const final_schema = {
        $id: `${SCHEMA_URL_BASE}/${name}_v${version}.json`,
        version: version,
        title: `${title} (version ${version})`,
        description: `${description} This schema is version ${version}.`,
        ...raw_schema
    };

    fs.writeFileSync(
        path.join(OUTPUT_DIR, `${name}_v${version}.json`),
        JSON.stringify(final_schema, null, 4)
    );

    console.log(
        `Generated JSON schema for ${name} v${version} at ${OUTPUT_DIR}`
    );
}
