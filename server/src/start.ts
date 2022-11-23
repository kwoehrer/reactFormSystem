import express from 'express';
import { router } from './routes';

const app = express();
const port = process.env.FORMPORT ?? "56018";

app.use(router);

app.listen(port, () => {
    console.log(`Starting form server on port ${port}`);
})