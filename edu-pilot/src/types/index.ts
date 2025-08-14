export interface CustomButtonProps {
  text: string;
  containerStyles?: string;
  textStyles?: string;
  btnType?: any;
  handleClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean
   leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /** Zusätzliche Inline-Styles (für Gradients, Box-Shadow, etc.) */
  styleOverride?: React.CSSProperties;
}