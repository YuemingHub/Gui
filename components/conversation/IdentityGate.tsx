"use client";

import {
  useState,
  type FormEvent,
  type InputHTMLAttributes,
} from "react";
import type { LoginInput, RegisterInput } from "@/app/lib/returnApi";

type GateResult = { ok: boolean; error: string | null };

type IdentityGateProps = {
  /** /api/me has not answered yet: show the frame, but no forms. */
  checking: boolean;
  busy: boolean;
  error: string | null;
  /** This browser still holds a pre-account token (the Founder during migration). */
  legacyAvailable: boolean;
  onLogin: (input: LoginInput) => Promise<GateResult>;
  onRegister: (input: RegisterInput) => Promise<GateResult>;
  onLegacyBrowser: () => Promise<GateResult>;
};

type Mode = "login" | "register";

const inputClassName =
  "w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3.5 text-base text-stone-100 placeholder:text-stone-600 focus:border-white/20";
const labelClassName = "text-[13px] tracking-wide text-stone-500";
const submitClassName =
  "mt-1 rounded-full border border-white/10 bg-[rgba(200,173,134,0.16)] px-5 py-3 text-sm text-stone-100 transition hover:bg-[rgba(200,173,134,0.24)] disabled:opacity-40";

function field(
  name: string,
  label: string,
  props: InputHTMLAttributes<HTMLInputElement>,
) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={labelClassName} htmlFor={"gate-" + name}>
        {label}
      </label>
      <input id={"gate-" + name} name={name} className={inputClassName} {...props} />
    </div>
  );
}

/**
 * The first screen for anyone without a server-side session. Identity is a
 * person (账号 + 密码), not a browser: nothing here reads localStorage to decide
 * what to show, and the legacy way in only opens on an explicit click.
 */
export function IdentityGate({
  checking,
  busy,
  error,
  legacyAvailable,
  onLogin,
  onRegister,
  onLegacyBrowser,
}: IdentityGateProps) {
  const [mode, setMode] = useState<Mode>("login");

  const submitLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    await onLogin({
      login_id: String(data.get("login_id") ?? "").trim(),
      password: String(data.get("password") ?? ""),
    });
  };

  const submitRegister = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    const displayName = String(data.get("display_name") ?? "").trim();
    await onRegister({
      invite_code: String(data.get("invite_code") ?? "").trim(),
      login_id: String(data.get("login_id") ?? "").trim(),
      password: String(data.get("password") ?? ""),
      ...(displayName ? { display_name: displayName } : {}),
    });
  };

  const tab = (value: Mode, label: string) => (
    <button
      type="button"
      aria-pressed={mode === value}
      disabled={checking}
      onClick={() => setMode(value)}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        mode === value
          ? "border-white/20 bg-white/[0.08] text-stone-100"
          : "border-white/8 text-stone-500 hover:text-stone-300"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="relative z-10 flex min-h-[100dvh] flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <p className="text-[11px] uppercase tracking-[0.42em] text-stone-600">我和自己</p>
        <h1
          className="mt-6 font-medium leading-[1.1] tracking-[-0.03em] text-stone-100"
          style={{ fontSize: "clamp(1.75rem, 6vw, 2.5rem)" }}
        >
          你是谁，
          <br />
          就由你自己说。
        </h1>
        <p className="mt-5 text-sm leading-7 text-stone-500">
          这里认的是你这个人，不是这台浏览器。换一台设备、清掉记录之后，用账号和密码仍然能回到自己的空间。
        </p>

        {checking ? (
          <p className="mt-10 text-sm leading-7 text-stone-500">正在确认你的空间…</p>
        ) : (
          <>
            <div className="mt-9 flex gap-2">
              {tab("login", "登录")}
              {tab("register", "第一次来？")}
            </div>
            <p className="mt-3 text-[13px] leading-6 text-stone-500">
              {mode === "register"
                ? "用邀请码创建我的空间"
                : "用账号和密码回到自己的空间"}
            </p>

            <form
              // A typed password must not survive the switch to the other form.
              key={mode}
              onSubmit={mode === "login" ? submitLogin : submitRegister}
              aria-describedby="gate-error"
              className="mt-5 flex flex-col gap-3"
            >
              {mode === "register"
                ? field("invite_code", "邀请码", {
                    type: "text",
                    placeholder: "向我要一个邀请码",
                    autoComplete: "off",
                    autoCapitalize: "off",
                    spellCheck: false,
                    required: true,
                    disabled: busy,
                  })
                : null}

              {field("login_id", "账号", {
                type: "text",
                placeholder: "小写、数字或下划线",
                autoComplete: "username",
                autoCapitalize: "off",
                spellCheck: false,
                required: true,
                disabled: busy,
              })}

              {field(
                "password",
                "密码",
                mode === "login"
                  ? {
                      type: "password",
                      autoComplete: "current-password",
                      required: true,
                      disabled: busy,
                    }
                  : {
                      type: "password",
                      autoComplete: "new-password",
                      required: true,
                      disabled: busy,
                    },
              )}

              {mode === "register"
                ? field("display_name", "称呼（可留空）", {
                    type: "text",
                    placeholder: "这里想怎么叫你",
                    autoComplete: "nickname",
                    disabled: busy,
                  })
                : null}

              <p
                id="gate-error"
                aria-live="polite"
                className="min-h-[1.5rem] text-sm leading-6 text-amber-300/80"
              >
                {error ?? ""}
              </p>

              <button type="submit" disabled={busy} className={submitClassName}>
                {busy
                  ? "正在确认…"
                  : mode === "login"
                    ? "进入我的空间"
                    : "创建我的空间"}
              </button>
            </form>

            {legacyAvailable ? (
              <div className="mt-9 border-t border-white/8 pt-5">
                <p className="text-[13px] leading-6 text-stone-500">
                  这台浏览器在绑定账号之前进来过，所以还留着这一条。它不会自己生效，要你亲自按一下。
                </p>
                <button
                  type="button"
                  onClick={() => void onLegacyBrowser()}
                  disabled={busy}
                  className="mt-2 w-full rounded-full border border-white/10 px-5 py-2.5 text-sm text-stone-400 transition hover:bg-white/[0.04] hover:text-stone-200 disabled:opacity-40"
                >
                  继续用这台浏览器上原来的空间
                </button>
                {/* Founder migration bridge: nudge toward a credential, then delete this block. */}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  disabled={busy || mode === "register"}
                  className="mt-2 w-full text-center text-[13px] leading-6 text-stone-600 underline-offset-4 transition hover:text-stone-300 hover:underline disabled:opacity-40"
                >
                  给这个空间设一个账号密码
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
