"use client";

import { useEffect, useState } from "react";
import UserForm from "./UserForm";

type User = {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
    is_active: boolean;
};

type UsersResponse = {
    count: number;
    next: string | null;
    previous: string | null;
    results: User[];
};

const roles = ["ALL", "ADMIN", "STAFF", "TEACHER", "STUDENT", "PARENT"];

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [role, setRole] = useState("ALL");
    const [status, setStatus] = useState("ALL");
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [actionUser, setActionUser] = useState<User | null>(null);
    const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);

    async function loadUsers() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch("/api/proxy/users", {
                method: "GET",
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

            setUsers(
                Array.isArray(data)
                    ? data
                    : Array.isArray(data.results)
                        ? data.results
                        : []
            );
        } catch (err) {
            console.error(err);
            setError("Failed to load users.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        const timer = window.setTimeout(() => void loadUsers(), 0);
        return () => window.clearTimeout(timer);
    }, []);

    const filteredUsers = users.filter((user) => {
        const fullName =
            `${user.first_name} ${user.last_name}`.toLowerCase();

        const matchesSearch =
            fullName.includes(search.toLowerCase()) ||
            user.email.toLowerCase().includes(search.toLowerCase());

        const matchesRole =
            role === "ALL" || user.role === role;

        const matchesStatus =
            status === "ALL" ||
            (status === "ACTIVE" && user.is_active) ||
            (status === "INACTIVE" && !user.is_active);

        return matchesSearch && matchesRole && matchesStatus;
    });

    return (
        <main className="dashboard-page">
            {/* Header */}
            <div className="page-header">
                <div>
                    <p className="page-eyebrow">Management</p>

                    <h1>Users</h1>

                    <p>
                        Manage users and their access to ClassPing.
                    </p>
                </div>

                <button
                    className="button-primary"
                    onClick={() => setShowCreateForm(true)}
                >
                    + Create User
                </button>
            </div>

            {/* Users panel */}
            <section className="panel">
                {/* Toolbar */}
                <div className="users-toolbar">
                    <div className="search-box">
                        <span>⌕</span>

                        <input
                            type="text"
                            placeholder="Search users..."
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                        />
                    </div>

                    <select
                        value={role}
                        onChange={(event) =>
                            setRole(event.target.value)
                        }
                    >
                        {roles.map((item) => (
                            <option key={item} value={item}>
                                {item === "ALL" ? "All roles" : item}
                            </option>
                        ))}
                    </select>

                    <select
                        value={status}
                        onChange={(event) =>
                            setStatus(event.target.value)
                        }
                    >
                        <option value="ALL">All status</option>
                        <option value="ACTIVE">Active</option>
                        <option value="INACTIVE">Inactive</option>
                    </select>
                </div>

                {/* Results */}
                {loading ? (
                    <div className="users-state">
                        <p>Loading users...</p>
                    </div>
                ) : error ? (
                    <div className="users-state">
                        <p>{error}</p>

                        <button
                            className="secondary-button"
                            onClick={loadUsers}
                        >
                            Try again
                        </button>
                    </div>
                ) : filteredUsers.length === 0 ? (
                    <div className="users-state">
                        <div className="empty-state-icon">👥</div>

                        <h3>No users found</h3>

                        <p>
                            Try changing your search or filters.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Status</th>
                                        <th />
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id}>
                                            <td>
                                                <div className="user-name">
                                                    <div className="user-avatar">
                                                        {user.first_name
                                                            ?.charAt(0)
                                                            .toUpperCase()}
                                                    </div>

                                                    <strong>
                                                        {user.first_name}{" "}
                                                        {user.last_name}
                                                    </strong>
                                                </div>
                                            </td>

                                            <td>{user.email}</td>

                                            <td>
                                                <span className="role-badge">
                                                    {user.role}
                                                </span>
                                            </td>

                                            <td>
                                                <span
                                                    className={
                                                        user.is_active
                                                            ? "status-badge"
                                                            : "status-badge muted"
                                                    }
                                                >
                                                    {user.is_active
                                                        ? "Active"
                                                        : "Inactive"}
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    className="table-action"
                                                    aria-label={`Actions for ${user.email}`}
                                                    onClick={() => setEditingUser(user)}
                                                >
                                                    ⋮
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="users-footer">
                            <span>
                                Showing {filteredUsers.length} of{" "}
                                {users.length} users
                            </span>

                            <div className="pagination">
                                <button disabled>←</button>
                                <button className="active">1</button>
                                <button>2</button>
                                <button>3</button>
                                <button>→</button>
                            </div>
                        </div>
                    </>
                )}
            </section>
            {showCreateForm && (
                <UserForm
                    onCancel={() => setShowCreateForm(false)}
                    onSuccess={async () => {
                        setShowCreateForm(false);
                        await loadUsers();
                    }}
                />
            )}
            {editingUser && (
                <UserForm
                    user={editingUser}
                    onCancel={() => setEditingUser(null)}
                    onSuccess={async () => {
                        setEditingUser(null);
                        await loadUsers();
                    }}
                />
            )}
        </main>
    );
}
