// Stylesheets are loaded by the <link> in the HTML, not imported here —
// importing as well would ship the same CSS twice.
import { initChrome } from '../shared/chrome';
import { initMotion } from '../shared/motion';
import { initProjectsIndex } from '../shared/projectsIndex';
import { initCaseStudyRouting } from '../shared/caseStudy';

initChrome();
initMotion();
initProjectsIndex(document);
initCaseStudyRouting(document);
