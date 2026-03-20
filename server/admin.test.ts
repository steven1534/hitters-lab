import { describe, it, expect, vi } from 'vitest';
import * as db from './db';

describe('Admin User Management', () => {
  describe('updateUserRole', () => {
    it('should update a user role to athlete', async () => {
      const updateUserRoleSpy = vi.spyOn(db, 'updateUserRole');
      
      await db.updateUserRole(1, 'athlete');
      
      expect(updateUserRoleSpy).toHaveBeenCalledWith(1, 'athlete');
    });

    it('should update a user role to admin', async () => {
      const updateUserRoleSpy = vi.spyOn(db, 'updateUserRole');
      
      await db.updateUserRole(2, 'admin');
      
      expect(updateUserRoleSpy).toHaveBeenCalledWith(2, 'admin');
    });
  });

  describe('toggleClientAccess', () => {
    it('should activate user access', async () => {
      const toggleSpy = vi.spyOn(db, 'toggleClientAccess');
      
      await db.toggleClientAccess(1, true);
      expect(toggleSpy).toHaveBeenCalledWith(1, true);
    });

    it('should deactivate user access', async () => {
      const toggleSpy = vi.spyOn(db, 'toggleClientAccess');
      
      await db.toggleClientAccess(1, false);
      expect(toggleSpy).toHaveBeenCalledWith(1, false);
    });
  });

  describe('markWelcomeEmailSent', () => {
    it('should mark welcome email as sent for user', async () => {
      const markSpy = vi.spyOn(db, 'markWelcomeEmailSent');
      
      await db.markWelcomeEmailSent(1);
      expect(markSpy).toHaveBeenCalledWith(1);
    });
  });

  describe('getUserById', () => {
    it('should retrieve user by ID', async () => {
      const getUserSpy = vi.spyOn(db, 'getUserById');
      
      await db.getUserById(1);
      expect(getUserSpy).toHaveBeenCalledWith(1);
    });
  });
});

describe('User Management Integration', () => {
  it('should verify update role and mark email sent flow', async () => {
    const updateRoleSpy = vi.spyOn(db, 'updateUserRole');
    const markEmailSpy = vi.spyOn(db, 'markWelcomeEmailSent');

    await db.updateUserRole(1, 'athlete');
    expect(updateRoleSpy).toHaveBeenCalledWith(1, 'athlete');

    await db.markWelcomeEmailSent(1);
    expect(markEmailSpy).toHaveBeenCalledWith(1);
  });

  it('should verify toggle access and mark email sent flow', async () => {
    const toggleSpy = vi.spyOn(db, 'toggleClientAccess');
    const markEmailSpy = vi.spyOn(db, 'markWelcomeEmailSent');

    await db.toggleClientAccess(1, true);
    expect(toggleSpy).toHaveBeenCalledWith(1, true);

    await db.markWelcomeEmailSent(1);
    expect(markEmailSpy).toHaveBeenCalledWith(1);
  });
});
