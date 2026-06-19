const express = require('express');
const { getDb } = require('../db');
const authMiddleware = require('../middleware/auth');
const { ROLES, requirePermission, isFamilyOwner, familyAuthMiddleware } = require('../middleware/familyAuth');

const router = express.Router();

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

router.get('/', authMiddleware, (req, res) => {
  const db = getDb();
  const userId = req.user.id;

  const families = db.prepare(`
    SELECT f.*, fm.role, fm.joined_at,
      (SELECT COUNT(*) FROM family_members WHERE family_id = f.id) as member_count
    FROM families f
    JOIN family_members fm ON f.id = fm.family_id
    WHERE fm.user_id = ?
    ORDER BY f.created_at DESC
  `).all(userId);

  res.json({ families });
});

router.get('/:id', authMiddleware, familyAuthMiddleware, (req, res) => {
  const db = getDb();
  const familyId = parseInt(req.params.id);

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权访问此家庭' });
  }

  const family = db.prepare(`
    SELECT f.*,
      (SELECT COUNT(*) FROM family_members WHERE family_id = f.id) as member_count
    FROM families f
    WHERE f.id = ?
  `).get(familyId);

  if (!family) {
    return res.status(404).json({ message: '家庭不存在' });
  }

  const members = db.prepare(`
    SELECT fm.*, u.username, u.nickname, u.created_at as user_created_at
    FROM family_members fm
    JOIN users u ON fm.user_id = u.id
    WHERE fm.family_id = ?
    ORDER BY 
      CASE fm.role 
        WHEN 'owner' THEN 1 
        WHEN 'admin' THEN 2 
        ELSE 3 
      END,
      fm.joined_at ASC
  `).all(familyId);

  const invitations = db.prepare(`
    SELECT fi.*, u.nickname as inviter_name
    FROM family_invitations fi
    JOIN users u ON fi.inviter_id = u.id
    WHERE fi.family_id = ?
      AND (fi.expires_at IS NULL OR fi.expires_at > datetime('now'))
      AND (fi.max_uses = 0 OR fi.used_count < fi.max_uses)
    ORDER BY fi.created_at DESC
  `).all(familyId);

  const sharedBoxes = db.prepare(`
    SELECT sb.*, b.name as box_name, b.location as box_location, b.color as box_color
    FROM shared_boxes sb
    JOIN boxes b ON sb.box_id = b.id
    WHERE sb.family_id = ?
  `).all(familyId);

  res.json({
    family,
    members,
    invitations,
    shared_boxes: sharedBoxes,
    current_role: req.space.role
  });
});

router.post('/', authMiddleware, (req, res) => {
  const { name, description } = req.body;
  const db = getDb();
  const userId = req.user.id;

  if (!name || name.trim() === '') {
    return res.status(400).json({ message: '家庭名称不能为空' });
  }

  const createFamily = db.prepare(`
    INSERT INTO families (name, owner_id, description)
    VALUES (?, ?, ?)
  `);

  const addMember = db.prepare(`
    INSERT INTO family_members (family_id, user_id, role, inviter_id)
    VALUES (?, ?, ?, ?)
  `);

  const result = db.transaction(() => {
    const familyResult = createFamily.run(name.trim(), userId, description || '');
    const familyId = familyResult.lastInsertRowid;
    addMember.run(familyId, userId, ROLES.OWNER, null);
    return familyId;
  })();

  const family = db.prepare(`
    SELECT f.*, 'owner' as role,
      (SELECT COUNT(*) FROM family_members WHERE family_id = f.id) as member_count
    FROM families f
    WHERE f.id = ?
  `).get(result);

  res.json({ message: '家庭创建成功', family });
});

router.put('/:id', authMiddleware, familyAuthMiddleware, requirePermission('manage_members'), (req, res) => {
  const { name, description, share_all } = req.body;
  const db = getDb();
  const familyId = parseInt(req.params.id);

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权修改此家庭' });
  }

  db.prepare(`
    UPDATE families 
    SET name = ?, description = ?, share_all = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    name?.trim() || req.space.name,
    description || '',
    share_all ? 1 : 0,
    familyId
  );

  const family = db.prepare('SELECT * FROM families WHERE id = ?').get(familyId);
  res.json({ message: '家庭信息已更新', family });
});

router.delete('/:id', authMiddleware, familyAuthMiddleware, requirePermission('delete_family'), (req, res) => {
  const db = getDb();
  const familyId = parseInt(req.params.id);

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权删除此家庭' });
  }

  if (!isFamilyOwner(familyId, req.user.id)) {
    return res.status(403).json({ message: '只有家庭所有者才能删除家庭' });
  }

  db.prepare('UPDATE boxes SET space_type = ?, space_id = ?, user_id = owner_id WHERE space_type = ? AND space_id = ?').run('private', null, 'family', familyId);
  db.prepare('UPDATE items SET space_type = ?, space_id = ?, user_id = owner_id WHERE space_type = ? AND space_id = ?').run('private', null, 'family', familyId);
  db.prepare('DELETE FROM families WHERE id = ?').run(familyId);

  res.json({ message: '家庭已删除，所有数据已转为私人空间' });
});

router.post('/:id/invite', authMiddleware, familyAuthMiddleware, requirePermission('invite_members'), (req, res) => {
  const { max_uses, expires_days } = req.body;
  const db = getDb();
  const familyId = parseInt(req.params.id);
  const userId = req.user.id;

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权邀请成员' });
  }

  let code;
  let attempts = 0;
  do {
    code = generateInviteCode();
    attempts++;
    const existing = db.prepare('SELECT id FROM family_invitations WHERE code = ?').get(code);
    if (!existing) break;
  } while (attempts < 10);

  if (attempts >= 10) {
    return res.status(500).json({ message: '生成邀请码失败，请重试' });
  }

  const expiresAt = expires_days ? new Date(Date.now() + expires_days * 24 * 60 * 60 * 1000).toISOString() : null;

  const result = db.prepare(`
    INSERT INTO family_invitations (family_id, inviter_id, code, max_uses, expires_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    familyId,
    userId,
    code,
    max_uses || 0,
    expiresAt
  );

  const invitation = db.prepare(`
    SELECT fi.*, u.nickname as inviter_name
    FROM family_invitations fi
    JOIN users u ON fi.inviter_id = u.id
    WHERE fi.id = ?
  `).get(result.lastInsertRowid);

  res.json({ message: '邀请码生成成功', invitation });
});

router.post('/join', authMiddleware, (req, res) => {
  const { code } = req.body;
  const db = getDb();
  const userId = req.user.id;

  if (!code || code.trim() === '') {
    return res.status(400).json({ message: '请输入邀请码' });
  }

  const invitation = db.prepare(`
    SELECT fi.*, f.name as family_name, f.owner_id
    FROM family_invitations fi
    JOIN families f ON fi.family_id = f.id
    WHERE fi.code = ?
  `).get(code.trim().toUpperCase());

  if (!invitation) {
    return res.status(400).json({ message: '邀请码无效' });
  }

  if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
    return res.status(400).json({ message: '邀请码已过期' });
  }

  if (invitation.max_uses > 0 && invitation.used_count >= invitation.max_uses) {
    return res.status(400).json({ message: '邀请码已达使用上限' });
  }

  const existingMember = db.prepare('SELECT id FROM family_members WHERE family_id = ? AND user_id = ?').get(invitation.family_id, userId);
  if (existingMember) {
    return res.status(400).json({ message: '您已是该家庭的成员' });
  }

  db.transaction(() => {
    db.prepare(`
      INSERT INTO family_members (family_id, user_id, role, inviter_id)
      VALUES (?, ?, ?, ?)
    `).run(invitation.family_id, userId, ROLES.MEMBER, invitation.inviter_id);

    db.prepare('UPDATE family_invitations SET used_count = used_count + 1 WHERE id = ?').run(invitation.id);
  })();

  const family = db.prepare(`
    SELECT f.*, fm.role, fm.joined_at,
      (SELECT COUNT(*) FROM family_members WHERE family_id = f.id) as member_count
    FROM families f
    JOIN family_members fm ON f.id = fm.family_id
    WHERE f.id = ? AND fm.user_id = ?
  `).get(invitation.family_id, userId);

  res.json({ message: `成功加入「${invitation.family_name}」`, family });
});

router.put('/:id/members/:userId/role', authMiddleware, familyAuthMiddleware, requirePermission('manage_members'), (req, res) => {
  const { role } = req.body;
  const db = getDb();
  const familyId = parseInt(req.params.id);
  const targetUserId = parseInt(req.params.userId);
  const currentUserId = req.user.id;

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权管理成员' });
  }

  if (![ROLES.ADMIN, ROLES.MEMBER].includes(role)) {
    return res.status(400).json({ message: '无效的角色类型' });
  }

  const targetMember = db.prepare('SELECT * FROM family_members WHERE family_id = ? AND user_id = ?').get(familyId, targetUserId);
  if (!targetMember) {
    return res.status(404).json({ message: '该用户不是家庭成员' });
  }

  if (targetMember.role === ROLES.OWNER) {
    return res.status(403).json({ message: '无法修改家庭所有者的角色' });
  }

  if (role === ROLES.ADMIN && !isFamilyOwner(familyId, currentUserId)) {
    return res.status(403).json({ message: '只有家庭所有者才能设置管理员' });
  }

  db.prepare('UPDATE family_members SET role = ? WHERE family_id = ? AND user_id = ?').run(role, familyId, targetUserId);

  const member = db.prepare(`
    SELECT fm.*, u.username, u.nickname
    FROM family_members fm
    JOIN users u ON fm.user_id = u.id
    WHERE fm.family_id = ? AND fm.user_id = ?
  `).get(familyId, targetUserId);

  res.json({ message: '角色已更新', member });
});

router.post('/:id/transfer', authMiddleware, familyAuthMiddleware, requirePermission('transfer_family'), (req, res) => {
  const { new_owner_id } = req.body;
  const db = getDb();
  const familyId = parseInt(req.params.id);
  const currentUserId = req.user.id;

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权转让家庭' });
  }

  if (!isFamilyOwner(familyId, currentUserId)) {
    return res.status(403).json({ message: '只有家庭所有者才能转让' });
  }

  const newOwnerMember = db.prepare('SELECT * FROM family_members WHERE family_id = ? AND user_id = ?').get(familyId, new_owner_id);
  if (!newOwnerMember) {
    return res.status(404).json({ message: '该用户不是家庭成员' });
  }

  db.transaction(() => {
    db.prepare('UPDATE families SET owner_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(new_owner_id, familyId);
    db.prepare('UPDATE family_members SET role = ? WHERE family_id = ? AND user_id = ?').run(ROLES.OWNER, familyId, new_owner_id);
    db.prepare('UPDATE family_members SET role = ? WHERE family_id = ? AND user_id = ?').run(ROLES.ADMIN, familyId, currentUserId);
  })();

  res.json({ message: '家庭所有权已转让' });
});

router.delete('/:id/members/:userId', authMiddleware, familyAuthMiddleware, requirePermission('manage_members'), (req, res) => {
  const db = getDb();
  const familyId = parseInt(req.params.id);
  const targetUserId = parseInt(req.params.userId);
  const currentUserId = req.user.id;

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权移除成员' });
  }

  if (targetUserId === currentUserId) {
    db.prepare('UPDATE boxes SET space_type = ?, space_id = ?, user_id = owner_id WHERE space_type = ? AND space_id = ? AND owner_id = ?').run('private', null, 'family', familyId, targetUserId);
    db.prepare('UPDATE items SET space_type = ?, space_id = ?, user_id = owner_id WHERE space_type = ? AND space_id = ? AND owner_id = ?').run('private', null, 'family', familyId, targetUserId);
    db.prepare('DELETE FROM family_members WHERE family_id = ? AND user_id = ?').run(familyId, targetUserId);
    return res.json({ message: '已退出家庭，您的数据已转为私人空间' });
  }

  const targetMember = db.prepare('SELECT * FROM family_members WHERE family_id = ? AND user_id = ?').get(familyId, targetUserId);
  if (!targetMember) {
    return res.status(404).json({ message: '该用户不是家庭成员' });
  }

  if (targetMember.role === ROLES.OWNER) {
    return res.status(403).json({ message: '无法移除家庭所有者' });
  }

  if (targetMember.role === ROLES.ADMIN && !isFamilyOwner(familyId, currentUserId)) {
    return res.status(403).json({ message: '只有家庭所有者才能移除管理员' });
  }

  db.prepare('UPDATE boxes SET space_type = ?, space_id = ?, user_id = owner_id WHERE space_type = ? AND space_id = ? AND owner_id = ?').run('private', null, 'family', familyId, targetUserId);
  db.prepare('UPDATE items SET space_type = ?, space_id = ?, user_id = owner_id WHERE space_type = ? AND space_id = ? AND owner_id = ?').run('private', null, 'family', familyId, targetUserId);
  db.prepare('DELETE FROM family_members WHERE family_id = ? AND user_id = ?').run(familyId, targetUserId);

  res.json({ message: '成员已移除，其数据已转为私人空间' });
});

router.delete('/:id/invitations/:invitationId', authMiddleware, familyAuthMiddleware, requirePermission('invite_members'), (req, res) => {
  const db = getDb();
  const familyId = parseInt(req.params.id);
  const invitationId = parseInt(req.params.invitationId);

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权管理邀请' });
  }

  db.prepare('DELETE FROM family_invitations WHERE id = ? AND family_id = ?').run(invitationId, familyId);
  res.json({ message: '邀请码已撤销' });
});

router.post('/:id/share-boxes', authMiddleware, familyAuthMiddleware, requirePermission('manage_boxes'), (req, res) => {
  const { box_ids } = req.body;
  const db = getDb();
  const familyId = parseInt(req.params.id);

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权设置共享收纳盒' });
  }

  if (!Array.isArray(box_ids)) {
    return res.status(400).json({ message: '参数错误' });
  }

  db.transaction(() => {
    db.prepare('DELETE FROM shared_boxes WHERE family_id = ?').run(familyId);
    
    const insertStmt = db.prepare(`
      INSERT OR IGNORE INTO shared_boxes (family_id, box_id)
      VALUES (?, ?)
    `);

    box_ids.forEach(boxId => {
      const box = db.prepare('SELECT * FROM boxes WHERE id = ? AND user_id = ? AND space_type = ?').get(boxId, req.user.id, 'private');
      if (box) {
        insertStmt.run(familyId, boxId);
      }
    });
  })();

  const sharedBoxes = db.prepare(`
    SELECT sb.*, b.name as box_name, b.location as box_location, b.color as box_color
    FROM shared_boxes sb
    JOIN boxes b ON sb.box_id = b.id
    WHERE sb.family_id = ?
  `).all(familyId);

  res.json({ message: '共享设置已更新', shared_boxes: sharedBoxes });
});

router.post('/:id/convert-boxes', authMiddleware, familyAuthMiddleware, requirePermission('manage_boxes'), (req, res) => {
  const { box_ids, to_family } = req.body;
  const db = getDb();
  const familyId = parseInt(req.params.id);
  const userId = req.user.id;

  if (req.space.type !== 'family' || req.space.id !== familyId) {
    return res.status(403).json({ message: '无权操作' });
  }

  if (!Array.isArray(box_ids)) {
    return res.status(400).json({ message: '参数错误' });
  }

  db.transaction(() => {
    if (to_family) {
      box_ids.forEach(boxId => {
        const box = db.prepare('SELECT * FROM boxes WHERE id = ? AND owner_id = ? AND space_type = ?').get(boxId, userId, 'private');
        if (box) {
          db.prepare('UPDATE boxes SET space_type = ?, space_id = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('family', familyId, userId, boxId);
          db.prepare('UPDATE items SET space_type = ?, space_id = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE box_id = ?').run('family', familyId, userId, boxId);
        }
      });
    } else {
      box_ids.forEach(boxId => {
        const box = db.prepare('SELECT * FROM boxes WHERE id = ? AND owner_id = ? AND space_type = ? AND space_id = ?').get(boxId, userId, 'family', familyId);
        if (box) {
          db.prepare('UPDATE boxes SET space_type = ?, space_id = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run('private', null, userId, boxId);
          db.prepare('UPDATE items SET space_type = ?, space_id = ?, user_id = ?, updated_at = CURRENT_TIMESTAMP WHERE box_id = ?').run('private', null, userId, boxId);
        }
      });
    }
  })();

  res.json({ message: '收纳盒空间转换完成' });
});

module.exports = router;
