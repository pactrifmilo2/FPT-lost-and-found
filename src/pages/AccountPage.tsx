import { useState, type FormEvent } from "react";
import { useAuth } from "@/lib/auth";
import { useAction } from "@/lib/data";
import { updateName } from "@/lib/api/profiles";
import { Field } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
export function AccountPage() {
  const { profile, session } = useAuth();
  const action = useAction();
  const [name, setName] = useState(profile!.fullName),
    [saved, setSaved] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaved(false);
    if (await action.run(() => updateName(name))) setSaved(true);
  }
  return (
    <form onSubmit={submit} className="card mx-auto max-w-lg space-y-4 p-6">
      <h1 className="text-xl font-bold">Tài khoản</h1>
      <p>{session?.user.email}</p>
      <Field label="Họ và tên" required>
        <input
          className="input"
          required
          maxLength={120}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      {action.error && (
        <p role="alert" className="text-red-700">
          {action.error}
        </p>
      )}
      {saved && <p role="status">Đã lưu tên.</p>}
      <Button disabled={action.busy}>Lưu</Button>
    </form>
  );
}
