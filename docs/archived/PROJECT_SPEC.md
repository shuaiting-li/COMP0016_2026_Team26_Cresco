# Project Specification: NTTDATA AI for Sustainability Agritech

## 1. Project Overview

| Item          | Details                                                          |
| ------------- | ---------------------------------------------------------------- |
| Project Title | NTTDATA AI for Sustainability Agritech with Satellite Processing |
| Authors       | Sagar, Sanchi, Shuaiting, Vivek                                  |
| Supervisor    | Professor Graham Roberts                                         |
| Date          | 04 Nov 2025                                                      |
| Version       | 0.2 (first draft+)                                               |

Provide a concise summary of the project's purpose and overall goals.

### 1.1 Summary

This project aims to develop an intelligent, multi-agent farming assistant system (name TBC). The system integrates multiple AI components to help farmers manage daily tasks efficiently by:

- Reminding farmers about essential actions.
- Answering agricultural queries based on internal and external knowledge.
- Allowing users to upload and analyse photos of crops or livestock for plant disease detection or growth monitoring.

The goal is to be more cost-efficient and easier to adopt than existing solutions.

### 1.2 Objectives

- Implement an agent responsible for long-term plans that reminds the farmer what to do each day (e.g., via a greeting message).
- Implement a RAG system for retrieving and generating contextually relevant agricultural knowledge.
- Implement an image processing module so farmers can upload photos via mobile phone and automatically identify objects or conditions in the photo.
- Integrate a powerful LLM for natural and context-aware conversations with the user.
- Use an LLM as a tool manager behind the scenes for orchestrating the interaction between components and agents (Lima core system).

### 1.3 Scope

**MVP**
- User interface for text-based conversation.
- Development of a modular multi-agent system integrating LLM and RAG.
- Prototype deployment for limited-scale demonstration.

**Nice to Have**
- User interface for text-based conversation and image upload.
- User interface for marking farm boundaries on satellite photos.
- Development of a modular multi-agent system integrating LLM, RAG, and image processing.
- Long-term memory and daily task reminders.
- Real-time weather or satellite integration.
- Product-level deployment with extensibility.

**Excluded**
- Full-scale commercial deployment.
- Integration with existing agricultural IoT sensors.
- Hardware development.

## 2. Background and Motivation

- **Problem Description:** Existing intelligent farming solutions are costly or too complex for small-scale farmers.
- **Motivation:** Create an open-source, cost-effective, and easy-to-use intelligent farming solution.
- **Existing Solutions:** Farmonaut, CropIn, Granular.
- **Limitations:** Proposed solution is more cost-effective—free if self-hosted, otherwise only API costs.

## 3. Requirements Specification

### 3.1 Functional Requirements

| ID  | Requirement                                                                  | Priority | Acceptance Criteria                                      |
| --- | ---------------------------------------------------------------------------- | -------- | -------------------------------------------------------- |
| FR1 | System sends daily reminders and updates based on farm schedule.             | M        | User receives ≥1 contextually relevant reminder per day. |
| FR2 | System supports natural conversation via LLM.                                | H        | LLM responds contextually within <2 seconds.             |
| FR3 | System supports uploading and analysing satellite images.                    | M        | Image upload and classification achieve 90% accuracy.    |
| FR4 | System retrieves factual data using RAG.                                     | H        | Responses include referenced knowledge sources.          |
| FR5 | System stores and recalls user interactions (long-term memory).              | M        | Context preserved across sessions.                       |
| FR6 | System runs locally or in the cloud with minimal setup.                      | L        | Setup completed in under 10 minutes.                     |
| FR7 | System allows user to mark their farm on a satellite map to provide context. | M        | LLM can identify the user's farm location.               |

### 3.2 Non-Functional Requirements

| ID   | Requirement                                                                           | Category        | Acceptance Criteria                       |
| ---- | ------------------------------------------------------------------------------------- | --------------- | ----------------------------------------- |
| NFR1 | System should respond to user queries quickly.                                        | Performance     | Average response time <10 seconds.        |
| NFR2 | Interface should be intuitive for non-technical users.                                | Usability       | Users can operate without training.       |
| NFR3 | System must preserve data privacy and not leak personal data.                         | Security        | No personal data shared externally.       |
| NFR4 | Modular architecture should allow each agent to be replaced or updated independently. | Maintainability | Components communicate via standard APIs. |

### 3.3 Constraints and Assumptions

- Internet connectivity is assumed for external data retrieval (RAG).
- User device: desktop browser application with capability to upload images.
- OpenAI-compatible LLM API is available for text generation.
- Existing models are available for image processing.
- User can share location data and maintain relevant static data.

## 4. System Design and Architecture

### 4.1 Overview

The system follows a multi-agent architecture where each agent covers a specific domain:

- **Planner Agent:** Generates long-term goals and daily tasks.
- **RAG Agent:** Fetches agricultural information.
- **Vision Agent:** Handles image recognition and interpretation.
- **Chat Agent (LLM):** Communicates with the user naturally.
- **Core Orchestrator:** Coordinates tasks between agents and handles user memory (executive logic/routing).

### 4.2 Architecture Diagram

> Placeholder: diagram to illustrate message flow between agents and central memory.

For detailed architecture documentation, see [ARCHITECTURE.md](ARCHITECTURE.md).

### 4.3 Data Model

- Level 0 DFD diagram (multi-agent architecture) – TBC.
- User table: `ID`, `profile`, `farm_type`, `preferences`.
- Task table: `TaskID`, `description`, `due_date`, `completion_status`.
- Image log: `ImageID`, `upload_date`, `result_metadata`.

### 4.4 Technology Stack

| Layer           | Technology        |
| --------------- | ----------------- |
| Frontend        | React or Next.js  |
| Backend         | Python (FastAPI)  |
| AI Models       | Gemini or LLaMA   |
| Database        | PostgreSQL        |
| Deployment      | Docker containers |
| Version Control | Git + GitHub      |

## 5. Implementation Plan

### 5.1 Work Packages / Tasks

| Task | Description                                | Duration | Dependencies |
| ---- | ------------------------------------------ | -------- | ------------ |
| T1   | Design system architecture and data model. | 2 weeks  | None         |
| T2   | Implement RAG backend.                     | 2 weeks  | T1           |
| T3   | TBC.                                       | TBC      | TBC          |

### 5.2 Milestones and Deliverables

| Milestone | Target Date | Deliverable                                                            |
| --------- | ----------- | ---------------------------------------------------------------------- |
| M1        | 12 Dec 2025 | MVP: Working frontend with API and RAG backend.                        |
| M2        | 15 Jan 2026 | Demonstration of UI plus potential Nice-to-Have features.              |
| M3        | 6 Feb 2026  | Submission of second prototype with additional implementations and UI. |
| M4        | 3 Mar 2026  | Demo-able product and pitch deck for in-person showcase.               |
| M5        | 12 Mar 2026 | Finalised solution with documentation and minimal bugs.                |

### 5.3 Version Control and Development Process

The project uses Git with a feature-branch workflow. CI/CD will run via GitHub Actions for automated tests and builds, and code reviews are required for every merge request.

## 6. Testing and Evaluation Plan

- **Testing Methods:** Unit testing (Python `unittest`), integration testing, and user testing sessions.
- **Test Data:** Simulated and anonymised agricultural data, plus public datasets for image recognition.
- **Evaluation Metrics:** TBC.

## 7. Risk Assessment

| Risk                                              | Likelihood | Impact | Mitigation                             |
| ------------------------------------------------- | ---------- | ------ | -------------------------------------- |
| R1: API rate limits or cost.                      | Medium     | Medium | Implement caching and fallbacks.       |
| R2: Model hallucination (LLM returns false data). | High       | High   | Use RAG with citation-based responses. |
| R3: Poor user adoption due to complex UI.         | Medium     | Medium | Conduct early usability testing.       |
| R4: Integration conflicts between agents.         | Low        | Medium | Define clear API boundaries.           |

## 8. Ethical, Legal, and Sustainability Considerations

- Ensure data privacy by not storing personally identifiable information.
- Provide transparent information sources (RAG citations).
- Use cloud computing responsibly to minimize energy waste.
- Consider accessibility (readable text, mobile-friendly UI, colourblind-friendly palette).

## 9. Schedule

> TBC – detailed schedule to be added once milestones are baselined.

## 10. References

List all references cited in this document using a consistent style (e.g., Harvard or IEEE).

## 11. Appendices

- **Appendix A:** Initial sketches, diagrams, or mock-ups.
- **Appendix B:** Additional data or background information.

---

**Last Updated**: November 25, 2025  
**Version**: 0.2  
**Status**: Planning Phase
