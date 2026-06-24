import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    FolderOpen,
    ClipboardList,
    FileText,
    BarChart3,
    Settings,
    GraduationCap,
    Calendar,
} from 'lucide-react';
import Navbar from '../layout/Navbar';
import { authApi } from '../../services/authApi';
import { teacherApi } from '../../services/teacherApi';
import '../../styles/lms.css';

const BADGE_CACHE_KEY = 'lmsSidebarBadgeCounts';
let inMemoryBadgeCounts = null;

const NAV_ITEMS = [
    { label: 'Tổng quan', path: '/lms/teacher', icon: LayoutDashboard },
    { label: 'Lớp học', path: '/lms/teacher/classes', icon: Users, badgeKey: 'classes' },
    { label: 'Kỳ thi', path: '/teacher/exams', icon: Calendar },
    { label: 'Đề thi', path: '/lms/teacher/tests', icon: FolderOpen },
    { label: 'Bài tập', path: '/lms/teacher/assignments', icon: ClipboardList },
    { label: 'Bài nộp', path: '/lms/teacher/submissions', icon: FileText, badgeKey: 'submissions' },
    { label: 'Báo cáo', path: '/lms/teacher/analytics', icon: BarChart3 },
    { label: 'Cài đặt', path: '/lms/teacher/settings', icon: Settings },
];

export default function LmsLayout({ title, subtitle, children }) {
    const location = useLocation();
    const [badgeCounts, setBadgeCounts] = useState(() => {
        if (inMemoryBadgeCounts) return inMemoryBadgeCounts;
        try {
            const raw = localStorage.getItem(BADGE_CACHE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (typeof parsed?.classes === 'number' && typeof parsed?.submissions === 'number') {
                    inMemoryBadgeCounts = parsed;
                    return parsed;
                }
            }
        } catch {
            // Ignore malformed cache.
        }
        return { classes: 0, submissions: 0 };
    });

    useEffect(() => {
        let mounted = true;

        const loadBadgeCounts = async () => {
            const [classResult, submissionResult] = await Promise.allSettled([
                authApi.getMyClassManagement(),
                teacherApi.getAllSubmissions(),
            ]);

            if (!mounted) return;

            const classes = classResult.status === 'fulfilled'
                ? (classResult.value?.classes?.length ?? 0)
                : 0;

            const submissions = submissionResult.status === 'fulfilled'
                ? ((submissionResult.value?.writingSubmissions?.length ?? 0) + (submissionResult.value?.examAttempts?.length ?? 0))
                : 0;

            const nextCounts = { classes, submissions };
            inMemoryBadgeCounts = nextCounts;
            try {
                localStorage.setItem(BADGE_CACHE_KEY, JSON.stringify(nextCounts));
            } catch {
                // Ignore storage failures.
            }

            setBadgeCounts(nextCounts);
        };

        loadBadgeCounts();

        return () => {
            mounted = false;
        };
    }, []);

    const navItems = useMemo(() => {
        return NAV_ITEMS.map((item) => ({
            ...item,
            badge: item.badgeKey ? badgeCounts[item.badgeKey] : null,
        }));
    }, [badgeCounts]);

    return (
        <div className="lms-root">
            <Navbar />
            <div className="lms-shell">
                <aside className="lms-sidebar">
                    <div className="lms-brand">
                        <div className="lms-brand-mark" aria-label="DAVictory LMS logo">
                            <GraduationCap size={20} strokeWidth={2.2} />
                        </div>
                        <div className="lms-brand-title">
                            DAVictory LMS
                            <span className="lms-brand-sub">Không gian giảng viên</span>
                        </div>
                    </div>
                    <nav className="lms-nav">
                        {navItems.map((item) => {
                            const active = location.pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <Link key={item.path} to={item.path} className={`lms-nav-item${active ? ' active' : ''}`}>
                                    <Icon size={18} />
                                    <span>{item.label}</span>
                                    {item.badgeKey && <span className="lms-nav-badge">{item.badge}</span>}
                                </Link>
                            );
                        })}
                    </nav>
                </aside>
                <main className="lms-content">
                    <div className="lms-topbar">
                        <div>
                            <h1 className="lms-title">{title}</h1>
                            {subtitle && <p className="lms-subtitle">{subtitle}</p>}
                        </div>
                    </div>
                    {children}
                </main>
            </div>
        </div>
    );
}
