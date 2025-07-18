import type { CustomButtonProps } from "../types"


function CustomButton({text, containerStyles, textStyles, btnType, handleClick, disabled}: CustomButtonProps) {
  return (
    <button className={containerStyles} type={btnType} onClick={handleClick} disabled={disabled}>
        <span className={textStyles}>
            {text}
        </span>
    </button>
    )
}

export default CustomButton