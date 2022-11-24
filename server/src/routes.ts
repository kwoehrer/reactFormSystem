import { Router } from 'express';
import cors from 'cors';
import bodyParser from "body-parser"; 
import { fileAccess } from './local'; 
import { FormAccess, FormCompletion } from './formdesc'; 
import {Request, Response} from 'express';


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

/**
 * Return the names of all forms, as an array of strings in JSON.
 */
router.get('/forms', (req : Request, res : Response) => {
    const result = access.listAllForms();
    res.json(result);
});

/**
 * Return the description of the form named in the endpoint. If there is
 * none such, return status 404.
 */
router.get('/forms/:name', (req : Request, res : Response) => {
    const formName = req.params.name; 
    const result = access.getForm(formName);
    if(result === undefined){
        res.sendStatus(404);
    } else{
        res.json(result);
    }
});

/**
 * The body should be a JSON object with form and contents fields for a new
 * instantiation. If the form name is valid and the contents are the correct length, then a fresh
 * (unique) instance identifier is returned. If there is a problem, status 400 is returned.
 */
 router.post('/instances', (req : Request, res : Response) => {
    if(req.body && req.body.contents && req.body.form && typeof req.body.form === 'string'){
        const result = access.create(req.body.form, req.body.contents);
        if(result === undefined){
            res.sendStatus(400);
        } else{
            res.send(result);
        }
    } else{
        res.sendStatus(400);
    }
});