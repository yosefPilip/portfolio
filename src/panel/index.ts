import '../styles/panel.css';
import { mountPanel } from './overlay';
import { createStore } from './state';

export function initPanel(): void {
  // One store, created here and handed to every module that needs it.
  const store = createStore();
  mountPanel(store);
}
