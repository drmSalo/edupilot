import type { CustomButtonProps } from "../types";

function CustomButton({
  text,
  containerStyles,
  textStyles,
  btnType,
  handleClick,
  disabled,
  leftIcon,
  rightIcon,
  styleOverride,
}: CustomButtonProps) {
  return (
    <button
      type={btnType}
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl transition ${
        disabled ? "opacity-60 cursor-not-allowed" : ""
      } ${containerStyles}`}
      style={styleOverride}
    >
      {leftIcon ? <span className="shrink-0">{leftIcon}</span> : null}
      <span className={textStyles}>{text}</span>
      {rightIcon ? <span className="shrink-0">{rightIcon}</span> : null}
    </button>
  );
}

export default CustomButton;
