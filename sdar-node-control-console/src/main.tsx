import React from 'react';
import ReactDOM from 'react-dom/client';
import { ConsoleApp } from './ConsoleApp';
import { ConsoleProvider } from './state/ConsoleState';
import './styles/app.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConsoleProvider><ConsoleApp /></ConsoleProvider>
  </React.StrictMode>,
);
