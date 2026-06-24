import { useState } from 'react';

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  icon?: React.ReactNode;
}

export default function FloatingLabelInput({ label, icon, value, onChange, type = 'text', ...props }: FloatingLabelInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const hasValue = (value !== undefined && value !== null && value.toString().length > 0);

  return (
    <div className="relative w-full group">
      {icon && (
        <span className={`absolute left-4 top-1/2 -translate-y-1/2 transition-all duration-300 z-10 pointer-events-none ${isFocused ? 'text-primary scale-110' : 'text-[#7A7A7A]'}`}>
          {icon}
        </span>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        className={`w-full ${icon ? 'pl-11' : 'pl-4'} pr-4 pt-5 pb-2 bg-[#F8FAFC] border-2 rounded-2xl text-[#1F1F1F] text-sm font-semibold placeholder-transparent focus:outline-none focus:bg-[#FFFDF9] transition-all duration-300 ${
          isFocused ? 'border-primary ring-4 ring-primary/10 shadow-lg' : 'border-black/5 hover:border-black/10'
        }`}
        {...props}
      />
      <label
        className={`absolute left-0 top-[45%] -translate-y-1/2 transition-all duration-300 pointer-events-none select-none text-[#7A7A7A] ${
          icon ? 'ml-11' : 'ml-4'
        } ${
          isFocused || hasValue
            ? '-translate-y-7 scale-90 text-[10px] font-black uppercase tracking-wider text-primary bg-[#FFFDF9] px-2 rounded-md border border-primary/10 z-10'
            : 'text-sm font-semibold'
        }`}
      >
        {label}
      </label>
    </div>
  );
}
