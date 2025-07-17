import { useState } from "react";
import Sidebar from "../customSections/Sidebar";
import { Outlet } from "react-router-dom";

function Layout() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="flex bg-black text-white min-h-screen">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <main
        className={`transition-all duration-300 w-full ${
          isCollapsed ? "ml-[60px]" : "ml-64"
        }`}
      >
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
