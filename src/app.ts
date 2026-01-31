import express from 'express';
import type { Express, Request, Response } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';

const app: Express = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined'));

app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    message: 'Server status OK.',
  });
});

export default app;
