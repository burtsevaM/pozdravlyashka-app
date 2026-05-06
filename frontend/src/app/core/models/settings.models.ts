export type EmailStatus = {
  mode: 'dev' | 'smtp';
  host: string;
  port: number;
  secure: boolean;
  from: string;
  mailpitUrl: string | null;
};
