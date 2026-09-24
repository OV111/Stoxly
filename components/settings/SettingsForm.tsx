"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { motion } from "motion/react";

type SettingsFormProps = {
  name: string;
  email: string;
  hasPassword: boolean;
  isGoogleLinked: boolean;
  createdAt: string;
};

type ProfileForm = { name: string };
type PasswordForm = { currentPassword: string; newPassword: string; confirmPassword: string };
type SetPasswordForm = { newPassword: string; confirmPassword: string };

const Card = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-2xl border border-gray-700 bg-gray-800 p-6 flex flex-col gap-4">
    {children}
  </div>
);

const inputClass =
  "h-11 px-3 rounded-lg bg-gray-900 border border-gray-600 text-white text-sm placeholder:text-gray-600 focus:outline-none focus:border-blue-500 transition-all disabled:opacity-50";

const SettingsForm = ({ name, email, hasPassword, isGoogleLinked, createdAt }: SettingsFormProps) => {
  const router = useRouter();

  const [profileStatus, setProfileStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [passwordStatus, setPasswordStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const profileForm = useForm<ProfileForm>({ defaultValues: { name } });
  const passwordForm = useForm<PasswordForm>();
  const setPasswordForm = useForm<SetPasswordForm>();

  const onProfileSubmit = async (data: ProfileForm) => {
    setProfileStatus(null);
    try {
      const res = await fetch("/api/auth/update-profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: data.name }),
      });
      const json = await res.json();
      if (!res.ok) {
        setProfileStatus({ type: "error", message: json.message });
        return;
      }
      setProfileStatus({ type: "success", message: "Name updated." });
      router.refresh();
    } catch {
      setProfileStatus({ type: "error", message: "Something went wrong. Please try again." });
    }
  };

  const onPasswordSubmit = async (data: PasswordForm) => {
    setPasswordStatus(null);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordStatus({ type: "error", message: json.message });
        return;
      }
      setPasswordStatus({ type: "success", message: "Password updated." });
      passwordForm.reset();
    } catch {
      setPasswordStatus({ type: "error", message: "Something went wrong. Please try again." });
    }
  };

  // Google-created accounts have no password to verify, so this posts to
  // /set-password (session is the proof) rather than /change-password.
  const onSetPasswordSubmit = async (data: SetPasswordForm) => {
    setPasswordStatus(null);
    try {
      const res = await fetch("/api/auth/set-password", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ newPassword: data.newPassword }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordStatus({ type: "error", message: json.message });
        return;
      }
      setPasswordStatus({
        type: "success",
        message: "Password set. You can now sign in with your email too.",
      });
      setPasswordForm.reset();
      router.refresh(); // flips hasPassword, swapping this card for the change form
    } catch {
      setPasswordStatus({ type: "error", message: "Something went wrong. Please try again." });
    }
  };

  const handleDelete = async () => {
    if (deleteConfirm !== email) {
      setDeleteError("Type your email exactly to confirm.");
      return;
    }
    setDeleteError("");
    setIsDeleting(true);
    try {
      const res = await fetch("/api/auth/delete-account", { method: "DELETE" });
      if (!res.ok) {
        const json = await res.json();
        setDeleteError(json.message);
        setIsDeleting(false);
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setDeleteError("Something went wrong. Please try again.");
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Account info */}
      <Card>
        <h2 className="text-base font-semibold text-white">Account</h2>
        <dl className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <dt className="text-gray-500">Email</dt>
            <dd className="text-gray-300">{email}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Sign-in method</dt>
            <dd className="text-gray-300">
              {isGoogleLinked && hasPassword
                ? "Google + password"
                : isGoogleLinked
                ? "Google"
                : "Password"}
            </dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-gray-500">Member since</dt>
            <dd className="text-gray-300">
              {new Date(createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </dd>
          </div>
        </dl>
      </Card>

      {/* Profile */}
      <Card>
        <h2 className="text-base font-semibold text-white">Profile</h2>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-gray-400">Name</label>
            <input
              {...profileForm.register("name", { required: "Name is required" })}
              type="text"
              className={inputClass}
            />
            {profileForm.formState.errors.name && (
              <p className="text-red-400 text-xs">{profileForm.formState.errors.name.message}</p>
            )}
          </div>

          {profileStatus && (
            <p className={`text-sm ${profileStatus.type === "success" ? "text-teal-400" : "text-red-400"}`}>
              {profileStatus.message}
            </p>
          )}

          <motion.button
            whileTap={{ scale: 0.98 }}
            type="submit"
            disabled={profileForm.formState.isSubmitting}
            className="self-start h-10 px-4 rounded-lg bg-[#3b82f6] hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
          >
            {profileForm.formState.isSubmitting ? "Saving..." : "Save name"}
          </motion.button>
        </form>
      </Card>

      {/* Password */}
      {hasPassword ? (
        <Card>
          <h2 className="text-base font-semibold text-white">Password</h2>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-400">Current password</label>
              <input
                {...passwordForm.register("currentPassword", { required: "Current password is required" })}
                type="password"
                className={inputClass}
              />
              {passwordForm.formState.errors.currentPassword && (
                <p className="text-red-400 text-xs">
                  {passwordForm.formState.errors.currentPassword.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-400">New password</label>
              <input
                {...passwordForm.register("newPassword", {
                  required: "New password is required",
                  minLength: { value: 8, message: "Min 8 characters" },
                })}
                type="password"
                className={inputClass}
              />
              {passwordForm.formState.errors.newPassword && (
                <p className="text-red-400 text-xs">{passwordForm.formState.errors.newPassword.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-400">Confirm new password</label>
              <input
                {...passwordForm.register("confirmPassword", {
                  required: "Please confirm your new password",
                  validate: (v) => v === passwordForm.watch("newPassword") || "Passwords do not match",
                })}
                type="password"
                className={inputClass}
              />
              {passwordForm.formState.errors.confirmPassword && (
                <p className="text-red-400 text-xs">
                  {passwordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {passwordStatus && (
              <p className={`text-sm ${passwordStatus.type === "success" ? "text-teal-400" : "text-red-400"}`}>
                {passwordStatus.message}
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={passwordForm.formState.isSubmitting}
              className="self-start h-10 px-4 rounded-lg bg-[#3b82f6] hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {passwordForm.formState.isSubmitting ? "Updating..." : "Update password"}
            </motion.button>
          </form>
        </Card>
      ) : (
        <Card>
          <h2 className="text-base font-semibold text-white">Password</h2>
          <p className="text-sm text-gray-500">
            You signed up with Google, so this account has no password yet. Set
            one to also sign in with your email — Google sign-in keeps working
            either way.
          </p>

          <form
            onSubmit={setPasswordForm.handleSubmit(onSetPasswordSubmit)}
            className="flex flex-col gap-3"
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="set-new-password" className="text-sm font-medium text-gray-400">
                New password
              </label>
              <input
                id="set-new-password"
                {...setPasswordForm.register("newPassword", {
                  required: "New password is required",
                  minLength: { value: 8, message: "Min 8 characters" },
                })}
                type="password"
                autoComplete="new-password"
                className={inputClass}
              />
              {setPasswordForm.formState.errors.newPassword && (
                <p className="text-red-400 text-xs">
                  {setPasswordForm.formState.errors.newPassword.message}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="set-confirm-password" className="text-sm font-medium text-gray-400">
                Confirm new password
              </label>
              <input
                id="set-confirm-password"
                {...setPasswordForm.register("confirmPassword", {
                  required: "Please confirm your new password",
                  validate: (v) =>
                    v === setPasswordForm.watch("newPassword") || "Passwords do not match",
                })}
                type="password"
                autoComplete="new-password"
                className={inputClass}
              />
              {setPasswordForm.formState.errors.confirmPassword && (
                <p className="text-red-400 text-xs">
                  {setPasswordForm.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            {passwordStatus && (
              <p className={`text-sm ${passwordStatus.type === "success" ? "text-teal-400" : "text-red-400"}`}>
                {passwordStatus.message}
              </p>
            )}

            <motion.button
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={setPasswordForm.formState.isSubmitting}
              className="self-start h-10 px-4 rounded-lg bg-[#3b82f6] hover:bg-blue-500 text-white font-semibold text-sm transition-colors disabled:opacity-50 cursor-pointer"
            >
              {setPasswordForm.formState.isSubmitting ? "Setting..." : "Set password"}
            </motion.button>
          </form>
        </Card>
      )}

      {/* Danger zone */}
      <div className="rounded-2xl border border-red-900/50 bg-red-950/10 p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-base font-semibold text-red-400">Danger zone</h2>
          <p className="text-sm text-gray-500 mt-1">
            Deleting your account is permanent and cannot be undone.
          </p>
        </div>

        <div className="flex flex-col gap-1.5 max-w-sm">
          <label className="text-sm font-medium text-gray-400">
            Type <span className="text-gray-300">{email}</span> to confirm
          </label>
          <input
            value={deleteConfirm}
            onChange={(e) => setDeleteConfirm(e.target.value)}
            type="text"
            className={inputClass}
          />
          {deleteError && <p className="text-red-400 text-xs">{deleteError}</p>}
        </div>

        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleDelete}
          disabled={isDeleting || deleteConfirm !== email}
          className="self-start h-10 px-4 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-semibold text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isDeleting ? "Deleting..." : "Delete account"}
        </motion.button>
      </div>
    </div>
  );
};

export default SettingsForm;
