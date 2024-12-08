export const organizationIncludes = {
  projects: {
    select: {
      id: true,
      name: true,
    },
  },
};

export const projectIncludes = {
  organization: {
    select: {
      id: true,
      name: true,
    },
  },
  functions: {
    select: {
      id: true,
      name: true,
    },
  },
  apiKeys: {
    select: {
      id: true,
      description: true,
      publicKey: true,
    },
  },
};

export const apiKeyIncludes = {
  project: {
    select: {
      id: true,
      name: true,
    },
  },
};

export const functionIncludes = {
  project: {
    select: {
      id: true,
      name: true,
    },
  },
};
