"use client";

import { useEffect, useState } from "react";
import { Ban, CircleCheck, FilePlus2, Pencil } from "lucide-react";
import styles from "../components/TableActions.module.css";
import UserForm from "../users/UserForm";
import SettingsFormDialog, { type Field } from "./SettingsFormDialog";
import StaffForm from "./StaffForm";
import ClassForm from "./ClassForm";
import FeeTypeForm from "./FeeTypeForm";
import GenerateInvoiceForm from "./GenerateInvoiceForm";

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
  class_name: string;
  academic_year_name: string;
  teacher_name: string;
};

type FeeType = {
  id: number;
  name: string;
  description: string;
  amount: number;
  branch: number;
  is_recurring: boolean;
  is_active: boolean;
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
    label: "Pengguna",
    title: "Pengguna",
    addLabel: "+ Pengguna",
    fields: [],
    headings: ["Nama", "Email", "Peran", "Status"],
    rows: [],
  },
  {
    id: "teacher-staff",
    label: "Guru/Staf",
    title: "Guru/Staf",
    addLabel: "+ Guru/Staf",
    fields: [],
    headings: [
      "Nama",
      "Email",
      "Telepon",
      "Jabatan",
      "Tanggal masuk",
      "Kualifikasi",
      "Status",
    ],
    rows: [],
  },
  {
    id: "class",
    label: "Kelas",
    title: "Kelas & Tahun Ajaran",
    addLabel: "+ Kelas",
    fields: [],
    headings: ["Kelas", "Tahun ajaran", "Wali kelas"],
    rows: [],
  },
  {
    id: "fee-type",
    label: "Jenis Biaya",
    title: "Jenis Biaya",
    addLabel: "+ Jenis Biaya",
    fields: [],
    headings: ["Nama", "Deskripsi", "Jumlah", "Berulang", "Status"],
    rows: [],
  },
//   {
//     id: "report-layout",
//     label: "Report Layout",
//     title: "Report Layout",
//     addLabel: "Add Layout",
//     fields: [
//       { key: "layoutName", label: "Layout name" },
//       {
//         key: "theme",
//         label: "Theme",
//         type: "select",
//         options: ["Standard", "Minimal", "Modern"],
//       },
//       { key: "section", label: "Report section" },
//       { key: "passingScore", label: "Minimum score", type: "number" },
//     ],
//     headings: ["Layout", "Theme", "Section", "Minimum score"],
//     rows: [["Semester Report", "Standard", "Attendance", "75"]],
//   },
];

function formatRole(role: string) {
  const labels: Record<string, string> = {
    ADMIN: "Admin",
    STAFF: "Staf",
    TEACHER: "Guru",
    STUDENT: "Siswa",
    PARENT: "Wali",
  };
  return labels[role] ?? role;
}

function formatStaffType(type: string) {
  const labels: Record<string, string> = {
    principal: "Kepala sekolah",
    teacher: "Guru",
    officer: "Staf",
  };
  return labels[type.toLowerCase()] ?? type;
}

function formatStatus(active: boolean) {
  return active ? "Aktif" : "Nonaktif";
}

export default function SettingsPage() {
  const [requestedSection, setActiveSection] = useState(sections[0].id);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const canManageSettings = userRole === "STAFF" || userRole === "ADMIN";
  const visibleSections = sections;
  const section = visibleSections.find((item) => item.id === requestedSection) ?? visibleSections[0];
  const activeSection = section.id;
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

  // Fee type management state
  const [feeTypes, setFeeTypes] = useState<FeeType[]>([]);
  const [feeTypesLoading, setFeeTypesLoading] = useState(true);
  const [feeTypesError, setFeeTypesError] = useState("");
  const [feeTypeFormOpen, setFeeTypeFormOpen] = useState(false);
  const [editingFeeType, setEditingFeeType] = useState<FeeType | null>(null);
  const [deactivatingFeeType, setDeactivatingFeeType] =
    useState<FeeType | null>(null);
  const [generatingInvoiceFeeType, setGeneratingInvoiceFeeType] =
    useState<FeeType | null>(null);
  const [feeTypeActionLoading, setFeeTypeActionLoading] = useState(false);
  const [feeTypeActionError, setFeeTypeActionError] = useState("");
  const [feeTypeActionMessage, setFeeTypeActionMessage] = useState("");

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
        throw new Error("Gagal memuat pengguna");
      }

      const data = await response.json();
      setUsers(Array.isArray(data) ? data : (data.results ?? []));
    } catch (error) {
      console.error(error);
      setUsersError("Gagal memuat pengguna.");
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
        throw new Error("Gagal memuat data staf");
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
      setStaffsError("Gagal memuat data staf.");
    } finally {
      setStaffsLoading(false);
    }
  }

  async function loadClasses() {
    try {
      setClassesLoading(true);
      setClassesError("");

      const response = await fetch("/api/proxy/class-teachers", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error("Gagal memuat kelas");
      }

      const data = await response.json();
      setClasses(Array.isArray(data) ? data : (data.results ?? []));
    } catch (error) {
      console.error(error);
      setClassesError("Gagal memuat kelas.");
    } finally {
      setClassesLoading(false);
    }
  }

  async function loadFeeTypes() {
    try {
      setFeeTypesLoading(true);
      setFeeTypesError("");

      const response = await fetch("/api/proxy/fee-types", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error("Gagal memuat jenis biaya");
      }

      const data = await response.json();
      setFeeTypes(
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
      setFeeTypesError("Gagal memuat jenis biaya.");
    } finally {
      setFeeTypesLoading(false);
    }
  }

  async function updateFeeTypeStatus() {
    if (!deactivatingFeeType) return;

    const shouldActivate = !deactivatingFeeType.is_active;
    const action = shouldActivate ? "mengaktifkan" : "menonaktifkan";

    try {
      setFeeTypeActionLoading(true);
      setFeeTypeActionError("");

      const response = await fetch(
        `/api/proxy/fee-types/${deactivatingFeeType.id}/`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ is_active: shouldActivate }),
        },
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(`Gagal ${action} jenis biaya`);
      }

      setDeactivatingFeeType(null);
      await loadFeeTypes();
    } catch (error) {
      console.error(error);
      setFeeTypeActionError(`Gagal ${action} jenis biaya.`);
    } finally {
      setFeeTypeActionLoading(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadSession() {
      try {
        const response = await fetch("/api/auth/session", {
          credentials: "include",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (controller.signal.aborted) return;
        const role = data.user?.role ?? null;
        setUserRole(role);
        if (role === "STAFF" || role === "ADMIN") {
          void loadUsers();
          void loadFeeTypes();
          void loadStaffs();
          void loadClasses();
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error("Gagal memuat sesi pengguna", error);
      } finally {
        if (!controller.signal.aborted) setSessionLoading(false);
      }
    }
    const timer = window.setTimeout(() => {
      void loadSession();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, []);

  const staffUsers = users.filter((user) =>
    ["ADMIN", "STAFF", "TEACHER", "PARENT"].includes(user.role) &&
      (userRole?.toUpperCase() === "ADMIN" || user.role.toUpperCase() !== "ADMIN"),
  );

  if (sessionLoading || !canManageSettings) {
    return (
      <main>
        <section className="settings-page panel">
          <h2>Pengaturan</h2>
          <p role="status">{sessionLoading ? "Memuat pengaturan..." : "Pengaturan hanya tersedia untuk Admin dan Staf."}</p>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section className="settings-page panel">
        <div className="panel-heading settings-header">
          <div>
            <h2>Pengaturan</h2>
            <p>Kelola konfigurasi sekolah dan data utama.</p>
          </div>
        </div>

        <div
          className="settings-tabs"
          role="tablist"
          aria-label="Bagian pengaturan"
        >
          {visibleSections.map((item) => (
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
                  } else if (activeSection === "fee-type") {
                    setEditingFeeType(null);
                    setFeeTypeFormOpen(true);
                  } else {
                    setDialogOpen(true);
                  }
                }}
              >
                {section.addLabel}
              </button>
            </div>

            {savedSection === section.id && (
              <p className="settings-save-message" role="status">
                Pengaturan tersimpan untuk sesi ini.
              </p>
            )}

            <div className="setting-list">
              {activeSection === "user" ? (
                usersLoading ? (
                            <p>Memuat pengguna...</p>
                ) : usersError ? (
                  <div className="users-state">
                    <p>{usersError}</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={loadUsers}
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        {section.headings.map((heading) => (
                          <th key={heading}>{heading}</th>
                        ))}
                        <th className={styles.actionHeading}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffUsers.map((user) => (
                        <tr key={user.id}>
                          <td>
                            {user.first_name} {user.last_name}
                          </td>
                          <td>{user.email}</td>
                          <td>{formatRole(user.role)}</td>
                          <td>{formatStatus(user.is_active)}</td>
                          <td className={styles.actionCell}>
                            <button
                              type="button"
                              className={styles.actionButton}
                              aria-label={`Edit ${user.first_name + " " + user.last_name}`}
                              title="Edit"
                              onClick={() => {
                                setEditingUser(user);
                                setUserFormOpen(true);
                              }}
                            >
                              <Pencil aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeSection === "teacher-staff" ? (
                staffsLoading ? (
                            <p>Memuat staf...</p>
                ) : staffsError ? (
                  <div className="staffs-state">
                    <p>{staffsError}</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={loadStaffs}
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        {section.headings.map((heading) => (
                          <th key={heading}>{heading}</th>
                        ))}
                        <th className={styles.actionHeading}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffs.map((staff) => (
                        <tr key={staff.id}>
                          <td>
                            {staff.first_name} {staff.last_name}
                          </td>
                          <td>{staff.email}</td>
                          <td>{staff.phone}</td>
                          <td>{formatStaffType(staff.staff_type)}</td>
                          <td>{staff.hire_date}</td>
                          <td>{staff.qualification}</td>
                          <td>{formatStatus(staff.is_active)}</td>
                          <td className={styles.actionCell}>
                            <button
                              type="button"
                              className={styles.actionButton}
                              aria-label={`Edit ${staff.first_name + " " + staff.last_name}`}
                              title="Edit"
                              onClick={() => {
                                setEditingStaff(staff);
                                setStaffFormOpen(true);
                              }}
                            >
                              <Pencil aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeSection === "class" ? (
                classesLoading ? (
                            <p>Memuat kelas...</p>
                ) : classesError ? (
                  <div className="classes-state">
                    <p>{classesError}</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={loadClasses}
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        {section.headings.map((heading) => (
                          <th key={heading}>{heading}</th>
                        ))}
                        <th className={styles.actionHeading}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classes.map((cls) => (
                        <tr key={cls.id}>
                          <td>{cls.class_name}</td>
                          <td>{cls.academic_year_name}</td>
                          <td>{cls.teacher_name}</td>
                          <td className={styles.actionCell}>
                            <button
                              type="button"
                              className={styles.actionButton}
                              aria-label={`Edit ${cls.class_name}`}
                              title="Edit"
                              onClick={() => {
                                setEditingClass(cls);
                                setClassFormOpen(true);
                              }}
                            >
                              <Pencil aria-hidden="true" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : activeSection === "fee-type" ? (
                feeTypesLoading ? (
                            <p>Memuat jenis biaya...</p>
                ) : feeTypesError ? (
                  <div className="fee-types-state">
                    <p>{feeTypesError}</p>
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={loadFeeTypes}
                    >
                      Coba lagi
                    </button>
                  </div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        {section.headings.map((heading) => (
                          <th key={heading}>{heading}</th>
                        ))}
                        <th className={styles.actionHeading}>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {feeTypes.map((feeType) => (
                        <tr key={feeType.id}>
                          <td>{feeType.name}</td>
                          <td>{feeType.description}</td>
                          <td>{feeType.amount}</td>
                          <td>{feeType.is_recurring ? "Ya" : "Tidak"}</td>
                          <td>{formatStatus(feeType.is_active)}</td>
                          <td>
                            <div className={styles.actions} role="group" aria-label={`Aksi untuk ${feeType.name}`}>
                              <button
                                className={styles.actionButton}
                                type="button"
                                aria-label={`Edit ${feeType.name}`}
                                title="Edit"
                                onClick={() => {
                                  setEditingFeeType(feeType);
                                  setFeeTypeFormOpen(true);
                                }}
                              ><Pencil aria-hidden="true" /></button>
                              <button
                                className={`${styles.actionButton} ${feeType.is_active ? styles.dangerButton : ""}`}
                                type="button"
                                aria-label={`${feeType.is_active ? "Nonaktifkan" : "Aktifkan"} ${feeType.name}`}
                                title={feeType.is_active ? "Nonaktifkan" : "Aktifkan"}
                                onClick={() => {
                                  setFeeTypeActionError("");
                                  setDeactivatingFeeType(feeType);
                                }}
                              >{feeType.is_active ? <Ban aria-hidden="true" /> : <CircleCheck aria-hidden="true" />}</button>
                              <button
                                className={styles.actionButton}
                                type="button"
                                aria-label={`Buat tagihan untuk ${feeType.name}`}
                                title={feeType.is_recurring ? "Tidak tersedia untuk biaya berulang" : "Buat Tagihan"}
                                disabled={feeType.is_recurring}
                                onClick={() => {
                                  setFeeTypeActionError("");
                                  setFeeTypeActionMessage("");
                                  setGeneratingInvoiceFeeType(feeType);
                                }}
                              ><FilePlus2 aria-hidden="true" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )
              ) : (
                <table>
                  <thead>
                    <tr>
                      {section.headings.map((heading) => (
                        <th key={heading}>{heading}</th>
                      ))}
                      <th className={styles.actionHeading}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.rows.map((row) => (
                      <tr key={row.join("-")}>
                        {row.map((cell) => (
                          <td key={cell}>{cell}</td>
                        ))}
                        <td className={styles.actionCell}>
                          <button type="button" className={styles.actionButton} aria-label={`Edit ${row[0]}`} title="Edit">
                            <Pencil aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {feeTypeActionMessage && activeSection === "fee-type" && (
              <p className="settings-save-message" role="status">
                {feeTypeActionMessage}
              </p>
            )}
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
      {canManageSettings && userFormOpen && (
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
      {classFormOpen && (
        <ClassForm
          classData={editingClass ?? undefined}
          onCancel={() => {
            setClassFormOpen(false);
            setEditingClass(null);
          }}
          onSuccess={async () => {
            setClassFormOpen(false);
            setEditingClass(null);
            await loadClasses();
          }}
        />
      )}
      {canManageSettings && feeTypeFormOpen && (
        <FeeTypeForm
          feeType={editingFeeType ?? undefined}
          onCancel={() => {
            setFeeTypeFormOpen(false);
            setEditingFeeType(null);
          }}
          onSuccess={async () => {
            setFeeTypeFormOpen(false);
            setEditingFeeType(null);
            await loadFeeTypes();
          }}
        />
      )}
      {canManageSettings && deactivatingFeeType && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <div>
                <h2>{deactivatingFeeType.is_active ? "Nonaktifkan" : "Aktifkan"} jenis biaya?</h2>
                <p>
                  Tindakan ini akan {deactivatingFeeType.is_active ? "menonaktifkan" : "mengaktifkan"}{" "}
                  {deactivatingFeeType.name}.
                </p>
              </div>
              <button
                type="button"
                className="modal-close"
                onClick={() => setDeactivatingFeeType(null)}
                disabled={feeTypeActionLoading}
              >
                ×
              </button>
            </div>
            {feeTypeActionError && (
              <div className="form-error">{feeTypeActionError}</div>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setDeactivatingFeeType(null)}
                disabled={feeTypeActionLoading}
              >
                Batal
              </button>
              <button
                type="button"
                className={`button-primary ${deactivatingFeeType.is_active ? "danger-button" : ""}`}
                onClick={updateFeeTypeStatus}
                disabled={feeTypeActionLoading}
              >
                {feeTypeActionLoading
                  ? deactivatingFeeType.is_active
                    ? "Menonaktifkan..."
                    : "Mengaktifkan..."
                  : deactivatingFeeType.is_active
                    ? "Nonaktifkan"
                    : "Aktifkan"}
              </button>
            </div>
          </div>
        </div>
      )}
      {canManageSettings && generatingInvoiceFeeType && (
        <GenerateInvoiceForm
          feeType={generatingInvoiceFeeType}
          classes={classes}
          onCancel={() => setGeneratingInvoiceFeeType(null)}
          onSuccess={() => {
            const feeTypeName = generatingInvoiceFeeType.name;
            setGeneratingInvoiceFeeType(null);
            setFeeTypeActionMessage(`Tagihan untuk ${feeTypeName} berhasil dibuat.`);
          }}
        />
      )}
    </main>
  );
}
