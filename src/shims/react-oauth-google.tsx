import React, { createContext, useContext } from "react";

type GoogleOAuthContextValue = {
  clientId?: string;
};

const GoogleOAuthContext = createContext<GoogleOAuthContextValue>({});

type GoogleOAuthProviderProps = {
  clientId?: string;
  children?: React.ReactNode;
};

export const GoogleOAuthProvider: React.FC<GoogleOAuthProviderProps> = ({
  clientId,
  children,
}) => {
  return (
    <GoogleOAuthContext.Provider value={{ clientId }}>
      {children}
    </GoogleOAuthContext.Provider>
  );
};

type UseGoogleLoginOptions = {
  onSuccess?: (token: { access_token: string }) => void;
  onError?: (error: unknown) => void;
};

/**
 * Lightweight shim for environments where we don't want to pull in the real
 * `@react-oauth/google` package (e.g. Netlify build issues).
 *
 * In this shim, calling the returned function will simply warn and invoke
 * `onError` if provided.
 */
export function useGoogleLogin(options: UseGoogleLoginOptions = {}) {
  const { onError } = options;

  return () => {
    const error = new Error(
      "Google OAuth login is disabled in this deployment (shim module in use)."
    );
    console.warn(error.message);
    if (onError) {
      onError(error);
    }
  };
}

