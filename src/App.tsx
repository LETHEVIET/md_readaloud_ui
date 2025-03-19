import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { ThemeProvider } from '@/components/theme-provider';
import { ModeToggle } from './components/mode-toggle';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';

// env.allowLocalModels = true;

import { Pause, Square, Play, Speech } from 'lucide-react';
import { FaMarkdown } from 'react-icons/fa';
import React, { useEffect, useState, useRef } from 'react';
import parse, { domToReact, attributesToProps } from 'html-react-parser';

import { parsing } from './parsing_markdown';
import ProcessButton from './components/check-button.js';

import { VOICES } from '@/voices.js';
import { KokoroTTS } from 'kokoro-js';

const model_quan = {
  model: '326 MB - model (fp32)',
  model_q4: '305 MB - model_q4 (4-bit matmul)',
  model_uint8: '177 MB - model_uint8 (8-bit &amp; mixed precision)',
  model_fp16: '163 MB - model_fp16 (fp16)',
  model_q4f16: '154 MB - model_q4f16 (4-bit matmul &amp; fp16 weights)',
  model_uint8f16: '114 MB - model_uint8f16 (Mixed precision)',
  model_quantized: '92.4 MB - model_quantized (8-bit)',
  model_q8f16: '86 MB - model_q8f16 (Mixed precision)',
  // "auto": "auto",
  // "fp32": "fp32",
  // "fp16": "fp16",
  // "q8": "q8",
  // "int8": "int8",
  // "uint8": "uint8",
  // "q4": "q4",
  // "bnb4": "bnb4",
  // "q4f16": "q4f16",
};

const accelerater = {
  // "cpu": "CPU",
  webgpu: 'WebGPU',
  wasm: 'WebAssembly',
};

function App() {
  const [htmlContent, setHtmlContent] = useState('');

  const [selectedVoice, setSelectedVoice] = useState('');
  const [speed, setSpeed] = useState(1.0);

  const [selectQuan, setSelectQuan] = useState(model_quan[0]);
  const [selectAcc, setSelectAcc] = useState(accelerater[0]);

  const [control, setControl] = useState(null);

  const [readStatus, setReadStatus] = useState('not-started');

  const [model, setModel] = useState(null);

  // Removed activeTab state as we are using side-by-side preview

  const myHandler = (id) => {
    console.log('Clicked!', id);
    control.startReading(id);
    setReadStatus('playing');
  };

  const replace = (domNode) => {
    // Check if the node is an element with the .sent class
    if (
      domNode.attribs &&
      domNode.attribs.class &&
      domNode.attribs.class.split(' ').includes('sent')
    ) {
      // Convert DOM attributes to React props and add onClick
      const props = {
        ...attributesToProps(domNode.attribs),
        onClick: () => myHandler(domNode.attribs.id),
      };
      // Create a new React element with the same tag, updated props, and parsed children
      return React.createElement(domNode.name, props, domToReact(domNode.children, { replace }));
    }
    // Return undefined for nodes that don’t match, letting default parsing continue
  };

  useEffect(() => {
    const getVoices = () => {
      const voiceIds = Object.keys(VOICES);
      if (voiceIds.length > 0) {
        setSelectedVoice(voiceIds[0]);
      }
    };

    const getQuan = () => {
      const quanIds = Object.keys(model_quan);
      setSelectQuan(quanIds[7]);
    };

    const getAcc = () => {
      const accIds = Object.keys(accelerater);
      setSelectAcc(accIds[0]);
    };

    getQuan();
    getAcc();
    getVoices();
  }, []);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target.result;
        const result = parsing(text); // Using your parsing function
        console.log('parsing completed');
        setHtmlContent(result.html);

        setControl(readDocument(result.sentences));
      };
      reader.readAsText(file);
    }
  };

  const handleControl = ({ cmd }) => {
    console.log(cmd);
    if (cmd === 'play') {
      if (readStatus === 'paused') {
        control.resumeReading();
        setReadStatus('playing');
      } else {
        control.startReading();
        setReadStatus('playing');
      }
    } else if (cmd === 'pause') {
      control.pauseReading();
      setReadStatus('paused');
    } else if (cmd === 'stop') {
      control.stopReading();
      setReadStatus('not-started');
    }
  };

  const modelLoadCallBack = async ({ data }) => {
    console.log(data);
  };

  const handleAcceleratorChange = (value) => {
    handleReset();
    setSelectAcc(value);
  };

  const handleModelLoad = async () => {
    try {
      // Validate selections
      if (!selectQuan || !selectAcc) {
        throw new Error('Please select both quantization and accelerator options');
      }

      const model_id = 'onnx-community/Kokoro-82M-v1.0-ONNX';
      let dtype;
      if (selectAcc === 'wasm') {
        dtype = 'q4';
      } else {
        dtype = 'fp32';
      }
      const tts = await KokoroTTS.from_pretrained(model_id, {
        dtype: dtype, // Options: "fp32", "fp16", "q8", "q4", "q4f16"
        device: selectAcc, // Options: "wasm", "webgpu" (web) or "cpu" (node). If using "webgpu", we recommend using dtype="fp32".
        progressCallback: modelLoadCallBack,
      });

      if (!tts) {
        throw new Error('Failed to initialize TTS model');
      }

      setModel(tts);
      return true; // Successful completion for ProcessButton
    } catch (error) {
      console.error('Error loading model:', error);
      setModel(null);
      throw error; // Re-throw for ProcessButton error handling
    }
  };

  const processButtonRef = useRef<ProcessButtonRef>(null);

  const handleReset = () => {
    if (processButtonRef.current) {
      processButtonRef.current.reset();
    }
  };

  const readDocument = (sentences) => {
    // Sort sentence keys once at initialization
    const keys = Object.keys(sentences).sort();

    // State variables maintained via closure
    let currentIndex = 0; // Tracks the current sentence being processed
    let isPlaying = false; // Indicates if the reading process is active
    let isPaused = false; // Indicates if the reading is paused
    let currentAudio = null; // Holds the current audio object for playback control
    let pauseTime = 0; // Stores the time at which the audio was paused

    // Core function to read the next sentence
    const readNext = () => {
      // Stop if all sentences are processed
      if (currentIndex >= keys.length) {
        console.log('All sentences processed.');
        isPlaying = false;
        return;
      }

      // Stop recursion if not playing
      if (!isPlaying) return;

      const id = keys[currentIndex];
      const element = document.getElementById(id);

      // Skip if element is not found
      if (!element) {
        console.warn(`Element ${id} not found.`);
        currentIndex++;
        readNext();
        return;
      }

      // Skip if sentence is invalid
      if (!sentences[id] || sentences[id].trim() === '') {
        console.warn(`Sentence with id ${id} is invalid. Skipping.`);
        currentIndex++;
        readNext();
        return;
      }

      // Fetch and play audio for the current sentence
      // fetchSpeechFromOpenAI(sentences[id])
      generateSpeechFromKokoroJS(sentences[id], { voice: selectedVoice, speed })
        .then((audioUrl) => {
          if (!audioUrl) throw new Error('No audio URL returned');

          // Highlight the current sentence
          element.classList.add('highlight');
          element.scrollIntoView({ behavior: 'smooth' });

          // Create and play the audio
          currentAudio = new Audio(audioUrl);

          // Ensure the highlight stays until the audio starts playing
          currentAudio.oncanplaythrough = () => {
            console.log(`Playing audio for ${id}`);
            console.log(element.classList);
            currentAudio.play();
          };

          // When audio ends, remove highlight and proceed to next sentence
          currentAudio.onended = () => {
            console.log(`Finished playing audio for ${id}`);
            console.log(element.classList);
            element.classList.remove('highlight');
            currentIndex++;
            readNext();
          };

          // Handle audio playback errors
          currentAudio.onerror = (error) => {
            console.error(`Error playing audio for ${id}:`, error);
            console.log('hihi', error.message);
            console.log('hihi', error.code);
            element.classList.remove('highlight');
            currentIndex++;
            readNext();
          };
        })
        .catch((error) => {
          console.error(`Error fetching audio for ${id}:`, error);
          currentIndex++;
          readNext();
        })
        .finally(() => {
          // Update progress and audio count
          // setProgress(((currentIndex + 1) / keys.length) * 100);
          // setGeneratedAudioCount(currentIndex + 1);
        });
    };

    // Start reading from the beginning or a specific ID
    const startReading = (startId = null) => {
      // Stop any ongoing playback first
      if (isPlaying) {
        stopReading();
      }

      // If a specific ID is provided, find its index
      if (startId) {
        const startIndex = keys.indexOf(startId);
        if (startIndex === -1) {
          console.error(`ID ${startId} not found.`);
          return;
        }
        currentIndex = startIndex;
      } else {
        currentIndex = 0; // Start from the beginning
      }

      isPlaying = true;
      isPaused = false;
      readNext();
    };

    // Pause the current playback
    const pauseReading = () => {
      if (isPlaying && currentAudio) {
        currentAudio.pause();
        pauseTime = currentAudio.currentTime; // Record the current playback position
        isPaused = true;
      }
    };

    // Resume from the paused position
    const resumeReading = () => {
      if (isPaused && currentAudio) {
        currentAudio.currentTime = pauseTime; // Restore the paused time
        currentAudio.play();
        isPaused = false;
      }
    };

    // Stop the playback and reset state
    const stopReading = () => {
      if (currentAudio) {
        currentAudio.pause();
        currentAudio = null;
      }
      isPlaying = false;
      isPaused = false;
      currentIndex = 0;

      // Remove highlights from all sentences for a clean state
      keys.forEach((id) => {
        const element = document.getElementById(id);
        if (element) element.classList.remove('highlight');
      });
    };

    // Return control methods
    return {
      startReading,
      pauseReading,
      resumeReading,
      stopReading,
    };
  };

  // const fetchSpeechFromOpenAI = async (text) => {
  //   console.log('Fetching speech from OpenAI:', text);
  //   const apiUrl = 'http://localhost:8880/v1/audio/speech';

  //   const response = await fetch(apiUrl, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //     },
  //     body: JSON.stringify({
  //       model: 'kokoro',
  //       input: text,
  //       voice: 'af_bella', // You can choose different voices
  //       response_format: 'mp3', // Supported: mp3, wav, opus, flac
  //       speed: 1.0,
  //     }),
  //   });

  //   if (!response.ok) {
  //     console.error(`HTTP error! status: ${response.status}, text: ${await response.text()}`); // Log more details
  //     throw new Error(`Failed to fetch speech from the server: HTTP status ${response.status}`);
  //   }

  //   // Convert the response to a blob
  //   const audioBlob = await response.blob();

  //   // Create a URL for the audio blob
  //   const audioUrl = URL.createObjectURL(audioBlob);

  //   console.log('Audio URL:', audioUrl);
  //   return audioUrl;
  // };

  const generateSpeechFromKokoroJS = async (text, options = {}) => {
    console.log('Generating speech using kokorojs:', text, options);

    try {
      const audioBuffer = await model.generate(text, {
        voice: options.voice || 'af_heart',
        speed: speed,
      });

      console.log('Speech generated successfully by kokorojs.');

      const audioBlob = audioBuffer.toBlob();

      // Create a URL for the blob
      const audioUrl = URL.createObjectURL(audioBlob);

      console.log('Audio URL:', audioUrl);
      return audioUrl;
    } catch (error) {
      console.error('Error generating speech with kokorojs:', error);
      throw new Error(`Failed to generate speech using kokorojs: ${error.message}`);
    }
  };

  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting);
      },
      { threshold: [0] },
    );

    if (ref.current) observer.observe(ref.current);

    return () => {
      if (ref.current) observer.unobserve(ref.current);
    };
  }, []);

  return (
    <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
      <div className="min-h-screen flex flex-col">
        {/* Navbar */}
        <nav className="sticky top-0 z-10 border-b px-4 py-3">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Speech />
              <FaMarkdown />
              Read Your Markdown Aloud
            </div>
            <div className="flex items-center gap-4">
              {/* <Button variant="ghost">Features</Button> */}
              <ModeToggle />
              {/* <Button variant="ghost">Pricing</Button>
        <Button variant="outline">Login</Button> */}
            </div>
          </div>
        </nav>

        {/* Main Content */}

        <ResizablePanelGroup
          className="flex-1 max-w-7xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-2 gap-6  w-full"
          direction="horizontal"
        >
          <ResizablePanel className="space-y-6">
            {/* Left Column - Input Section */}
            <div className="p-6 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Select Voice</Label>
                  <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(VOICES).map(([id, voice]) => (
                        <SelectItem key={id} value={id}>
                          {voice.name} ({voice.language}) {voice.traits || ''} - Grade:{' '}
                          {voice.overallGrade}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className=" space-y-2">
                  <Label className="text-sm font-medium">Accelarator</Label>
                  <Select value={selectAcc} onValueChange={handleAcceleratorChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select accelerator" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(accelerater).map(([id, name]) => (
                        <SelectItem key={id} value={id}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <ProcessButton
                  className=" space-y-2"
                  onProcess={handleModelLoad}
                  ref={processButtonRef}
                />

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Speed {speed}x</Label>
                  <Slider
                    min={0.1}
                    max={2.0}
                    step={0.05}
                    defaultValue={[1.0]}
                    onValueChange={setSpeed}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="markdown_file" className="text-sm font-medium">
                    Upload Markdown File
                  </Label>
                  <Input
                    id="markdown_file"
                    type="file"
                    accept=".md,.markdown"
                    onChange={handleFileChange}
                    className="w-full"
                  />
                </div>

                {/* <div className="space-y-2"> */}
                {/* <Separator className="space-y-2"/> */}

                {/* <div className="flex items-end space-y-2 space-x-2 border-t pt-2"> */}
                {/*
                  <div className="flex-7 space-y-2">
                    <Label className="text-sm font-medium">Model Quantization</Label>
                      <Select value={selectQuan} onValueChange={setSelectQuan}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select a version" />
                      </SelectTrigger>
                      <SelectContent>
                        {Object.entries(model_quan).map(([id, name]) => (
                          <SelectItem key={id} value={id}>
                            {name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  */}

                {/* </div> */}
                {/* </div> */}
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel className="space-y-6">
            {htmlContent ? (
              <div className="flex flex-col h-full space-y-4">
                <div className="flex flex-initial gap-2">
                  <Button
                    className="bg-lime-100 rounded-full cursor-pointer hover:bg-lime-200"
                    // variant="icon"
                    color="green"
                    size="icon"
                    onClick={() => handleControl({ cmd: 'play' })}
                    disabled={readStatus === 'playing'}
                  >
                    <Play color="green" className="h-4 w-4" />
                  </Button>
                  <Button
                    className="bg-blue-100 rounded-full cursor-pointer hover:bg-blue-200"
                    size="icon"
                    onClick={() => handleControl({ cmd: 'pause' })}
                    disabled={readStatus !== 'playing'}
                  >
                    <Pause color="blue" className="h-4 w-4" />
                  </Button>
                  <Button
                    className="bg-red-100 rounded-full cursor-pointer hover:bg-red-200"
                    size="icon"
                    onClick={() => handleControl({ cmd: 'stop' })}
                  >
                    <Square color="red" className="h-4 w-4" />
                  </Button>
                </div>
                <Separator />
                <ScrollArea className="flex-auto w-full h-[600px] p-4">
                  <div className="prose" ref={ref}>
                    {parse(htmlContent, { replace })}
                  </div>
                </ScrollArea>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">No preview available</div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Footer */}
        <footer className="sticky bottom-0 border-t px-4 py-3">
          <div className="max-w-7xl mx-auto text-sm text-gray-500">
            © 2025 Read Your Markdown Aloud. All rights reserved.
          </div>
        </footer>
      </div>
    </ThemeProvider>
  );
}

export default App;
