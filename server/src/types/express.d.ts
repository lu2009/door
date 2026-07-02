declare namespace Express {
  interface Request {
    user?: {
      username: string;
      databaseName: string;
      displayName: string;
      registrant: string;
    };
  }
}
