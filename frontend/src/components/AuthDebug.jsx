import { useAuthContext } from "@/context/AuthContext";
import { useLocation } from "react-router-dom";

export default function AuthDebug() {
  const { user, token, isAuthenticated, role } = useAuthContext();
  const location = useLocation();

  return (
    <div style={{ 
      position: 'fixed', 
      top: 0, 
      left: 0, 
      right: 0, 
      background: 'rgba(0,0,0,0.8)', 
      color: 'white', 
      padding: '10px', 
      zIndex: 9999,
      fontSize: '12px',
      fontFamily: 'monospace'
    }}>
      <div>Location: {location.pathname}</div>
      <div>Is Authenticated: {isAuthenticated ? 'YES' : 'NO'}</div>
      <div>Token: {token ? 'YES' : 'NO'}</div>
      <div>User: {user ? JSON.stringify(user, null, 2) : 'NULL'}</div>
      <div>Role: {role}</div>
      <div>LocalStorage intro: {localStorage.getItem('kib_intro_seen_v1')}</div>
      <div>LocalStorage tour: {localStorage.getItem('kibundo_tour_done')}</div>
    </div>
  );
}