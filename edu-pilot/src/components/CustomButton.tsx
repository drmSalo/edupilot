import type { CustomButtonProps } from "../types"


function CustomButton({text, containerStyles, textStyles}: CustomButtonProps) {
  return (
    <button className={containerStyles}>
        <span className={textStyles}>
            {text}
        </span>
    </button>
    )
}

export default CustomButton