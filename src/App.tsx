/* ##
import {Text} from '@chakra-ui/react';
## */
import './App.css';
// #(
import { MouseEvent, KeyboardEvent, useEffect, useRef, useState, useInsertionEffect, useMemo, useCallback } from 'react';
import { Button, ButtonGroup, Radio, RadioGroup, Select, Stack, useToast, UseToastOptions } from '@chakra-ui/react';
import { Form, ImageFit } from './Form';
import { readFile } from './readFile';
import { fixFormDescription, FormDescription } from './formdesc';
import { accessServer, PromiseFormAccess } from './client/request';
import { userInfo } from 'os';

const HORIZ_MARGIN = 24;
const VERT_MARGIN = 60;
// #)

function getWindowDimensions(): { width: number; height: number; } {
  return {
    width: window.innerWidth,
    height: window.innerHeight
  };
}

const DEFAULT_OPTIONS: FormDescription = {
  name: 'default',
  image: '',
  slots: []
}

/**
 * Converts an exception to a string.
 * @param e Exception, to be converted to a string.
 * @returns A string representation of the error
 */
function throwMessage(e: Error): string {
  return e.name + ": " + e.message;
}

function App() {
  // #(
  const [windowDims, setWindowDims] = useState(getWindowDimensions())
  const canvasRef = useRef(null as null | HTMLCanvasElement);
  const [formName, setFormName] = useState('Add Form');
  const [fit, setFit] = useState(ImageFit.FitWidth);
  const [form, setForm] = useState(null as null | Form); 
  const [currentSlotIndex, setCurrentSlotIndex] = useState(-1);
  const [slotContents, setSlotContents] = useState([] as Array<string>);

  const toast = useToast();

  const backendServer = accessServer("localhost", 56018);
  const formList = formListParse(usePromise<[], string[]>(backendServer.listAllForms,[],toast));
  const [options, setOptions] = useState(optionsParse(usePromise(backendServer.getForm,[formName],toast)));

  function formListParse(formList: string[]|undefined): string[]{
    if(formList === undefined){
      return [];
    } else{
      return formList;
    }
  }

  function optionsParse(options: FormDescription|undefined): FormDescription{
    if(options === undefined){
      return DEFAULT_OPTIONS;
    } else{
      return options;
    }
  }

  function usePromise<A extends unknown[], T>(promisef: (...args: A) => Promise<T> | undefined,
    args: A, toast: (opt: UseToastOptions) => unknown): T | undefined {
      console.log("usePromise in use");
      const [result, setResult] = useState<T|undefined>();

      useEffect(() => {
        const prom =  promisef(...args);

        prom?.then((res) => {
          console.log("Successful usePromise");
          setResult(res);
        }).catch((err) => {
          toast({ status: 'error', description:throwMessage(err) });
          setResult(undefined);
        });
      }, [...args, toast]);
      
      console.log("usePromise completed : ");
      console.log(result)
      return result;
  }


  useEffect(() => {
    let stillTrying = true;
    async function fetchForm() {
      console.log('Trying fetch');
      const canvas = canvasRef.current;
      if (formName && canvas) {
        try {
          console.log(formName);
          const buf = await readFile(formName.replace(' ', '-') + ".json");
          const str = new TextDecoder('utf-8').decode(buf);
          const formSelect = JSON.parse(str);
          let imageFile: string;
          if (typeof formSelect.image === "string") {
            imageFile = formSelect.image;
          } else {
            throw new Error("No image mentioned in " + formName + ".json");
          }
          const formImage = new Image();
          formImage.src = imageFile;
          await formImage.decode();
          const cleanOptions: FormDescription = fixFormDescription(formSelect);
          
          if (stillTrying) {
            setOptions(cleanOptions);
            setSlotContents(cleanOptions.slots.map(_ => ""));
            setForm(new Form(canvas, formImage, cleanOptions));
            console.log(`Successfully read form`);
          }
        } catch (ex) {
          let mess: string;
          if (typeof ex === 'string') {
            mess = ex;
          } else if (ex instanceof Error) {
            mess = ex.message;
          } else {
            mess = 'Unknown error';
          }
          toast({ status: 'error', description: mess });
        }
      } else {
        console.log(' ... but canvas is null');
      }
    }
    fetchForm();
    return () => { stillTrying = false; }
  }, [formName, canvasRef, toast]);


  useEffect(() => {
    function handleResize() {
      setWindowDims(getWindowDimensions())
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    }
  }, []) // [] means don't run this again

  useEffect(() => {
    console.log('attempted to draw');
    const canvas = canvasRef.current;
    if (form && canvas) {
      console.log('fit = ' + fit);
      form.setCurrentSlotIndex(currentSlotIndex);
      form.setSlotContents(slotContents);
      form.setFit(fit);
      const gfx = canvas.getContext('2d');
      if (gfx) {
        form.paint(gfx);
      } else {
        console.log('no gfx context?');
      }
    } else {
      console.log(`Problem: form = ${form} and canvas = ${canvas}`);
    }
  });

  function mouseClick(e: MouseEvent) {
    const canvas = canvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      console.log(`x = ${mx}, y = ${my}`);
      let newIndex = -1;
      if (form) {
        if(options)options.slots.forEach((sl, index) => {
          const loc = sl.location;
          const x = form.cvtpctx(loc.x);
          const y = form.cvtpcty(loc.y);
          const w = form.cvtpctx(loc.w);
          const h = form.cvtpcty(loc.h);
          if (mx >= x && mx <= x + w &&
            my <= y && my >= y - h) {
            newIndex = index;
            // console.log('Found index + ' + index);
          }
        });
      }
      if (newIndex !== currentSlotIndex) {
        setCurrentSlotIndex(newIndex);
      }
    } else{

    }
  }

  function keyDown(e: KeyboardEvent) {
    if (e.key.length === 1) {
      if (currentSlotIndex >= 0) {
        e.preventDefault();
        const index = currentSlotIndex;
        const oldContents = slotContents;
        setSlotContents([...oldContents.slice(0, index), oldContents[index] + e.key, ...oldContents.slice(index + 1)]);
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      let newIndex = currentSlotIndex;
      if (++newIndex >= slotContents.length) {
        newIndex = -1;
      }
      setCurrentSlotIndex(newIndex);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      if (currentSlotIndex >= 0) {
        e.preventDefault();
        const i = currentSlotIndex;
        const oldContents = slotContents;
        setSlotContents([...oldContents.slice(0, i), slotContents[i].slice(0, -1), ...oldContents.slice(i + 1)]);
      }
    }

  }
  const canvasWidth = windowDims.width - HORIZ_MARGIN;
  const canvasHeight = windowDims.height - VERT_MARGIN;
  
  //Submit button/create logic
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submit = useCallback(async () => {
    if(isSubmitting){
      return;
    }

    setIsSubmitting(true);
    const result = await backendServer.create(formName, slotContents);
    setIsSubmitting(false);
    console.log("New instance id created: " + result);

  }, [isSubmitting, slotContents]);
  // #)
  return (
    <div className="App">
      <header className="App-header">
        <Stack direction='row'>
          <Select placeholder='Select Form' value={formName}
            onChange={(ev) => setFormName(ev.target.value)}>
            { 
              formList.map(name => (
                <option id={name} value={name}>{name}</option>
              ))
            }
          </Select>
          <RadioGroup onChange={(s) => setFit(+s)} value={fit}>
            <Stack direction='row'>
              <Radio size='lg' value={ImageFit.FitWidth}>Fit Width</Radio>
              <Radio size='lg' value={ImageFit.FitHeight}>Fit Height</Radio>
              <Radio value={ImageFit.FitWhole}>Fit Whole</Radio>
            </Stack>
          </RadioGroup>
          <ButtonGroup>
            <Button disabled = {isSubmitting} colorScheme= 'blue' variant= 'outline' onClick={submit}>
              Submit
            </Button>
          </ButtonGroup>
        </Stack>
        <canvas ref={canvasRef} width={canvasWidth} height={canvasHeight}
          onClick={mouseClick} onKeyDown={keyDown} tabIndex={1}>
          This application requires HTML 5 and JavaScript]
        </canvas>
        {/* #)
        <Text>TODO (after refactoring!)</Text>
        ## */}
      </header>
    </div>
  );
}

export default App;
