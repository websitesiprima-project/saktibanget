'use client'
import React, { FC, useState, useEffect, useCallback, MouseEvent } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, User, LogOut, ChevronDown, ChevronUp } from 'lucide-react'
import styled from 'styled-components'
import { supabase } from '@/lib/supabaseClient'

interface Notification {
  id: string
  message: string
  time: string
  unread: boolean
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
}

const VendorHeaderContainer = styled.header`
  height: 80px;
  background: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 clamp(1rem, 1.5rem, 2rem);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-bottom: 1px solid #e2e8f0;
  position: sticky;
  top: 0;
  z-index: 100;
  transition: all 0.3s ease;
  min-height: 64px;
  overflow: visible;

  .vendor-header-content {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 0;
  }

  .vendor-header-left {
    flex: 1;
    display: flex;
    align-items: center;
    gap: clamp(0.75rem, 1rem, 1.25rem);
    min-width: 0;
  }

  .page-title {
    font-size: clamp(1.25rem, 1.5rem, 1.625rem);
    font-weight: 700;
    color: #1e293b;
    margin: 0;
    letter-spacing: -0.5px;
    font-family: 'Inter', sans-serif;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .vendor-header-right {
    display: flex;
    align-items: center;
    gap: clamp(0.75rem, 1rem, 1.5rem);
    flex-shrink: 0;
  }

  /* Zoom adjustments */
  @media (max-width: 1536px) {
    padding: 0 1rem;

    .page-title {
      font-size: 1.25rem;
    }

    .vendor-header-right {
      gap: 0.75rem;
    }
  }

  @media (max-width: 1400px) {
    padding: 0 0.75rem;

    .page-title {
      font-size: 1.125rem;
    }

    .vendor-header-right {
      gap: 0.5rem;
    }
  }

  /* Notifications */
  .notification-container {
    position: relative;
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
    padding: 8px;
    border-radius: 12px;
    flex-shrink: 0;
  }

  .notification-icon:hover {
    transform: scale(1.05);
    background: #f1f5f9;
    color: #3b82f6;
  }

  .notification-badge {
    position: absolute;
    top: -5px;
    right: -5px;
    background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%);
    color: white;
    font-size: 11px;
    font-weight: 700;
    padding: 3px 6px;
    border-radius: 10px;
    min-width: 18px;
    text-align: center;
    box-shadow: 0 2px 6px rgba(238, 90, 82, 0.3);
    font-family: 'Inter', sans-serif;
  }

  .notification-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: -5rem;
    background: #ffffff;
    backdrop-filter: blur(10px);
    border-radius: 16px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    border: 1px solid #e2e8f0;
    min-width: clamp(18rem, 20rem, 23.75rem);
    max-width: 26.25rem;
    z-index: 1000;
    animation: slideDown 0.3s ease;
    overflow: hidden;
  }

  @media (max-width: 1536px) {
    .notification-dropdown {
      right: -3rem;
      min-width: 18rem;
    }
  }

  @media (max-width: 1400px) {
    .notification-dropdown {
      right: -1rem;
      min-width: 16rem;
    }
  }

  @media (max-width: 1200px) {
    .notification-dropdown {
      right: 0;
      min-width: 15rem;
    }
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

  .notification-header {
    padding: 16px 20px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .notification-header h3 {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    margin: 0;
    font-family: 'Inter', sans-serif;
  }

  .notification-count {
    font-size: 13px;
    color: #64748b;
    font-family: 'Inter', sans-serif;
  }

  .notification-list {
    max-height: 380px;
    overflow-y: auto;
  }

  .notification-item {
    padding: 14px 20px;
    border-bottom: 1px solid #f1f5f9;
    transition: all 0.2s;
    cursor: pointer;
  }

  .notification-item:hover {
    background: #f8fafc;
  }

  .notification-item.unread {
    background: rgba(59, 130, 246, 0.02);
    border-left: 3px solid #3b82f6;
  }

  .notification-item p {
    font-size: 14px;
    color: #334155;
    margin: 0 0 4px 0;
    font-family: 'Inter', sans-serif;
  }

  .notification-time {
    font-size: 12px;
    color: #94a3b8;
    font-family: 'Inter', sans-serif;
  }

  /* Profile Dropdown */
  .user-profile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 8px 12px 8px 8px;
    background: #f8fafc;
    border-radius: 50px;
    cursor: pointer;
    transition: all 0.25s;
    position: relative;
    flex-shrink: 0;
  }

  .user-profile:hover {
    background: #f1f5f9;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  }

  .user-avatar {
    width: 42px;
    height: 42px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    border: 2px solid #e2e8f0;
  }

  @media (max-width: 1536px) {
    .user-avatar {
      width: 38px;
      height: 38px;
    }
  }

  @media (max-width: 1400px) {
    .user-profile {
      padding: 6px 10px 6px 6px;
      gap: 8px;
    }

    .user-avatar {
      width: 36px;
      height: 36px;
    }
  }

  @media (max-width: 1200px) {
    .user-info {
      display: none;
    }
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

  .dropdown-arrow-svg {
    color: #8b95a1;
    flex-shrink: 0;
  }

  .profile-dropdown {
    position: absolute;
    top: calc(100% + 10px);
    right: 0;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
    min-width: 200px;
    overflow: hidden;
    z-index: 1000;
    animation: slideDown 0.3s ease;
  }

  .dropdown-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 16px;
    color: #475569;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 14px;
    font-weight: 500;
    font-family: 'Inter', sans-serif;
    border: none;
    background: transparent;
  }

  .dropdown-item:hover {
    background: #f8fafc;
  }

  .dropdown-item.logout {
    color: #ef4444;
    border-top: 1px solid #f1f5f9;
  }

  .dropdown-item.logout:hover {
    background: #fef2f2;
  }

  .item-icon-svg {
    flex-shrink: 0;
  }

  .dropdown-divider {
    height: 1px;
    background: #e2e8f0;
    margin: 8px 0;
  }

  /* Responsive */
  @media (max-width: 968px) {
    padding: 0 20px;

    .page-title {
      font-size: 20px;
    }

    .user-info {
      display: none;
    }

    .notification-dropdown,
    .profile-dropdown {
      right: -10px;
    }
  }

  @media (max-width: 600px) {
    padding: 0 15px;

    .page-title {
      font-size: 18px;
    }
  }
`;

const LogoGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-right: 16px;
  padding-right: 24px;
  border-right: 1px solid rgba(0, 0, 0, 0.08);
  height: 50px;

  @media (max-width: 1200px) {
    display: none;
  }

  .logo-pln {
    height: 42px;
    width: auto;
    object-fit: contain;
    transition: transform 0.2s;
  }

  .logo-danantara {
    height: 28px;
    width: auto;
    object-fit: contain;
    transition: transform 0.2s;
  }
  
  img:hover {
    transform: scale(1.05);
  }
  
  .logo-text {
    display: flex;
    flex-direction: column;
    justify-content: center;
    line-height: 1.2;
    border-left: 1px solid rgba(0,0,0,0.1);
    padding-left: 16px;
    margin-left: 0px;
    
    strong {
      font-size: 15px;
      color: #334155;
      font-weight: 700;
      letter-spacing: -0.01em;
    }
    span {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      letter-spacing: 0.02em;
    }
  }
`;

const formatTimeAgo = (dateString: string): string => {
  const now = new Date()
  const date = new Date(dateString)
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'Baru saja'
  if (diffMins < 60) return `${diffMins} menit lalu`
  if (diffHours < 24) return `${diffHours} jam lalu`
  if (diffDays < 30) return `${diffDays} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

const VendorHeader: FC = () => {
  const router = useRouter()
  const pathname = usePathname()
  const [showNotifications, setShowNotifications] = useState<boolean>(false)
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false)
  const [userName, setUserName] = useState<string>('Vendor')
  const [userInitial, setUserInitial] = useState<string>('V')
  const [profileImage, setProfileImage] = useState<string>('')
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState<number>(0)

  const fetchNotifications = useCallback(async () => {
    const vendorUserId = localStorage.getItem('vendorUserId')
    if (!vendorUserId) return

    const lastReadAt = localStorage.getItem('notificationsLastRead')
    const lastRead = lastReadAt ? new Date(lastReadAt) : new Date(0)

    const { data, error } = await supabase
      .from('surat_pengajuan')
      .select('id, nomor_surat, status, updated_at, created_at')
      .eq('vendor_id', parseInt(vendorUserId))
      .order('updated_at', { ascending: false })
      .limit(15)

    if (error || !data) return

    const notifList: Notification[] = data.map(surat => {
      const msgMap: Record<string, string> = {
        APPROVED: `Surat ${surat.nomor_surat} telah disetujui`,
        REJECTED: `Surat ${surat.nomor_surat} ditolak. Cek alasan penolakan.`,
        PENDING: `Pengajuan ${surat.nomor_surat} sedang diproses`,
      }
      const updatedDate = new Date(surat.updated_at)
      const isUnread =
        updatedDate > lastRead &&
        (surat.status === 'APPROVED' || surat.status === 'REJECTED')

      return {
        id: surat.id as string,
        message: msgMap[surat.status] ?? `Surat ${surat.nomor_surat} diperbarui`,
        time: formatTimeAgo(surat.updated_at),
        unread: isUnread,
        status: surat.status as 'PENDING' | 'APPROVED' | 'REJECTED',
      }
    })

    setNotifications(notifList)
    setUnreadCount(notifList.filter(n => n.unread).length)
  }, [])

  // Initial load + auto-refresh every 60 seconds
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  useEffect(() => {
    const savedProfile = localStorage.getItem('vendorProfile')
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile)
        if (profile.picName) {
          setUserName(profile.picName)
          setUserInitial(profile.picName.charAt(0).toUpperCase())
        } else if (profile.companyName) {
          setUserName(profile.companyName)
          setUserInitial(profile.companyName.charAt(0).toUpperCase())
        }
        // Load profile image if available
        if (profile.profileImage) {
          setProfileImage(profile.profileImage)
        }
      } catch (error) {
        console.error('Error parsing profile:', error)
      }
    }
  }, [])

  useEffect(() => {
    const handleStorageChange = (): void => {
      const savedProfile = localStorage.getItem('vendorProfile')
      if (savedProfile) {
        try {
          const profile = JSON.parse(savedProfile)
          if (profile.picName) {
            setUserName(profile.picName)
            setUserInitial(profile.picName.charAt(0).toUpperCase())
          } else if (profile.companyName) {
            setUserName(profile.companyName)
            setUserInitial(profile.companyName.charAt(0).toUpperCase())
          }
          // Update profile image when changed
          if (profile.profileImage) {
            setProfileImage(profile.profileImage)
          } else {
            setProfileImage('')
          }
        } catch (error) {
          console.error('Error parsing profile:', error)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('profileUpdated', handleStorageChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('profileUpdated', handleStorageChange)
    }
  }, [])

  const getPageTitle = (): string => {
    switch (pathname) {
      case '/vendor-portal':
        return 'Dashboard'
      case '/vendor-portal/pengajuan':
        return 'Buat Pengajuan'
      case '/vendor-portal/profile':
        return 'Profil Perusahaan'
      default:
        return 'Portal Vendor'
    }
  }

  const handleLogout = (): void => {
    localStorage.removeItem('vendorLoggedIn')
    localStorage.removeItem('vendorEmail')
    router.push('/vendor-login')
  }

  const handleProfileClick = (): void => {
    setShowProfileMenu(false)
    router.push('/vendor-portal/profile')
  }

  const toggleProfileMenu = (): void => {
    setShowProfileMenu(!showProfileMenu)
  }

  const toggleNotifications = (): void => {
    if (!showNotifications) {
      // Mark all as read when opening the dropdown
      localStorage.setItem('notificationsLastRead', new Date().toISOString())
      setNotifications(prev => prev.map(n => ({ ...n, unread: false })))
      setUnreadCount(0)
    }
    setShowNotifications(!showNotifications)
  }

  return (
    <VendorHeaderContainer>
      <div className="vendor-header-content">
        <div className="vendor-header-left">
          <h1 className="page-title">{getPageTitle()}</h1>
        </div>

        <div className="vendor-header-right">
          <LogoGroup>
            <img src="/images/Logo_PLN.png" alt="PLN Logo" className="logo-pln" />
            <img src="/images/Logo_Danantara (2).png" alt="Danantara Logo" className="logo-danantara" />
            <div className="logo-text">
              <strong>PLN (Persero)</strong>
              <span>UPT Manado</span>
            </div>
          </LogoGroup>

          <div className="notification-container">
            <div className="notification-icon" onClick={toggleNotifications}>
              <Bell size={24} strokeWidth={2.5} />
              {unreadCount > 0 && (
                <span className="notification-badge">{unreadCount}</span>
              )}
            </div>

            {showNotifications && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifikasi</h3>
                  <span className="notification-count">{unreadCount} baru</span>
                </div>
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div style={{ padding: '24px 20px', textAlign: 'center', color: '#94a3b8', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
                      Belum ada notifikasi
                    </div>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} className={`notification-item ${notif.unread ? 'unread' : ''}`}>
                        <p>{notif.message}</p>
                        <span className="notification-time">{notif.time}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="user-profile" onClick={toggleProfileMenu}>
            {profileImage ? (
              <img src={profileImage} alt={userName} className="user-avatar" />
            ) : (
              <img src="/images/profil default instagram.jpg" alt={userName} className="user-avatar" />
            )}
            <div className="user-info">
              <span className="user-name">{userName}</span>
              <span className="user-role">Partner</span>
            </div>
            {showProfileMenu ? (
              <ChevronUp className="dropdown-arrow-svg" size={16} strokeWidth={2.5} />
            ) : (
              <ChevronDown className="dropdown-arrow-svg" size={16} strokeWidth={2.5} />
            )}
            {showProfileMenu && (
              <div className="profile-dropdown" onClick={(e: MouseEvent) => e.stopPropagation()}>
                <div className="dropdown-item" onClick={handleProfileClick}>
                  <User className="item-icon-svg" size={18} strokeWidth={2} />
                  <span>Profil Saya</span>
                </div>
                <div className="dropdown-item logout" onClick={handleLogout}>
                  <LogOut className="item-icon-svg" size={18} strokeWidth={2} />
                  <span>Logout</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </VendorHeaderContainer>
  )
}

export default VendorHeader
