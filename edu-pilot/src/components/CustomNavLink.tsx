import { NavLink, type NavLinkProps } from "react-router-dom";

interface CustomNavLinkProps extends NavLinkProps {
  children: React.ReactNode;
  className?: string;
}

function CustomNavLink({ to, children, className = "", ...rest }: CustomNavLinkProps) {
  return (
    <NavLink
      to={to}
      {...rest}
      className={({ isActive }) =>
        `${className} text-lg font-medium transition hover:text-[#c7f022] ${
          isActive ? "text-[#c7f022]" : "text-white"
        }`
      }
    >
      {children}
    </NavLink>
  );
}

export default CustomNavLink;
