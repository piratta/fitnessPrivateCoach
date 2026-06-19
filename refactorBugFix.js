const fs = require('fs');

let file = 'frontend/src/components/ClientDashboard.jsx';
let code = fs.readFileSync(file, 'utf-8');

// Replace week calculation
let searchBlock = `      const now = new Date();
      const dow = now.getDay(); // 0=Sun, 1=Mon, ... 6=Sat`;

let replaceBlock = `      const now = new Date();
      now.setDate(now.getDate() + weekOffset * 7);
      const dow = now.getDay(); // 0=Sun, 1=Mon, ... 6=Sat`;

code = code.replace(searchBlock, replaceBlock);

// Replace dependency array
let searchDep = `      setTodaySessionsByDay(byDay);
    });
  }, [clientData?.routine, clientData?.routineUpdatedAt]);`;

let replaceDep = `      setTodaySessionsByDay(byDay);
    });
  }, [clientData?.routine, clientData?.routineUpdatedAt, weekOffset]);`;

code = code.replace(searchDep, replaceDep);

fs.writeFileSync(file, code);
console.log("ClientDashboard bug fixed accurately");
