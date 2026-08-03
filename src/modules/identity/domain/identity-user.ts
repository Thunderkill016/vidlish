export type IdentityUser = {
  id: string;
  email: string;
};

export type CurrentAccess = {
  userId: string;
  email: string;
  betaAccess: "active";
};
