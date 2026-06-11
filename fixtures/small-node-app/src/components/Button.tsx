import React from "react";

interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

const Button: React.FC<ButtonProps> = ({ label, onClick, variant = "primary" }) => {
  return <button onClick={onClick}>{label}</button>;
};

export default Button;

export function PrimaryButton(props: ButtonProps) {
  return <Button {...props} variant="primary" />;
}
