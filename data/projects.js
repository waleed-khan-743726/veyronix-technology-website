/**
 * Veyronix Technology - Centralized Case Study & Project Data
 * Authentic engineering projects and architectural prototypes
 */

export const projects = [
  {
    slug: "aervion-smart-aerial-navigation",
    title: "Aervion — Smart Aerial Navigation & Visual Tracking",
    category: "AI / Computer Vision & Edge Systems",
    tagline: "Autonomous vision-based drone tracking with decoupled asynchronous inference and flight control.",
    overview: "Aervion is an applied computer vision and drone flight control system built to enable real-time target identification, click-to-lock tracking, and autonomous following on lightweight quadcopters.",
    challenge: "In embedded drone platforms, running heavy deep learning inference on the main loop causes critical frame-rate drops. If vision inference lags, flight stabilization PID loops miss control cycles, resulting in erratic flight behavior and safety disconnections.",
    solution: "Architected a dual-threaded pipeline separating the video capture and AI inference engine from the high-frequency flight-command control loop. An asynchronous worker handles target bounding-box computation while the flight controller maintains continuous 50Hz heartbeat stabilization.",
    technologies: ["Python", "OpenCV", "DJI Tello SDK", "Streamlit", "Multi-Threading", "PID Control"],
    industry: "Autonomous Systems & Robotics",
    featured: true,
    githubUrl: "https://github.com/veyronix",
    liveUrl: "case-study-aervion.html",
    highlights: [
      "Decoupled vision inference from flight control loop",
      "Real-time face detection & target bounding box lock",
      "Autonomous distance estimation & safe follow margins",
      "Interactive Streamlit control dashboard with live HUD"
    ]
  },
  {
    slug: "ghl-revenue-automation-engine",
    title: "GoHighLevel Multi-Channel Lead Pipeline",
    category: "CRM & Revenue Automation",
    tagline: "End-to-end inbound lead capture, AI qualification, pipeline routing, and automated calendar follow-ups.",
    overview: "Designed an automated revenue operations system integrating marketing channels with GoHighLevel CRM to eliminate lead slippage and accelerate first-response times.",
    challenge: "Inbound leads from ad campaigns, website forms, and social channels were languishing in spreadsheets for hours, causing low conversion rates and manual scheduling overhead.",
    solution: "Implemented webhook listeners and n8n orchestration bridging custom forms directly to GoHighLevel CRM. Integrated OpenAI API for instantaneous intent qualification, automated pipeline stage assignment, and triggered dynamic SMS/email scheduling sequences.",
    technologies: ["GoHighLevel API", "n8n", "OpenAI API", "Webhooks", "PostgreSQL"],
    industry: "Sales & Marketing Operations",
    featured: true,
    githubUrl: "https://github.com/veyronix",
    liveUrl: "projects.html#ghl-engine",
    highlights: [
      "Sub-60-second automated response sequence",
      "AI qualification classifying lead budget & urgency",
      "Automated calendar booking and appointment reminders",
      "Zero manual data entry from ad touchpoint to CRM"
    ]
  },
  {
    slug: "enterprise-knowledge-copilot",
    title: "Internal Knowledge Retrieval & Workflow Copilot",
    category: "AI Agents & LLM Systems",
    tagline: "Tool-using LLM assistant with Retrieval-Augmented Generation (RAG) over operational documentation.",
    overview: "Built an internal AI copilot for operational teams to query standard operating procedures, extract structured data from technical manuals, and trigger internal workflow webhooks.",
    challenge: "Operational personnel spent over 25% of their workday searching through fragmented PDF manuals and disconnected Notion wikis to find specific procedural policies.",
    solution: "Engineered a semantic search index using chunked vector embeddings and hybrid BM25 retrieval. Connected the model to deterministic tool-calling endpoints to trigger verification checks and draft client deliverables.",
    technologies: ["Python", "FastAPI", "OpenAI API", "pgvector", "LangChain", "Next.js"],
    industry: "Professional Services & SaaS",
    featured: true,
    githubUrl: "https://github.com/veyronix",
    liveUrl: "projects.html#knowledge-copilot",
    highlights: [
      "Hybrid vector + keyword search over technical documents",
      "Deterministic tool-calling guardrails preventing hallucination",
      "Automated policy citation with direct source references",
      "Webhooks integration with internal task management"
    ]
  },
  {
    slug: "event-driven-data-sync-bridge",
    title: "Event-Driven ERP & Database Synchronization",
    category: "API & System Integration",
    tagline: "Reliable webhook ingestion and bidirectional synchronization between custom SaaS and core databases.",
    overview: "Architected a fault-tolerant integration middleware connecting disparate third-party SaaS platforms with central relational databases.",
    challenge: "Frequent API rate-limit errors and network timeouts caused data inconsistencies between billing platforms and internal reporting databases.",
    solution: "Designed an event-driven queue with dead-letter retries, idempotency keys, and automated reconciliation scripts ensuring zero data loss during network interruptions.",
    technologies: ["Python", "FastAPI", "Redis Queue", "PostgreSQL", "Docker", "REST APIs"],
    industry: "E-Commerce & SaaS",
    featured: false,
    githubUrl: "https://github.com/veyronix",
    liveUrl: "projects.html#data-sync",
    highlights: [
      "Idempotent event ingestion preventing duplicate records",
      "Automated exponential backoff retries with dead-letter alerts",
      "Bidirectional data consistency across billing and CRM",
      "Real-time operational health telemetry dashboard"
    ]
  }
];

if (typeof window !== "undefined") {
  window.VEYRONIX_PROJECTS = projects;
}
