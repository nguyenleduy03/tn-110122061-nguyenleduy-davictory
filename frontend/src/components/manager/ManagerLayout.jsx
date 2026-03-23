import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    School,
    ClipboardCheck,
    LineChart,
    ShieldCheck,
    Activity,
} from 'lucide-react';
import Navbar from '../layout/Navbar';
import '../../styles/manager.css';

const NAV_ITEMS = [
    { label: 'Tổng quan', path: '/manager', icon: LayoutDashboard },
    { label: 'Lớp học', path: '/manager/classes', icon: School },
    { label: 'Điều phối', path: '/manager/operations', icon: ClipboardCheck },
    { label: 'Báo cáo', path: '/manager/reports', icon: LineChart },
    { label: 'Hệ thống', path: '/debug', icon: Activity },
];

export default function ManagerLayout({ title, subtitle, children }) {
    const location = useLocation();

    return (
        <div className="manager-root">
            <Navbar />
            <div className="manager-shell">
                <aside className="manager-sidebar">
                    <div className="manager-brand">
                        <div className="manager-brand-mark">
                            <ShieldCheck size={18} />
                        </div>
                        <div className="manager-brand-copy">
                            <div className="manager-brand-title">DAVictory Quản lý</div>
                            <div className="manager-brand-sub">Điều phối vận hành học tập</div>
                        </div>
                    </div>

                    <nav className="manager-nav">
                        {NAV_ITEMS.map((item) => {
                            const Icon = item.icon;
                            const isActive =
                                location.pathname === item.path ||
                                (item.path !== '/manager' && location.pathname.startsWith(item.path));

                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`manager-nav-item${isActive ? ' active' : ''}`}
                                >
                                    <Icon size={17} />
                                    <span>{item.label}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </aside>

                <main className="manager-content">
                    <header className="manager-topbar">
                        <div>
                            <h1 className="manager-title">{title}</h1>
                            {subtitle && <p className="manager-subtitle">{subtitle}</p>}
                        </div>
                    </header>

                    {children}
                </main>
            </div>
        </div>
    );
}
