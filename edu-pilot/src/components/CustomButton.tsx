import type { CustomButtonProps } from "../types"


function CustomButton({text, containerStyles, textStyles, btnType, handleClick}: CustomButtonProps) {
  return (
    <button className={containerStyles} type={btnType} onClick={handleClick}>
        <span className={textStyles}>
            {text}
        </span>
    </button>
    )
}

export default CustomButton