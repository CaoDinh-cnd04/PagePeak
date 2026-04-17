const s = '""Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo.""';
const stripQuotes = (s) => s.replace(/^["\u201c\u2018']+|["\u201d\u2019']+$/g, "").trim();
console.log(stripQuotes(s.slice(0, 120)));
