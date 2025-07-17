export interface CustomButtonProps {
  text: string;
  containerStyles?: string;
  textStyles?: string;
  btnType?: any;
  handleClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}