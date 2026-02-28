'use client'
import React, { FC } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, User, LucideIcon } from 'lucide-react'
import styled from 'styled-components'

interface MenuItem {
  path: string
  icon: LucideIcon
  label: string
}

const VendorSidebarWrapper = styled.aside`
  width: 280px;
  height: 100vh;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  box-shadow: none;
  z-index: 1000;
  transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  border-right: 1px solid #e2e8f0;
  overflow: hidden;

  .vendor-sidebar-header {
    height: 80px;
    padding: 0 20px;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    border-bottom: 1px solid #f1f5f9;
    cursor: pointer;
  }

  .vendor-sidebar-logo {
    display: flex;
    align-items: center;
    gap: 12px;
    width: 100%;
    justify-content: center;
  }

  .vendor-sidebar-logo-img {
    width: 120px;
    height: auto;
    object-fit: contain;
    background: transparent;
    flex-shrink: 0;
  }

  .vendor-sidebar-logo-info {
    display: none;
  }

  .vendor-nav {
    flex: 1;
    padding: 24px 12px;
    overflow-y: auto;
    overflow-x: hidden;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .vendor-nav-item {
    display: flex;
    align-items: center;
    gap: 14px;
    padding: 12px 16px;
    color: #64748b;
    text-decoration: none;
    transition: all 0.2s;
    cursor: pointer;
    border-radius: 12px;
    font-family: var(--font-inter);
    justify-content: flex-start;
    height: 48px;
  }

  .vendor-nav-item:hover {
    background: #f8fafc;
    color: #3b82f6;
  }

  .vendor-nav-item.active {
    background: #eff6ff;
    color: #3b82f6;
    font-weight: 600;
  }

  .vendor-nav-icon {
    flex-shrink: 0;
    transition: color 0.2s;
  }

  .vendor-nav-text {
    font-size: 15px;
    font-weight: 500;
    white-space: nowrap;
  }

  .vendor-sidebar-footer {
    padding: 20px;
    border-top: 1px solid #f1f5f9;
  }

  .vendor-user-profile {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    background: #f8fafc;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .vendor-user-profile:hover {
    background: #f1f5f9;
  }

  .vendor-user-avatar {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    background: #1e293b;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 16px;
    font-weight: 600;
    font-family: var(--font-inter);
    flex-shrink: 0;
  }

  .vendor-user-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .vendor-user-name {
    font-size: 14px;
    font-weight: 600;
    color: #1e293b;
    font-family: var(--font-inter);
  }

  .vendor-user-role {
    font-size: 12px;
    color: #64748b;
    font-family: var(--font-inter);
  }

  /* Scrollbar Styling */
  .vendor-nav::-webkit-scrollbar {
    width: 6px;
  }

  .vendor-nav::-webkit-scrollbar-track {
    background: transparent;
  }

  .vendor-nav::-webkit-scrollbar-thumb {
    background: #e2e8f0;
    border-radius: 3px;
  }

  .vendor-nav::-webkit-scrollbar-thumb:hover {
    background: #cbd5e1;
  }

  /* Responsive */
  @media (max-width: 768px) {
    transform: translateX(-100%);

    &.active {
      transform: translateX(0);
    }
  }
`;

const VendorSidebar: FC = () => {
  const pathname = usePathname()

  const menuItems: MenuItem[] = [
    { path: '/vendor-portal', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/vendor-portal/pengajuan', icon: FileText, label: 'Buat Pengajuan' },
    { path: '/vendor-portal/profile', icon: User, label: 'Profil Perusahaan' },
  ]

  return (
    <VendorSidebarWrapper className="vendor-sidebar">
      <div className="vendor-sidebar-header">
        <div className="vendor-sidebar-logo">
          <img src="/images/Logo SAKTI 2.png" alt="SAKTI Logo" className="vendor-sidebar-logo-img" />
          <div className="vendor-sidebar-logo-info">
            <div className="vendor-sidebar-logo-text">PLN SAKTI</div>
            <div className="vendor-sidebar-logo-desc">Sistem Arsip & Kontrak</div>
          </div>
        </div>
      </div>

      <nav className="vendor-nav">
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = item.path === '/vendor-portal'
            ? pathname === '/vendor-portal'
            : pathname.startsWith(item.path)

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`vendor-nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={22} strokeWidth={2} className="vendor-nav-icon" />
              <span className="vendor-nav-text">{item.label}</span>
            </Link>
          )
        })}
      </nav>
    </VendorSidebarWrapper>
  )
}

export default VendorSidebar
