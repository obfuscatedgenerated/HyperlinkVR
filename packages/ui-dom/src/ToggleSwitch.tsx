export const ToggleSwitch = ({ enabled, on_change, label, tooltip }: { enabled?: boolean; on_change: (new_state: boolean) => void; label?: string; tooltip?: string }) => {
    return (
        <label title={tooltip} className="cursor-pointer flex items-center">
            {label && <span className="mr-2">{label}</span>}
            <button
                className={`relative cursor-pointer inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                    enabled ? "bg-blue-600" : "bg-gray-300"
                }`}
                onClick={() => on_change(!enabled)}
            >
                <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        enabled ? "translate-x-5" : "translate-x-1"
                    }`}
                />
            </button>
        </label>
    );
}
