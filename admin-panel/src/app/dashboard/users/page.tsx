"use client";

import { useEffect, useState, useMemo } from "react";
import { useAdminStore } from "@/store/adminStore";
import { 
  Users, 
  Shield, 
  ToggleLeft, 
  ToggleRight, 
  Lock,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { User } from "@/services/mockData";

export default function UsersPage() {
  const { users, fetchUsers, toggleUserStatus, updateUserRole, isAuthenticated } = useAdminStore();
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 10;
  
  useEffect(() => {
    if (isAuthenticated) {
      fetchUsers();
    }
  }, [fetchUsers, isAuthenticated]);

  const totalPages = Math.max(1, Math.ceil(users.length / usersPerPage));
  
  const currentUsers = useMemo(() => {
    const indexOfLast = currentPage * usersPerPage;
    const indexOfFirst = indexOfLast - usersPerPage;
    return users.slice(indexOfFirst, indexOfLast);
  }, [users, currentPage, usersPerPage]);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(c => c + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(c => c - 1);
  };

  const handleStatusToggle = (id: string, name: string) => {
    toggleUserStatus(id);
    const user = users.find(u => u.id === id);
    // Zustand toggled status so the state reflects the opposite of current
    const nextStatus = user?.status === "Active" ? "Inactive" : "Active";
    toast.success(`User "${name}" has been set to ${nextStatus}`);
  };

  const handleRoleChange = (id: string, role: User['role']) => {
    updateUserRole(id, role);
    toast.success(`Role updated to ${role}`);
  };

  return (
    <div className="space-y-6 select-none font-ui relative">
      <Toaster position="top-right" />

      {/* Header Row */}
      <div>
        <h2 className="font-heading text-3xl font-bold text-primary-navy">Users & Permissions</h2>
        <p className="text-xs text-primary-navy/40 mt-1 font-light">Manage administrator accounts, assign access scopes, and audit profiles.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Side: Users List Table - Spans 2 cols */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-border-custom rounded-card shadow-soft overflow-hidden">
            <div className="p-5 border-b border-border-custom/50">
              <h3 className="text-xs font-semibold text-primary-navy/70 uppercase tracking-wider">
                Administrators Directory
              </h3>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border-custom bg-background/30 text-[10px] uppercase tracking-wider font-semibold text-primary-navy/40">
                    <th className="py-4 px-6 font-medium">User Profile</th>
                    <th className="py-4 px-4 font-medium">Role</th>
                    <th className="py-4 px-4 font-medium">Permissions Scope</th>
                    <th className="py-4 px-4 font-medium">Status</th>
                    <th className="py-4 px-4 font-medium">Last Active</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-custom/50 text-xs">
                  {currentUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-primary-navy/[0.005]">
                      {/* Profile Column */}
                      <td className="py-4 px-6 flex items-center gap-3">
                        {user.avatar ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="w-9 h-9 rounded-full object-cover border border-border-custom flex-shrink-0"
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-full bg-primary-navy text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {user.name?.charAt(0).toUpperCase() || 'U'}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-primary-navy truncate">{user.name}</p>
                          <p className="text-[10px] text-primary-navy/40 mt-0.5 truncate">{user.email}</p>
                        </div>
                      </td>

                      {/* Role Dropdown */}
                      <td className="py-4 px-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as User['role'])}
                          className="bg-transparent border border-border-custom rounded-lg px-2.5 py-1 text-xs text-primary-navy cursor-pointer focus:border-accent-gold/40 outline-none"
                          disabled={user.name === "Admin"} // Protect first admin
                        >
                          <option value="ADMIN">ADMIN</option>
                          <option value="USER">USER</option>
                        </select>
                      </td>

                      {/* Permissions List */}
                      <td className="py-4 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(user.permissions || []).map((perm) => (
                            <span 
                              key={perm}
                              className="px-1.5 py-0.5 bg-primary-navy/5 border border-border-custom rounded text-[8px] font-mono text-primary-navy/60 uppercase"
                            >
                              {perm}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Status Toggle */}
                      <td className="py-4 px-4">
                        <button
                          onClick={() => handleStatusToggle(user.id, user.name || user.email)}
                          className="p-1 rounded text-primary-navy/50 hover:text-primary-navy cursor-pointer transition-colors"
                          disabled={user.name === "Admin"}
                        >
                          {user.status === "Active" ? (
                            <div className="flex items-center gap-1.5 text-success font-semibold">
                              <ToggleRight size={22} className="stroke-[1.5]" />
                              <span>Active</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5 text-primary-navy/35">
                              <ToggleLeft size={22} className="stroke-[1.5]" />
                              <span>Inactive</span>
                            </div>
                          )}
                        </button>
                      </td>

                      {/* Last Login */}
                      <td className="py-4 px-4 text-primary-navy/40">{user.lastLogin}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Footer */}
            <div className="border-t border-border-custom bg-background/20 px-6 py-4 flex items-center justify-between text-[11px] text-primary-navy/40">
              <span>
                Showing {users.length > 0 ? (currentPage - 1) * usersPerPage + 1 : 0} to {Math.min(currentPage * usersPerPage, users.length)} of {users.length} administrators
              </span>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={handlePrevPage}
                  disabled={currentPage === 1}
                  className="p-1 rounded border border-border-custom bg-white hover:bg-primary-navy/[0.02] cursor-pointer text-primary-navy/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={13} />
                </button>
                <button className="w-5 h-5 flex items-center justify-center rounded bg-primary-navy text-white font-semibold">
                  {currentPage}
                </button>
                <button 
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded border border-border-custom bg-white hover:bg-primary-navy/[0.02] cursor-pointer text-primary-navy/50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={13} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Access scopes audit */}
        <div className="lg:col-span-3">
          <div className="bg-white border border-border-custom rounded-card p-6 shadow-soft space-y-3 font-ui text-[11px] text-primary-navy/60">
            <div className="flex items-center gap-2 text-primary-navy border-b border-border-custom/50 pb-2">
              <Lock size={14} className="text-accent-gold" />
              <h3 className="text-xs font-semibold uppercase tracking-wider">Access Scope Reference</h3>
            </div>
            <div className="space-y-2 pt-1 font-light">
              <p><span className="font-semibold text-primary-navy">ADMIN:</span> Full workspace access. Can manage content, users, and settings.</p>
              <p><span className="font-semibold text-primary-navy">USER:</span> Standard user of the platform. Cannot access the admin panel.</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
