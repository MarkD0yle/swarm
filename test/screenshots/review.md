# Swarm — State Street persona review

**File:** `/Users/markdoyle/Documents/dev/Swarm/test/screenshots/Screenshot 2026-04-03 at 9.07.24 PM.png`

## Executive summary

The review highlights significant issues with the UI's accessibility, compliance, and usability. High-severity issues include the lack of color-coded status indicators and the reliance on color alone, which affects accessibility for color-blind users. Medium-severity issues focus on button visibility, progress indicator clarity, and the absence of essential features like raw data export and session timeout warnings. The consensus emphasizes the need for clear, accessible, and compliant interfaces, with a strong preference for precise tracking and exportable data to ensure transparency and auditability.

## Interaction highlights

- **agreement** (SS-001 ↔ SS-008): Color-only status indicators are a risk; need unambiguous indicators.
- **agreement** (SS-002 ↔ SS-007): Dark mode is essential for reducing eye strain.
- **agreement** (SS-003 ↔ SS-002): Exporting raw data is essential for transparency.
- **agreement** (SS-004 ↔ SS-005): Button visibility is key for user guidance.
- **agreement** (SS-006 ↔ SS-001): Precise tracking with timestamps is essential for compliance.
- **disagreement** (SS-001 ↔ SS-004): ISO timestamps are non-negotiable for audit and compliance.
- **disagreement** (SS-002 ↔ SS-005): Methodology footnotes are less critical during trading hours.

## Ranked issues

### 1. [high] Lack of color-coded status indicators

**Source:** SS-001, SS-003, SS-005

The progress bars use a single color, making it difficult to quickly assess status. Implement a color-coded system (e.g., green for complete, amber for in-progress, red for issues) to enhance at-a-glance understanding.

### 2. [high] Color-only status indicators

**Source:** SS-008

The progress bars use color alone to indicate status, which is not accessible for color-blind users. Add icons or labels to convey progress status.

### 3. [medium] Button color contrast

**Source:** SS-005, SS-009

The 'Continue to simulation setup' button has low contrast against its background, which may affect visibility and accessibility. Increasing the contrast by using a darker color or a more distinct border can improve usability.

### 4. [medium] Progress Indicators Lack Detail

**Source:** SS-002, SS-007

The progress bars do not provide detailed information on what the percentages represent, which can lead to confusion about the task's status. Adding tooltips with specific criteria or metrics would improve clarity.

### 5. [medium] Missing Raw Data Export Option

**Source:** SS-002, SS-003, SS-006

There is no visible option to export raw data related to the simulation steps or activity logs. Providing a CSV export option would enhance transparency and allow for further analysis.

### 6. [medium] No clear undo path for actions

**Source:** SS-006, SS-009

The UI does not provide an explicit undo option for actions taken, which is necessary for compliance and user trust. Consider adding an undo feature or confirmation dialog for critical actions.

### 7. [medium] Missing last updated timestamp

**Source:** SS-001, SS-004, SS-006

Each activity log entry lacks a clear 'last updated' timestamp. Include ISO timestamps to ensure precise tracking and compliance.

### 8. [medium] Lack of session timeout warning

**Source:** SS-006, SS-005

There is no visible indication of session timeout, which is crucial for compliance and security. Implement a session timeout warning to alert users before automatic logout.

### 9. [medium] Button Hierarchy and Visibility

**Source:** SS-003, SS-010

The 'Continue to simulation setup' button is the same color as the 'View relationship map' button, which may not clearly indicate the primary action. Use a more distinct color or size for the primary action to guide user focus.

### 10. [medium] Progress Indicator Ambiguity

**Source:** SS-003, SS-009

The progress bars for steps 01 and 02 are visually similar, which may cause confusion about which step is currently active. Consider using distinct colors or indicators to differentiate the current step from completed ones.

### 11. [medium] Lack of Dark Mode

**Source:** SS-007, SS-009

The UI does not respect prefers-color-scheme for dark mode, which is essential for reducing eye strain and improving accessibility.

### 12. [medium] Missing API Documentation Link

**Source:** SS-004

The UI lacks a direct link to API documentation, which is essential for evaluating integration capabilities.

### 13. [medium] Session Persistence Across Tab Switches

**Source:** SS-010

Ensure that user sessions persist when switching between tabs to prevent loss of progress or data, which is crucial for maintaining workflow continuity.

### 14. [low] Activity log timestamp format

**Source:** SS-005, SS-010

The timestamps in the activity log are precise to milliseconds, which may not be necessary for all users and can clutter the interface. Consider simplifying the format to seconds or minutes for better readability.

### 15. [low] Typography and Readability

**Source:** SS-003

The font size for the step descriptions and activity log may be too small for some users, affecting readability. Consider increasing the font size or adjusting the contrast for better accessibility.

### 16. [low] Whitespace usage

**Source:** SS-001

Excessive whitespace around elements can reduce the density of information. Optimize spacing to ensure more data is visible without scrolling.

### 17. [low] Ambiguous button labels

**Source:** SS-001, SS-009

The button 'Continue to simulation setup' lacks clarity on the action it performs. Consider more descriptive labels to reduce user uncertainty.

### 18. [low] Typography hierarchy

**Source:** SS-008

The text hierarchy is not distinct enough between headings and body text, which can make it harder to scan the page. Consider increasing the size or weight of headings.

## Round 1 — persona issue counts

- **SS-001:** 4 issues
- **SS-002:** 5 issues
- **SS-003:** 4 issues
- **SS-004:** 4 issues
- **SS-005:** 4 issues
- **SS-006:** 5 issues
- **SS-007:** 4 issues
- **SS-008:** 5 issues
- **SS-009:** 4 issues
- **SS-010:** 4 issues

## Round 2 — reaction counts

- **SS-001:** 2 agreements, 2 disagreements, 0 additional findings
- **SS-002:** 2 agreements, 2 disagreements, 0 additional findings
- **SS-003:** 6 agreements, 2 disagreements, 0 additional findings
- **SS-004:** 3 agreements, 2 disagreements, 1 additional findings
- **SS-005:** 3 agreements, 2 disagreements, 0 additional findings
- **SS-006:** 4 agreements, 2 disagreements, 1 additional findings
- **SS-007:** 3 agreements, 2 disagreements, 0 additional findings
- **SS-008:** 3 agreements, 2 disagreements, 0 additional findings
- **SS-009:** 8 agreements, 2 disagreements, 0 additional findings
- **SS-010:** 3 agreements, 2 disagreements, 1 additional findings
