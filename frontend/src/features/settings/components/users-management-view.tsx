'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsApi } from '../api';
import type { UserSummary, RoleSummary } from '@/types/settings';
import { Users, Plus, KeyRound, UserMinus, Shield, Search, CheckCircle, AlertTriangle, X } from 'lucide-react';

export function UsersManagementView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [userTypeFilter, setUserTypeFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedUserForReset, setSelectedUserForReset] = useState<UserSummary | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    password: '',
    userType: 'employee',
    roleCodes: [] as string[],
    isActive: true,
  });

  const { data: usersResponse, isLoading: loadingUsers } = useQuery({
    queryKey: ['settings-users', page, userTypeFilter, searchQuery],
    queryFn: () =>
      SettingsApi.getUsers({
        page,
        limit: 15,
        ...(userTypeFilter ? { userType: userTypeFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      }),
  });

  const { data: rolesResponse } = useQuery({
    queryKey: ['settings-roles-all'],
    queryFn: () => SettingsApi.getRoles({ limit: 100 }),
  });

  const users = usersResponse?.data ?? [];
  const meta = usersResponse?.meta ?? { page: 1, limit: 15, total: 0, totalPages: 1 };
  const roles = rolesResponse?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => SettingsApi.createUser(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
      setShowCreateModal(false);
      setFormData({
        fullName: '',
        mobile: '',
        email: '',
        password: '',
        userType: 'employee',
        roleCodes: [],
        isActive: true,
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => SettingsApi.resetUserPassword(selectedUserForReset!.id, newPassword),
    onSuccess: () => {
      setSelectedUserForReset(null);
      setNewPassword('');
      alert('Password reset successfully and existing sessions revoked.');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => SettingsApi.deactivateUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-users'] });
    },
  });

  const toggleRoleSelection = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      roleCodes: prev.roleCodes.includes(code)
        ? prev.roleCodes.filter((c) => c !== code)
        : [...prev.roleCodes, code],
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            User & Account Administration
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage backoffice staff, delivery drivers, field sales officers, and granular role assignments.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create New Account
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by full name, mobile, or email..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>

        <select
          value={userTypeFilter}
          onChange={(e) => {
            setUserTypeFilter(e.target.value);
            setPage(1);
          }}
          className="px-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none capitalize"
        >
          <option value="">All Account Types</option>
          <option value="admin">Administrator / Owner</option>
          <option value="employee">Backoffice Staff / Employee</option>
          <option value="driver">Delivery Staff / Driver</option>
          <option value="sales">Field Sales Representative</option>
        </select>
      </div>

      {loadingUsers ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Users className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No system users found matching current filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Account Member</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Assigned Roles</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Created At</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{user.fullName}</div>
                      <div className="text-xs font-mono text-gray-500 dark:text-gray-400">
                        {user.mobile} {user.email ? `• ${user.email}` : ''}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 capitalize font-medium text-gray-700 dark:text-gray-300">
                      {user.userType}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1">
                        {user.roles && user.roles.length > 0 ? (
                          user.roles.map((role) => (
                            <span
                              key={role.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-mono font-medium bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60"
                            >
                              <Shield className="w-3 h-3" />
                              {role.code}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-400 italic">No assigned roles</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300">
                          <CheckCircle className="w-3 h-3" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300">
                          <AlertTriangle className="w-3 h-3" /> Deactivated
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => setSelectedUserForReset(user)}
                        title="Force Password Reset"
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 rounded transition-colors"
                      >
                        <KeyRound className="w-3.5 h-3.5" />
                        Reset Key
                      </button>

                      {user.isActive && (
                        <button
                          onClick={() => {
                            if (confirm(`Are you sure you want to deactivate ${user.fullName}? All existing sessions will be immediately revoked.`)) {
                              deactivateMutation.mutate(user.id);
                            }
                          }}
                          disabled={deactivateMutation.isPending}
                          title="Deactivate Account"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 rounded transition-colors disabled:opacity-50"
                        >
                          <UserMinus className="w-3.5 h-3.5" />
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-lg w-full p-6 space-y-5 border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-4">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Create Backoffice Account
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ravi Kumar"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
                  <input
                    type="text"
                    required
                    placeholder="10-digit mobile"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="user@sudha.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Initial Password</label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 chars"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Account Category</label>
                  <select
                    value={formData.userType}
                    onChange={(e) => setFormData({ ...formData, userType: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 capitalize"
                  >
                    <option value="employee">Backoffice Staff / Employee</option>
                    <option value="driver">Delivery Driver</option>
                    <option value="sales">Field Sales Representative</option>
                    <option value="admin">Admin / Manager</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Assign Roles & Permissions Checklists
                </label>
                <div className="max-h-36 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-2">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center gap-2 cursor-pointer text-xs">
                      <input
                        type="checkbox"
                        checked={formData.roleCodes.includes(role.code)}
                        onChange={() => toggleRoleSelection(role.code)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{role.code}</span>
                      <span className="text-gray-600 dark:text-gray-400">({role.name})</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={createMutation.isPending || !formData.fullName || !formData.mobile || !formData.password}
                onClick={() => createMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Creating Account...' : 'Provision Account'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedUserForReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              Force Password Reset
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Resetting password for <span className="font-semibold text-gray-800 dark:text-gray-200">{selectedUserForReset.fullName}</span> ({selectedUserForReset.mobile}). All active access sessions across devices will be immediately revoked.
            </p>

            <div>
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">New Secure Password</label>
              <input
                type="password"
                placeholder="Enter new 6+ char password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedUserForReset(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={resetMutation.isPending || newPassword.length < 6}
                onClick={() => resetMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {resetMutation.isPending ? 'Resetting...' : 'Reset Key & Revoke Sessions'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
