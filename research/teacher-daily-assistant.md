# Teacher daily assistant: Appllama research

Studied 30 product screens on 22 October 2026, including images. These are planner and calendar references, not evidence of teacher-specific usability testing.

## References and useful patterns

- Structured (1499198946): Daily Timeline oth_xnbyf, Task Detail oth_68fol, Weekly Timeline oth_pwrg2, Empty Inbox oth_tq15l, New Task Suggestions oth_6c4oh, New Task Form oth_7ie2q, Inbox With Task oth_m9958, Assistant oth_zadip, Settings oth_m5xpf, Integrations oth_erxav. Date context stays prominent; a time rail makes the sequence of the day understandable. Detail screens reveal scheduling and notes separately from the agenda.
- Tiimo (1480220328): Planner Home oth_cv3eg, Daily Task List oth_og4ez, Grouped Task List oth_itbng, Calendars oth_t2q5z, Widget Guide oth_5cynw, Desktop Guide oth_mw3rb, Quick Add oth_74g7y, Task Actions oth_fofhv, List Detail oth_umdmo, Focus Timer oth_hs5h1. Group labels and duration text support scanning. Quick entry asks for a title first. Contextual menus keep occasional actions out of every row.
- TimeTree (952578473): Calendar List oth_k9yva, Month Calendar oth_dhaot, Day Agenda oth_tqkd9, Create Event oth_63nag, Title Entry oth_d2jxm, Labels oth_m7aaq, Options oth_i3u1b, Reminders oth_azjvm, Editor oth_wptx2, Preview oth_3dm7l. Month and day views answer different questions; detail sheets retain calendar context. Optional properties stay secondary.

## Recommendations for Teachers Desk

1. Lead the home screen with Today: upcoming teaching periods, attendance still to mark, and work due. Use actual school calendar and timetable records; distinguish missing data from completed work. Keep the class directory accessible as a separate section.
2. Preserve the current class, subject and date while moving between attendance, marks and lesson plans. Use one consistent location for these controls.
3. Keep dense student work in tables on desktop, with sticky identity columns and clear edit/save states. Adapt row details for small screens instead of shrinking a whole spreadsheet.
4. Exams show student, status, marks and calculated results. Submission controls belong to projects and class activities. This correction is implemented and regression tested.
5. Attendance should support marking exceptions quickly and reviewing a register before saving. Separate not recorded, absent, half-day and non-working dates.
6. Keep creation forms short: essential fields first, calculation rules and optional notes progressively disclosed. Show a readable calculation preview when rules change.
7. Use one restrained semantic colour system. Pair every status colour with text; use colour for class or subject identity only when it has a consistent meaning.
8. Place destructive and rare actions in the management area or contextual menu. Keep primary teaching actions visible and consistently labelled.

Implemented: Today agenda from the school calendar and timetable, per-class attendance progress, pending marks and submissions, overdue lesson reviews, class filtering, direct links to the relevant work, shared class/subject/date context, and progressively disclosed optional form fields. The existing table editing and exam-only marks workflow remain in use. Native mobile patterns are adapted to the responsive web app.
