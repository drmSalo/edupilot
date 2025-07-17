import { useState } from "react";
import { FaUser, FaHome, FaPlus, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import CustomNavLink from "../components/CustomNavLink";
import CustomModal from "../components/CustomModal";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const [showModal, setShowModal] = useState(false);

  const sidebarWidth = isCollapsed ? "w-[60px]" : "w-64";

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-screen p-4 shadow-lg bg-black text-white border-r border-[#c7f022] z-50 transition-all duration-300 ${sidebarWidth}`}
      >
        <div className="flex flex-col h-full justify-between">
          
          <div>
           
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="text-[#c7f022] text-xl mb-6"
            >
              {isCollapsed ? <FaChevronRight /> : <FaChevronLeft />}
            </button>
            

            {/* Navigation */}
            <nav className="flex flex-col gap-6">
              <CustomNavLink to="/profile">
                <div className="flex items-center gap-3">
                  <FaUser />
                  {!isCollapsed && <span>Profile</span>}
                </div>
              </CustomNavLink>

              <CustomNavLink to="/projects">
                <div className="flex items-center gap-3">
                  <FaHome />
                  {!isCollapsed && <span>Home</span>}
                </div>
              </CustomNavLink>

              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-3 text-left text-lg font-medium hover:text-[#c7f022]"
              >
                <FaPlus />
                {!isCollapsed && <span>Create Project</span>}
              </button>
            </nav>
          </div>

          {/* Bottom Part */}
          <div className="text-sm text-gray-400">
            {!isCollapsed && "Upgrade"}
          </div>
        </div>
      </aside>

      {showModal && <CustomModal setShowModal={setShowModal} />}
    </>
  );
}

export default Sidebar;
