import { LoginPanel } from "@/components/login-panel";
import { ZookLogo } from "@/components/zook-logo";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center px-5 py-8">
      <div className="absolute left-5 top-5">
        <ZookLogo />
      </div>
      <LoginPanel />
    </main>
  );
}
