"use client";

import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { SessionUser } from "@/lib/session";
import { loadCurrentBranch, branchUpdatedEvent, type Branch } from "../profile/branchApi";
import {
  defaultSchoolProfile,
  getInitials,
  type SchoolProfile,
} from "./school-store";

type SchoolHeaderProps = {
  onMenuClick: () => void;
};

export default function SchoolHeader({ onMenuClick }: SchoolHeaderProps) {
  const router = useRouter();
  const actionsRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState<SchoolProfile>(defaultSchoolProfile);
  const [profileOpen, setProfileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [branch, setBranch] = useState<Branch | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    let updated = false;
    const onBranchUpdated = (event: Event) => {
      updated = true;
      setBranch((event as CustomEvent<Branch>).detail);
    };
    window.addEventListener(branchUpdatedEvent, onBranchUpdated);
    void loadCurrentBranch(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted && !updated) setBranch(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) console.error("Gagal memuat nama cabang", error);
      });
    return () => {
      controller.abort();
      window.removeEventListener(branchUpdatedEvent, onBranchUpdated);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    function updateProfile(user: SessionUser) {
      const roleLabels: Record<string, string> = {
        ADMIN: "Administrator", STAFF: "Staf", TEACHER: "Guru", PARENT: "Wali", STUDENT: "Siswa",
      };
      setProfile({
        name: user.full_name.trim() || [user.first_name, user.last_name].filter(Boolean).join(" ") || user.email,
        email: user.email, phone: "", role: roleLabels[user.role] ?? user.role,
      });
    }
    let updated = false;
    const onUserUpdated = (event: Event) => {
      updated = true;
      updateProfile((event as CustomEvent<SessionUser>).detail);
    };
    window.addEventListener("classping-user-updated", onUserUpdated);
    async function loadProfile() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const { user }: { user: SessionUser | null } = await response.json();
        if (!user || controller.signal.aborted) return;
        if (!updated) updateProfile(user);
      } catch (error) {
        if (!controller.signal.aborted) console.error("Gagal memuat profil pengguna", error);
      }
    }
    void loadProfile();
    return () => {
      controller.abort();
      window.removeEventListener("classping-user-updated", onUserUpdated);
    };
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!actionsRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    }
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  async function logout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <>
      <header className="topbar">
        <button className="mobile-menu" type="button" aria-label="Buka menu" onClick={onMenuClick}>
          <Menu aria-hidden="true" />
        </button>
        <div className="topbar-school">
          <span className="school-avatar">{branch ? getInitials(branch.name) : "CP"}</span>
          <div><strong>{branch?.name || "Portal Sekolah"}</strong><small>Tahun Ajaran 2026/2027</small></div>
        </div>
        <div className="topbar-actions" ref={actionsRef}>
          <button
            className="profile profile-button"
            type="button"
            aria-label="Buka menu profil"
            aria-expanded={profileOpen}
            aria-haspopup="true"
            onClick={() => {
              setProfileOpen((open) => !open);
            }}
          >
            <span className="profile-avatar">{getInitials(profile.name)}</span>
            <span className="profile-copy"><strong>{profile.name}</strong><small>{profile.role}</small></span>
            <ChevronDown aria-hidden="true" />
          </button>

          {profileOpen && (
            <section className="school-profile-menu" role="menu" aria-label="Menu profil pengguna">
              <button type="button" role="menuitem" className="school-profile-menu__head" aria-label="Lihat profil pengguna" onClick={() => {
                setProfileOpen(false);
                router.push("/dashboard/user-profile");
              }}>
                <span className="profile-avatar">{getInitials(profile.name)}</span>
                <div><strong>{profile.name}</strong><small>{profile.role}</small><span>{profile.email}</span></div>
              </button>
              <button type="button" role="menuitem" className="danger" onClick={logout} disabled={loggingOut}>
                <span><LogOut aria-hidden="true" /></span><span><strong>{loggingOut ? "Keluar…" : "Keluar"}</strong><small>Akhiri sesi di perangkat ini</small></span>
              </button>
            </section>
          )}
        </div>
      </header>


    </>
  );
}
