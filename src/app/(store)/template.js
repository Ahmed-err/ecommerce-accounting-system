// Re-mounts on every store navigation, so each page enters with the same short 3D
// transition (see .page-enter in styles/motion.css). Admin and POS have no template.
export default function StoreTemplate({ children }) {
  return <div className="page-enter">{children}</div>;
}
