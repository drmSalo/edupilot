import type { CustomButtonProps } from "../types"


function CustomButton({text, containerStyles, textStyles, btnType}: CustomButtonProps) {
  return (
    <button className={containerStyles} type={btnType}>
        <span className={textStyles}>
            {text}
        </span>
    </button>
    )
}

export default CustomButton