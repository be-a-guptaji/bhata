export type User = {
  fullName: string;
  token: string;
  id: string;
};

export function getUser(): User | null {
  if (typeof window === "undefined") {
    return null;
  }

  const user = localStorage.getItem("user");

  if (!user) {
    return null;
  }

  try {
    return JSON.parse(user);
  } catch {
    return null;
  }
}

export function saveUser(user: User) {
  localStorage.setItem("user", JSON.stringify(user));
}
