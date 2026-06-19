const fs = require('fs');

let code = fs.readFileSync('frontend/src/components/ClientDashboard.jsx', 'utf-8');

// 1. Remove unused functions
code = code.replace(/\/\/ eslint-disable-next-line no-unused-vars\s*const refreshReviewBadge = async \(\) => \{[\s\S]*?catch \{[\s\S]*?\}\s*\};\s*useEffect\(\(\) => \{\s*fetchProgressHistory\(\);\s*\}, \[user, activeTab\]\);/g, 
`useEffect(() => {
    fetchProgressHistory();
  }, [user, activeTab]);`);

code = code.replace(/\/\/ eslint-disable-next-line no-unused-vars\s*const cancelLoadedRoutine = \(\) => \{[\s\S]*?const currentLogs =/g, 'const currentLogs =');

// 2. Remove unused state variables
code = code.replace(/\/\/ eslint-disable-next-line no-unused-vars\s*const \[reviewData, setReviewData\] = useState\(\{[\s\S]*?\}\);\s*/g, '');
code = code.replace(/const isMeasurementsLocked = daysUntilNext > 0;\s*/g, '');

// 3. Fix empty catch blocks
code = code.replace(/catch\s*\(e\)\s*\{\s*\}/g, 'catch (e) { console.error("Error capturado:", e); }');
code = code.replace(/catch\s*\{\s*\}/g, 'catch (e) { console.error("Error capturado:", e); }');
// Also handle `catch { /* some comment */ }` by explicitly matching it?
// Let's replace simple `catch {` with `catch(e) { console.error(e);`
code = code.replace(/catch \{(.*?)\}/g, 'catch (e) { console.error(e); $1 }');

// 4. Extract formatTime (remove from ClientDashboard)
code = code.replace(/const formatTime = \(totalSeconds\) => \{[\s\S]*?return.*\s*\};\s*/g, '');
// Add import formatTime
if(!code.includes("import { formatTime }")) {
    code = code.replace(/import { API_BASE_URL } from '\.\.\/config';/, `import { API_BASE_URL } from '../config';\nimport { formatTime } from '../utils/timeUtils';`);
}

// 5. Replace state initialization for selectedDay, logs, comments, videoLinks
code = code.replace(/const \[selectedDay, setSelectedDay\] = useState\(''\);/, 'const [_selectedDay, setSelectedDay] = useState(\'\');');

code = code.replace(/const \[logs, setLogs\] = useState\(\{\}\);/, 'const [_logs, setLogs] = useState({});');

code = code.replace(/const \[comments, setComments\] = useState\(\{\}\); \/\/ \{ \[day_exIdx\]: string \}\s*const \[videoLinks, setVideoLinks\] = useState\(\{\}\);/g, 
`const [_comments, setComments] = useState({});
  const [_videoLinks, setVideoLinks] = useState({});`);

// We must remove the cascading useEffects. 
// Let's write the code for derived state to put right after the useState definitions
const derivedStateCode = `
  const defaultDay = clientData?.routine ? Object.keys(clientData.routine).filter(day => !day.endsWith('_notes'))[0] : '';
  const selectedDay = _selectedDay || defaultDay || '';
  
  const logs = useMemo(() => {
    if (Object.keys(_logs).length > 0) return _logs;
    if (!clientData?.routine || !selectedDay) return {};
    const fresh = {};
    Object.keys(clientData.routine).filter(k => !k.endsWith('_notes')).forEach(dayName => {
      const initialized = initializeLogsForTab(dayName, dayName, clientData, {}, {}, {});
      fresh[dayName] = initialized.logs;
    });
    return fresh;
  }, [_logs, clientData?.routine, selectedDay]);

  const comments = useMemo(() => {
    if (Object.keys(_comments).length > 0) return _comments;
    return {};
  }, [_comments]);

  const videoLinks = useMemo(() => {
    if (Object.keys(_videoLinks).length > 0) return _videoLinks;
    return {};
  }, [_videoLinks]);
`;

code = code.replace(/const \[\_selectedDay, setSelectedDay\] = useState\(''\);[\s\S]*?const \[\_videoLinks, setVideoLinks\] = useState\(\{\}\);/g,
  `const [_selectedDay, setSelectedDay] = useState('');
  const [skippedDays, setSkippedDays] = useState({});
  const [weekOffset, setWeekOffset] = useState(0);

  const [_comments, setComments] = useState({});
  const [_videoLinks, setVideoLinks] = useState({});
  const [_logs, setLogs] = useState({});
  ${derivedStateCode}
  `
);

// We need to delete the `useEffect` that initializes them.
code = code.replace(/useEffect\(\(\) => \{\s*if \(clientData\?\.routine\) \{[\s\S]*?\}\s*\}, \[clientData\?\.routine\]\);\s*/g, '');
code = code.replace(/useEffect\(\(\) => \{\s*if \(clientData\?\.routine && !selectedDay\) \{\s*setSelectedDay\(Object\.keys\(clientData\.routine\)\[0\]\);\s*\}\s*\}, \[clientData\?\.routine, selectedDay\]\);\s*/g, '');
code = code.replace(/useEffect\(\(\) => \{\s*if \(viewingNextRoutine && clientData\?\.nextRoutine && !selectedDay\) \{\s*setSelectedDay\(Object\.keys\(clientData\.nextRoutine\)\[0\]\);\s*\}\s*\}, \[viewingNextRoutine, clientData\?\.nextRoutine, selectedDay\]\);\s*/g, '');

fs.writeFileSync('frontend/src/components/ClientDashboard.jsx', code);
console.log("Refactor completed for ClientDashboard.jsx");
