"use client";

import { useEffect, useState } from "react";
import UserForm from "../users/UserForm";
import SettingsFormDialog, { type Field } from "./SettingsFormDialog";
import StaffForm from "./StaffForm";

type User = {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
};

type Staff = {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone: string;
    staff_type: string;
    hire_date: string;
    qualification: string;
    is_active: boolean;
};

type Class = {
    id: number;
    name: string;
    academic_year: string;
    homeroom_teacher: string;
};

type SettingsSection = {
    id: string;
    label: string;
    title: string;
    addLabel: string;
    fields: Field[];
    rows: string[][];
    headings: string[];
};

const sections: SettingsSection[] = [
    {
        id: "user",
        label: "User",
        title: "User",
        addLabel: "+ User",
        fields: [],
        headings: ["Name", "Email", "Role", "Status"],
        rows: [],
    },
    {
        id: "teacher-staff",
        label: "Teacher/Staff",
        title: "Teacher/Staff",
        addLabel: "+ Teacher/Staff",
        fields: [],
        headings: ["Name", "Email", "Phone", "Position", "Hire Date", "Qualification", "Status"],
        rows: [],
    },
    {
        id: "class",
        label: "Class",
        title: "Class & Academic Year",
        addLabel: "+ Class",
        fields: [],
        headings: ["Class", "Academic year", "Homeroom teacher"],
        rows: [],
    },
    {
        id: "report-layout",
        label: "Report Layout",
        title: "Report Layout",
        addLabel: "Add Layout",
        fields: [
            { key: "layoutName", label: "Layout name" },
            { key: "theme", label: "Theme", type: "select", options: ["Standard", "Minimal", "Modern"] },
            { key: "section", label: "Report section" },
            { key: "passingScore", label: "Minimum score", type: "number" },
        ],
        headings: ["Layout", "Theme", "Section", "Minimum score"],
        rows: [["Semester Report", "Standard", "Attendance", "75"]],
    },
];

export default function SettingsPage() {
    const [activeSection, setActiveSection] = useState(sections[0].id);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [savedSection, setSavedSection] = useState("");
    const [users, setUsers] = useState<User[]>([]);
    const [usersLoading, setUsersLoading] = useState(true);
    const [usersError, setUsersError] = useState("");
    const [userFormOpen, setUserFormOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Staff management state
    const [staffs, setStaffs] = useState<Staff[]>([]);
    const [staffsLoading, setStaffsLoading] = useState(true);
    const [staffsError, setStaffsError] = useState("");
    const [staffFormOpen, setStaffFormOpen] = useState(false);
    const [editingStaff, setEditingStaff] = useState<Staff | null>(null);

    // Class management state
    const [classes, setClasses] = useState<Class[]>([]);
    const [classesLoading, setClassesLoading] = useState(true);
    const [classesError, setClassesError] = useState("");
    const [classFormOpen, setClassFormOpen] = useState(false);
    const [editingClass, setEditingClass] = useState<Class | null>(null);

    async function loadUsers() {
        try {
            setUsersLoading(true);
            setUsersError("");

            const response = await fetch("/api/proxy/users", {
                credentials: "include",
                cache: "no-store",
            });

            if (response.status === 401) {
                window.location.href = "/login";
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to load users");
            }

            const data = await response.json();
            setUsers(Array.isArray(data) ? data : data.results ?? []);
        } catch (error) {
            console.error(error);
            setUsersError("Failed to load users.");
        } finally {
            setUsersLoading(false);
        }
    }

    async function loadStaffs() {
        try {
            setStaffsLoading(true);
            setStaffsError("");

            const response = await fetch("/api/proxy/staffs", {
                credentials: "include",
                cache: "no-store",
            });

            if (response.status === 401) {
                window.location.href = "/login";
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to load staffs");
            }

            const data = await response.json();
            setStaffs(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.results)
                        ? data.results
                        : Array.isArray(data.data)
                            ? data.data
                            : [],
            );
        } catch (error) {
            console.error(error);
            setStaffsError("Failed to load staffs.");
        } finally {
            setStaffsLoading(false);
        }
    }

    async function loadClasses() {
        try {
            setClassesLoading(true);
            setClassesError("");

            const response = await fetch("/api/proxy/classes", {
                credentials: "include",
                cache: "no-store",
            });

            if (response.status === 401) {
                window.location.href = "/login";
                return;
            }

            if (!response.ok) {
                throw new Error("Failed to load classes");
            }

            const data = await response.json();
            setClasses(Array.isArray(data) ? data : data.results ?? []);
        } catch (error) {
            console.error(error);
            setClassesError("Failed to load classes.");
        } finally {
            setClassesLoading(false);
        }
    }

    useEffect(() => {
        const timer = window.setTimeout(() => {
            void loadUsers();
            void loadStaffs();
            void loadClasses();
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const section = sections.find((item) => item.id === activeSection) ?? sections[0];
    const staffUsers = users.filter((user) => ["ADMIN", "STAFF", "TEACHER", "PARENT"].includes(user.role)); //Admin will remove

    return (
        <main>
            <section className="settings-page panel">
                <div className="panel-heading settings-header">
                    <div>
                        <h2>Settings</h2>
                        <p>Manage school configuration and master data.</p>
                    </div>
                </div>

                <div className="settings-tabs" role="tablist" aria-label="Settings sections">
                    {sections.map((item) => (
                        <button
                            key={item.id}
                            type="button"
                            role="tab"
                            aria-selected={activeSection === item.id}
                            className={`settings-tab ${activeSection === item.id ? "active" : ""}`}
                            onClick={() => {
                                setActiveSection(item.id);
                                setSavedSection("");
                            }}
                        >
                            {item.label}
                        </button>
                    ))}
                </div>

                <div className="settings-panel active">
                    <div className="setting-card">
                        <div className="setting-card__header">
                            <h3>{section.title}</h3>
                            <button
                                type="button"
                                className="button-primary"
                                onClick={() => {
                                    if (activeSection === "user") {
                                        setEditingUser(null);
                                        setUserFormOpen(true);
                                    } else if (activeSection === "teacher-staff") {
                                        setEditingStaff(null);
                                        setStaffFormOpen(true);
                                    } else if (activeSection === "class") {
                                        setEditingClass(null);
                                        setClassFormOpen(true);
                                    }
                                    else {
                                        setDialogOpen(true);
                                    }
                                }}
                            >
                                {section.addLabel}
                            </button>
                        </div>

                        {savedSection === section.id && (
                            <p className="settings-save-message" role="status">
                                Settings saved for this session.
                            </p>
                        )}

                        <div className="setting-list">
                            {activeSection === "user" ? (
                                usersLoading ? <p>Loading users...</p> : usersError ? (
                                    <div className="users-state">
                                        <p>{usersError}</p>
                                        <button type="button" className="secondary-button" onClick={loadUsers}>Try again</button>
                                    </div>
                                ) : (
                                    <table>
                                        <thead>
                                            <tr>{section.headings.map((heading) => <th key={heading}>{heading}</th>)}<th>Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {staffUsers.map((user) => (
                                                <tr key={user.id}>
                                                    <td>{user.first_name} {user.last_name}</td>
                                                    <td>{user.email}</td>
                                                    <td>{user.role}</td>
                                                    <td>{user.is_active ? "Active" : "Inactive"}</td>
                                                    <td><button type="button" className="text-button" onClick={() => {
                                                        setEditingUser(user);
                                                        setUserFormOpen(true);
                                                    }}>Edit</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )
                            ) : activeSection === "teacher-staff" ? (
                                staffsLoading ? <p>Loading staff...</p> : staffsError ? (
                                    <div className="staffs-state">
                                        <p>{staffsError}</p>
                                        <button type="button" className="secondary-button" onClick={loadStaffs}>Try again</button>
                                    </div>
                                ) : (
                                    <table>
                                        <thead>
                                            <tr>{section.headings.map((heading) => <th key={heading}>{heading}</th>)}<th>Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {staffs.map((staff) => (
                                                <tr key={staff.id}>
                                                    <td>{staff.first_name} {staff.last_name}</td>
                                                    <td>{staff.email}</td>
                                                    <td>{staff.phone}</td>
                                                    <td>{staff.staff_type}</td>
                                                    <td>{staff.hire_date}</td>
                                                    <td>{staff.qualification}</td>
                                                    <td>{staff.is_active ? "Active" : "Inactive"}</td>
                                                    <td><button type="button" className="text-button" onClick={() => {
                                                        setEditingStaff(staff);
                                                        setStaffFormOpen(true);
                                                    }}>Edit</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                ))
                                : activeSection === "class" ? (
                                    classesLoading ? <p>Loading classes...</p> : classesError ? (
                                        <div className="classes-state">
                                            <p>{classesError}</p>
                                            <button type="button" className="secondary-button" onClick={loadClasses}>Try again</button>
                                        </div>
                                    ) : (
                                        <table>
                                            <thead>
                                                <tr>{section.headings.map((heading) => <th key={heading}>{heading}</th>)}<th>Action</th></tr>
                                            </thead>
                                            <tbody>
                                                {classes.map((cls) => (
                                                    <tr key={cls.id}>
                                                        <td>{cls.name}</td>
                                                        <td>{cls.academic_year}</td>
                                                        <td>{cls.homeroom_teacher}</td>
                                                        <td><button type="button" className="text-button" onClick={() => {
                                                            setEditingClass(cls);
                                                            setClassFormOpen(true);
                                                        }}> Edit</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )
                                )
                                : (
                                    <table>
                                        <thead>
                                            <tr>{section.headings.map((heading) => <th key={heading}>{heading}</th>)}<th>Action</th></tr>
                                        </thead>
                                        <tbody>
                                            {section.rows.map((row) => (
                                                <tr key={row.join("-")}>
                                                    {row.map((cell) => <td key={cell}>{cell}</td>)}
                                                    <td><button type="button" className="text-button">Edit</button></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                        </div>
                    </div>
                </div>
            </section>

            {dialogOpen && (
                <SettingsFormDialog
                    title={section.addLabel}
                    fields={section.fields}
                    onCancel={() => setDialogOpen(false)}
                    onSave={() => {
                        setDialogOpen(false);
                        setSavedSection(section.id);
                    }}
                />
            )}
            {userFormOpen && (
                <UserForm
                    user={editingUser ?? undefined}
                    onCancel={() => {
                        setUserFormOpen(false);
                        setEditingUser(null);
                    }}
                    onSuccess={async () => {
                        setUserFormOpen(false);
                        setEditingUser(null);
                        await loadUsers();
                    }}
                />
            )}
            {staffFormOpen && (
                <StaffForm
                    staff={editingStaff ?? undefined}
                    onCancel={() => {
                        setStaffFormOpen(false);
                        setEditingStaff(null);
                    }}
                    onSuccess={async () => {
                        setStaffFormOpen(false);
                        setEditingStaff(null);
                        await loadStaffs();
                    }}
                />
            )}
        </main>
    );
}
