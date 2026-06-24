export const Dropdown = ({ options, selected, on_change, label, tooltip, placeholder_item }: { options: {label?: string, value: string}[]; selected: string; on_change: (new_value: string) => void; label?: string; tooltip?: string; placeholder_item?: string }) => (
    <label title={tooltip} className="cursor-pointer flex items-center">
        {label && <span className="mr-2">{label}</span>}
        <select
            className="bg-gray-700 text-white rounded-md px-2 py-1 focus:outline-none"
            value={selected}
            onChange={(e) => on_change(e.target.value)}
        >
            {placeholder_item && (
                <option value="" disabled>
                    {placeholder_item}
                </option>
            )}
            {options.map((option) => (
                <option key={option.value} value={option.value}>
                    {option.label || option.value}
                </option>
            ))}
        </select>
    </label>
);
