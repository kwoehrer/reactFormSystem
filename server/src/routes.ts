import { Router } from 'express';
import cors from 'cors';
import bodyParser from "body-parser"; 
import { fileAccess } from './local'; 
import { FormAccess, FormCompletion } from './formdesc'; 

export const router = Router();

const filename = process.env.FORMS_FILENAME ?? "forms.json";

// top-level "await" doesn't work with Jest
// XXX  const access = await fileAccess(filename);
let access : FormAccess;
async function workaroundNoTopLevelAwait() {
    access = await fileAccess(filename);
}
const promise = workaroundNoTopLevelAwait();

router.use(cors());

router.use(bodyParser.json()); // parse any bodies using JSON syntax

// TODO: Finish this module
