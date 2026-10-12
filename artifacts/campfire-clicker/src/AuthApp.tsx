import {
  ClerkProvider,
  SignIn,
  SignUp,
} from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Route, Router as WouterRouter, Switch, useLocation } from "wouter";
import App from "./App";

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;

function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY in the app environment.");
}

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#d29352",
    colorForeground: "#eee7d7",
    colorMutedForeground: "#a7ad9e",
    colorDanger: "#e79c7a",
    colorBackground: "#18211f",
    colorInput: "#111a1a",
    colorInputForeground: "#eee7d7",
    colorNeutral: "#536053",
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: "0.85rem",
  },
  elements: {
    rootBox: {
      width: "100%",
      display: "flex",
      justifyContent: "center",
    },
    cardBox: {
      width: "440px",
      maxWidth: "100%",
      overflow: "hidden",
      backgroundColor: "#18211f",
      border: "1px solid rgba(195,203,186,.18)",
      borderRadius: "1rem",
    },
    card: {
      boxShadow: "none",
      border: "none",
      backgroundColor: "transparent",
    },
    footer: {
      boxShadow: "none",
      border: "none",
      backgroundColor: "transparent",
    },
    headerTitle: { color: "#eee7d7" },
    headerSubtitle: { color: "#a7ad9e" },
    socialButtonsBlockButtonText: { color: "#eee7d7" },
    formFieldLabel: { color: "#d9d4c5" },
    footerActionLink: { color: "#e7bd80" },
    footerActionText: { color: "#a7ad9e" },
    dividerText: { color: "#a7ad9e" },
    identityPreviewEditButton: { color: "#e7bd80" },
    formFieldSuccessText: { color: "#b8d0a8" },
    alertText: { color: "#f0b8a0" },
    logoBox: { borderRadius: "0.75rem" },
    logoImage: { objectFit: "contain" as const },
    socialButtonsBlockButton: {
      backgroundColor: "#202d28",
      border: "1px solid #526253",
      color: "#eee7d7",
    },
    formButtonPrimary: {
      backgroundColor: "#c98c50",
      color: "#171b18",
    },
    formFieldInput: {
      backgroundColor: "#111a1a",
      borderColor: "#4b594e",
      color: "#eee7d7",
    },
    footerAction: { border: "none" },
    dividerLine: { backgroundColor: "#526253" },
    alert: {
      backgroundColor: "#3c2b26",
      borderColor: "#845e49",
    },
    otpCodeFieldInput: {
      backgroundColor: "#111a1a",
      borderColor: "#4b594e",
      color: "#eee7d7",
    },
    formFieldRow: { marginBottom: "0.85rem" },
    main: { gap: "1rem" },
  },
};

function SignInPage() {
  return (
    <main className="auth-route">
      <div className="auth-copy">
        <span className="auth-eyebrow">roasting mallows</span>
        <h1>Back to the fire</h1>
        <p>Sign in with Google to pick up where your camp left off.</p>
      </div>
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        signUpUrl={`${basePath}/sign-up`}
      />
    </main>
  );
}

function SignUpPage() {
  return (
    <main className="auth-route">
      <div className="auth-copy">
        <span className="auth-eyebrow">roasting mallows</span>
        <h1>Join the campfire</h1>
        <p>Create an account to sign in with Google.</p>
      </div>
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        signInUrl={`${basePath}/sign-in`}
      />
    </main>
  );
}

function ClerkRoutes() {
  const [, setLocation] = useLocation();

  return (
    <ClerkProvider
      publishableKey={clerkPubKey}
      proxyUrl={clerkProxyUrl}
      appearance={clerkAppearance}
      signInUrl={`${basePath}/sign-in`}
      signUpUrl={`${basePath}/sign-up`}
      localization={{
        signIn: {
          start: {
            title: "Welcome back",
            subtitle: "Sign in to return to your camp.",
          },
        },
        signUp: {
          start: {
            title: "Join the campfire",
            subtitle: "Create your account and settle in.",
          },
        },
      }}
      routerPush={(to) => setLocation(stripBase(to))}
      routerReplace={(to) => setLocation(stripBase(to), { replace: true })}
    >
      <Switch>
        <Route path="/sign-in/*?" component={SignInPage} />
        <Route path="/sign-up/*?" component={SignUpPage} />
        <Route path="/" component={App} />
      </Switch>
    </ClerkProvider>
  );
}

export default function AuthApp() {
  return (
    <WouterRouter base={basePath}>
      <ClerkRoutes />
    </WouterRouter>
  );
}
