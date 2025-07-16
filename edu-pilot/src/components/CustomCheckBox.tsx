// CustomCheckbox.tsx
interface CustomCheckboxProps {
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    label: any
  }
  
  const CustomCheckbox = ({ checked, onChange, label }: CustomCheckboxProps) => {
    return (
      <label className="flex items-start gap-3 cursor-pointer select-none text-white text-sm">
        <input
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="peer hidden"
        />
        <div className="w-5 h-5 flex items-center justify-center rounded border-2 
          peer-checked:border-[#c7f022] 
          border-white 
          peer-checked:bg-[#c7f022] 
          transition-colors duration-200">
          {/* Checkmark */}
          <svg
            className={`w-3 h-3 text-black transition-opacity duration-200 ${
              checked ? "opacity-100" : "opacity-0"
            }`}
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
          >
            <polyline points="5 10 9 14 15 6" />
          </svg>
        </div>
        <span>{label}</span>
      </label>
    );
  };
  
  export default CustomCheckbox;
  