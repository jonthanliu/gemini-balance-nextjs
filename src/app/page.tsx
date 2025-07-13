import { cookies } from "next/headers";
import Link from "next/link";
import LoginForm from "./LoginForm";

export default async function Home() {
  const cookieStore = await cookies();
  const authToken = cookieStore.get("auth_token")?.value;
  const serverAuthToken = process.env.AUTH_TOKEN;

  const isAuthenticated = authToken && authToken === serverAuthToken;

  if (isAuthenticated) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm lg:flex">
          <p className="fixed left-0 top-0 flex w-full justify-center border-b border-gray-300 bg-gradient-to-b from-zinc-200 pb-6 pt-8 backdrop-blur-2xl dark:border-neutral-800 dark:bg-zinc-800/30 dark:from-inherit lg:static lg:w-auto  lg:rounded-xl lg:border lg:bg-gray-200 lg:p-4 lg:dark:bg-zinc-800/30">
            You are already authenticated.
          </p>
          <div className="fixed bottom-0 left-0 flex h-48 w-full items-end justify-center bg-gradient-to-t from-white via-white dark:from-black dark:via-black lg:static lg:size-auto lg:bg-none">
            <Link
              href="/admin"
              className="pointer-events-none flex place-items-center gap-2 p-8 lg:pointer-events-auto lg:p-0"
            >
              Go to Admin Panel
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return <LoginForm />;
}
