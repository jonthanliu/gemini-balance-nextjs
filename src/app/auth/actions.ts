"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function login(
  state: { error?: string; success?: boolean },
  formData: FormData
) {
  const token = formData.get("token") as string;
  const { AUTH_TOKEN } = process.env;

  if (!AUTH_TOKEN) {
    return { error: "AUTH_TOKEN is not configured on the server." };
  }

  if (token === AUTH_TOKEN) {
    const cookieStore = await cookies();
    cookieStore.set("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24,
    });
    redirect("/admin");
  } else {
    return { error: "Invalid token." };
  }
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete("auth_token");
  redirect("/auth");
}
