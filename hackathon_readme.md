SmartAttend — Microsoft Build AI Submission (AI at Work)

This file summarizes the deliverables and submission checklist for the hackathon.

Theme: AI at Work — Productivity & Teamwork

Deliverables (what we'll submit):
- Project deck: `TeamName_Deck.pdf` (10 slides) — see `docs/deck.md`
- Demo video: MP4 (≤3 minutes) — upload unlisted to YouTube and include link
- GitHub repo: public; include README with setup + architecture + AI details
- Live prototype URL: deployed instance or ngrok tunnel; include test credentials

Repository checklist
- [x] `README.md` with project description and quick start
- [x] `project_documentation.txt` with architecture and API reference
- [x] `docs/deck.md` — slide content to export as PDF
- [x] `docs/demo_script.md` — 3-minute demo script and timings
- [ ] Ensure `client` and `server` run on accessible URL for judges
- [ ] Add test accounts and sample credentials in `README.md` (avoid real secrets)

Submission checklist
- [ ] Export `docs/deck.md` to `TeamName_Deck.pdf`
- [ ] Record demo video following `docs/demo_script.md` and upload as unlisted
- [ ] Confirm GitHub repo is public and links to deck + demo
- [ ] Provide live demo URL and ensure it remains online for 30+ days
- [ ] Create a short `submission.txt` with links and any login credentials

Suggested resources to integrate (Microsoft AI)
- Use Azure OpenAI / Azure AI Studio for smarter anomaly explanation or summarization
- Use Azure Cognitive Services (Face API) as optional server-side verification
- Show GitHub Copilot-assisted code generation in an appendix if useful

Notes
- We must credit all open-source libraries in the README.
- Ensure no secrets (API keys, DB passwords) are committed. Use `.env.example` only.
