import React, { useState } from "react";
import PropTypes from "prop-types";
import Modal from "react-bootstrap/Modal";
import {
  FaArrowRight as ArrowRight,
  FaEye as Eye,
  FaEyeSlash as EyeOff,
  FaKey as KeyRound,
  FaEnvelope as Mail,
  FaScroll as ScrollText,
  FaShieldAlt as ShieldCheck,
  FaMagic as Sparkles,
  FaUser as User,
  FaUsers as Users,
} from "react-icons/fa";
import logoLight from "../../images/logo-light.png";
import apiFetch from "../../utils/apiFetch";
import "./Login.css";

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

async function loginUser(credentials) {
  credentials.username = capitalizeFirstLetter(credentials.username);
  try {
    const response = await apiFetch("/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(credentials),
    });
    if (!response.ok) {
      throw new Error("Login failed");
    }
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

async function createUser(newUser) {
  newUser.username = capitalizeFirstLetter(newUser.username);
  try {
    const response = await apiFetch("/users/add", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(newUser),
    });
    const data = await response.json();
    if (!response.ok || data.errors) {
      const message = data.errors
        ? data.errors.map((e) => e.msg).join(", ")
        : data.message || "Failed to create user";
      throw new Error(message);
    }
    return data;
  } catch (error) {
    console.error("Create user error:", error);
    throw error;
  }
}

function AuthLayout({ children }) {
  return (
    <main className="auth-layout">
      <div className="auth-background" aria-hidden="true">
        <div className="auth-background__mist" />
        <div className="auth-background__circle auth-background__circle--one" />
        <div className="auth-background__circle auth-background__circle--two" />
        <div className="auth-background__constellation" />
        <div className="auth-background__particles" />
      </div>
      <section
        className="auth-brand-panel"
        aria-label="RealmTracker introduction"
      >
        <div className="auth-brand-panel__content">
          <div className="auth-brand-panel__logo-frame">
            <img src={logoLight} alt="RealmTracker" className="auth-logo" />
          </div>
          <p className="auth-brand-panel__eyebrow">
            <Sparkles size={16} /> Premium fantasy VTT
          </p>
          <h1>Build worlds. Track adventures. Play together.</h1>
          <p className="auth-brand-panel__copy">
            A command center for Dungeon Masters and players with cinematic
            combat tools, living character sheets, and campaign-grade
            organization.
          </p>
          <div
            className="auth-brand-panel__features"
            aria-label="RealmTracker highlights"
          >
            <span>
              <ShieldCheck size={18} /> Secure campaign hub
            </span>
            <span>
              <ScrollText size={18} /> Character-first workflows
            </span>
            <span>
              <Users size={18} /> Table-ready collaboration
            </span>
          </div>
        </div>
      </section>
      <section className="auth-form-panel" aria-label="Authentication">
        {children}
      </section>
    </main>
  );
}

function AuthCard({ children, className = "" }) {
  return <div className={`auth-card ${className}`.trim()}>{children}</div>;
}

function AuthHeader({ eyebrow, title, subtitle }) {
  return (
    <header className="auth-header">
      <span className="auth-header__eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </header>
  );
}

function AuthInput({
  id,
  icon: Icon,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  error,
  trailing,
}) {
  return (
    <label
      className={`auth-input ${error ? "auth-input--error" : ""}`}
      htmlFor={id}
    >
      <Icon className="auth-input__icon" size={20} aria-hidden="true" />
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        placeholder=" "
        autoComplete={autoComplete}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : undefined}
      />
      <span className="auth-input__label">{label}</span>
      {trailing}
      {error && (
        <small id={`${id}-error`} className="auth-input__error">
          {error}
        </small>
      )}
    </label>
  );
}

function AuthButton({
  children,
  loading = false,
  variant = "primary",
  ...props
}) {
  return (
    <button
      className={`auth-button auth-button--${variant}`}
      disabled={loading || props.disabled}
      {...props}
    >
      {loading && <span className="auth-button__spinner" aria-hidden="true" />}
      <span>{children}</span>
    </button>
  );
}

function AuthDivider({ children }) {
  return (
    <div className="auth-divider">
      <span>{children}</span>
    </div>
  );
}

function AuthFooter({ onCreateAccount }) {
  return (
    <footer className="auth-footer">
      <span>New to RealmTracker?</span>
      <button
        type="button"
        className="auth-link auth-link--strong"
        onClick={onCreateAccount}
      >
        Sign up — Create your account <ArrowRight size={16} />
      </button>
    </footer>
  );
}

export default function Login({ onLogin }) {
  const [show, setShow] = useState(false);
  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    confirmPassword: "",
  });
  const [loginError, setLoginError] = useState("");
  const [signupError, setSignupError] = useState("");

  const updateForm = (value) => setNewUser((prev) => ({ ...prev, ...value }));

  const handleLogin = async (event) => {
    event?.preventDefault();
    setIsLoggingIn(true);
    try {
      await loginUser({ username, password });
      const res = await apiFetch("/me");
      if (res.ok) {
        const user = await res.json();
        onLogin(user);
        setLoginError("");
      } else {
        throw new Error("Failed to fetch user");
      }
    } catch (error) {
      console.error("Login error:", error);
      setLoginError(
        "Failed to log in. Please check your credentials and try again."
      );
    } finally {
      setIsLoggingIn(false);
    }
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (newUser.password !== newUser.confirmPassword) {
      setSignupError("Passwords do not match!");
      return;
    }
    try {
      await createUser({
        username: newUser.username,
        password: newUser.password,
      });
      setSignupError("");
      handleClose();
      setNewUser({ username: "", password: "", confirmPassword: "" });
    } catch (error) {
      console.error("Signup error:", error);
      setSignupError(error.message);
    }
  };

  return (
    <AuthLayout>
      <AuthCard>
        <AuthHeader
          eyebrow="Realm access"
          title="Enter the table"
          subtitle="Sign in to continue your campaigns, encounters, maps, and characters."
        />

        <form className="auth-form" onSubmit={handleLogin} noValidate>
          <AuthInput
            id="login-username"
            icon={User}
            label="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />
          <AuthInput
            id="login-password"
            icon={KeyRound}
            label="Password"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            trailing={
              <button
                type="button"
                className="auth-input__toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((prev) => !prev)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            }
          />

          <div className="auth-form__options">
            <label className="auth-check" htmlFor="keep-signed-in">
              <input
                id="keep-signed-in"
                type="checkbox"
                checked={keepSignedIn}
                onChange={(e) => setKeepSignedIn(e.target.checked)}
              />
              <span>Keep me signed in</span>
            </label>
            <a className="auth-link" href="#!">
              Forgot password?
            </a>
          </div>

          {loginError && (
            <div className="auth-alert" role="alert">
              {loginError}
            </div>
          )}

          <AuthButton type="submit" loading={isLoggingIn}>
            Login
          </AuthButton>
          <AuthButton type="button" variant="secondary" disabled>
            Continue as Guest <span className="auth-button__soon">Soon</span>
          </AuthButton>
        </form>

        <AuthDivider>or</AuthDivider>
        <AuthFooter onCreateAccount={handleShow} />
      </AuthCard>

      <Modal
        className="dnd-modal auth-modal"
        show={show}
        onHide={handleClose}
        centered
      >
        <AuthCard className="auth-card--modal">
          <button
            type="button"
            className="auth-modal__close"
            onClick={handleClose}
            aria-label="Close sign up"
          >
            ×
          </button>
          <AuthHeader
            eyebrow="Begin your legend"
            title="Create account"
            subtitle="Reserve your RealmTracker identity for future adventures."
          />
          <form onSubmit={onSubmit} className="auth-form">
            <AuthInput
              id="signupUsername"
              icon={User}
              label="Username"
              value={newUser.username}
              onChange={(e) => updateForm({ username: e.target.value })}
              autoComplete="username"
            />
            <AuthInput
              id="signupPassword"
              icon={Mail}
              label="Password"
              type="password"
              value={newUser.password}
              onChange={(e) => updateForm({ password: e.target.value })}
              autoComplete="new-password"
            />
            <AuthInput
              id="signupConfirmPassword"
              icon={KeyRound}
              label="Confirm password"
              type="password"
              value={newUser.confirmPassword}
              onChange={(e) => updateForm({ confirmPassword: e.target.value })}
              autoComplete="new-password"
            />
            {signupError && (
              <div className="auth-alert" role="alert">
                {signupError}
              </div>
            )}
            <div className="auth-modal__actions">
              <AuthButton type="submit">Submit Create Account</AuthButton>
              <button type="button" className="auth-link" onClick={handleClose}>
                Cancel
              </button>
            </div>
          </form>
        </AuthCard>
      </Modal>
    </AuthLayout>
  );
}

AuthLayout.propTypes = { children: PropTypes.node.isRequired };
AuthCard.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
};
AuthHeader.propTypes = {
  eyebrow: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
};
AuthInput.propTypes = {
  id: PropTypes.string.isRequired,
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  type: PropTypes.string,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  autoComplete: PropTypes.string,
  error: PropTypes.string,
  trailing: PropTypes.node,
};
AuthButton.propTypes = {
  children: PropTypes.node.isRequired,
  loading: PropTypes.bool,
  variant: PropTypes.string,
};
AuthDivider.propTypes = { children: PropTypes.node.isRequired };
AuthFooter.propTypes = { onCreateAccount: PropTypes.func.isRequired };

Login.propTypes = {
  onLogin: PropTypes.func.isRequired,
};
