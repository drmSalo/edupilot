import { useState, type JSX } from "react";
import {
  FaUser,
  FaHome,
  FaPlus,
  FaChevronLeft,
  FaChevronRight,
  FaRocket,
  FaBezierCurve,
} from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import CustomNavLink from "../components/CustomNavLink";
import CustomModal from "../components/CustomModal";
import { useAuth } from "../context/AuthContext";
import { useCreateProject } from "../components/hooks/useCreateProject";
import { useDispatch } from "react-redux";
import { triggerRefresh } from "../context/projectSlice";
import { COLORS } from "../customSections/HeroSection";

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

  const widthClass = isCollapsed ? "w-[68px]" : "w-72";

  const handleCreateProject = async (name: string): Promise<{ id: string; name: string } | null> => {
    if (!currentUser) return null;
    const id = await createProject(name);
    if (id) {
      dispatch(triggerRefresh());
      return { id, name };
    }
    return null;
  };

  const handleUpgradeClick = () => navigate("/plans");

  const NavItem = ({
    to,
    icon,
    label,
  }: {
    to: string;
    icon: JSX.Element;
    label: string;
  }) => (
    <CustomNavLink
      to={to}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2 outline-none transition
        hover:opacity-100 focus:ring-2 focus:ring-offset-0
      `}
      // Tooltip via title, wenn eingeklappt
      title={isCollapsed ? label : undefined}
      style={{
        border: `1px solid ${COLORS.BORDER}`,
        background: "rgba(255,255,255,0.02)",
        backdropFilter: "blur(6px)",
      }}
    >
      <span
        className="shrink-0 grid place-items-center text-lg"
        style={{ color: COLORS.PRIMARY }}
      >
        {icon}
      </span>
      {!isCollapsed && (
        <span className="text-sm font-medium" style={{ color: COLORS.TEXT }}>
          {label}
        </span>
      )}
    </CustomNavLink>
  );

  return (
    <>
      <aside
        className={`fixed top-0 left-0 h-screen ${widthClass} p-3 sm:p-4 z-50 transition-all duration-300`}
        style={{
          background: COLORS.GLASS,
          borderRight: `1px solid ${COLORS.BORDER}`,
          color: COLORS.TEXT,
          backdropFilter: "blur(12px)",
          boxShadow: `0 10px 60px -20px rgba(0,0,0,0.7), 0 0 40px 6px ${COLORS.PRIMARY}22`,
        }}
      >
        {/* Gradient Rim */}
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{
            backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
          }}
        />

        <div className="flex h-full flex-col justify-between">
          {/* Top: Brand + Toggle */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div
                  className="grid place-items-center h-8 w-8 rounded-lg"
                  style={{
                    background: `${COLORS.PRIMARY}22`,
                    border: `1px solid ${COLORS.BORDER}`,
                  }}
                >
                  <FaBezierCurve style={{ color: COLORS.PRIMARY }} />
                </div>
                {!isCollapsed && (
                  <div className="text-sm font-extrabold tracking-wide">Edu&nbsp;Pilot</div>
                )}
              </div>

              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="grid place-items-center h-8 w-8 rounded-lg transition hover:opacity-90 focus:ring-2"
                aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
                style={{
                  background: "rgba(255,255,255,0.02)",
                  border: `1px solid ${COLORS.BORDER}`,
                }}
              >
                {isCollapsed ? (
                  <FaChevronRight style={{ color: COLORS.PRIMARY }} />
                ) : (
                  <FaChevronLeft style={{ color: COLORS.PRIMARY }} />
                )}
              </button>
            </div>

            {/* Create Project CTA */}
            <button
              onClick={() => setShowModal(true)}
              className="w-full rounded-xl px-3 py-2 mb-4 text-sm font-semibold transition hover:opacity-95"
              style={{
                color: "#00131a",
                backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT})`,
                boxShadow: `0 10px 30px -10px ${COLORS.PRIMARY}aa, 0 0 40px ${COLORS.ACCENT}55`,
                border: "none",
              }}
              title={isCollapsed ? "Create Project" : undefined}
            >
              <span className="inline-flex items-center gap-2 justify-center">
                <FaPlus />
                {!isCollapsed && <span>Create Project</span>}
              </span>
            </button>

            {/* Nav */}
            {!isCollapsed && (
              <div className="text-[10px] uppercase tracking-wider mb-2" style={{ color: COLORS.SUBTLE }}>
                Navigation
              </div>
            )}
            <nav className={`flex flex-col gap-3 ${isCollapsed ? "items-center" : ""}`}>
              <NavItem to="/profile" icon={<FaUser />} label="Profile" />
              <NavItem to="/projects" icon={<FaHome />} label="Home" />
              
            </nav>
          </div>

          {/* Bottom: Upgrade */}
          <div className={`${isCollapsed ? "items-center" : "items-stretch"} flex flex-col`}>
            <button
              onClick={handleUpgradeClick}
              className="rounded-xl px-3 py-2 text-sm font-medium transition hover:opacity-95"
              style={{
                border: `1px solid ${COLORS.BORDER}`,
                background: "rgba(255,255,255,0.02)",
                backdropFilter: "blur(6px)",
                color: COLORS.TEXT,
              }}
              title={isCollapsed ? "Upgrade" : undefined}
            >
              <span className="inline-flex items-center gap-2 justify-center">
                <FaRocket style={{ color: COLORS.PRIMARY }} />
                {!isCollapsed && <span>Upgrade</span>}
              </span>
            </button>

            <div
              aria-hidden
              className="h-[2px] w-full mt-3 opacity-50"
              style={{
                backgroundImage: `linear-gradient(90deg, ${COLORS.PRIMARY}, ${COLORS.ACCENT2}, ${COLORS.ACCENT})`,
              }}
            />
          </div>
        </div>
      </aside>

      {showModal && <CustomModal setShowModal={setShowModal} onCreate={handleCreateProject} />}
    </>
  );
}

export default Sidebar;
