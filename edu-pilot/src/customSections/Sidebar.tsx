import { useState } from "react";
import {
  FaUser,
  FaHome,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaRocket,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CustomNavLink from "../components/CustomNavLink";
import CustomModal from "../components/CustomModal";
import { useAuth } from "../context/AuthContext";
import { useCreateProject } from "../components/hooks/useCreateProject";
import { useDispatch } from "react-redux";
import { triggerRefresh } from "../context/projectSlice";

interface SidebarProps {
  isCollapsed: boolean;
  setIsCollapsed: (val: boolean) => void;
}

function Sidebar({ isCollapsed, setIsCollapsed }: SidebarProps) {
  const [showModal, setShowModal] = useState(false);
  const { currentUser } = useAuth();
  const { createProject } = useCreateProject();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const sidebarWidth = isCollapsed ? "w-[60px]" : "w-64";

  const handleCreateProject = async (name: string): Promise<{ id: string; name: string } | null> => {
    if (!currentUser) return null;

    const id = await createProject(name);
    if (id) {
      dispatch(triggerRefresh());
      return { id, name };
    }
    return null;
  };

  const handleUpgradeClick = () => {
    navigate("/plans");
  };

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
              <CustomNavLink to="/test">
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

          {/* Bottom - Upgrade */}
          <div
            className="text-sm text-gray-400 hover:text-[#c7f022] flex items-center gap-2 cursor-pointer mt-4"
            onClick={handleUpgradeClick}
          >
            <FaRocket />
            {!isCollapsed && <span>Upgrade</span>}
          </div>
        </div>
      </aside>

      {showModal && <CustomModal setShowModal={setShowModal} onCreate={handleCreateProject} />}
    </>
  );
}

export default Sidebar;
