const { getDb } = require('../db');

const ROLES = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member'
};

const PERMISSIONS = {
  [ROLES.OWNER]: ['manage_members', 'transfer_family', 'delete_family', 'manage_boxes', 'manage_items', 'invite_members', 'view', 'borrow_return'],
  [ROLES.ADMIN]: ['manage_boxes', 'manage_items', 'invite_members', 'view', 'borrow_return'],
  [ROLES.MEMBER]: ['view', 'borrow_return']
};

function hasPermission(role, permission) {
  return PERMISSIONS[role]?.includes(permission) || false;
}

function getFamilyMember(familyId, userId) {
  const db = getDb();
  return db.prepare(`
    SELECT fm.*, f.name as family_name, f.owner_id, f.share_all
    FROM family_members fm
    JOIN families f ON fm.family_id = f.id
    WHERE fm.family_id = ? AND fm.user_id = ?
  `).get(familyId, userId);
}

function getFamilyRole(familyId, userId) {
  const db = getDb();
  const member = db.prepare('SELECT role FROM family_members WHERE family_id = ? AND user_id = ?').get(familyId, userId);
  return member?.role || null;
}

function isFamilyOwner(familyId, userId) {
  const db = getDb();
  const family = db.prepare('SELECT owner_id FROM families WHERE id = ?').get(familyId);
  return family?.owner_id === userId;
}

function canAccessBox(box, userId, familyId = null) {
  if (box.space_type === 'private') {
    return box.user_id === userId || box.owner_id === userId;
  }
  
  if (box.space_type === 'family' && box.space_id === familyId) {
    const role = getFamilyRole(familyId, userId);
    return role !== null;
  }
  
  return false;
}

function canAccessItem(item, userId, familyId = null) {
  if (item.space_type === 'private') {
    return item.user_id === userId || item.owner_id === userId;
  }
  
  if (item.space_type === 'family' && item.space_id === familyId) {
    const role = getFamilyRole(familyId, userId);
    return role !== null;
  }
  
  return false;
}

function familyAuthMiddleware(req, res, next) {
  const familyId = req.headers['x-family-id'];
  
  if (!familyId || familyId === 'private') {
    req.space = {
      type: 'private',
      id: null,
      role: null
    };
    return next();
  }
  
  const userId = req.user.id;
  const member = getFamilyMember(parseInt(familyId), userId);
  
  if (!member) {
    return res.status(403).json({ message: '您不是该家庭的成员' });
  }
  
  req.space = {
    type: 'family',
    id: parseInt(familyId),
    role: member.role,
    shareAll: !!member.share_all,
    name: member.family_name
  };
  
  next();
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (req.space.type === 'private') {
      return next();
    }
    
    if (req.space.type === 'family') {
      if (hasPermission(req.space.role, permission)) {
        return next();
      }
      return res.status(403).json({ message: '权限不足' });
    }
    
    return res.status(403).json({ message: '无效的空间类型' });
  };
}

module.exports = {
  ROLES,
  PERMISSIONS,
  hasPermission,
  getFamilyMember,
  getFamilyRole,
  isFamilyOwner,
  canAccessBox,
  canAccessItem,
  familyAuthMiddleware,
  requirePermission
};
