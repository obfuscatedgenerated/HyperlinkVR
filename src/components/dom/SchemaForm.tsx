import { AutoForm } from "@autoform/mantine";
import { ZodProvider } from "@autoform/zod";
import { MantineProvider } from "@mantine/core";
import { useCallback, useMemo } from "react";
import { z } from "zod";

import "./SchemaForm.css";
import { ControlledSelect } from "~components/dom/ControlledSelect";

const SchemaForm = ({
    schema,
    title = "Schema Form",
    onSubmit,
}: {
    schema: z.ZodObject;
    title?: string;
    onSubmit: (data: any) => void;
}) => {
    const const_fields = useMemo(() => {
        const fields: Record<string, any> = {};
        Object.entries(schema.shape).forEach(([key, value]) => {
            if (value instanceof z.ZodLiteral) {
                fields[key] = value.value;
            }

            // if a version field is provided with a range, set it to the max value
            if (key === "version" && value instanceof z.ZodNumber) {
                const max = value.maxValue;
                if (max !== undefined) {
                    fields[key] = max;
                }
            }

            // $schema is constant
            if (key === "$schema" && value instanceof z.ZodDefault) {
                fields[key] = value.def.defaultValue;
            }
        });

        return fields;
    }, [schema]);

    // hide const fields from the schema
    const filtered_schema = useMemo(
        () => {
            const new_schema = schema.clone();

            for (const field of Object.keys(const_fields)) {
                delete new_schema.shape[field];
            }

            return new_schema;
        },
        [schema, const_fields]
    );

    const schema_provider = useMemo(() => new ZodProvider(filtered_schema), [filtered_schema]);

    const handle_submit = useCallback(
        (data: any) => {
            // enforce const fields
            const new_data = { ...data, ...const_fields };
            onSubmit(new_data);
        },
        [const_fields]
    );

    return (
        <MantineProvider>
            <main style={{ margin: "2rem" }}>
                <h1>{title}</h1>

                <AutoForm
                    schema={schema_provider}
                    onSubmit={handle_submit}
                    defaultValues={const_fields}
                    withSubmit
                    formComponents={{
                        select: ControlledSelect,
                    }}
                />
            </main>
        </MantineProvider>
    );
};
export default SchemaForm
