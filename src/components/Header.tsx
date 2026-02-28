'use client'
import { useState, useEffect, FC, MouseEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, Settings, LogOut, ChevronDown, ChevronUp } from 'lucide-react'
import styled from 'styled-components'
import { supabase } from '../lib/supabaseClient'
import { getUserProfile } from '../services/userService'

interface HeaderProps {
  onMenuClick?: () => void
  isExpanded?: boolean
}



const HeaderContainer = styled.header`
  height: 80px;
  min-height: 80px;
  max-height: 80px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(1rem, 1.5rem, 2rem);
  box-shadow: 0 0.0625rem 0.125rem rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: all 0.3s ease;
  overflow: visible;
  width: 100%;
  margin: 0;
  box-sizing: border-box;

  .header-left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: clamp(0.5rem, 0.75rem, 1rem);
    min-width: 0; /* Allow flex items to shrink */
  }

  /* Hamburger Menu */
  .hamburger-menu {
    display: none;
    flex-direction: column;
    gap: 0.313rem;
    background: none;
    border: none;
    cursor: pointer;
    padding: 0.5rem;
    border-radius: 0.375rem;
    transition: background 0.3s;
    z-index: 101;
    position: relative;
    flex-shrink: 0;
  }

  .hamburger-menu:hover {
    background: var(--bg-hover);
  }

  .hamburger-menu:active {
    transform: scale(0.95);
  }

  .hamburger-menu span {
    width: 1.5rem;
    height: 0.188rem;
    background: #1e5ba8;
    border-radius: 0.125rem;
    transition: all 0.3s;
    display: block;
  }

  .header-title {
    font-size: clamp(1.125rem, 1.25rem, 1.5rem);
    font-weight: 700;
    color: #1e293b;
    margin: 0;
    letter-spacing: -0.03125rem;
    font-family: var(--font-inter);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .header-right {
    display: flex;
    align-items: center;
    gap: clamp(0.5rem, 0.75rem, 1rem);
    flex-shrink: 0;
  }


  .notification-icon {
    position: relative;
    cursor: pointer;
    transition: transform 0.2s;
    color: #64748b;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem;
    border-radius: 0.75rem;
    flex-shrink: 0;
  }

  .notification-icon:hover {
    transform: scale(1.05);
    background: #f1f5f9;
    color: #3b82f6;
  }

  /* Zoom adjustments for notification */
  @media (max-width: 1536px) {
    .notification-icon {
      padding: 0.4rem;
    }
  }

  @media (max-width: 1400px) {
    .notification-icon {
      padding: 0.375rem;
    }
  }

  .notification-badge {
    position: absolute;
    top: -0.313rem;
    right: -0.313rem;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
    color: white;
    font-size: clamp(0.625rem, 0.688rem, 0.75rem);
    font-weight: 700;
    padding: 0.188rem 0.375rem;
    border-radius: 0.625rem;
    min-width: 1.125rem;
    text-align: center;
    box-shadow: 0 0.125rem 0.375rem rgba(238, 90, 82, 0.3);
    font-family: var(--font-inter);
  }

  /* Notification Dropdown */
  .notification-dropdown {
    position: absolute;
    top: calc(100% + 0.625rem);
    right: -5rem;
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border-radius: 1rem;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
    min-width: clamp(18rem, 20rem, 23.75rem);
    max-width: 26.25rem;
    z-index: 1000;
    animation: slideDown 0.3s ease;
    overflow: hidden;
  }

  /* Zoom adjustments for dropdowns */
  @media (max-width: 1536px) {
    .notification-dropdown {
      min-width: 18rem;
      right: -3rem;
    }
  }

  @media (max-width: 1400px) {
    .notification-dropdown {
      min-width: 16rem;
      right: -1rem;
    }
  }

  @media (max-width: 1200px) {
    .notification-dropdown {
      right: 0;
    }
  }

  .notification-header {
    padding: 1rem 1.25rem;
    border-bottom: 1px solid var(--border-color);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .notification-header h3 {
    font-size: clamp(0.875rem, 1rem, 1.125rem);
    font-weight: 700;
    color: var(--text-primary);
    margin: 0;
  }

  .notification-header .mark-read {
    font-size: clamp(0.688rem, 0.75rem, 0.813rem);
    color: #5a9dc4;
    cursor: pointer;
    font-weight: 600;
  }

  .notification-header .mark-read:hover {
    text-decoration: underline;
  }

  .notification-list {
    max-height: 400px;
    overflow-y: auto;
  }

  .notification-item {
    padding: 16px 20px;
    border-bottom: 1px solid var(--border-color);
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    gap: 12px;
  }

  .notification-item:hover {
    background: var(--bg-hover);
  }

  .notification-item:last-child {
    border-bottom: none;
  }

  .notification-icon-wrapper {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .notification-icon-wrapper.contract {
    background: #eff6ff;
    color: #3b82f6;
  }

  .notification-icon-wrapper.vendor {
    background: #f0fdf4;
    color: #22c55e;
  }

  .notification-icon-wrapper.amendment {
    background: #fef3c7;
    color: #f59e0b;
  }

  .notification-content {
    flex: 1;
  }

  .notification-title {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    margin-bottom: 4px;
  }

  .notification-desc {
    font-size: 13px;
    color: #64748b;
    margin-bottom: 6px;
    line-height: 1.4;
  }

  .notification-time {
    font-size: 11px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .notification-empty {
    padding: 40px 20px;
    text-align: center;
    color: var(--text-muted);
  }

  .notification-empty-icon {
    width: 48px;
    height: 48px;
    margin: 0 auto 12px;
    opacity: 0.3;
  }

  .user-profile {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    cursor: pointer;
    padding: 0.5rem 0.75rem;
    border-radius: 1.875rem;
    transition: all 0.25s;
    flex-shrink: 0;
  }

  .user-profile:hover {
    background: var(--bg-hover);
  }

  /* Zoom adjustments for user profile */
  @media (max-width: 1536px) {
    .user-profile {
      padding: 0.4rem 0.6rem;
      gap: 0.5rem;
    }

    .user-avatar {
      width: 38px;
      height: 38px;
      font-size: 15px;
    }

    .user-name {
      font-size: 13px;
    }

    .user-role {
      font-size: 11px;
    }
  }

  @media (max-width: 1400px) {
    .user-profile {
      padding: 0.4rem;
      gap: 0.4rem;
    }

    .user-info {
      max-width: 100px;
      overflow: hidden;
    }

    .user-name,
    .user-role {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
  }

  @media (max-width: 1200px) {
    .user-info {
      display: none !important;
    }

    .user-profile {
      padding: 0.5rem;
    }
  }

  .dropdown-arrow-svg {
    color: #94a3b8;
    margin-left: 4px;
    transition: transform 0.3s;
    flex-shrink: 0;
  }

  /* Profile Dropdown */
  .profile-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 10px;
    background: var(--bg-card);
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: var(--shadow-lg);
    border: 1px solid var(--border-color);
    min-width: 240px;
    z-index: 1000;
    animation: slideDown 0.3s ease;
    overflow: hidden;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 20px;
    cursor: pointer;
    transition: background 0.2s;
    font-size: 14px;
    color: var(--text-primary);
    font-family: var(--font-inter);
    font-weight: 500;
  }

  .dropdown-item:hover {
    background: var(--bg-hover);
  }

  .dropdown-item.logout {
    color: #ff6b6b;
  }

  .dropdown-item.logout:hover {
    background: rgba(255, 107, 107, 0.08);
  }

  .item-icon-svg {
    color: #5a9dc4;
    flex-shrink: 0;
  }

  .dropdown-item.logout .item-icon-svg {
    color: #ff6b6b;
  }

  .dropdown-divider {
    height: 1px;
    background: var(--border-color);
    margin: 8px 0;
  }

  .user-avatar {
    width: 42px;
    height: 42px;
    background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 17px;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    box-shadow: 0 2px 8px rgba(126, 185, 217, 0.2);
  }

  .user-info {
    display: flex;
    flex-direction: column;
  }

  .user-name {
    font-size: 14px;
    font-weight: 600;
    color: #2b3f50;
    font-family: 'Inter', sans-serif;
  }

  .user-role {
    font-size: 12px;
    color: #8b95a1;
    font-family: 'Inter', sans-serif;
    font-weight: 500;
  }

  @media (max-width: 968px) {
    .hamburger-menu {
      display: flex !important;
      pointer-events: auto;
    }
    
    padding: 0 20px;

    .search-box {
      min-width: 150px;
    }
    
    .header-title {
      font-size: 20px;
    }

    .user-info {
      display: none;
    }
    
    .profile-dropdown {
      right: -10px;
    }
  }

  @media (max-width: 600px) {
    padding: 0 15px;
    
    .header-title {
      font-size: 18px;
    }
    
    .search-box {
      display: none;
    }
    
    .notification-icon {
      font-size: 20px;
    }
  }
`;

const LogoGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-right: 12px;
  padding-right: 16px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  height: 50px;
  flex-shrink: 0;

  /* Zoom 110-125% - hide logos earlier to prevent overflow */
  @media (max-width: 1536px) {
    gap: 10px;
    margin-right: 10px;
    padding-right: 12px;

    .logo-pln {
      height: 38px;
    }

    .logo-danantara {
      height: 26px;
    }
  }

  @media (max-width: 1400px) {
    display: none;
  }

  @media (max-width: 1200px) {
    display: none;
  }

  /* PLN Logo - Smaller Size */
  .logo-pln {
    height: 36px;
    width: auto;
    object-fit: contain;
  }

  /* Danantara Logo - Smaller Size */
  .logo-danantara {
    height: 28px;
    width: auto;
    object-fit: contain;
  }
  
  .logo-text {
      display: flex;
      flex-direction: column;
      justify-content: center;
      line-height: 1.2;
      border-left: 1px solid rgba(0,0,0,0.1);
      padding-left: 12px;
      margin-left: 0px;
      max-width: 140px;
      overflow: hidden;
      
      strong {
          font-size: 14px;
          color: #334155;
          font-weight: 700;
          letter-spacing: -0.01em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }
      span {
          font-size: 11px;
          color: #64748b;
          font-weight: 500;
          letter-spacing: 0.02em;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
      }
  }

  /* Zoom adjustments for logo text */
  @media (max-width: 1536px) {
    .logo-text {
      padding-left: 10px;
      max-width: 120px;

      strong {
        font-size: 13px;
      }

      span {
        font-size: 10px;
      }
    }
  }
`;

const Header: FC<HeaderProps> = ({ onMenuClick, isExpanded = false }) => {
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false)
  const [userName, setUserName] = useState<string>('Admin')
  const [userRole, setUserRole] = useState<string>('Administrator')
  const [profileImageUrl, setProfileImageUrl] = useState<string>('')

  const router = useRouter()
  const pathname = usePathname()

  const fetchUserProfile = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const result = await getUserProfile(user.id)
        if (result.success && (result as any).data) {
          setUserName((result as any).data.full_name || user.email?.split('@')[0] || 'Admin')
          setUserRole((result as any).data.role || 'User')
          setProfileImageUrl((result as any).data.profile_image || '')
        }
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
    }
  }

  useEffect(() => {
    fetchUserProfile()

    // Listen for profile updates
    const handleProfileUpdate = () => {
      fetchUserProfile()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('profile-updated', handleProfileUpdate)
    }

    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('profile-updated', handleProfileUpdate)
      }
    }
  }, [])

  const getPageTitle = (): string => {
    switch (pathname) {
      case '/dashboard':
        return 'Dashboard'
      case '/aset':
        return 'Manajemen Kontrak'
      case '/vendor':
        return 'Data Vendor'
      case '/approval-surat':
        return 'Approval Surat Pengajuan'
      case '/approval-akun':
        return 'Approval Akun Vendor'
      case '/laporan':
        return 'Laporan & Analitik'
      case '/pengaturan':
        return 'Pengaturan'
      case '/riwayat':
        return 'Riwayat Aktivitas'
      default:
        return 'Dashboard'
    }
  }

  const toggleProfileMenu = (): void => {
    setShowProfileMenu(!showProfileMenu)
  }

  const handleLogout = (): void => {
    localStorage.removeItem('isLoggedIn')
    localStorage.removeItem('devMode')
    router.push('/')
  }

  const goToSettings = (): void => {
    router.push('/pengaturan')
    setShowProfileMenu(false)
  }

  return (
    <HeaderContainer className={isExpanded ? 'expanded' : 'collapsed'}>
      <div className="header-left">
        <button className="hamburger-menu" onClick={onMenuClick}>
          <span></span>
          <span></span>
          <span></span>
        </button>
        <h1 className="header-title">{getPageTitle()}</h1>
      </div>
      <div className="header-right">
        <LogoGroup>
          <img src="/images/Logo_PLN.png" alt="Logo PLN" className="logo-pln" />
          <img src="/images/Logo_Danantara (2).png" alt="Logo Danantara" className="logo-danantara" />
          <div className="logo-text">
            <strong>PLN (Persero)</strong>
            <span>UPT Manado</span>
          </div>
        </LogoGroup>

        <div className="user-profile" onClick={toggleProfileMenu}>
          <img
            src={profileImageUrl || "/images/profil default instagram.jpg"}
            alt="Admin"
            className="user-avatar"
          />
          <div className="user-info">
            <span className="user-name">{userName}</span>
            <span className="user-role">{userRole}</span>
          </div>
          {showProfileMenu ? (
            <ChevronUp className="dropdown-arrow-svg" size={16} strokeWidth={2.5} />
          ) : (
            <ChevronDown className="dropdown-arrow-svg" size={16} strokeWidth={2.5} />
          )}
          {showProfileMenu && (
            <div className="profile-dropdown" onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-item" onClick={goToSettings}>
                <Settings className="item-icon-svg" size={18} strokeWidth={2} />
                <span>Pengaturan</span>
              </div>
              <div className="dropdown-divider" />
              <div className="dropdown-item logout" onClick={handleLogout}>
                <LogOut className="item-icon-svg" size={18} strokeWidth={2} />
                <span>Logout</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </HeaderContainer>
  )
}

export default Header
