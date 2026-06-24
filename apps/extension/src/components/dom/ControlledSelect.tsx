import { type AutoFormFieldProps } from "@autoform/react";
import { Select } from "@mantine/core";
import { useController } from "react-hook-form";

// https://github.com/vantezzen/autoform/issues/201

export const ControlledSelect = ({ field, ...props }: AutoFormFieldProps) => {
    const { field: rhfField, fieldState } = useController({
        name: props.id
    });

    return (
        <Select
            {...props}
            {...rhfField}
            error={fieldState.error?.message}
            data={(field.options || []).map(([k, l]) => ({
                value: k,
                label: l
            }))}
            onChange={(val) => rhfField.onChange(val)}
            value={rhfField.value ?? ""}
        />
    );
};
