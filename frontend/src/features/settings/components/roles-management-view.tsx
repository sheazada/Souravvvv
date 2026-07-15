'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SettingsApi } from '../api';
import type { RoleSummary } from '@/types/settings';
import { Shield, Plus, Lock, Trash2, CheckSquare, Search, X } from 'lucide-react';

export function RolesManagementView() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRoleForPerms, setSelectedRoleForPerms] = useState<RoleSummary | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    permissionCodes: [] as string[],
  });

  const { data: rolesResponse, isLoading: loadingRoles } = useQuery({
    queryKey: ['settings-roles', page, searchQuery],
    queryFn: () =>
      SettingsApi.getRoles({
        page,
        limit: 15,
        ...(searchQuery ? { search: searchQuery } : {}),
      }),
  });

  const { data: permsResponse } = useQuery({
    queryKey: ['settings-permissions-all'],
    queryFn: () => SettingsApi.getPermissions(),
  });

  const roles = rolesResponse?.data ?? [];
  const meta = rolesResponse?.meta ?? { page: 1, limit: 15, total: 0, totalPages: 1 };
  const allPermissions = permsResponse?.data ?? [];

  const createMutation = useMutation({
    mutationFn: () => SettingsApi.createRole(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-roles'] });
      setShowCreateModal(false);
      setFormData({ code: '', name: '', description: '', permissionCodes: [] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (roleId: string) => SettingsApi.deleteRole(roleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-roles'] });
    },
  });

  const updatePermsMutation = useMutation({
    mutationFn: () => SettingsApi.assignRolePermissions(selectedRoleForPerms!.id, selectedPermissions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-roles'] });
      setSelectedRoleForPerms(null);
    },
  });

  const toggleCreatePerm = (code: string) => {
    setFormData((prev) => ({
      ...prev,
      permissionCodes: prev.permissionCodes.includes(code)
        ? prev.permissionCodes.filter((c) => c !== code)
        : [...prev.permissionCodes, code],
    }));
  };

  const toggleEditPerm = (code: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const permsByModule = allPermissions.reduce((acc, perm) => {
    acc[perm.module] = acc[perm.module] || [];
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, typeof allPermissions>);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white dark:bg-gray-800 p-6 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            Roles & Access Permissions Checklist
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure system roles and bind modular operational capabilities (procurement, inventory, finance).
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          Create Custom Role
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search roles by code or display name..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      {loadingRoles ? (
        <div className="flex items-center justify-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : roles.length === 0 ? (
        <div className="text-center p-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <Shield className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 font-medium">No roles found matching current filters.</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Role Identifier</th>
                  <th className="py-3.5 px-4">Display Name</th>
                  <th className="py-3.5 px-4">Type</th>
                  <th className="py-3.5 px-4">Assigned Users</th>
                  <th className="py-3.5 px-4">Capabilities</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                {roles.map((role) => (
                  <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                      {role.code}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{role.name}</div>
                      <div className="text-xs text-gray-500">{role.description ?? 'No description'}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {role.isSystemRole ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          <Lock className="w-3 h-3" /> Predefined System
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-950/60 dark:text-green-300">
                          Custom Role
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono font-medium">
                      {role._count?.userRoles ?? 0} active accounts
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs">
                      {role._count?.rolePermissions ?? 0} bound permissions
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      {!role.isSystemRole ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRoleForPerms(role);
                              setSelectedPermissions(role.permissions?.map((p) => p.code) ?? []);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 rounded transition-colors"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            Edit Checklist
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Are you sure you want to delete custom role ${role.code}?`)) {
                                deleteMutation.mutate(role.id);
                              }
                            }}
                            disabled={deleteMutation.isPending || (role._count?.userRoles ?? 0) > 0}
                            title={(role._count?.userRoles ?? 0) > 0 ? 'Assigned roles cannot be deleted' : 'Delete Role'}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/40 dark:text-red-400 rounded transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Protected</span>
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
                <Shield className="w-5 h-5 text-blue-600" />
                Create Custom Backoffice Role
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Role Code Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. WAREHOUSE_MGR"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Display Name</label>
                  <input
                    type="text"
                    required
                    placeholder="Warehouse Manager"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Handles stock transfers and GRNs"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-2">Bind Modular Capabilities</label>
                <div className="max-h-48 overflow-y-auto p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
                  {Object.entries(permsByModule).map(([mod, perms]) => (
                    <div key={mod} className="space-y-1.5">
                      <div className="text-xs font-bold uppercase text-gray-400">{mod}</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                        {perms.map((p) => (
                          <label key={p.id} className="flex items-center gap-2 cursor-pointer text-xs">
                            <input
                              type="checkbox"
                              checked={formData.permissionCodes.includes(p.code)}
                              onChange={() => toggleCreatePerm(p.code)}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="font-mono text-gray-800 dark:text-gray-200">{p.code}</span>
                          </label>
                        ))}
                      </div>
                    </div>
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
                disabled={createMutation.isPending || !formData.code || !formData.name}
                onClick={() => createMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {createMutation.isPending ? 'Creating Role...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selectedRoleForPerms && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-xl w-full p-6 space-y-4 border border-gray-200 dark:border-gray-700 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 pb-3">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-blue-600" />
                Edit Capabilities: <span className="font-mono">{selectedRoleForPerms.code}</span>
              </h3>
              <button onClick={() => setSelectedRoleForPerms(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 space-y-4">
              {Object.entries(permsByModule).map(([mod, perms]) => (
                <div key={mod} className="space-y-1.5">
                  <div className="text-xs font-bold uppercase text-gray-400">{mod}</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2">
                    {perms.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(p.code)}
                          onChange={() => toggleEditPerm(p.code)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-mono text-gray-800 dark:text-gray-200">{p.code}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setSelectedRoleForPerms(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={updatePermsMutation.isPending}
                onClick={() => updatePermsMutation.mutate()}
                className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition-colors"
              >
                {updatePermsMutation.isPending ? 'Updating Checklist...' : 'Update Capabilities'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
