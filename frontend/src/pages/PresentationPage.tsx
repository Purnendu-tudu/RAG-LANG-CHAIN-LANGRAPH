import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, SkipForward, SkipBack, RotateCcw, Sparkles, Terminal,
  Cpu, ShieldCheck, Database, FileText, Code, CheckCircle2, ArrowRight,
  Brain, Layers, Zap, Activity, Info, RefreshCw
} from 'lucide-react';
import { MermaidDiagram } from '../components/MermaidDiagram';

interface FlowStep {
  id: number;
  name: string;
  subLabel: string;
  category: 'input' | 'security' | 'router' | 'retrieval' | 'assembly' | 'llm' | 'sanitizer' | 'ui';
  pythonFunction: string;
  pythonModule: string;
  inputState: string;
  outputState: string;
  executionTime: string;
  description: string;
  icon: any;
  colorClass: string;
  bgGlowClass: string;
  borderColor: string;
}

const FLOW_STEPS: FlowStep[] = [
  {
    id: 0,
    name: "1. Prompt Submission",
    subLabel: "HTTP POST /api/gevernovai/chat",
    category: "input",
    pythonFunction: "gevernovai_chat_endpoint(request: ChatRequest)",
    pythonModule: "backend/main.py (L645)",
    inputState: '{\n  "question": "Draw full architecture of small wind turbine",\n  "provider": "google",\n  "query_mode": "architecture"\n}',
    outputState: '{\n  "status": "received",\n  "thread_id": "session-4921"\n}',
    executionTime: "1.2 ms",
    description: "Captures user query, deserializes payload into Pydantic model, and initializes the LangGraph state machine execution context.",
    icon: Terminal,
    colorClass: "text-amber-400",
    bgGlowClass: "from-amber-500/20 to-amber-600/5",
    borderColor: "border-amber-500/40",
  },
  {
    id: 1,
    name: "2. Security & Guardrail Check",
    subLabel: "SENSITIVE_DATA_GUARD & Prompt Injection Filter",
    category: "security",
    pythonFunction: "validate_input_guard(state: RAGState)",
    pythonModule: "backend/rag_graph.py (L380)",
    inputState: 'state["question"] = "Draw full architecture of small wind turbine"',
    outputState: 'state["is_safe"] = True\nstate["guard_passed"] = True',
    executionTime: "0.8 ms",
    description: "Evaluates the prompt against GE VernovAI confidentiality filters and prompt injection shields to enforce enterprise compliance.",
    icon: ShieldCheck,
    colorClass: "text-emerald-400",
    bgGlowClass: "from-emerald-500/20 to-emerald-600/5",
    borderColor: "border-emerald-500/40",
  },
  {
    id: 2,
    name: "3. Query Router Node",
    subLabel: "Query Mode Classification",
    category: "router",
    pythonFunction: "route_query_mode(query_mode: str = 'architecture')",
    pythonModule: "backend/rag_graph.py (L410)",
    inputState: 'query_mode = "architecture"',
    outputState: 'state["instructions"] = "Senior Systems Engineering Diagrams (Node classification strategy & classDef styles)"',
    executionTime: "0.4 ms",
    description: "Routes the request to target prompt strategies (Q&A, Summary, Key Takeaways, or Senior Systems Engineering Diagrams).",
    icon: Cpu,
    colorClass: "text-cyan-400",
    bgGlowClass: "from-cyan-500/20 to-cyan-600/5",
    borderColor: "border-cyan-500/40",
  },
  {
    id: 3,
    name: "4. FAISS Vector Retrieval",
    subLabel: "Top-K Semantic Similarity Search",
    category: "retrieval",
    pythonFunction: "retrieve_node(state: RAGState) -> dict",
    pythonModule: "backend/rag_graph.py (L730)",
    inputState: 'retriever.get_relevant_documents("Draw full architecture of small wind turbine")',
    outputState: 'state["context_docs"] = [\n  Doc(file="small_wind_turbine.pdf", page=3, score=0.92),\n  Doc(file="small_wind_turbine.pdf", page=5, score=0.88)\n]',
    executionTime: "34.5 ms",
    description: "Queries the FAISS vector index using Google Generative AI embeddings to retrieve top relevant document chunks.",
    icon: Database,
    colorClass: "text-sky-400",
    bgGlowClass: "from-sky-500/20 to-sky-600/5",
    borderColor: "border-sky-500/40",
  },
  {
    id: 4,
    name: "5. Context & Citation Synthesis",
    subLabel: "Metadata Grounding & Citation Binding",
    category: "assembly",
    pythonFunction: "format_docs_with_citations(docs: List[Document])",
    pythonModule: "backend/rag_graph.py (L350)",
    inputState: 'docs = [Document(page_content="Model LN3500 3000W PMA...", metadata={"source": "small_wind_turbine.pdf", "page": 3})]',
    outputState: 'context_str = "Document Name: small_wind_turbine.pdf | Page: 3\\nSection: Specifications\\n..."',
    executionTime: "2.1 ms",
    description: "Formats document chunks with page numbers, document titles, and section headers into a grounded context string.",
    icon: FileText,
    colorClass: "text-indigo-400",
    bgGlowClass: "from-indigo-500/20 to-indigo-600/5",
    borderColor: "border-indigo-500/40",
  },
  {
    id: 5,
    name: "6. Gemini / Ollama LLM Generation",
    subLabel: "Systems Engineering Prompt & Graph Construction",
    category: "llm",
    pythonFunction: "generate_node(state: RAGState) -> dict",
    pythonModule: "backend/rag_graph.py (L750)",
    inputState: 'prompt_template.format(context=context_str, question=state["question"])',
    outputState: 'raw_llm_response = [\n  {"type": "text", "text": "```mermaid\\nflowchart TD\\n  subgraph Structural...```"}\n]',
    executionTime: "840.2 ms",
    description: "Executes LLM reasoning using Gemini 1.5 Flash / Ollama to generate grounded markdown explanations and valid Mermaid diagrams.",
    icon: Brain,
    colorClass: "text-purple-400",
    bgGlowClass: "from-purple-500/20 to-purple-600/5",
    borderColor: "border-purple-500/40",
  },
  {
    id: 6,
    name: "7. AST Text Extractor & Sanitizer",
    subLabel: "Python Repr Parsing & Mermaid Escaping",
    category: "sanitizer",
    pythonFunction: "extract_text_from_llm_response(raw_response)",
    pythonModule: "backend/rag_graph.py (L290)",
    inputState: 'raw = \'[{"type": "text", "text": "```mermaid\\\\nflowchart TD..."}]\'' ,
    outputState: 'clean_text = "```mermaid\\nflowchart TD\\n  subgraph Structural...```"',
    executionTime: "0.5 ms",
    description: "Strips raw Python list/dict string representations returned by LangChain Google GenAI and sanitizes Mermaid syntax.",
    icon: Code,
    colorClass: "text-fuchsia-400",
    bgGlowClass: "from-fuchsia-500/20 to-fuchsia-600/5",
    borderColor: "border-fuchsia-500/40",
  },
  {
    id: 7,
    name: "8. Full Response Width UI Render",
    subLabel: "<MermaidDiagram /> SVG Rendering & Lightbox",
    category: "ui",
    pythonFunction: "mermaid.render(id, cleanChart) -> SVG",
    pythonModule: "frontend/src/components/MermaidDiagram.tsx",
    inputState: 'chart = "flowchart TD\\n  subgraph Structural [Structural Subsystem]\\n    A[Turbine Body]\\n  end"',
    outputState: 'DOM: <svg viewBox="0 0 800 600" class="w-full">...</svg>',
    executionTime: "12.4 ms",
    description: "Renders full-height Mermaid SVG diagrams fitted to the chat response width with straight linear lines, class colors, and interactive lightbox zoom/pan.",
    icon: Sparkles,
    colorClass: "text-teal-400",
    bgGlowClass: "from-teal-500/20 to-teal-600/5",
    borderColor: "border-teal-500/40",
  },
];

const PRESETS = [
  {
    label: "🌪️ Small Wind Turbine Architecture",
    prompt: "Draw full architecture of small wind turbine (Model LN3500 / HY-3000)",
    demoChart: `flowchart TD
  subgraph Structural ["Structural & Siting Subsystem"]
    A["Wind Resource"] --> B["Tower Structure (20 ft / 6m)"]
    B --> C["Flange Connection"]
  end

  subgraph Mechanical ["Mechanical & Rotor Subsystem"]
    D["Blades & Hub (3m Rotor)"] --> E["Rotor Assembly"]
    E --> F["Turbine Body (LN3500)"]
  end

  subgraph Electrical ["Electrical Generation Subsystem"]
    F --> G["3-Phase PMA Generator"]
    G --> H["3000W Power Controller"]
    H --> I[("Battery Storage Bank")]
  end

  subgraph Safety ["Safety & Protection Subsystem"]
    J{"Wind Speed > 8m/s?"} -->|Yes| K["Aerodynamic Blade Brake"]
    J -->|Emergency| L["Electromagnetic Brake"]
  end

  C --> F
  
  class A,B,C mechanical;
  class D,E,F mechanical;
  class G,H,I electrical;
  class J,K,L safety;
  classDef mechanical fill:#334155,stroke:#64748b,color:#f8fafc;
  classDef electrical fill:#1e3a8a,stroke:#3b82f6,color:#f8fafc;
  classDef safety fill:#7f1d1d,stroke:#ef4444,color:#f8fafc;`
  },
  {
    label: "⚡ Electrical Rectification Flow",
    prompt: "Show electrical generation, 3-phase PMA generator, and battery charging flow",
    demoChart: `flowchart TD
  subgraph Generation ["Power Generation Subsystem"]
    P1["Rotor Shaft Rotation"] --> P2("3-Phase PMA Alternator")
    P2 --> P3["AC Voltage Signal (48Vdc)"]
  end

  subgraph Rectification ["Rectification & Control"]
    P3 --> R1["3-Phase AC to DC Rectifier"]
    R1 --> R2("Charge Controller (3000W)")
  end

  subgraph Storage ["Storage & Distribution"]
    R2 --> S1[("48V Battery Bank")]
    R2 --> S2["Pure Sine Inverter"]
    S2 --> S3["AC Power Output (230V)"]
  end

  class P1,P2,P3 electrical;
  class R1,R2 controllers;
  class S1,S2,S3 data;
  classDef electrical fill:#1e3a8a,stroke:#3b82f6,color:#f8fafc;
  classDef controllers fill:#7c2d12,stroke:#f97316,color:#f8fafc;
  classDef data fill:#581c87,stroke:#a855f7,color:#f8fafc;`
  },
];

export const PresentationPage: React.FC = () => {
  const [activeStepId, setActiveStepId] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [selectedPreset, setSelectedPreset] = useState<number>(0);
  const [activePrompt, setActivePrompt] = useState<string>(PRESETS[0].prompt);

  const activeStep = FLOW_STEPS[activeStepId];

  // Auto-play presentation timer
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setActiveStepId((prev) => {
          if (prev >= FLOW_STEPS.length - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, 3000 / playbackSpeed);
    }
    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed]);

  const handleSelectStep = (stepId: number) => {
    setIsPlaying(false);
    setActiveStepId(stepId);
  };

  const handleRunPreset = (index: number) => {
    setSelectedPreset(index);
    setActivePrompt(PRESETS[index].prompt);
    setActiveStepId(0);
    setIsPlaying(true);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#070b14] text-slate-100 p-4 sm:p-6 space-y-6">
      
      {/* ── Top Header Banner */}
      <div className="max-w-7xl mx-auto glass-panel p-5 sm:p-6 rounded-2xl border border-sky-500/20 bg-gradient-to-r from-slate-950 via-slate-900 to-sky-950/40 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <span className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/30 text-sky-400">
              <Activity className="w-5 h-5 animate-pulse" />
            </span>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              GE VernovAI & LangGraph Execution Pipeline
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl">
            Live interactive node presentation visualizing how prompts flow through security guards, FAISS vector retrieval, Gemini LLM reasoning, and full-response Mermaid diagram generation.
          </p>
        </div>

        {/* Preset Selector Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {PRESETS.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => handleRunPreset(idx)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all border ${
                selectedPreset === idx
                  ? 'bg-sky-500 text-slate-950 border-sky-400 shadow-lg shadow-sky-500/20 scale-105'
                  : 'bg-slate-900/80 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Main Presentation Grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Left Column: Interactive Node Pipeline & Flow (8 Cols) */}
        <div className="lg:col-span-8 space-y-6">

          {/* Controls Bar */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-slate-950 font-bold text-xs shadow-lg shadow-sky-500/20 active:scale-95 transition-all"
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlaying ? "Pause Flow" : "Play Flow"}</span>
              </button>

              <button
                onClick={() => handleSelectStep(Math.max(0, activeStepId - 1))}
                disabled={activeStepId === 0}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 transition-all"
                title="Previous Step"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSelectStep(Math.min(FLOW_STEPS.length - 1, activeStepId + 1))}
                disabled={activeStepId === FLOW_STEPS.length - 1}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 disabled:opacity-40 transition-all"
                title="Next Step"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                onClick={() => handleSelectStep(0)}
                className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 transition-all"
                title="Reset Flow"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            {/* Speed Control */}
            <div className="flex items-center space-x-2 text-xs text-slate-400 font-medium">
              <span>Speed:</span>
              {[0.5, 1, 2].map((spd) => (
                <button
                  key={spd}
                  onClick={() => setPlaybackSpeed(spd)}
                  className={`px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all ${
                    playbackSpeed === spd
                      ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  {spd}x
                </button>
              ))}
            </div>
          </div>

          {/* ── Node Visual Pipeline Grid */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/90 relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center space-x-1.5">
                <Layers className="w-4 h-4 text-sky-400" />
                <span>Node Execution Pipeline ({activeStepId + 1} / {FLOW_STEPS.length})</span>
              </span>

              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Active: {activeStep.name}
              </span>
            </div>

            {/* Node Flow Cards Container */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 relative">
              {FLOW_STEPS.map((step, idx) => {
                const isActive = step.id === activeStepId;
                const isPassed = step.id < activeStepId;
                const IconComponent = step.icon;

                return (
                  <motion.div
                    key={step.id}
                    onClick={() => handleSelectStep(step.id)}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3.5 rounded-xl border cursor-pointer relative transition-all duration-200 flex flex-col justify-between min-h-[110px] ${
                      isActive
                        ? `bg-gradient-to-br ${step.bgGlowClass} ${step.borderColor} shadow-xl ring-2 ring-sky-400/50`
                        : isPassed
                          ? 'bg-slate-900/60 border-slate-800 text-slate-300 opacity-90'
                          : 'bg-slate-950/40 border-slate-900 text-slate-500 hover:border-slate-800'
                    }`}
                  >
                    {/* Active pulse ring */}
                    {isActive && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500"></span>
                      </span>
                    )}

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className={`p-1.5 rounded-lg ${isActive ? 'bg-sky-500/20 text-sky-300' : 'bg-slate-900 text-slate-400'}`}>
                          <IconComponent className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-mono font-bold opacity-60">#{step.id + 1}</span>
                      </div>

                      <h3 className={`text-xs font-bold line-clamp-1 ${isActive ? 'text-white' : 'text-slate-300'}`}>
                        {step.name}
                      </h3>
                      <p className="text-[10px] text-slate-400 line-clamp-1 font-mono">
                        {step.subLabel}
                      </p>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px] font-mono text-slate-500">
                      <span>{step.executionTime}</span>
                      {isPassed && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* Live Render Output Preview Card */}
          <div className="glass-panel p-5 rounded-2xl border border-slate-800 bg-slate-950/90 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Live Response Visual Preview
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Query: "{activePrompt}"
              </span>
            </div>

            {/* Mermaid Diagram Demo Render */}
            <div className="pt-2">
              <MermaidDiagram chart={PRESETS[selectedPreset].demoChart} />
            </div>
          </div>

        </div>

        {/* Right Column: Real-Time Technical Inspector Panel (4 Cols) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Step Technical Inspector */}
          <div className="glass-panel p-5 rounded-2xl border border-sky-500/20 bg-slate-950/95 space-y-4 shadow-xl sticky top-4">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Terminal className="w-4 h-4 text-sky-400" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Technical Node Inspector
                </h2>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Step {activeStep.id + 1}
              </span>
            </div>

            {/* Function details */}
            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Python Function Signature
                </label>
                <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-sky-300 break-all mt-1">
                  {activeStep.pythonFunction}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Source Code Module
                </label>
                <div className="p-2 rounded-lg bg-slate-900/60 border border-slate-800/80 font-mono text-[11px] text-slate-300 mt-1">
                  📁 {activeStep.pythonModule}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Description
                </label>
                <p className="text-xs text-slate-300 leading-relaxed mt-1">
                  {activeStep.description}
                </p>
              </div>

              {/* State Input Payload */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Input State (RAGState)
                </label>
                <pre className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 font-mono text-[10px] text-emerald-300 overflow-x-auto mt-1 max-h-32">
                  {activeStep.inputState}
                </pre>
              </div>

              {/* State Output Payload */}
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Output State Payload
                </label>
                <pre className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80 font-mono text-[10px] text-cyan-300 overflow-x-auto mt-1 max-h-32">
                  {activeStep.outputState}
                </pre>
              </div>

              {/* Execution Metrics */}
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
                <span>Latency Benchmark:</span>
                <span className="font-mono font-bold text-sky-400">{activeStep.executionTime}</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
