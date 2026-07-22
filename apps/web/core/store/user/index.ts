/**
 * Copyright (c) 2023-present Helix Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { cloneDeep, set } from "lodash-es";
import { action, makeObservable, observable, runInAction, computed } from "mobx";
// plane imports
import { EUserPermissions, API_BASE_URL } from "@plane/constants";
import type { IUser, TUserPermissions } from "@plane/types";
// plane web imports
import type { RootStore } from "@/store/root.store";
import type { IUserPermissionStore } from "@/store/user/base-permissions.store";
import { UserPermissionStore } from "@/store/user/base-permissions.store";
// services
import { AuthService } from "@/services/auth.service";
import { UserService } from "@/services/user.service";
// stores
import type { IAccountStore } from "@/store/user/account.store";
import type { IUserProfileStore } from "@/store/user/profile.store";
import { ProfileStore } from "@/store/user/profile.store";
// local imports
import type { IUserSettingsStore } from "./settings.store";
import { UserSettingsStore } from "./settings.store";

type TUserErrorStatus = {
  status: string;
  message: string;
};

export interface IUserStore {
  // observables
  isAuthenticated: boolean;
  isLoading: boolean;
  error: TUserErrorStatus | undefined;
  data: IUser | undefined;
  // store observables
  userProfile: IUserProfileStore;
  userSettings: IUserSettingsStore;
  accounts: Record<string, IAccountStore>;
  permission: IUserPermissionStore;
  // actions
  fetchCurrentUser: () => Promise<IUser | undefined>;
  updateCurrentUser: (data: Partial<IUser>) => Promise<IUser | undefined>;
  handleSetPassword: (csrfToken: string, data: { password: string }) => Promise<IUser | undefined>;
  deactivateAccount: () => Promise<void>;
  changePassword: (
    csrfToken: string,
    payload: { old_password?: string; new_password: string }
  ) => Promise<IUser | undefined>;
  reset: () => void;
  signOut: () => Promise<void>;
  // computed
  canPerformAnyCreateAction: boolean;
  projectsWithCreatePermissions: { [projectId: string]: number } | null;
}

const DEV_USER: IUser = {
  id: "dev-user-001",
  email: "admin@helix.local",
  first_name: "Helix",
  last_name: "Admin",
  display_name: "Helix Admin",
  avatar_url: "",
  is_onboarded: true,
  role: "admin",
  is_bot: false,
  user_timezone: "UTC",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
} as any;

export class UserStore implements IUserStore {
  // observables
  isLoading: boolean = true;
  isAuthenticated: boolean = false;
  error: TUserErrorStatus | undefined = undefined;
  data: IUser | undefined = undefined;
  // store observables
  userProfile: IUserProfileStore;
  userSettings: IUserSettingsStore;
  accounts: Record<string, IAccountStore> = {};
  permission: IUserPermissionStore;
  // services
  authService;
  userService;

  // root store
  store: RootStore;

  constructor(store: RootStore) {
    this.store = store;
    // stores
    this.userProfile = new ProfileStore(this.store);
    this.userSettings = new UserSettingsStore();
    this.permission = new UserPermissionStore(this.store);
    // service
    this.userService = new UserService();
    this.authService = new AuthService();
    // observables
    makeObservable(this, {
      // observable
      isLoading: observable.ref,
      isAuthenticated: observable.ref,
      error: observable,
      // model observables
      data: observable,
      userProfile: observable,
      userSettings: observable,
      accounts: observable,
      permission: observable,
      // actions
      fetchCurrentUser: action,
      updateCurrentUser: action,
      handleSetPassword: action,
      deactivateAccount: action,
      changePassword: action,
      reset: action,
      signOut: action,
      // computed
      canPerformAnyCreateAction: computed,
      projectsWithCreatePermissions: computed,
    });
  }

  /**
   * @description fetches the current user
   * @returns {Promise<IUser>}
   */
  fetchCurrentUser = async (): Promise<IUser> => {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = undefined;
      });
      const user = await this.userService.currentUser();
      if (user && user?.id) {
        await Promise.all([
          this.userProfile.fetchUserProfile(),
          this.userSettings.fetchCurrentUserSettings(),
          this.store.workspaceRoot.fetchWorkspaces(),
        ]);
        runInAction(() => {
          this.data = user;
          this.isLoading = false;
          this.isAuthenticated = true;
        });
      } else {
        const isHelixSession = typeof window !== "undefined" && window.localStorage.getItem("helix_session") === "true";
        runInAction(() => {
          this.data = isHelixSession ? DEV_USER : user;
          this.isLoading = false;
          this.isAuthenticated = isHelixSession;
        });
      }
      return (this.data || user) as IUser;
    } catch (error) {
      const isHelixSession = typeof window !== "undefined" && window.localStorage.getItem("helix_session") === "true";
      runInAction(() => {
        this.isLoading = false;
        this.isAuthenticated = isHelixSession;
        this.data = isHelixSession ? DEV_USER : undefined;
        this.error = isHelixSession
          ? undefined
          : {
              status: "user-fetch-error",
              message: "Failed to fetch current user",
            };
      });
      if (isHelixSession) return DEV_USER;
      throw error;
    }
  };

  /**
   * @description updates the current user
   * @param data
   * @returns {Promise<IUser>}
   */
  updateCurrentUser = async (data: Partial<IUser>): Promise<IUser> => {
    const currentUserData = cloneDeep(this.data);
    try {
      if (currentUserData) {
        Object.keys(data).forEach((key: string) => {
          const userKey: keyof IUser = key as keyof IUser;
          if (this.data) set(this.data, userKey, data[userKey]);
        });
      }
      const user = await this.userService.updateUser(data);
      if (user && this.data) {
        runInAction(() => {
          Object.keys(user).forEach((key: string) => {
            const userKey: keyof IUser = key as keyof IUser;
            if (this.data) set(this.data, userKey, user[userKey]);
          });
        });
      }
      return user;
    } catch (error) {
      if (currentUserData) {
        Object.keys(currentUserData).forEach((key: string) => {
          const userKey: keyof IUser = key as keyof IUser;
          if (this.data) set(this.data, userKey, currentUserData[userKey]);
        });
      }
      runInAction(() => {
        this.error = {
          status: "user-update-error",
          message: "Failed to update current user",
        };
      });
      throw error;
    }
  };

  /**
   * @description update the user password
   * @param data
   * @returns {Promise<IUser>}
   */
  handleSetPassword = async (csrfToken: string, data: { password: string }): Promise<IUser | undefined> => {
    const currentUserData = cloneDeep(this.data);
    try {
      if (currentUserData && currentUserData.is_password_autoset && this.data) {
        const user = await this.authService.setPassword(csrfToken, { password: data.password });
        set(this.data, ["is_password_autoset"], false);
        return user;
      }
      return undefined;
    } catch (error) {
      if (this.data) set(this.data, ["is_password_autoset"], true);
      runInAction(() => {
        this.error = {
          status: "user-update-error",
          message: "Failed to update current user",
        };
      });
      throw error;
    }
  };

  changePassword = async (
    csrfToken: string,
    payload: {
      old_password?: string;
      new_password: string;
    }
  ): Promise<IUser | undefined> => {
    try {
      const user = await this.userService.changePassword(csrfToken, payload);
      if (this.data) set(this.data, ["is_password_autoset"], false);
      return user;
    } catch (error) {
      console.log(error);
      throw error;
    }
  };

  /**
   * @description deactivates the current user
   * @returns {Promise<void>}
   */
  deactivateAccount = async (): Promise<void> => {
    await this.userService.deactivateAccount();
    this.store.resetOnSignOut();
  };

  /**
   * @description resets the user store
   * @returns {void}
   */
  reset = (): void => {
    runInAction(() => {
      this.isAuthenticated = false;
      this.isLoading = false;
      this.error = undefined;
      this.data = undefined;
      this.userProfile = new ProfileStore(this.store);
      this.userSettings = new UserSettingsStore();
      this.permission = new UserPermissionStore(this.store);
    });
  };

  /**
   * @description signs out the current user
   * @returns {Promise<void>}
   */
  signOut = async (): Promise<void> => {
    await this.authService.signOut(API_BASE_URL);
    this.store.resetOnSignOut();
  };

  // helper actions
  /**
   * @description fetches the projects with write permissions
   * @returns {{[projectId: string]: number} || null}
   */
  fetchProjectsWithCreatePermissions = (): { [key: string]: TUserPermissions } => {
    const { workspaceSlug } = this.store.router;

    const allWorkspaceProjectRoles = this.permission.getProjectRolesByWorkspaceSlug(workspaceSlug || "");

    const userPermissions =
      (allWorkspaceProjectRoles &&
        Object.keys(allWorkspaceProjectRoles)
          .filter((key) => allWorkspaceProjectRoles[key] >= EUserPermissions.MEMBER)
          .reduce(
            (res: { [projectId: string]: number }, key: string) => ((res[key] = allWorkspaceProjectRoles[key]), res),
            {}
          )) ||
      null;

    return userPermissions;
  };

  /**
   * @description returns projects where user has permissions
   * @returns {{[projectId: string]: number} || null}
   */
  get projectsWithCreatePermissions() {
    return this.fetchProjectsWithCreatePermissions();
  }

  /**
   * @description returns true if user has permissions to write in any project
   * @returns {boolean}
   */
  get canPerformAnyCreateAction() {
    const filteredProjects = this.fetchProjectsWithCreatePermissions();
    return filteredProjects ? Object.keys(filteredProjects).length > 0 : false;
  }
}
