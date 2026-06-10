function memberHasAnyRole(member, roleIds) {
  if (!member?.roles || !roleIds?.length) return false;
  return roleIds.some((id) => member.roles.cache.has(id));
}

function memberHasRole(member, roleId) {
  return roleId && member?.roles?.cache?.has(roleId);
}

function assertHasAnyRole(interaction, roleIds, message = "FORBIDDEN") {
  if (!memberHasAnyRole(interaction.member, roleIds)) {
    const err = new Error(message);
    err.code = "FORBIDDEN";
    throw err;
  }
}

function getStaffRolesForCategory(config, category) {
  const global = config.roles?.ticketStaffGlobal ?? [];
  const categoryRoles = config.roles?.ticketStaff?.[category] ?? [];
  return [...new Set([...global, ...categoryRoles])];
}

function isAdmin(interaction, config) {
  const adminRoles = config.roles?.admin ?? [];
  const allowed = config.allowedRoleIds ?? [];
  return memberHasAnyRole(interaction.member, [...adminRoles, ...allowed]);
}

function canGenerateCode(interaction, config) {
  const roles = config.roles?.codeGenerators ?? [];
  const admin = config.roles?.admin ?? [];
  return memberHasAnyRole(interaction.member, [...roles, ...admin, ...config.allowedRoleIds]);
}

function canApproveFunctional(interaction, config) {
  const roles = config.roles?.functionalApprovers ?? [];
  const admin = config.roles?.admin ?? [];
  return memberHasAnyRole(interaction.member, [...roles, ...admin, ...config.allowedRoleIds]);
}

function canEvaluateContest(interaction, config) {
  const roles = config.roles?.contestEvaluators ?? [];
  const admin = config.roles?.admin ?? [];
  return memberHasAnyRole(interaction.member, [...roles, ...admin, ...config.allowedRoleIds]);
}

module.exports = {
  memberHasAnyRole,
  memberHasRole,
  assertHasAnyRole,
  getStaffRolesForCategory,
  isAdmin,
  canGenerateCode,
  canApproveFunctional,
  canEvaluateContest
};
