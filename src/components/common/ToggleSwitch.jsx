const ToggleSwitch = ({ checked, onChange, label, description }) => {
    return (
        <div className="flex items-center justify-between">
            <div>
                <p className="font-medium text-gray-900">{label}</p>
                {description && <p className="text-sm text-gray-500">{description}</p>}
            </div>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                onClick={() => onChange(!checked)}
                className={`relative inline-flex items-center h-6 w-11 flex-shrink-0 cursor-pointer rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                    checked ? 'bg-brand-600' : 'bg-gray-200'
                }`}
                dir="ltr"
            >
                <span className="sr-only">{label}</span>
                <span
                    className={`inline-block h-4 w-4 rounded-full bg-white shadow-lg transition-all duration-200 ease-in-out ${
                        checked ? 'ms-[26px]' : 'ms-1'
                    }`}
                />
            </button>
        </div>
    );
};

export default ToggleSwitch;
